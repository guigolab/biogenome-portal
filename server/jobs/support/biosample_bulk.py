import gzip
import logging
import os

from lxml import etree
from mongoengine.errors import NotUniqueError, ValidationError

from clients import ebi_client
from db.model import BioSample
from helpers.data import create_batches
from parsers import biosample
from uuid import uuid4

logger = logging.getLogger(__name__)


def parse_biosamples_from_xml(xml_path):
    """
    Memory-efficient streaming parser for ENA biosample XML files (plain or gzipped).
    Assumes valid ENA structure: <SAMPLE_SET><SAMPLE>...</SAMPLE> ... </SAMPLE_SET>
    Only top-level <SAMPLE> nodes are parsed. Each is converted to a BioSample using
    the same logic as parse_biosample_from_ebi_data (accession, taxid, scientific_name, metadata).
    Returns a list of BioSample instances (not saved to DB).
    """
    biosamples = []
    open_fn = gzip.open if xml_path.endswith(".gz") else open
    with open_fn(xml_path, "rb") as f:
        context = etree.iterparse(f, events=("end",))
        for _, elem in context:
            if elem.tag != "SAMPLE":
                continue
            parent = elem.getparent()
            if parent is None or parent.tag != "SAMPLE_SET":
                continue

            try:
                biosample_obj = biosample.parse_biosample_from_ena_xml_element(elem)
                biosamples.append(biosample_obj)
            except (ValueError, TypeError):
                # Skip samples that cannot be parsed (e.g. missing scientific name)
                pass

            elem.clear()
            while elem.getprevious() is not None:
                del elem.getparent()[0]

    return biosamples


def fetch_new_biosamples_from_ebi_portal(accessions, tmp_dir):
    """
    Function to fetch new biosamples from ENA portal in bulk (up to 10k accessions at a time) and parse them
    WARNING: only works for biosamples with data available in ENA portal (not all biosamples are available)
    Returns a list of parsed BioSample objects
    """
    batches = create_batches(accessions, 5000)
    biosamples = []
    for batch in batches:
        try:
            path_to_gzipped_xml_file = os.path.join(tmp_dir, f"biosamples_{uuid4()}.xml.gz")
            fetch_success = ebi_client.get_xml_from_ena_browser(batch, path_to_gzipped_xml_file)
            if (
                not fetch_success
                or not os.path.exists(path_to_gzipped_xml_file)
                or os.path.getsize(path_to_gzipped_xml_file) == 0
            ):
                continue
            biosamples.extend(parse_biosamples_from_xml(path_to_gzipped_xml_file))
        # Best-effort cleanup to save disk space
        except Exception as e:
            logger.exception(f"Error fetching biosamples from ENA portal: {e}")
            continue
        finally:
            try:
                os.remove(path_to_gzipped_xml_file)
            except OSError:
                pass
    return biosamples


def handle_biosamples_from_accessions(accessions, tmp_dir):
    """
    Fetch and insert BioSample rows for the given accessions (ENA).

    Does not call ``finalize_organism_catalog_for_taxids``; the Celery job must sync once
    after all catalog writes (assemblies/reads/biosamples jobs).

    Accessions are de-duplicated per batch (e.g. many read runs share one biosample)
    and parsed XML is de-duplicated by accession before insert so Mongo bulk insert
    cannot hit duplicate ``accession`` keys.

    Returns accessions inserted or updated in this run (bulk insert first, then
    per-document save / metadata refresh on failure or duplicate), for downstream
    geolocation and organism cleanup.
    """
    batches = create_batches(accessions, 5000)
    saved_accessions = []
    for batch in batches:
        existing_accessions = set(BioSample.objects(accession__in=batch).scalar("accession"))
        # Preserve order, drop falsy and DB hits; collapse duplicate accessions in this batch.
        new_accessions = list(
            dict.fromkeys(
                a for a in batch if a and str(a).strip() and a not in existing_accessions
            )
        )
        if new_accessions:
            biosamples = fetch_new_biosamples_from_ebi_portal(new_accessions, tmp_dir)
            by_accession = {}
            for doc in biosamples:
                if doc.accession:
                    by_accession[doc.accession] = doc
            to_insert = list(by_accession.values())
            if not to_insert:
                continue
            try:
                BioSample.objects.insert(to_insert)
                saved_accessions.extend(
                    a for a in by_accession if a
                )
                logger.info(
                    "Bulk inserted %s new biosample document(s)", len(to_insert)
                )
            except Exception:
                logger.exception(
                    "Bulk biosample insert failed (batch size %s); "
                    "falling back to per-document save/update",
                    len(to_insert),
                )
                for doc in to_insert:
                    acc = doc.accession
                    if not acc:
                        continue
                    try:
                        doc.save()
                        saved_accessions.append(acc)
                    except (NotUniqueError, ValidationError):
                        try:
                            BioSample.objects(accession=acc).update(
                                taxid=doc.taxid,
                                scientific_name=doc.scientific_name,
                                metadata=doc.metadata,
                            )
                            saved_accessions.append(acc)
                            logger.debug(
                                "BioSample %s already existed; updated from ENA fetch",
                                acc,
                            )
                        except Exception:
                            logger.exception(
                                "Failed to update duplicate biosample %s", acc
                            )
                    except Exception:
                        logger.exception("Failed to save biosample %s", acc)
    return saved_accessions

import logging
import os
from typing import Any, Dict, Iterable, List, Optional

from celery import shared_task

from clients.genomehubs_client import get_blobtoolkit_id
from clients.ncbi_client import query_datasets_to_file
from db.models import Assembly, Chromosome
from helpers.assembly import handle_assemblies_from_jsonl_file
from helpers.biosample import handle_biosamples_from_accessions
from helpers.data import create_batches
from helpers.geolocation import update_geolocations
from helpers.import_organism_guard import (
    delete_rows_without_organism,
    surviving_taxids_after_cleanup,
)
from helpers.organism import (
    handle_full_taxonomy_from_taxids,
    reload_organisms_and_update_deps,
)
from helpers.taxon_organism_sync import sync_many_taxids
from jobs.organisms import fetch_tolid_prefixes_task

logger = logging.getLogger(__name__)

PROJECT_ACCESSION = os.getenv("PROJECT_ACCESSION")
TMP_DIR = os.getenv("TMP_DIR", "/tmp")


def _safe_remove(path: Optional[str]) -> None:
    """Remove a file if it exists; log and continue on failure."""
    if not path:
        return
    try:
        if os.path.isfile(path):
            os.remove(path)
    except OSError as exc:
        logger.warning("Could not remove temp file %s: %s", path, exc)


def _ensure_parent_dir(file_path: str) -> None:
    parent = os.path.dirname(file_path)
    if parent:
        os.makedirs(parent, exist_ok=True)


def _write_accession_batch(path: str, batch: List[str]) -> None:
    """Write one NCBI assembly accession per line for datasets --inputfile."""
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(batch))
        if batch:
            f.write("\n")


@shared_task(name="assemblies_import", ignore_result=False)
def import_assemblies_by_bioproject(project_accession: Optional[str] = None) -> Dict[str, Any]:
    """
    STEPS:
    1. Collect assemblies from NCBI Datasets
    2. Collect taxids from assemblies
    3. Fetch organisms from ENA browser -> save organisms and taxons
    4. Fetch biosamples from ENA browser -> save biosamples
    5. Update assemblies with new information and save only those with valid organisms and biosamples
    """
    if not project_accession:
        project_accession = PROJECT_ACCESSION
    if not project_accession:
        raise ValueError(
            "project_accession is required (argument or PROJECT_ACCESSION env var)."
        )

    jsonl_file_path = os.path.join(TMP_DIR, f"{project_accession}.jsonl")
    _ensure_parent_dir(jsonl_file_path)

    try:
        cmd = [
            "genome",
            "accession",
            project_accession,
            "--report",
            "--assembly-source",
            "GenBank",
            "--as-json-lines",
        ]
        output_path = query_datasets_to_file(cmd, jsonl_file_path)
        if not output_path:
            raise RuntimeError(
                f"NCBI datasets CLI returned no data for bioproject {project_accession!r} "
                "(check project accession and datasets installation)."
            )

        saved_assembly_accessions = handle_assemblies_from_jsonl_file(jsonl_file_path)
        if not saved_assembly_accessions:
            raise RuntimeError(
                f"No new assemblies were persisted for bioproject {project_accession!r}."
            )

        biosample_accessions = Assembly.objects(
            accession__in=saved_assembly_accessions
        ).scalar("sample_accession")
        saved_biosample_accessions = handle_biosamples_from_accessions(
            biosample_accessions, TMP_DIR
        )

        assembly_taxids = Assembly.objects(
            accession__in=saved_assembly_accessions
        ).scalar("taxid")
        saved_organism_taxids = handle_full_taxonomy_from_taxids(
            assembly_taxids, TMP_DIR, fetch_tolid_prefixes_sync=False
        )

        reload_organisms_and_update_deps(saved_organism_taxids)
        removed = delete_rows_without_organism(
            Assembly, "accession", saved_assembly_accessions
        )
        if removed:
            logger.info(
                "Removed %s assembly/assemblies with no Organism after taxonomy import",
                removed,
            )
        surviving = surviving_taxids_after_cleanup(
            Assembly, "accession", saved_assembly_accessions
        )
        if surviving:
            sync_many_taxids(surviving)
        update_geolocations(saved_biosample_accessions)

        if saved_organism_taxids:
            fetch_tolid_prefixes_task.delay(list(saved_organism_taxids))

        logger.info(
            "Bioproject %s import finished: %s assemblies, biosamples/geolocation updated.",
            project_accession,
            len(saved_assembly_accessions),
        )
        return {
            "project_accession": project_accession,
            "assemblies_saved": len(saved_assembly_accessions),
            "status": "ok",
        }
    except Exception:
        logger.exception("import_assemblies_by_bioproject failed for %s", project_accession)
        raise
    finally:
        _safe_remove(jsonl_file_path)


@shared_task(name="accessions_import", ignore_result=False)
def import_assemblies_from_accessions(
    accessions: Iterable[str],
) -> Dict[str, Any]:
    if not accessions:
        raise ValueError("No accessions provided")

    accessions_list = list(accessions)
    logger.info("Assemblies to fetch: %s", len(accessions_list))

    batches = create_batches(accessions_list, 1000)
    temp_paths: List[str] = []
    output_files_paths: List[str] = []
    saved_accessions: List[str] = []

    try:
        for idx, batch in enumerate(batches):
            assembly_input_file = os.path.join(
                TMP_DIR, f"assemblies_{idx}_{len(batch)}.txt"
            )
            assembly_output_file = os.path.join(
                TMP_DIR, f"assemblies_{idx}_{len(batch)}.jsonl"
            )
            temp_paths.extend([assembly_input_file, assembly_output_file])
            _ensure_parent_dir(assembly_input_file)

            try:
                _write_accession_batch(assembly_input_file, batch)
            except OSError as exc:
                logger.error(
                    "Failed to write accession batch file %s: %s",
                    assembly_input_file,
                    exc,
                )
                raise RuntimeError(
                    f"Could not write temporary accession file: {assembly_input_file}"
                ) from exc

            args = [
                "genome",
                "accession",
                "--inputfile",
                assembly_input_file,
                "--as-json-lines",
            ]
            output_path = query_datasets_to_file(args, assembly_output_file)
            if not output_path:
                logger.warning(
                    "No datasets output for batch index %s (size %s); stderr may be in logs.",
                    idx,
                    len(batch),
                )
                continue
            output_files_paths.append(output_path)

        for jsonl_file_path in output_files_paths:
            try:
                new_assembly_accessions = handle_assemblies_from_jsonl_file(
                    jsonl_file_path
                )
            except Exception:
                logger.exception(
                    "handle_assemblies_from_jsonl_file failed for %s", jsonl_file_path
                )
                raise
            if not new_assembly_accessions:
                logger.warning("No new assemblies found for batch file %s", jsonl_file_path)
                continue
            saved_accessions.extend(new_assembly_accessions)

        if not saved_accessions:
            logger.warning(
                "import_assemblies_from_accessions: no assemblies saved from %s batches.",
                len(batches),
            )

        biosample_accessions = Assembly.objects(
            accession__in=saved_accessions
        ).scalar("sample_accession")
        saved_biosample_accessions = handle_biosamples_from_accessions(
            biosample_accessions, TMP_DIR
        )

        assembly_taxids = Assembly.objects(accession__in=saved_accessions).scalar(
            "taxid"
        )
        saved_organism_taxids = handle_full_taxonomy_from_taxids(
            assembly_taxids, TMP_DIR, fetch_tolid_prefixes_sync=False
        )

        reload_organisms_and_update_deps(saved_organism_taxids)
        removed = delete_rows_without_organism(Assembly, "accession", saved_accessions)
        if removed:
            logger.info(
                "Removed %s assembly/assemblies with no Organism after taxonomy import",
                removed,
            )
        surviving = surviving_taxids_after_cleanup(
            Assembly, "accession", saved_accessions
        )
        if surviving:
            sync_many_taxids(surviving)
        update_geolocations(saved_biosample_accessions)

        if saved_organism_taxids:
            fetch_tolid_prefixes_task.delay(list(saved_organism_taxids))

        logger.info(
            "Accession import finished: %s assemblies saved.", len(saved_accessions)
        )
        return {
            "batches": len(batches),
            "assemblies_saved": len(saved_accessions),
            "status": "ok",
        }
    except Exception:
        logger.exception("import_assemblies_from_accessions failed")
        raise
    finally:
        for path in temp_paths:
            _safe_remove(path)


## update chromosome list to assemblies
@shared_task(name="link_chromosomes", ignore_result=False)
def link_chromosomes() -> Dict[str, int]:
    linked = 0
    errors = 0
    assemblies_accession_list = Assembly.objects(chromosomes__size=0)
    for assembly in assemblies_accession_list:
        try:
            related_chromosomes = Chromosome.objects(
                metadata__assembly_accession=assembly.accession
            ).scalar("accession_version")
            if not related_chromosomes:
                continue
            assembly.chromosomes = related_chromosomes
            assembly.save()
            linked += 1
        except Exception:
            errors += 1
            logger.exception(
                "link_chromosomes: failed for assembly %s", getattr(assembly, "accession", "?")
            )
    if errors:
        logger.warning("link_chromosomes completed with %s error(s), %s linked.", errors, linked)
    else:
        logger.info("link_chromosomes: linked chromosomes for %s assemblies.", linked)
    return {"linked": linked, "errors": errors}


@shared_task(name="assemblies_blob_link", ignore_result=False)
def add_blob_link() -> Dict[str, int]:
    updated = 0
    errors = 0
    assemblies_accession_list = Assembly.objects(blobtoolkit_id=None).scalar("accession")
    for acc in assemblies_accession_list:
        try:
            response = get_blobtoolkit_id(acc)
            first = response[0] if response else None
            names = first.get("names") if isinstance(first, dict) else None
            if not names:
                continue
            ass = Assembly.objects(accession=acc).first()
            if ass is None:
                logger.warning("add_blob_link: assembly %s not found in DB", acc)
                continue
            ass.blobtoolkit_id = names[0]
            ass.save()
            updated += 1
        except Exception:
            errors += 1
            logger.exception("add_blob_link: failed for accession %s", acc)
    if errors:
        logger.warning(
            "add_blob_link completed with %s error(s), %s updated.", errors, updated
        )
    else:
        logger.info("add_blob_link: set blobtoolkit_id for %s assemblies.", updated)
    return {"updated": updated, "errors": errors}

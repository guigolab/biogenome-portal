from db.model import BioSample
from clients import ebi_client
from helpers.rest_catalog_sync import sync_species_after_catalog_change
from parsers import biosample
from helpers import geolocation, data as data_helper, organism as organism_helper


def handle_biosample(accession, save_related_organism=False):
    """
    Fetch a BioSample from BioSamples API when missing locally.

    When ``save_related_organism`` is True (direct biosample create from the biosamples service),
    ensure the organism exists, denormalize ``taxon_lineage`` onto the sample, persist it, and
    sync species denorm. When False (e.g. assembly/read import), skip organism handling and
    sync; still persist the new sample and run geolocation side effects.
    """
    biosample_obj = BioSample.objects(accession=accession).first()
    if biosample_obj:
        return biosample_obj

    biosample_response = ebi_client.get_sample_from_biosamples(accession)
    if not biosample_response:
        return None

    biosample_obj = biosample.parse_biosample_from_ebi_data(biosample_response)
    if not biosample_obj:
        return None

    if save_related_organism:
        organism = organism_helper.handle_organism(biosample_obj.taxid)
        if organism:
            data_helper.update_lineage(biosample_obj, organism, skip_sync=True)
            biosample_obj.save()
            sync_species_after_catalog_change(
                str(biosample_obj.taxid), biosample_obj.taxon_lineage
            )

    geolocation.save_coordinates(biosample_obj)
    geolocation.update_countries_from_biosample(biosample_obj, biosample_obj.accession)

    if not save_related_organism:
        biosample_obj.save()

    return biosample_obj

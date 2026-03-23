"""ToLID prefix lookup for import jobs (rate-limited NCBI/ToL client calls)."""

from __future__ import annotations

import time

from clients import tolid_client
from db.model import Organism
from helpers.data import create_batches

# Keep in sync with ``jobs.support.organism_catalog_guard.TAXID_LIST_LIMIT``
# (also re-exported from ``organism_catalog_sync``).
TAXID_LIST_LIMIT = 5000


def fetch_tolid_prefixes(taxids):
    batches = create_batches(taxids, TAXID_LIST_LIMIT)
    for batch in batches:
        counter = 0
        for taxid in batch:
            tolid_prefix = tolid_client.get_tolid(taxid)
            if tolid_prefix:
                Organism.objects(taxid=taxid).update(tolid_prefix=tolid_prefix)
            counter += 1
            if counter == 3:
                time.sleep(1)
                counter = 0

import asyncio
import csv
import re
from typing import Dict, List, Optional, Tuple

import aiohttp
from clients import ncbi_client
from parsers import chromosome
from db.models import Assembly, Chromosome
from helpers.taxon_organism_sync import sync_many_taxids
import json


NCBI_HTTP_BASE = "https://ftp.ncbi.nlm.nih.gov"
NCBI_GENOMES_ALL = "/genomes/all"


def _ncbi_ftp_path_from_accession(accession):
    """
    Build the NCBI directory path for an assembly accession (used for HTTP URLs).
    Accession format: GCA_000001405.29 or GCF_000001405.29
    Path format: /genomes/all/GCA/000/000/001/ (3 groups of 3 digits from the 9-digit part).
    """
    if not accession or not re.match(r"^(GCA|GCF)_\d+(\.\d+)?$", accession, re.IGNORECASE):
        return None
    parts = accession.upper().split("_", 1)
    prefix = parts[0]  # GCA or GCF
    rest = parts[1].split(".")[0]  # numeric part without version
    digits = rest.zfill(9)[:9]  # 9 digits, zero-padded
    if len(digits) != 9 or not digits.isdigit():
        return None
    d1, d2, d3 = digits[0:3], digits[3:6], digits[6:9]
    return f"{NCBI_GENOMES_ALL}/{prefix}/{d1}/{d2}/{d3}"


async def _scrape_ftp_directory_listing(session: aiohttp.ClientSession, url: str) -> List[str]:
    """
    Fetch FTP directory listing (HTML) and return list of subdirectory names
    (links ending with /, excluding . and ..).
    """
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            resp.raise_for_status()
            content = await resp.text()
    except Exception:
        return []
    # Match href=".../" - directory links (relative or with path)
    dirs = re.findall(r'href="([^"]+/)"', content)
    result = []
    for d in dirs:
        name = d.rstrip("/").split("/")[-1]
        if name and name not in (".", ".."):
            result.append(name)
    return result


def _scrape_ftp_file_listing(content: str) -> List[str]:
    """
    Parse FTP directory listing HTML and return list of file names
    (links not ending with /, excluding . and ..).
    """
    # Match href="...something" without trailing /
    all_links = re.findall(r'href="([^"]+)"', content)
    result = []
    for link in all_links:
        if link.endswith("/"):
            continue
        name = link.rstrip("/").split("/")[-1]
        if name and name not in (".", ".."):
            result.append(name)
    return result


async def get_assembly_report_url(session: aiohttp.ClientSession, assembly_accession: str) -> Optional[str]:
    """
    Given an assembly accession, scrape NCBI HTTP directory listings to find the
    matching assembly directory and the _assembly_report.txt file; return its full URL.

    Returns the URL as a string, or None if not found or on error.
    """
    base_path = _ncbi_ftp_path_from_accession(assembly_accession)
    if not base_path:
        return None
    base_url = f"{NCBI_HTTP_BASE}{base_path}"
    if not base_url.endswith("/"):
        base_url += "/"
    dir_names = await _scrape_ftp_directory_listing(session, base_url)
    if not dir_names:
        return None
    acc_upper = assembly_accession.upper()
    acc_with_underscore = acc_upper.replace(".", "_")
    candidates = [
        n for n in dir_names
        if n.upper().startswith(acc_upper) or n.upper().startswith(acc_with_underscore)
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda n: (not n.upper().startswith(acc_upper), n))
    assembly_dir = candidates[0]
    assembly_url = f"{base_url}{assembly_dir}"
    if not assembly_url.endswith("/"):
        assembly_url += "/"
    try:
        async with session.get(assembly_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            resp.raise_for_status()
            content = await resp.text()
    except Exception:
        return None
    files = _scrape_ftp_file_listing(content)
    report_name = next((f for f in files if f.endswith("_assembly_report.txt")), None)
    if not report_name:
        return None
    return f"{assembly_url}{report_name}"


async def fetch_assembly_report(assembly_accession: str) -> Optional[str]:
    """
    Given an assembly accession (e.g. GCA_000001405.29), resolve the assembly_report URL via HTTP
    directory listings, fetch the file, and return its contents as a string.

    Returns the report text, or None if not found or on error.
    """
    async with aiohttp.ClientSession() as session:
        report_url = await get_assembly_report_url(session, assembly_accession)
        if not report_url:
            return None
        try:
            async with session.get(report_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                resp.raise_for_status()
                return await resp.text()
        except Exception:
            return None


def fetch_assembly_report_sync(assembly_accession: str) -> Optional[str]:
    """Synchronous wrapper for fetch_assembly_report. Use this from Flask (sync) views."""
    return asyncio.run(fetch_assembly_report(assembly_accession))


# Limit concurrent connections to NCBI to avoid overloading the server
NCBI_CONCURRENT_CONNECTIONS = 10
NCBI_BATCH_DELAY_SECONDS = 1.0


async def get_assembly_report_urls(
    accessions: List[str],
    batch_size: int = 100,
) -> List[Tuple[str, str]]:
    """
    Given a list of assembly accessions, resolve assembly_report URLs concurrently in batches.
    Uses a single session with limited concurrency and a short delay between batches to be
    respectful to the NCBI FTP server.

    Returns a list of (accession, url) pairs for successfully resolved report URLs.
    """
    if not accessions:
        return []
    # Use a connector that limits concurrent connections per host
    connector = aiohttp.TCPConnector(
        limit=min(batch_size, NCBI_CONCURRENT_CONNECTIONS),
        limit_per_host=NCBI_CONCURRENT_CONNECTIONS,
    )
    results: List[Optional[str]] = [None] * len(accessions)
    async with aiohttp.ClientSession(connector=connector) as session:
        for i in range(0, len(accessions), batch_size):
            batch = accessions[i : i + batch_size]
            batch_results = await asyncio.gather(
                *[get_assembly_report_url(session, acc) for acc in batch],
                return_exceptions=True,
            )
            for j, value in enumerate(batch_results):
                if isinstance(value, Exception):
                    continue
                if value is not None:
                    results[i + j] = value
            if i + batch_size < len(accessions):
                await asyncio.sleep(NCBI_BATCH_DELAY_SECONDS)
    return [(accessions[i], results[i]) for i in range(len(accessions)) if results[i] is not None]


def get_assembly_report_urls_sync(
    accessions: List[str], batch_size: int = 100
) -> List[Tuple[str, str]]:
    """Synchronous wrapper for get_assembly_report_urls. Returns list of (accession, url) pairs."""
    return asyncio.run(get_assembly_report_urls(accessions, batch_size=batch_size))


# Assembly report TSV: header has Sequence-Role, GenBank-Accn; chromosomes have Role "assembled-molecule"
_ASSEMBLY_REPORT_ROLE_COL = "Sequence-Role"
_ASSEMBLY_REPORT_ACCN_COL_GENBANK = "GenBank-Accn"
_ASSEMBLY_REPORT_ACCN_COL_REFSEQ = "RefSeq-Accn"
_CHROMOSOME_ROLE = "assembled-molecule"

async def _stream_report_lines(session: aiohttp.ClientSession, report_url: str):
    """Stream the report URL and yield decoded lines (without loading the full body)."""
    async with session.get(report_url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
        resp.raise_for_status()
        buffer = ""
        async for chunk in resp.content.iter_chunked(8192):
            buffer += chunk.decode("utf-8", errors="replace")
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                yield line


async def stream_assembly_report_chromosomes(assembly_accession: str) -> List[Chromosome]:
    """
    Resolve the assembly report URL, stream the report from NCBI, parse it line-by-line,
    and return only the chromosomes (rows with Sequence-Role == assembled-molecule).
    The report is streamed and not loaded fully into memory.
    """
    result: List[Chromosome] = []
    is_refseq = assembly_accession.startswith('GCF_')
    accn_col = _ASSEMBLY_REPORT_ACCN_COL_REFSEQ if is_refseq else _ASSEMBLY_REPORT_ACCN_COL_GENBANK
    async with aiohttp.ClientSession() as session:
        report_url = await get_assembly_report_url(session, assembly_accession)
        if not report_url:
            return result
        line_iter = _stream_report_lines(session, report_url)
        header = None
        role_idx = accn_idx = 0
        async for line in line_iter:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = next(csv.reader([line], delimiter="\t"), [])
            if header is None:
                header = parts
                try:
                    role_idx = header.index(_ASSEMBLY_REPORT_ROLE_COL)
                    accn_idx = header.index(accn_col)
                    #convert keys to lowercase and remove spaces
                    header = [k.lower().replace("-", "_") for k in header]
                except ValueError:
                    break
                continue
            if len(parts) <= max(role_idx, accn_idx):
                continue
            if parts[role_idx] != _CHROMOSOME_ROLE:
                continue
            accn = parts[accn_idx].strip() if accn_idx < len(parts) else None
            if not accn:
                continue
            metadata = dict(zip(header, parts)) if header else {}
            metadata.pop(accn_col, None)
            result.append(Chromosome(accession_version=accn, metadata=metadata))
    return result


def stream_assembly_report_chromosomes_sync(assembly_accession: str) -> List[Chromosome]:
    """Synchronous wrapper. Use from Flask (sync) views."""
    return asyncio.run(stream_assembly_report_chromosomes(assembly_accession))


async def _fetch_chromosomes_from_report_url(
    session: aiohttp.ClientSession, assembly_accession: str, report_url: str
) -> List[Chromosome]:
    """
    Stream assembly report from URL, parse chromosomes (assembled-molecule rows),
    set metadata.assembly_accession on each, and return the list.
    """
    chromosomes: List[Chromosome] = []
    header = None
    role_idx = accn_idx = 0
    async for line in _stream_report_lines(session, report_url):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = next(csv.reader([line], delimiter="\t"), [])
        if header is None:
            header = parts
            try:
                role_idx = header.index(_ASSEMBLY_REPORT_ROLE_COL)
                accn_idx = header.index(_ASSEMBLY_REPORT_ACCN_COL)
            except ValueError:
                break
            continue
        if len(parts) <= max(role_idx, accn_idx):
            continue
        if parts[role_idx] != _CHROMOSOME_ROLE:
            continue
        accn = parts[accn_idx].strip() if accn_idx < len(parts) else None
        if not accn:
            continue
        metadata = dict(zip(header, parts)) if header else {}
        metadata.pop(_ASSEMBLY_REPORT_ACCN_COL, None)
        metadata["assembly_accession"] = assembly_accession
        chromosomes.append(Chromosome(accession_version=accn, metadata=metadata))
    return chromosomes


async def fetch_chromosomes_for_assemblies_bulk(
    accessions: List[str], batch_size: int = 50
) -> Dict[str, List[Chromosome]]:
    """
    Resolve assembly report URLs for all accessions, then fetch and parse reports
    concurrently. Returns a dict mapping assembly accession to list of Chromosome instances.
    """
    if not accessions:
        return {}
    url_pairs = await get_assembly_report_urls(accessions, batch_size=batch_size)
    if not url_pairs:
        return {}
    connector = aiohttp.TCPConnector(
        limit=min(len(url_pairs), NCBI_CONCURRENT_CONNECTIONS),
        limit_per_host=NCBI_CONCURRENT_CONNECTIONS,
    )
    result: Dict[str, List[Chromosome]] = {}
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [
            _fetch_chromosomes_from_report_url(session, acc, url)
            for acc, url in url_pairs
        ]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        for (acc, _), value in zip(url_pairs, batch_results):
            if isinstance(value, Exception):
                continue
            result[acc] = value
    return result


def fetch_chromosomes_for_assemblies_bulk_sync(
    accessions: List[str], batch_size: int = 50
) -> Dict[str, List[Chromosome]]:
    """Synchronous wrapper for fetch_chromosomes_for_assemblies_bulk."""
    return asyncio.run(fetch_chromosomes_for_assemblies_bulk(accessions, batch_size=batch_size))


def save_chromosomes_bulk_and_update_assemblies(accessions: List[str]) -> None:
    """
    Fetch chromosomes from NCBI assembly reports in bulk for the given assembly accessions,
    save chromosome documents, and update each assembly's chromosomes list.
    """
    if not accessions:
        return
    chroms_by_assembly = fetch_chromosomes_for_assemblies_bulk_sync(accessions)
    all_versions = set()
    for chroms in chroms_by_assembly.values():
        for c in chroms:
            all_versions.add(c.accession_version)
    existing_versions = set(
        Chromosome.objects(accession_version__in=all_versions).scalar("accession_version")
    )
    for acc, chroms in chroms_by_assembly.items():
        Chromosome.objects(metadata__assembly_accession=acc).delete()
        to_insert = [c for c in chroms if c.accession_version not in existing_versions]
        if to_insert:
            Chromosome.objects.insert(to_insert)
            for c in to_insert:
                existing_versions.add(c.accession_version)
        chromosome_list = [c.accession_version for c in chroms]
        Assembly.objects(accession=acc).update(chromosomes=chromosome_list)


def save_chromosomes(assembly_obj):
    accession = assembly_obj.accession
    sequences_args = ['genome', 'accession', accession, '--report', 'sequence', '--assembly-level', 'chromosome,complete']
    sequence_report = ncbi_client.get_data_from_ncbi(sequences_args)
    if sequence_report and sequence_report.get('reports'):
        print(f"Found a total of {len(sequence_report.get('reports'))} sequences")

        chromosomes_to_save = chromosome.parse_chromosomes_from_ncbi_datasets(sequence_report.get('reports'))

        print(f"Found a total of {len(chromosomes_to_save)} chromosomes")

        if chromosomes_to_save:
            existing_chromosomes = Chromosome.objects(accession_version__in=[chr.accession_version for chr in chromosomes_to_save]).scalar('accession_version')
            new_chromosomes = [chr for chr in chromosomes_to_save if chr.accession_version and chr.accession_version not in existing_chromosomes]
            if new_chromosomes:
                print(f"Saving a total of {len(new_chromosomes)} chromosomes")
                Chromosome.objects.insert(new_chromosomes)
            assembly_obj.chromosomes = [chr.accession_version for chr in chromosomes_to_save]
    else:
        print(f"Chromosomes not found for {accession}")


def save_chromosomes_from_stream(assembly_obj):
    accession = assembly_obj.accession
    #if level is not complete or chromosomes we skip it
    if assembly_obj.metadata.get('assembly_info', {}).get('assembly_level') not in ['Complete Genome', 'Chromosome']:
        return
    try:
        sequences_args = ['genome', 'accession', accession, '--report', 'sequence','--as-json-lines']
        sequence_report = ncbi_client.stream_data_from_ncbi(sequences_args)
        if not sequence_report:
            return
        for line in sequence_report.splitlines():
            parsed_chromosome = chromosome.parse_chromosome_from_json_line(line)
            if parsed_chromosome:
                Chromosome.objects.insert(parsed_chromosome)
                assembly_obj.chromosomes.append(parsed_chromosome.accession_version)
    except Exception as e:
        print(e)
        return


def handle_assemblies_from_jsonl_file(jsonl_file_path: str) -> None:
    """
    Handle assemblies from a JSONL file.
    STEPS:
    1. Retrieve existing assemblies
    2. Update existing assemblies
    3. Save new assemblies
    4. Save chromosomes for new assemblies
    Returns the list of new assembly accessions
    """
    existing_accessions = Assembly.objects().scalar('accession')
    assemblies_to_update = dict() #accession: assembly metadata dictionary
    new_assemblies_to_save = []
    with open(jsonl_file_path, 'r') as f:
        for line in f:
            assembly = json.loads(line)
            if assembly.get('accession') in existing_accessions:
                assemblies_to_update[assembly.get('accession')] = assembly.get('metadata')
            else:
                new_assemblies_to_save.append(assembly)
    if new_assemblies_to_save:
        Assembly.objects.insert(new_assemblies_to_save)
        sync_many_taxids(a.get("taxid") for a in new_assemblies_to_save)
    for accession, metadata in assemblies_to_update.items():
        Assembly.objects(accession=accession).update(metadata=metadata)
    new_assembly_accessions = [a.accession for a in new_assemblies_to_save]
    if new_assembly_accessions:
        save_chromosomes_bulk_and_update_assemblies(new_assembly_accessions)
    
    return new_assembly_accessions
import asyncio
import re
from typing import List, Optional, Tuple

import aiohttp

NCBI_HTTP_BASE = "https://ftp.ncbi.nlm.nih.gov"
NCBI_GENOMES_ALL = "/genomes/all"

NCBI_CONCURRENT_CONNECTIONS = 10
NCBI_BATCH_DELAY_SECONDS = 1.0


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
    all_links = re.findall(r'href="([^"]+)"', content)
    result = []
    for link in all_links:
        if link.endswith("/"):
            continue
        name = link.rstrip("/").split("/")[-1]
        if name and name not in (".", ".."):
            result.append(name)
    return result


async def get_assembly_report_url(
    session: aiohttp.ClientSession, assembly_accession: str
) -> Optional[str]:
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


def normalize_assembly_report_tsv_line(line: str) -> Optional[str]:
    """
    NCBI *_assembly_report.txt mixes comment lines with tab-separated tables. Section
    headers and the sequence table header often start with ``#`` or ``##``; data rows do not.
    Returns the line with comment prefixes stripped, or None if the line is not a TSV row
    (e.g. ``# Assembly name: ...`` with no tabs).
    """
    line = line.strip()
    if not line or "\t" not in line:
        return None
    while line.startswith("#"):
        line = line[1:].lstrip()
    return line or None


async def stream_report_lines(session: aiohttp.ClientSession, report_url: str):
    """Stream the report URL and yield decoded lines (without loading the full body)."""
    async with session.get(report_url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
        resp.raise_for_status()
        buffer = ""
        async for chunk in resp.content.iter_chunked(8192):
            buffer += chunk.decode("utf-8", errors="replace")
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                yield line

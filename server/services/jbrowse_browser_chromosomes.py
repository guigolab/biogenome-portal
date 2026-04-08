"""
JBrowse / genome-browser chromosome naming and sort order.

Mirrors front/lib/genome-browser/chrLabels.ts sort/ref-name rules so the API
is the single source of truth for jbrowse_ref_name and display order.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

GROUP_NUMERIC = 0
GROUP_SEX = 1
GROUP_OTHER = 2
GROUP_ORGANELLE = 3


def _str_val(v: Any) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def _accession_compare_norm(s: str) -> str:
    """Compare INSDC accessions ignoring punctuation/spaces/case (GCA_1.2 ≈ GCA_1_2)."""
    return re.sub(r"[^A-Za-z0-9]", "", s).upper()


def _accessions_equivalent(a: str, b: str) -> bool:
    if not a or not b:
        return False
    return _accession_compare_norm(a) == _accession_compare_norm(b)


def strip_assembly_qualifier_from_ref_name(ref: str, assembly_accession: str) -> str:
    """
    Remove a leading assembly accession from a sequence id so RefGet / GFF / UI agree.

    Handles:
    - ``GCA_…#chr1`` (NCBI combined) — also when the left side matches assembly only after
      normalizing underscores (and when ``#`` splits ``accession#contig`` but prefix match failed
      because metadata used a different accession variant than ``assembly_accession``).
    - ``GCA_…|chr1``, ``GCA_….chr1``, etc.
    """
    r = ref.strip()
    a = assembly_accession.strip()
    if not r or not a:
        return r
    variants = {a, a.upper(), a.lower()}
    no_u = a.replace("_", "")
    if no_u != a:
        variants.update({no_u, no_u.upper(), no_u.lower()})
    for v in variants:
        if not v:
            continue
        for sep in ("#", "|", ":", ".", "_", " "):
            prefix = f"{v}{sep}"
            if r.startswith(prefix):
                rest = r[len(prefix) :].strip()
                if rest:
                    return rest
    # ``accession#contig`` where left token matches assembly only after normalization
    if "#" in r:
        left, _, right = r.partition("#")
        left = left.strip()
        right = right.strip()
        if right and _accessions_equivalent(left, a):
            return right
    return r


def chromosome_sequence_length_bp(metadata: Optional[Dict[str, Any]]) -> int:
    m = metadata or {}
    raw = (
        m.get("Sequence-Length")
        or m.get("sequence_length")
        or m.get("sequence-length")
        or m.get("length")
    )
    try:
        n = float(raw)
        if n > 0 and n == int(n):
            return int(n)
    except (TypeError, ValueError):
        pass
    return 0


def primary_chromosome_label(metadata: Optional[Dict[str, Any]], accession_version: str) -> str:
    m = metadata or {}
    return (
        _str_val(m.get("Assigned-Molecule"))
        or _str_val(m.get("assigned_molecule"))
        or _str_val(m.get("chr_name"))
        or _str_val(m.get("Sequence-Name"))
        or _str_val(m.get("sequence_name"))
        or _str_val(m.get("ucsc_style_name"))
        or _str_val(m.get("UCSC-style-name"))
        or _str_val(m.get("name"))
        or accession_version
    )


def chromosome_ref_name_for_jbrowse(
    metadata: Optional[Dict[str, Any]],
    accession_version: str,
    assembly_accession: Optional[str] = None,
) -> str:
    m = metadata or {}
    ref = (
        _str_val(m.get("Assigned-Molecule"))
        or _str_val(m.get("assigned_molecule"))
        or _str_val(m.get("Sequence-Name"))
        or _str_val(m.get("sequence_name"))
        or _str_val(m.get("UCSC-style-name"))
        or _str_val(m.get("ucsc_style_name"))
        or _str_val(m.get("RefSeq-Accn"))
        or _str_val(m.get("refseq_accn"))
        or _str_val(m.get("chr_name"))

        or accession_version
    )
    if assembly_accession:
        ref = strip_assembly_qualifier_from_ref_name(ref, assembly_accession)
    return ref


def _norm(s: Any) -> str:
    if s is None:
        return ""
    return str(s).strip()


def _blob_for_row(
    metadata: Dict[str, Any],
    accession_version: str,
    assembly_accession: Optional[str],
) -> str:
    m = metadata or {}
    parts = [
        chromosome_ref_name_for_jbrowse(m, accession_version, assembly_accession),
        _norm(m.get("Assigned-Molecule")),
        _norm(m.get("assigned_molecule")),
        _norm(m.get("Sequence-Name")),
        _norm(m.get("sequence_name")),
        _norm(m.get("UCSC-style-name")),
        _norm(m.get("ucsc_style_name")),
    ]
    return "\0".join(p for p in parts if p).lower()


def _is_organelle(blob: str) -> bool:
    if any(
        x in blob
        for x in (
            "mitochond",
            "chloroplast",
            "plastid",
            "apicoplast",
            "kinetoplast",
            "organelle",
        )
    ):
        return True
    for part in blob.split("\0"):
        p = part.strip().lower()
        if not p:
            continue
        if p in (
            "mt",
            "chrm",
            "chrmt",
            "mito",
            "pt",
            "pltd",
        ) or p.startswith("chloroplast") or p.startswith("mitochond"):
            return True
    return False


def _parse_sex_chromosome(s: str) -> Optional[int]:
    t = s.strip()
    if not t:
        return None
    u = t.upper().replace("_", "")
    candidates = [u, re.sub(r"^CHR", "", u), re.sub(r"^CHROMOSOME", "", u)]
    for c in candidates:
        if c in ("X", "CHRX"):
            return 1000
        if c in ("Y", "CHRY"):
            return 1001
        if c in ("W", "CHRW"):
            return 1002
        if c in ("Z", "CHRZ"):
            return 1003
    if re.match(r"^CHR\.?X(\b|$)", t, re.I):
        return 1000
    if re.match(r"^CHR\.?Y(\b|$)", t, re.I):
        return 1001
    if re.match(r"^CHR\.?W(\b|$)", t, re.I):
        return 1002
    if re.match(r"^CHR\.?Z(\b|$)", t, re.I):
        return 1003
    return None


def _sex_key_from_strings(*parts: str) -> Optional[int]:
    for p in parts:
        if not p:
            continue
        k = _parse_sex_chromosome(p)
        if k is not None:
            return k
    return None


def _parse_numeric_chromosome(s: str) -> Optional[int]:
    t = s.strip()
    if not t:
        return None
    if re.fullmatch(r"\d+", t):
        return int(t)
    m = re.search(r"(?:^|chromosome|chr)[_\- ]?(\d{1,4})(?:\b|\.)", t, re.I)
    if m:
        return int(m.group(1))
    m = re.search(r"SUPER[_\-]?(\d{1,4})\b", t, re.I)
    if m:
        return int(m.group(1))
    m = re.fullmatch(r"LG[_\-]?(\d{1,4})", t, re.I)
    if m:
        return int(m.group(1))
    return None


def _numeric_key_from_strings(*parts: str) -> Optional[int]:
    keys = []
    for p in parts:
        if not p:
            continue
        n = _parse_numeric_chromosome(p)
        if n is not None:
            keys.append(n)
    return min(keys) if keys else None


def _natural_sort_key(label: str) -> List[Any]:
    """Approximate JS localeCompare(..., { numeric: true })."""
    parts = re.split(r"(\d+)", label.lower())
    out: List[Any] = []
    for p in parts:
        if p == "":
            continue
        if p.isdigit():
            out.append(int(p))
        else:
            out.append(p)
    return out


def chromosome_sort_tuple(
    metadata: Dict[str, Any],
    accession_version: str,
    assembly_accession: Optional[str],
) -> Tuple[int, int, List[Any]]:
    m = metadata or {}
    ref = chromosome_ref_name_for_jbrowse(m, accession_version, assembly_accession)
    assigned = _norm(m.get("Assigned-Molecule")) or _norm(m.get("assigned_molecule"))
    seq = _norm(m.get("Sequence-Name")) or _norm(m.get("sequence_name"))
    blob = _blob_for_row(m, accession_version, assembly_accession)

    if _is_organelle(blob):
        return (GROUP_ORGANELLE, 0, _natural_sort_key(ref))

    sex = _sex_key_from_strings(assigned, ref, seq) or _sex_key_from_strings(
        primary_chromosome_label(m, accession_version)
    )
    if sex is not None:
        return (GROUP_SEX, sex, _natural_sort_key(ref))

    num = _numeric_key_from_strings(assigned, ref, seq)
    if num is not None:
        return (GROUP_NUMERIC, num, _natural_sort_key(ref))

    return (GROUP_OTHER, 0, _natural_sort_key(ref))


def map_chromosome_documents_for_browser(
    chromosomes: List[Any],
    assembly_accession: str,
) -> List[Dict[str, Any]]:
    """
    Build sorted browser rows: accession_version, metadata, jbrowse_ref_name, length_bp.
    `chromosomes` are mongoengine Chromosome docs with .accession_version and .metadata.
    """
    rows: List[Dict[str, Any]] = []
    for c in chromosomes:
        av = getattr(c, "accession_version", None) or ""
        av = str(av)
        meta = getattr(c, "metadata", None) or {}
        if not isinstance(meta, dict):
            meta = {}
        meta_copy = dict(meta)
        jref = chromosome_ref_name_for_jbrowse(meta_copy, av, assembly_accession)
        length_bp = chromosome_sequence_length_bp(meta_copy)
        rows.append(
            {
                "accession_version": av,
                "metadata": meta_copy,
                "jbrowse_ref_name": jref,
                "length_bp": length_bp,
                "_sort": chromosome_sort_tuple(meta_copy, av, assembly_accession),
            }
        )
    rows.sort(key=lambda r: r["_sort"])
    for r in rows:
        del r["_sort"]
    return rows

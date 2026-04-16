"""
Regex for catalog date / sentinel string values (ENA collection date, first_public, release_date).

Used by date-histogram stats to restrict buckets to plausible ISO-like or sentinel literals.

Valid in Python ``re`` and MongoDB ``$regexMatch`` (PCRE-like).
"""

# ISO-like dates (single date or range after first segment) + ENA sentinel literals.
CATALOG_DATE_STRING_PATTERN = (
    r"^(?:"
    r"[12][0-9]{3}"
    r"(?:-(?:0[1-9]|1[0-2])"
    r"(?:-(?:0[1-9]|[12][0-9]|3[01])"
    r"(?:T[0-9]{2}:[0-9]{2}(?::[0-9]{2})?(?:Z|[+-][0-9]{1,2})?)?)?)?"
    r"(?:/"
    r"[0-9]{4}"
    r"(?:-[0-9]{2}"
    r"(?:-[0-9]{2}"
    r"(?:T[0-9]{2}:[0-9]{2}(?::[0-9]{2})?(?:Z|[+-][0-9]{1,2})?)?)?)?)?"
    r"|not applicable|not collected|not provided|restricted access"
    r"|missing: control sample|missing: sample group|missing: synthetic construct"
    r"|missing: lab stock|missing: third party data"
    r"|missing: data agreement established pre-2023|missing: endangered species"
    r"|missing: human-identifiable|missing"
    r")$"
)

# Date-histogram UI only: calendar ISO dates (optional time / optional second segment in ranges).
# Excludes ENA sentinels so the chart reflects parseable timelines only.
CATALOG_HISTOGRAM_ISO_DATE_PATTERN = (
    r"^[12][0-9]{3}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])"
    r"(?:T[0-9]{2}:[0-9]{2}(?::[0-9]{2})?(?:Z|[+-][0-9]{1,2})?)?"
    r"(?:/[12][0-9]{3}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])"
    r"(?:T[0-9]{2}:[0-9]{2}(?::[0-9]{2})?(?:Z|[+-][0-9]{1,2})?)?)?$"
)

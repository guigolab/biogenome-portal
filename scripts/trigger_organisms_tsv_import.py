#!/usr/bin/env python3
"""
Log in as an admin user (POST /api/login) and enqueue organism TSV import
(POST /api/cronjob/import/organisms_tsv) with a tab-separated file containing
a ``taxid`` column and optional metadata columns.

Requires a BioGenome admin account (role Admin).

Login JSON includes ``access_token``; this script sends
``Authorization: Bearer <token>`` so it works over **plain HTTP** (Secure
cookies are not sent by clients on ``http://``, which caused missing-cookie 401s).

If you rely on cookies only (browser), use HTTPS or set ``JWT_COOKIE_SECURE=false``
in development.

Examples:

  export API_BASE_URL=http://localhost:5000
  ./scripts/trigger_organisms_tsv_import.py --user admin --password "$DB_PASS" \\
    --tsv scripts/mock_organisms_import.tsv

  python3 scripts/trigger_organisms_tsv_import.py --help
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def main() -> int:
    p = argparse.ArgumentParser(description="Trigger organism TSV import cron job (admin).")
    p.add_argument(
        "--base-url",
        default=os.environ.get("API_BASE_URL", "http://localhost:5000").rstrip("/"),
        help="API origin (default: env API_BASE_URL or http://localhost:5000)",
    )
    p.add_argument("--user", "-u", required=True, help="Admin username")
    p.add_argument("--password", "-p", default=os.environ.get("API_PASSWORD", ""))
    p.add_argument(
        "--tsv",
        type=Path,
        required=True,
        help="Path to tab-separated file with a taxid column",
    )
    p.add_argument(
        "--iucn-force",
        action="store_true",
        help="Pass iucn_force=true into run_enrich_followup_for_taxids (IUCN fetch)",
    )
    p.add_argument(
        "--insecure",
        action="store_true",
        help="Disable TLS certificate verification (HTTPS dev only)",
    )
    args = p.parse_args()

    if not args.password:
        print("error: provide --password or set API_PASSWORD", file=sys.stderr)
        return 2

    try:
        import requests
    except ImportError:
        print("error: install requests (pip install requests)", file=sys.stderr)
        return 2

    if not args.tsv.is_file():
        print(f"error: TSV not found: {args.tsv}", file=sys.stderr)
        return 2

    session = requests.Session()
    verify = not args.insecure

    login_url = f"{args.base_url}/api/login"
    r = session.post(
        login_url,
        json={"name": args.user, "password": args.password},
        headers={"Content-Type": "application/json"},
        timeout=60,
        verify=verify,
    )
    if r.status_code != 200:
        print(
            f"login failed: HTTP {r.status_code}\n{r.text}",
            file=sys.stderr,
        )
        return 1

    try:
        login_body = r.json()
    except Exception:
        login_body = {}
    bearer = login_body.get("access_token")
    upload_headers: dict[str, str] = {}
    if bearer:
        upload_headers["Authorization"] = f"Bearer {bearer}"
    else:
        # Older API without access_token in body: cookies + CSRF (needs HTTPS or JWT_COOKIE_SECURE=false on HTTP).
        csrf = session.cookies.get("csrf_access_token")
        if csrf:
            upload_headers["X-CSRF-TOKEN"] = csrf
        else:
            print(
                "error: login response has no access_token and no csrf_access_token cookie; "
                "update the API (login JSON must include access_token) or use HTTPS / JWT_COOKIE_SECURE=false",
                file=sys.stderr,
            )
            return 1

    upload_url = f"{args.base_url}/api/cronjob/import/organisms_tsv"
    with open(args.tsv, "rb") as fh:
        files = {"file": (args.tsv.name, fh, "text/tab-separated-values")}
        data = {}
        if args.iucn_force:
            data["iucn_force"] = "true"
        r2 = session.post(
            upload_url,
            files=files,
            data=data,
            headers=upload_headers,
            timeout=120,
            verify=verify,
        )

    try:
        body = r2.json()
    except Exception:
        body = {"raw": r2.text}

    print(json.dumps(body, indent=2, default=str))
    if r2.status_code >= 400:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env bash
# prep-branding.sh — Stage a private branding directory into front/branding/
# before a Docker build or local `npm run bake-portal`.
#
# Usage:
#   scripts/prep-branding.sh <source-dir>
#
# <source-dir> must contain:
#   portal.json   — full or partial PortalConfig (copied as portal.config.json)
#   *.png / *.svg — logo files (copied as-is, filename preserved)
#   *.geojson     — optional map overlays (copied as-is)
#
# Example (CBP private config):
#   scripts/prep-branding.sh /home/emilior/bgp-configs/biogenome-portal-cbp
#
# After running this, either:
#   - docker compose build bgp_front   (DEV compose)
#   - npm run bake-portal              (local Next dev server)

set -euo pipefail

SRC="${1:-}"
if [[ -z "$SRC" ]]; then
  echo "Usage: $0 <source-dir>" >&2
  exit 1
fi

if [[ ! -d "$SRC" ]]; then
  echo "Error: source directory not found: $SRC" >&2
  exit 1
fi

DEST="$(cd "$(dirname "$0")/.." && pwd)/front/branding"
mkdir -p "$DEST"

# Copy portal.json → portal.config.json (bake-portal.mjs merge target)
if [[ -f "$SRC/portal.json" ]]; then
  cp "$SRC/portal.json" "$DEST/portal.config.json"
  echo "Copied portal.json → front/branding/portal.config.json"
fi

# Copy all image and geojson assets (preserve filenames so portal.json logoUrl refs stay valid)
shopt -s nullglob
for file in "$SRC"/*.png "$SRC"/*.svg "$SRC"/*.webp "$SRC"/*.jpg "$SRC"/*.geojson; do
  cp "$file" "$DEST/"
  echo "Copied $(basename "$file") → front/branding/$(basename "$file")"
done
shopt -u nullglob

echo ""
echo "Branding staged in front/branding/. Now run:"
echo "  docker compose -f docker-compose-DEV.yml build bgp_front"
echo "or for local dev:"
echo "  cd front && npm run bake-portal && npm run dev"

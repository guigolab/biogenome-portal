#!/bin/sh
set -e
# Run before 20-envsubst-on-templates.sh. Pick root vs subpath from BASE_PATH:
#   unset or empty or "/"  → root (/)
#   e.g. /bgp             → subpath
case "${BASE_PATH:-}" in
  ''|/)
    cp /etc/nginx/available/root.conf.envtpl /etc/nginx/templates/default.conf.template
    ;;
  *)
    cp /etc/nginx/available/subpath.conf.envtpl /etc/nginx/templates/default.conf.template
    ;;
esac

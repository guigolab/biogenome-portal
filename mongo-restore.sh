#! /bin/bash
set -e

mongorestore --gzip --archive=./db-dump/${DB_DUMP} --db=${DB_NAME}
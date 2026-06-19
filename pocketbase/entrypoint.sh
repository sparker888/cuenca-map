#!/bin/sh
set -e

DATA_DIR="/pb/pb_data"

# Idempotently ensure the superuser exists from server-side secrets.
# These come from fly secrets (PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD) and live
# ONLY on the backend — never in client/Netlify config.
if [ -n "$PB_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  /pb/pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir "$DATA_DIR" || true
fi

exec /pb/pocketbase serve --http=0.0.0.0:8080 --dir "$DATA_DIR"

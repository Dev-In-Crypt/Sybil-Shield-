#!/usr/bin/env bash
# Restore drill: proves a pg_dump produced in backup.sh's format can actually
# be restored, not just that backup.sh runs without error.
#
# SAFETY: restores into a brand-new, THROWAWAY Postgres container (a fresh
# `docker run`, not the dev-stack's `postgres` service) that is removed on
# exit no matter what. Never touches any real/persistent database.
#
# Usage:
#   scripts/restore-drill.sh                  # generate a dump from the
#                                              # local dev stack's `postgres`
#                                              # service (docker compose up
#                                              # postgres must be running)
#                                              # and drill it
#   scripts/restore-drill.sh path/to/dump.sql.gz   # drill an existing dump
#
# Exits non-zero (and prints the psql log) if the restore or the row-count
# sanity check fails.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRILL_CONTAINER="sybilshield-restore-drill-$$"
DRILL_DB=sybilshield
DRILL_USER=sybilshield
DRILL_PASSWORD=sybilshield-drill-only
PSQL_LOG="$(mktemp)"
GENERATED_DUMP=""

cleanup() {
  docker rm -f "$DRILL_CONTAINER" >/dev/null 2>&1 || true
  [ -n "$GENERATED_DUMP" ] && rm -f "$GENERATED_DUMP"
  rm -f "$PSQL_LOG"
}
trap cleanup EXIT

DUMP_PATH="${1:-}"
if [ -z "$DUMP_PATH" ]; then
  echo "[restore-drill] no dump given -- generating one from the local dev stack's postgres service (same command as backup.sh)"
  GENERATED_DUMP="$(mktemp).sql.gz"
  ( cd "$PROJECT_DIR" && docker compose exec -T postgres \
      pg_dump -U sybilshield sybilshield ) | gzip -9 > "$GENERATED_DUMP"
  DUMP_PATH="$GENERATED_DUMP"
fi

if [ ! -s "$DUMP_PATH" ]; then
  echo "ERROR: dump file missing or empty: $DUMP_PATH" >&2
  exit 2
fi
DUMP_BYTES=$(wc -c < "$DUMP_PATH" | tr -d ' ')
echo "[restore-drill] using dump: $DUMP_PATH ($DUMP_BYTES bytes)"

echo "[restore-drill] starting a throwaway Postgres container ($DRILL_CONTAINER)..."
docker run -d --name "$DRILL_CONTAINER" \
  -e POSTGRES_USER="$DRILL_USER" -e POSTGRES_PASSWORD="$DRILL_PASSWORD" -e POSTGRES_DB="$DRILL_DB" \
  postgres:16-alpine >/dev/null

echo -n "[restore-drill] waiting for it to accept connections"
READY=0
for _ in $(seq 1 30); do
  if docker exec "$DRILL_CONTAINER" pg_isready -U "$DRILL_USER" -d "$DRILL_DB" >/dev/null 2>&1; then
    READY=1
    break
  fi
  echo -n "."
  sleep 1
done
echo
if [ "$READY" -ne 1 ]; then
  echo "ERROR: throwaway container never became ready" >&2
  exit 3
fi

echo "[restore-drill] restoring..."
if ! gunzip -c "$DUMP_PATH" | docker exec -i "$DRILL_CONTAINER" psql -U "$DRILL_USER" -d "$DRILL_DB" -v ON_ERROR_STOP=1 >"$PSQL_LOG" 2>&1; then
  echo "ERROR: restore failed -- last 40 lines of psql output:" >&2
  tail -40 "$PSQL_LOG" >&2
  exit 4
fi

echo "[restore-drill] restore completed, checking row counts..."
CUSTOMERS=$(docker exec "$DRILL_CONTAINER" psql -U "$DRILL_USER" -d "$DRILL_DB" -tAc "SELECT count(*) FROM customers;")
ANALYSES=$(docker exec "$DRILL_CONTAINER" psql -U "$DRILL_USER" -d "$DRILL_DB" -tAc "SELECT count(*) FROM analyses;")
echo "  customers: $CUSTOMERS"
echo "  analyses:  $ANALYSES"

if [ "$CUSTOMERS" -lt 1 ]; then
  echo "ERROR: restored customers table is empty -- restore is decorative" >&2
  exit 5
fi

echo "[restore-drill] PASS -- backup format is genuinely restorable."

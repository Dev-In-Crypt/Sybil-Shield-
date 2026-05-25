#!/usr/bin/env bash
# Daily Postgres backup with local retention + optional off-site B2 sync.
#
# Cron: 0 3 * * *  /home/sybil/sybilshield/scripts/backup.sh >> /home/sybil/sybilshield/logs/backup.log 2>&1
#
# Off-site sync (Backblaze B2):
#   Set B2_BUCKET=... in /etc/sybilshield/backup.env and install rclone with a
#   remote named "b2:" via `rclone config`. If unset, script just keeps local
#   copies and exits 0.

set -euo pipefail

CONFIG=/etc/sybilshield/backup.env
[ -r "$CONFIG" ] && . "$CONFIG"

PROJECT_DIR="${PROJECT_DIR:-/home/sybil/sybilshield}"
BACKUP_DIR="${BACKUP_DIR:-/home/sybil/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml -f $PROJECT_DIR/docker-compose.prod.yml"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="$BACKUP_DIR/sybilshield-$TS.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +%FT%TZ)] starting backup -> $OUT"

# Use docker exec into the Postgres container — avoids host-side pg_dump
# version drift and works even if local psql isn't installed.
$COMPOSE exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-sybilshield}" "${POSTGRES_DB:-sybilshield}" \
  | gzip -9 > "$OUT.tmp"

# Sanity check: gzip-valid + non-trivial size (> 1 KB)
gzip -t "$OUT.tmp"
SIZE=$(stat -c '%s' "$OUT.tmp")
if [ "$SIZE" -lt 1024 ]; then
  echo "ERROR: dump too small ($SIZE bytes)" >&2
  rm -f "$OUT.tmp"
  exit 2
fi

mv "$OUT.tmp" "$OUT"
echo "  wrote $OUT ($SIZE bytes)"

# Retention: keep only last N days of local copies.
find "$BACKUP_DIR" -name 'sybilshield-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete -print

# Optional off-site sync via rclone (Backblaze B2 or any remote called b2:).
if [ -n "${B2_BUCKET:-}" ] && command -v rclone >/dev/null 2>&1; then
  echo "  rclone sync -> b2:$B2_BUCKET/postgres/"
  rclone copy "$OUT" "b2:$B2_BUCKET/postgres/" --quiet
  # Also expire old off-site copies (keep 30d on B2, longer than local).
  rclone delete --min-age "${B2_RETENTION_DAYS:-30}d" "b2:$B2_BUCKET/postgres/" --quiet || true
else
  echo "  off-site sync skipped (B2_BUCKET unset or rclone missing)"
fi

echo "[$(date -u +%FT%TZ)] backup OK"

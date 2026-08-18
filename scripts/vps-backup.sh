#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_DIR="${DUMP_DIR:-/backups/pg}"
MINIO_DATA="${MINIO_DATA_DIR:-/minio-data}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"

mkdir -p "$DUMP_DIR"

: "${POSTGRES_HOST:=postgres}"
: "${POSTGRES_USER:=repentance}"
: "${POSTGRES_DB:=repentance101}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

export PGPASSWORD="$POSTGRES_PASSWORD"

DUMP_FILE="${DUMP_DIR}/repentance101-${STAMP}.sql.gz"
echo "dumping postgres to ${DUMP_FILE}"
pg_dump \
  -h "$POSTGRES_HOST" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner \
  --no-acl \
  | gzip -9 > "$DUMP_FILE"

find "$DUMP_DIR" -type f -name 'repentance101-*.sql.gz' -mtime "+${KEEP_DAYS}" -print -delete || true

if [[ -z "${RESTIC_REPOSITORY:-}" ]]; then
  echo "RESTIC_REPOSITORY not set — kept ${KEEP_DAYS}-day local dumps only"
  exit 0
fi

if [[ -z "${RESTIC_PASSWORD:-}" ]]; then
  echo "RESTIC_PASSWORD missing — skipping off-site restic backup" >&2
  exit 0
fi

export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-${R2_ACCESS_KEY_ID:-}}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-${R2_SECRET_ACCESS_KEY:-}}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-auto}"

if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
  echo "R2/S3 keys missing — skipping off-site restic backup" >&2
  exit 0
fi

if ! restic snapshots >/dev/null 2>&1; then
  echo "initializing restic repository ${RESTIC_REPOSITORY}"
  restic init
fi

BACKUP_PATHS=("$DUMP_DIR")
if [[ -d "$MINIO_DATA" ]]; then
  BACKUP_PATHS+=("$MINIO_DATA")
fi

echo "restic backup ${BACKUP_PATHS[*]}"
restic backup "${BACKUP_PATHS[@]}" --tag repentance101 --host dreamhost-vps
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
echo "backup finished ${STAMP}"

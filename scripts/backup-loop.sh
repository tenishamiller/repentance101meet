#!/usr/bin/env bash
set -eu

echo "backup sidecar started $(date -u +%Y-%m-%dT%H:%M:%SZ)"

while true; do
  if /usr/local/bin/vps-backup.sh; then
    echo "backup ok $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  else
    echo "backup failed $(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
  fi
  sleep "${BACKUP_INTERVAL_SECONDS:-86400}"
done

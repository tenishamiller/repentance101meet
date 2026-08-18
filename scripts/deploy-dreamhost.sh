#!/usr/bin/env bash
# Update production on the DreamHost VPS only. Do not use Vercel.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Run this on the DreamHost VPS after Docker is installed." >&2
  echo "See DEPLOY-VPS.md" >&2
  exit 1
fi

git pull origin master
docker compose up -d --build
docker compose ps

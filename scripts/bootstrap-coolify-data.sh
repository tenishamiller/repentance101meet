#!/usr/bin/env bash
# One-time: Postgres + MinIO + local backups on the Coolify VPS.
# Safe for the other three sites — does not bind 80/443.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP_DIR="/data/coolify/applications/9sudnrqdhwlvoojg8frgzn0a"
APP_ID=3
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.coolify-data.yml)

if [[ ! -f .env ]]; then
  umask 077
  cat > .env <<EOF
NEXT_PUBLIC_APP_URL="https://repentance101ministry.com"
NEXTAUTH_URL="https://repentance101ministry.com"
NEXT_PUBLIC_APP_NAME="Repentance 101"
POSTGRES_PASSWORD="$(openssl rand -hex 24)"
MINIO_ROOT_USER="repentance101"
MINIO_ROOT_PASSWORD="$(openssl rand -hex 24)"
RESTIC_PASSWORD="$(openssl rand -base64 32)"
# Add Cloudflare R2 later for off-site copies:
# RESTIC_REPOSITORY="s3:https://<ACCOUNT_ID>.r2.cloudflarestorage.com/repentance101-backups"
# R2_ACCESS_KEY_ID=""
# R2_SECRET_ACCESS_KEY=""
EOF
  echo "wrote $ROOT/.env"
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${POSTGRES_PASSWORD:?}"
: "${MINIO_ROOT_PASSWORD:?}"
: "${MINIO_ROOT_USER:=repentance101}"

"${COMPOSE[@]}" up -d postgres minio
# minio/mc entrypoint is `mc`; override it. Skip compose minio-init (POSIX `set` dumps env).
docker run --rm --network repentance101meet_default \
  --entrypoint /bin/sh \
  -e MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD \
  -v "$ROOT/docker/minio-cors.json:/cors.json:ro" \
  minio/mc:latest -c '
    set -e
    i=0
    until mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"; do
      i=$((i+1))
      [ $i -gt 30 ] && exit 1
      sleep 2
    done
    mc mb -p local/media || true
    mc anonymous set download local/media
    mc cors set local/media /cors.json || true
    echo minio bucket media ready
  '
"${COMPOSE[@]}" up -d --build backup

echo "waiting for postgres..."
for i in $(seq 1 40); do
  if docker exec r101-postgres pg_isready -U repentance -d repentance101 >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
docker exec r101-postgres pg_isready -U repentance -d repentance101

DUMP="/home/ubuntu/repentance101-supabase.sql.gz"
DUMP_ENV="/home/ubuntu/repentance101meet/.dump.env"
if [[ ! -f "$DUMP" ]]; then
  echo "dumping current database (Supabase)..."
  sudo python3 - <<PY
from pathlib import Path
env = {}
for line in Path("/data/coolify/applications/9sudnrqdhwlvoojg8frgzn0a/.env").read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k] = v.strip().strip('"').strip("'")
url = env.get("DIRECT_URL") or env.get("DATABASE_URL")
if not url:
    raise SystemExit("no DIRECT_URL/DATABASE_URL on Coolify app")
path = Path("$DUMP_ENV")
path.write_text("DUMP_URL=" + url + "\n")
path.chmod(0o600)
print("dump env ready")
PY
  sudo chown ubuntu:ubuntu "$DUMP_ENV"
  docker run --rm --env-file "$DUMP_ENV" postgres:16-alpine \
    sh -c 'pg_dump --no-owner --no-acl "$DUMP_URL" | gzip -9' > "$DUMP"
  rm -f "$DUMP_ENV"
  echo "dump saved"
fi

TABLES="$(docker exec r101-postgres psql -U repentance -d repentance101 -tAc "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';")"
if [[ "${TABLES// /}" == "0" ]]; then
  echo "restoring dump into VPS postgres..."
  gunzip -c "$DUMP" | docker exec -i r101-postgres psql -U repentance -d repentance101 -v ON_ERROR_STOP=1 >/tmp/r101-restore.log
  echo "restore finished"
else
  echo "postgres already has $TABLES tables — skip restore"
fi

NEW_DB_URL="postgresql://repentance:${POSTGRES_PASSWORD}@r101-postgres:5432/repentance101?schema=public"

sudo python3 - <<PY
from pathlib import Path
path = Path("$APP_DIR/.env")
text = path.read_text()
vals = {
    "DATABASE_URL": "$NEW_DB_URL",
    "DIRECT_URL": "$NEW_DB_URL",
    "S3_ENDPOINT": "http://r101-minio:9000",
    "S3_PUBLIC_ENDPOINT": "https://repentance101ministry.com",
    "S3_ACCESS_KEY": "$MINIO_ROOT_USER",
    "S3_SECRET_KEY": "$MINIO_ROOT_PASSWORD",
    "S3_BUCKET": "media",
    "S3_REGION": "us-east-1",
}
lines = text.splitlines()
keys_seen = set()
out = []
for line in lines:
    if not line.strip() or line.strip().startswith("#") or "=" not in line:
        out.append(line)
        continue
    k = line.split("=", 1)[0]
    if k in vals:
        out.append(f'{k}="{vals[k]}"')
        keys_seen.add(k)
    else:
        out.append(line)
for k, v in vals.items():
    if k not in keys_seen:
        out.append(f'{k}="{v}"')
path.write_text("\n".join(out) + "\n")
print("updated Coolify app .env keys:", ", ".join(sorted(vals)))
PY

sudo tee /tmp/r101-upsert-env.php >/dev/null <<'PHP'
<?php
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\EnvironmentVariable;
use Illuminate\Support\Str;

$pairs = json_decode(file_get_contents('/tmp/r101-env.json'), true);
$appId = (int)$pairs['_app_id'];
unset($pairs['_app_id']);

foreach ($pairs as $key => $value) {
    $rows = EnvironmentVariable::where('resourceable_type', 'App\\Models\\Application')
        ->where('resourceable_id', $appId)
        ->where('key', $key)
        ->get();
    if ($rows->isEmpty()) {
        $ev = new EnvironmentVariable();
        $ev->resourceable_type = 'App\\Models\\Application';
        $ev->resourceable_id = $appId;
        $ev->key = $key;
        $ev->value = $value;
        $ev->uuid = (string) Str::uuid();
        $ev->is_preview = false;
        $ev->is_runtime = true;
        $ev->is_buildtime = false;
        $ev->is_shown_once = false;
        $ev->is_multiline = false;
        $ev->is_literal = true;
        $ev->is_required = false;
        $ev->is_shared = false;
        $ev->save();
        echo "created $key\n";
    } else {
        foreach ($rows as $row) {
            $row->value = $value;
            $row->is_literal = true;
            $row->is_runtime = true;
            $row->save();
        }
        echo "updated $key x".$rows->count()."\n";
    }
}
PHP

sudo python3 - <<PY
import json
from pathlib import Path
Path("/tmp/r101-env.json").write_text(json.dumps({
    "_app_id": $APP_ID,
    "DATABASE_URL": "$NEW_DB_URL",
    "DIRECT_URL": "$NEW_DB_URL",
    "S3_ENDPOINT": "http://r101-minio:9000",
    "S3_PUBLIC_ENDPOINT": "https://repentance101ministry.com",
    "S3_ACCESS_KEY": "$MINIO_ROOT_USER",
    "S3_SECRET_KEY": "$MINIO_ROOT_PASSWORD",
    "S3_BUCKET": "media",
    "S3_REGION": "us-east-1",
}))
PY
sudo chmod 600 /tmp/r101-env.json /tmp/r101-upsert-env.php
docker cp /tmp/r101-upsert-env.php coolify:/tmp/r101-upsert-env.php
docker cp /tmp/r101-env.json coolify:/tmp/r101-env.json
docker exec coolify php /tmp/r101-upsert-env.php
docker exec coolify rm -f /tmp/r101-upsert-env.php /tmp/r101-env.json
sudo rm -f /tmp/r101-upsert-env.php /tmp/r101-env.json

echo "recreating ministry app with new env..."
sudo docker compose --project-directory "$APP_DIR" -f "$APP_DIR/docker-compose.yaml" up -d --force-recreate --no-build

echo "done"
docker ps --filter name=r101- --format 'table {{.Names}}\t{{.Status}}'
echo "R2 off-site backup is NOT on yet — add RESTIC_REPOSITORY + R2 keys to $ROOT/.env then: docker compose -f docker-compose.yml -f docker-compose.coolify-data.yml up -d backup"

#!/usr/bin/env bash
# Recreate the Coolify ministry app so it uses r101-postgres + r101-minio.
# Also create extra databases/buckets for the other sites.
set -euo pipefail
export PATH=/usr/bin:/usr/sbin:/bin:/sbin

APP_DIR=/data/coolify/applications/9sudnrqdhwlvoojg8frgzn0a
ROOT=/home/ubuntu/repentance101meet
cd "$ROOT"
set -a
# shellcheck disable=SC1091
source .env
set +a

echo "=== ministry file env ==="
sudo python3 - <<'PY'
from pathlib import Path
import re
for line in Path("/data/coolify/applications/9sudnrqdhwlvoojg8frgzn0a/.env").read_text().splitlines():
    if line.startswith("DATABASE_URL=") or line.startswith("S3_ENDPOINT=") or line.startswith("S3_BUCKET="):
        k,v=line.split("=",1)
        v=v.strip().strip('"')
        if k=="DATABASE_URL":
            v=re.sub(r"postgresql://[^@]+@","postgresql://***@",v)
        print(k, v)
PY

echo "=== recreate ministry ==="
sudo /usr/bin/docker compose --project-directory "$APP_DIR" -f "$APP_DIR/docker-compose.yaml" up -d --force-recreate --no-build
sleep 8
echo "=== ministry runtime ==="
sudo /usr/bin/docker exec 9sudnrqdhwlvoojg8frgzn0a-210508141538 sh -c 'printenv DATABASE_URL' | sed -E 's#postgresql://[^@]+@#postgresql://***@#'
sudo /usr/bin/docker exec 9sudnrqdhwlvoojg8frgzn0a-210508141538 sh -c 'printenv S3_ENDPOINT; printenv S3_BUCKET'

echo "=== extra databases ==="
for db in braidappt glorygoat; do
  exists="$(sudo /usr/bin/docker exec r101-postgres psql -U repentance -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'")"
  if [[ "${exists// /}" == "1" ]]; then
    echo "$db exists"
  else
    sudo /usr/bin/docker exec r101-postgres psql -U repentance -d postgres -c "CREATE DATABASE ${db} OWNER repentance;"
  fi
done

echo "=== extra minio buckets ==="
sudo /usr/bin/docker run --rm --network repentance101meet_default \
  --entrypoint /bin/sh \
  -e MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD \
  minio/mc:latest -c '
    set -eu
    mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
    for b in media braid glory review-images; do
      mc mb -p local/$b || true
      cat > /tmp/anon-$b.json <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::$b/*"]}]}
EOF
      mc anonymous set-json /tmp/anon-$b.json local/$b || true
    done
    mc ls local
  '

echo "=== persist Coolify DATABASE_URL/S3 via artisan ==="
NEW_DB_URL="postgresql://repentance:${POSTGRES_PASSWORD}@r101-postgres:5432/repentance101?schema=public"
sudo python3 - <<PY
import json
from pathlib import Path
Path("/tmp/r101-env.json").write_text(json.dumps({
    "_app_id": 3,
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
sudo chmod 600 /tmp/r101-env.json
sudo /usr/bin/docker exec -i coolify tee /tmp/r101-env.json >/dev/null < /tmp/r101-env.json
sudo /usr/bin/docker exec -i coolify tee /tmp/r101-upsert-env.php >/dev/null <<'PHP'
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
        ->where('resourceable_id', $appId)->where('key', $key)->get();
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
sudo /usr/bin/docker exec coolify php /tmp/r101-upsert-env.php
sudo /usr/bin/docker exec coolify rm -f /tmp/r101-upsert-env.php /tmp/r101-env.json
sudo rm -f /tmp/r101-env.json

echo "=== site checks ==="
curl -sI https://repentance101ministry.com | head -5
curl -sI https://braidappt.com | head -5
curl -sI https://glorygoatmilksoap.com | head -5
curl -sI https://theseersconnect.com | head -5
echo DONE

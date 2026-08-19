#!/usr/bin/env bash
set -euo pipefail
export PATH=/usr/bin:/usr/sbin:/bin:/sbin
cd /home/ubuntu/repentance101meet

python3 <<'PY'
from pathlib import Path
import subprocess

env = {}
for line in Path("/home/ubuntu/repentance101meet/.env").read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k] = v.strip().strip('"').strip("'")

cmd = [
    "docker", "run", "--rm", "--network", "repentance101meet_default",
    "--entrypoint", "/bin/sh",
    "-e", "MINIO_ROOT_USER=" + env["MINIO_ROOT_USER"],
    "-e", "MINIO_ROOT_PASSWORD=" + env["MINIO_ROOT_PASSWORD"],
    "minio/mc:latest", "-c",
    """set -eu
mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
for b in media braid glory review-images; do
  mc mb -p "local/$b" >/dev/null || true
  cat > /tmp/anon-$b.json <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::$b/*"]}]}
EOF
  mc anonymous set-json /tmp/anon-$b.json "local/$b" >/dev/null || true
done
mc ls local
""",
]
print(subprocess.check_output(cmd, text=True))
print("minio buckets ready")
PY

sudo python3 <<'PY'
import json
import urllib.request
from pathlib import Path

def load(path):
    env = {}
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k] = v.strip().strip('"').strip("'")
    return env

def fetch_tables(base_url, key, known):
    tables = list(known)
    req = urllib.request.Request(
        base_url.rstrip("/") + "/rest/v1/",
        headers={
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Accept": "application/openapi+json",
        },
    )
    try:
        spec = json.load(urllib.request.urlopen(req, timeout=30))
        extra = [
            p.strip("/")
            for p in spec.get("paths", {})
            if p.startswith("/") and p.count("/") == 1
        ]
        for t in extra:
            if t and t not in tables and not t.startswith("rpc"):
                tables.append(t)
        print("openapi tables", len(tables))
    except Exception as exc:
        print("openapi skip", type(exc).__name__)
    return tables

def dump_app(name, env_path, url_key, known, dbname):
    env = load(env_path)
    url = env[url_key].rstrip("/")
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    tables = fetch_tables(url, key, known)
    sql = ['CREATE SCHEMA IF NOT EXISTS public;']
    for t in tables:
        ident = "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in t)
        req = urllib.request.Request(
            url + "/rest/v1/" + t + "?select=*",
            headers={"apikey": key, "Authorization": "Bearer " + key},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                rows = json.loads(resp.read().decode())
        except Exception as exc:
            print(name, t, "FAIL", type(exc).__name__)
            continue
        print(name, t, "rows", len(rows) if isinstance(rows, list) else 0)
        sql.append(f'DROP TABLE IF EXISTS "{ident}" CASCADE;')
        sql.append(f'CREATE TABLE "{ident}" (id bigserial primary key, doc jsonb not null);')
        if isinstance(rows, list):
            for row in rows:
                payload = json.dumps(row).replace("'", "''")
                sql.append(f"INSERT INTO \"{ident}\"(doc) VALUES ('{payload}'::jsonb);")
    out = Path(f"/tmp/{name}-dump.sql")
    out.write_text("\n".join(sql) + "\n")
    print(name, "sql", out.stat().st_size, "bytes")

dump_app(
    "goat",
    "/data/coolify/applications/zgintqtqxtbkc1wtnqhnpldw/.env",
    "SUPABASE_URL",
    ["gg_products", "gg_stock_waitlist", "gg_orders", "gg_reviews"],
    "glorygoat",
)
dump_app(
    "braid",
    "/data/coolify/applications/yb4qtqwun7pwrdnopxyvzuje/.env",
    "NEXT_PUBLIC_SUPABASE_URL",
    [],
    "braidappt",
)
print("dumps written")
PY

sudo chown ubuntu:ubuntu /tmp/goat-dump.sql /tmp/braid-dump.sql
sudo /usr/bin/docker exec -i r101-postgres psql -U repentance -d glorygoat < /tmp/goat-dump.sql >/tmp/goat-restore.log
sudo /usr/bin/docker exec -i r101-postgres psql -U repentance -d braidappt < /tmp/braid-dump.sql >/tmp/braid-restore.log
echo "glorygoat tables:"
sudo /usr/bin/docker exec r101-postgres psql -U repentance -d glorygoat -c '\dt'
echo "braidappt table count:"
sudo /usr/bin/docker exec r101-postgres psql -U repentance -d braidappt -tAc "select count(*) from information_schema.tables where table_schema='public';"
rm -f /tmp/goat-dump.sql /tmp/braid-dump.sql
echo DONE

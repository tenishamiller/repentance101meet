# Deploy on a DreamHost VPS (no Vercel, no extra Postgres/MinIO bill)

**This VPS already runs Coolify (all 4 sites).** Do **not** start Caddy and do **not** bind ports 80/443.

Postgres + MinIO (ministry data only):

```bash
cd ~/repentance101meet
bash scripts/bootstrap-coolify-data.sh
```

This app is a long-running Next.js Node process. Vercel’s serverless limits (≈4.5 MB request body, short function timeouts, cold starts) do **not** apply when you run it on the VPS.

**Backup choice:** daily `pg_dump` kept **7 days on the VPS**, plus encrypted **restic** snapshots of those dumps and MinIO files to **Cloudflare R2** (free ~10 GB, then cheap). Same-disk copies alone are not a backup — recordings live on this box and will eat disk.

## What runs where

| Piece | Where | Cost |
|-------|--------|------|
| Next.js ministry app | **DreamHost VPS** (Docker) | included in the VPS |
| Postgres 16 | **same VPS** (Docker) | $0 extra |
| File storage (avatars, chat, recordings) | **MinIO** on the same VPS | $0 extra |
| TLS / reverse proxy | **Caddy** on the VPS | $0 extra |
| Off-site backups | **restic → Cloudflare R2** | free until ~10 GB |
| Livestream SFU | **LiveKit Cloud** (already live) | keep until you self-host video |

Do **not** expose Postgres `5432` or MinIO `9000`/`9001` on the public firewall. Caddy serves files at `https://repentance101ministry.com/media/...`.

Until DNS cuts over, Vercel can keep using Supabase: the app uses MinIO/S3 only when `S3_ENDPOINT` + keys are set (Compose sets those on the VPS).

## VPS size

- Ubuntu 22.04/24.04 (or Debian)
- **4 GB RAM** if app + Postgres + MinIO share the box (2 GB will swap)
- Disk: recordings are **200 MB–1 GB each** — watch `df -h` and prune old teachings
- Open inbound **80**, **443**, and SSH only

```bash
# On the VPS
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out/in, then:
docker compose version
```

## One-time setup on the VPS

```bash
git clone https://github.com/tenishamiller/repentance101meet.git
cd repentance101meet
cp .env.vps.example .env
nano .env
```

Set at least:

- `AUTH_SECRET`, `ADMIN_*`
- `POSTGRES_PASSWORD` and `MINIO_ROOT_PASSWORD` (`openssl rand -hex 24` for each)
- `LIVEKIT_*` and `NEXT_PUBLIC_LIVEKIT_URL` (same values as today)
- `NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL` = `https://repentance101ministry.com`

Leave `S3_*` and `DATABASE_URL` out of `.env` — Compose injects them to the local Postgres and MinIO.

### Move data off Supabase (before or right after first boot)

On a machine that can reach Supabase (or the Supabase SQL dump UI):

```bash
pg_dump --no-owner --no-acl "$SUPABASE_DIRECT_URL" | gzip > repentance101-supabase.sql.gz
```

Copy that file onto the VPS, then after `docker compose up -d --build`:

```bash
gunzip -c repentance101-supabase.sql.gz | docker compose exec -T postgres \
  psql -U repentance -d repentance101
```

Avatars / old chat files / recordings still on Supabase stay reachable until you copy them into MinIO (or leave the old public URLs until they expire). New uploads go to MinIO once the VPS is live.

## Cloudflare R2 backups (recommended)

1. Cloudflare dashboard → **R2** → create bucket `repentance101-backups`.
2. Create an R2 API token with **Object Read & Write**.
3. Add to `.env` on the VPS:

```bash
RESTIC_REPOSITORY="s3:https://<ACCOUNT_ID>.r2.cloudflarestorage.com/repentance101-backups"
RESTIC_PASSWORD="$(openssl rand -base64 32)"   # save this somewhere safe
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
```

4. Recreate the backup sidecar: `docker compose up -d backup`

The sidecar dumps Postgres on start, then once a day. It keeps **7 daily / 4 weekly / 6 monthly** restic snapshots. Without R2 vars it still writes local dumps under the `backup_local` volume (not off-site).

Run a backup now:

```bash
docker compose exec backup /usr/local/bin/vps-backup.sh
```

Restore (disaster): `restic restore latest --target /tmp/restore`, then `gunzip -c …sql.gz | psql …`, and copy the restored MinIO `data` back onto the `minio_data` volume while MinIO is stopped.

## DNS cutover (domain → DreamHost)

1. Note the VPS public IPv4 in the DreamHost panel.
2. Change:
   - **A** `@` → `YOUR_DREAMHOST_IP` (was Vercel `76.76.21.21` if still there)
   - **A** `www` → `YOUR_DREAMHOST_IP` (or CNAME www → apex)
3. Remove Vercel `cname.vercel-dns.com` records.
4. Wait until `dig +short repentance101ministry.com` returns the DreamHost IP.

Do **not** start Caddy until DNS points here, or Let’s Encrypt may fail.

## Start the stack

```bash
docker compose up -d --build
docker compose logs -f app
```

Health: `https://repentance101ministry.com` should load through Caddy → app:3000. Test login, a small upload, and that a file URL looks like `/media/...`.

## Deploy updates later

```bash
cd ~/repentance101meet   # or wherever you cloned
git pull origin master
docker compose up -d --build
```

## Leave Vercel and Supabase billing (after the site works on DreamHost)

1. Confirm login, messages, uploads, and a test livestream on the VPS URL.
2. In Vercel → project **repentance101meet** → Domains → remove the ministry domain.
3. Disconnect Git auto-deploys or archive the Vercel project.
4. After the Supabase dump is restored and new uploads work on MinIO, pause or delete the Supabase project so it stops billing.
5. Keep this GitHub repo.

## Why this fixes the Vercel pain

| Vercel limit | On this VPS stack |
|--------------|-------------------|
| ~4.5 MB serverless body | Caddy allows **512 MB** |
| `maxDuration` 10–60s | Continuous Node process — no function timeout |
| Cold starts / concurrency caps | Always-on container |
| Paid Supabase | Postgres + MinIO on the VPS you already pay for |

## Troubleshooting

- **502 / unhealthy app** — `docker compose logs app` (often missing `AUTH_SECRET` / `POSTGRES_PASSWORD`).
- **TLS errors** — DNS not pointing at this VPS yet; check `dig` and firewall 80/443.
- **Uploads 403** — MinIO not ready; `docker compose logs minio-init`.
- **Disk filling up** — recordings; `df -h` and delete old teachings in admin after they are restic-backed.
- **Old site still shows** — DNS cache; confirm A record is the DreamHost IP, not `76.76.21.21`.

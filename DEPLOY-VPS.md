# Deploy on OVHcloud VPS (no Vercel)

This app is a long-running Next.js Node process. Vercel’s serverless limits (≈4.5 MB request body, short function timeouts, cold starts) do **not** apply when you run it on your VPS with Docker + Caddy.

## What runs where (recommended Phase 1)

| Piece | Where | Why |
|-------|--------|-----|
| Next.js ministry app | **Your OVH VPS** (Docker) | Removes Vercel body/time limits |
| Postgres + file storage | **Supabase** (already live) | Stable; no data migration yet |
| Livestream SFU | **LiveKit Cloud** (already live) | Video stays working during cutover |
| TLS / reverse proxy | **Caddy** on the VPS | Auto HTTPS, 512 MB body allowance |

Phase 2 (optional later): move Postgres, object storage, and LiveKit onto the same VPS. Not required to leave Vercel.

## OVH VPS requirements

- Ubuntu 22.04/24.04 (or Debian)
- **2 GB RAM minimum** (4 GB better for builds + livestream admin use)
- Open inbound **80** and **443** (and SSH)
- Docker Engine + Compose plugin installed

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
nano .env   # paste the same secrets you use on Vercel today
```

Copy every production env var from the current Vercel project into `.env`, especially:

- `DATABASE_URL`, `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SECRET`, `ADMIN_*`
- `LIVEKIT_*`, `NEXT_PUBLIC_LIVEKIT_URL`
- Set `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to `https://repentance101ministry.com`

## DNS cutover (domain → OVH)

At your DNS host (registrar / DreamHost / OVH DNS):

1. Note your OVH VPS public IPv4.
2. Change:
   - **A** `@` → `YOUR_OVH_IP` (was Vercel `76.76.21.21`)
   - **A** `www` → `YOUR_OVH_IP` (or CNAME www → apex)
3. Remove Vercel `cname.vercel-dns.com` records.
4. Wait for DNS to resolve to the OVH IP (`dig +short repentance101ministry.com`).

Do **not** start Caddy until DNS points here, or Let’s Encrypt may fail.

## Start the stack

```bash
docker compose up -d --build
docker compose logs -f app
```

Health: `https://repentance101ministry.com` should load through Caddy → app:3000.

## Deploy updates later

```bash
cd ~/repentance101meet   # or wherever you cloned
git pull origin master
docker compose up -d --build
```

## Leave Vercel (after the site works on OVH)

1. Confirm login, messages, uploads, and a test livestream on the VPS URL.
2. In Vercel → project **repentance101meet** → Domains → remove the ministry domain.
3. Disconnect Git auto-deploys or delete/archive the Vercel project so it stops rebuilding.
4. Keep this GitHub repo; pushes no longer need Vercel.

## Cancel / keep OVH

You said you are already on OVHcloud — **keep that VPS** for this app. Only cancel OVH after a successful move elsewhere (e.g. DreamHost). Do not cancel the box that will host production.

## Why this fixes the Vercel pain

| Vercel limit | On this VPS stack |
|--------------|-------------------|
| ~4.5 MB serverless body | Caddy allows **512 MB**; app fallback raised to **100 MB** |
| `maxDuration` 10–60s | Continuous Node process — no function timeout |
| Cold starts / concurrency caps | Always-on container |
| Platform upload workarounds | Direct Supabase signed uploads still used; server fallback no longer artificially capped at 4 MB |

## Troubleshooting

- **502 / unhealthy app** — `docker compose logs app` (often bad `DATABASE_URL` / missing `AUTH_SECRET`).
- **TLS errors** — DNS not pointing at this VPS yet; check `dig` and firewall 80/443.
- **Old site still shows** — DNS/CDN cache; confirm A record is OVH IP, not `76.76.21.21`.

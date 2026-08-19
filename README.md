# Repentance 101 — repentance101ministry.com

Ministry platform for **Repentance 101**: member approvals, channels, live meetings, and community chat.

**Deploy stack:** GitHub → **DreamHost VPS (Docker: app + Postgres + MinIO)** · Backups → restic / Cloudflare R2 · Livestream → LiveKit Cloud  
👉 **VPS guide:** see [DEPLOY-VPS.md](./DEPLOY-VPS.md)

**Completely separate from BraidAppt** — see [ISOLATION.md](./ISOLATION.md)

## Quick local preview

1. Copy `.env.example` → `.env` and fill in Postgres + `AUTH_SECRET`
2. Run:
   ```bash
   npm install
   npm run db:push
   npm run db:seed
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000)

## Features

- Member signup with admin approval
- Public channels: Guidelines & Livestream info (editable by the host)
- Private channels: Resource, Accountability, Tough Q&A, General Chat
- Custom WebRTC livestream (host broadcasts, members participate) with chat, raise hand, block list
- Profiles with avatars (MinIO on the VPS)

## Host admin login

The host uses the private host portal (not linked on the public site):

**https://repentance101ministry.com/host**

Credentials come from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your server `.env` — never commit or display them on the site.

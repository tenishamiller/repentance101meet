# Repentance 101 — repentance101ministry.com

Ministry platform for **Norman's** teaching ministry: member approvals, channels, live meetings, and community chat.

**Deploy stack:** GitHub → Vercel · Database & storage → Supabase · Livestream → built-in WebRTC (free, no third-party video)

**Completely separate from BraidAppt** — see [ISOLATION.md](./ISOLATION.md)

👉 **Full setup guide:** see [DEPLOY.md](./DEPLOY.md)

## Quick local preview (with Supabase)

1. Copy `.env.example` → `.env` and fill in your Supabase keys
2. Create a public **`uploads`** bucket in Supabase Storage
3. Run:
   ```bash
   npm install
   npm run db:push
   npm run db:seed
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000)

## Features

- Member signup with Norman's admin approval
- Public channels: Guidelines & Livestream info (editable by Norman)
- Private channels: Resource, Accountability, Tough Q&A, General Chat
- Custom WebRTC livestream (Norman broadcasts, members watch) with chat, raise hand, block list
- Profiles with avatars (Supabase Storage)

## Host admin login

Norman uses the private host portal (not linked on the public site):

**https://repentance101ministry.com/host**

Credentials come from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your Vercel environment — never commit or display them on the site.

# Repentance 101 — repentance101meet.com

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

## Admin login (after seed)

- Email: `norman@repentance101meet.com`
- Password: value of `ADMIN_PASSWORD` in your `.env`

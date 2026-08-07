# Isolation from BraidAppt

Repentance 101 is a **completely separate product** from BraidAppt. Nothing is shared.

## What is separate

| Area | Repentance 101 | BraidAppt |
|------|----------------|-----------|
| **GitHub repo** | `tenishamiller/repentance101meet` | `tenishamiller/braidappt` |
| **Vercel project** | `repentance101meet` (personal account) | `braidappt` (braid-appt team) |
| **Domain** | `repentance101ministry.com` | `braidappt.com` |
| **Supabase project** | `repentance101meet` (dedicated DB) | separate project |
| **Database tables** | Own Prisma schema, own users | unrelated |
| **File storage** | Own `uploads` bucket | unrelated |
| **Auth users** | Norman + ministry members only | braiders/clients only |
| **LiveKit** | Own LiveKit Cloud project (when configured) | unrelated |
| **Env files** | Only in `repentance101meet/` | Only in `braidbook/` |

## What we do NOT do

- Read credentials from `braidbook/` or any BraidAppt folder
- Deploy to the `braid-appt` Vercel team
- Reuse BraidAppt's Supabase database or storage
- Share admin accounts, API keys, or domains

## Setup (this project only)

```bash
cd C:\Users\tenis\Projects\repentance101meet

# 1. Add YOUR Supabase token to .env.local (see .env.local.example)
copy .env.local.example .env.local

# 2. Create dedicated Supabase project + .env
npm run setup:supabase

# 3. Database + Norman admin
npm run db:push
npm run db:seed

# 4. Preview locally
npm run dev

# 5. Deploy to your personal Vercel (not BraidAppt)
npm run deploy
```

## GitHub

Repo: **https://github.com/tenishamiller/repentance101meet**

Connect this repo to the **repentance101meet** Vercel project only — not the BraidAppt project.

# Supabase + Vercel + GitHub Setup

> **Important:** This ministry site is **100% separate from BraidAppt**. See [ISOLATION.md](./ISOLATION.md).

Follow these steps to get Repentance 101 live so you can see it and share with Norman.

---

## 1. GitHub (code — separate repo)

Repo: **https://github.com/tenishamiller/repentance101meet**

This is NOT the BraidAppt repo. Connect only this repo to the Repentance 101 Vercel project.

---

## 2. Supabase (dedicated database + storage)

### Automated setup (recommended)

```bash
# Create token at https://supabase.com/dashboard/account/tokens
# Add to repentance101meet/.env.local only:
#   SUPABASE_ACCESS_TOKEN=sbp_...

npm run setup:supabase
npm run db:push
npm run db:seed
```

This creates a **new** Supabase project named `repentance101meet` — not shared with BraidAppt.

### Manual setup (alternative)
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Name it `repentance101meet`, pick a region, set a database password (save it)

### Get connection strings
In **Project Settings → Database**:

| Variable | Which connection |
|----------|------------------|
| `DATABASE_URL` | **Transaction pooler** (port 6543) — for Vercel/runtime |
| `DIRECT_URL` | **Direct connection** (port 5432) — for migrations |

Example format:
```
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### Create storage bucket (avatars & chat attachments)
1. **Storage → New bucket**
2. Name: `uploads`
3. **Public bucket**: ON
4. Policies: allow authenticated uploads (or use service role from the app)

### Get API keys
**Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key (keep secret)

### Run migrations & seed Norman's admin account

On your machine, create `.env` from `.env.example`, fill in Supabase values, then:

```bash
npm run db:push
npm run db:seed
```

Or with migrations:
```bash
npx prisma migrate dev --name init
npm run db:seed
```

---

## 3. Vercel (separate project — NOT braid-appt team)

### Option A: CLI (personal account)

```bash
npx vercel login
npm run deploy
```

This creates/links project **repentance101meet** under your **personal** Vercel account.

### Option B: Dashboard

1. [vercel.com/new](https://vercel.com/new) → Import **repentance101meet** from GitHub
2. Do **not** import into the BraidAppt project or braid-appt team
3. Framework: **Next.js** (auto-detected)

### Environment variables (Vercel → Settings → Environment Variables)

Add all of these for **Production**, **Preview**, and **Development**:

```
DATABASE_URL          = (Supabase transaction pooler URL)
DIRECT_URL            = (Supabase direct URL)
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
AUTH_SECRET           = (run: openssl rand -base64 32)
NEXTAUTH_URL          = https://repentance101ministry.com
NEXT_PUBLIC_APP_URL   = https://repentance101ministry.com
ADMIN_EMAIL           = norman@repentance101ministry.com
ADMIN_PASSWORD        = (strong password for Norman)
ADMIN_NAME            = Norman
NEXT_PUBLIC_APP_NAME  = Repentance 101
```

Click **Deploy**. Vercel runs `prisma migrate deploy` during build.

### Custom domain (repentance101ministry.com)
Vercel → Project → **Domains** → add `repentance101ministry.com` and `www.repentance101ministry.com`  
At your registrar, add DNS record: **A** `@` → `76.76.21.21` (or point nameservers to Vercel).  
For **www**: **CNAME** `www` → `cname.vercel-dns.com`  
Then set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to `https://repentance101ministry.com`.

---

## 4. Preview locally (optional)

With Supabase `.env` filled in:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Norman admin login** (after seed):
- Email: `norman@repentance101ministry.com`
- Password: whatever you set in `ADMIN_PASSWORD`

---

## Stack summary

| Service | Role |
|---------|------|
| **GitHub** | Source code + deploy trigger |
| **Supabase** | PostgreSQL database + file storage |
| **Vercel** | Next.js hosting |
| **WebRTC (built-in)** | Norman broadcasts live; members watch in-browser — $0/month |

No Docker required for production.

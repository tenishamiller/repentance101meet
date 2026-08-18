# Setup notes (legacy)

> **Production is the DreamHost VPS only. Do not deploy to Vercel.**  
> See [DEPLOY-VPS.md](./DEPLOY-VPS.md) for the deploy command.

> **Important:** This ministry site is **100% separate from BraidAppt**. See [ISOLATION.md](./ISOLATION.md).

Follow these steps to get Repentance 101 live.

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

### Run migrations & seed the host admin account

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

## 3. Vercel — retired

Do **not** deploy here. Production is the DreamHost VPS.

```bash
cd ~/repentance101meet
git pull origin master
docker compose up -d --build
```

See [DEPLOY-VPS.md](./DEPLOY-VPS.md). After DNS points at DreamHost, disconnect Git auto-deploys in the Vercel dashboard so `master` pushes do not keep shipping to Vercel.

---

## 4. Preview locally (optional)

With Supabase `.env` filled in:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Host admin login** (after seed — private URL, not on public nav):

- **https://repentance101ministry.com/host** (or `http://localhost:3000/host` locally)
- Use `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your environment

---

## Stack summary

| Service | Role |
|---------|------|
| **GitHub** | Source code |
| **DreamHost VPS** | Next.js + Postgres + MinIO (see DEPLOY-VPS.md) |
| **LiveKit Cloud** | Livestream SFU |

Do not deploy to Vercel.

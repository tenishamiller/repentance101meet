# Deploy Repentance 101

Production is the **DreamHost VPS** (Coolify + Postgres + MinIO). Do not deploy this app to Vercel.

See **[DEPLOY-VPS.md](./DEPLOY-VPS.md)** for the live stack.

This ministry site is **100% separate from BraidAppt**. See [ISOLATION.md](./ISOLATION.md).

## GitHub

Repo: **https://github.com/tenishamiller/repentance101meet**

## Local preview

```bash
cp .env.example .env
# set DATABASE_URL, AUTH_SECRET, ADMIN_* 
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Host admin

**https://repentance101ministry.com/host**

Credentials come from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the server `.env`.

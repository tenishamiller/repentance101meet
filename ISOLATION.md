# Isolation from BraidAppt

Repentance 101 is a **completely separate product** from BraidAppt. Nothing is shared.

## What is separate

| Area | Repentance 101 | BraidAppt |
|------|----------------|-----------|
| **GitHub repo** | `tenishamiller/repentance101meet` | `tenishamiller/braidappt` |
| **Domain** | `repentance101ministry.com` | `braidappt.com` |
| **Database** | VPS Postgres (`repentance101`) | separate VPS database |
| **File storage** | MinIO bucket `media` | separate storage |
| **Auth users** | Norman + ministry members only | braiders/clients only |
| **LiveKit** | Own LiveKit Cloud project (when configured) | unrelated |
| **Env files** | Only in `repentance101meet/` | Only in the BraidAppt repo |

## What we do NOT do

- Read credentials from any BraidAppt folder
- Reuse BraidAppt's database or storage
- Share admin accounts, API keys, or domains

## Setup (this project only)

```bash
cd repentance101meet
cp .env.example .env
# fill AUTH_SECRET, DATABASE_URL, and MinIO/S3 values

npm install
npm run db:push
npm run db:seed
npm run dev
```

Production: DreamHost VPS via Coolify. See [DEPLOY-VPS.md](./DEPLOY-VPS.md).

# Coolify VPS migration — all four sites

Move **braidappt.com**, **glorygoatmilksoap.com**, **theseersconnect.com**, and **repentance101ministry.com** off Vercel onto **one Coolify server**. Supabase stays unchanged.

Each repo already has a `Dockerfile` on GitHub. Vercel can stay live until DNS is switched.

---

## 1. Server (one time)

Ubuntu 24.04, **8 GB RAM minimum** (Coolify + four apps).

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Open Coolify: `http://YOUR_SERVER_IP:8000`, create admin user.

**Firewall:** allow 22, 80, 443, 8000 (8000 can be closed after setup).

---

## 2. Add each app in Coolify

For every site: **Projects → New resource → Application → Public repository → Dockerfile**

| Coolify name | Domain | GitHub repo | Branch | Container port |
|--------------|--------|-------------|--------|----------------|
| repentance101 | repentance101ministry.com, www | tenishamiller/repentance101meet | master | 3000 |
| braidappt | braidappt.com, www | tenishamiller/braidappt | main | 3000 |
| glory-goat | glorygoatmilksoap.com, www | tenishamiller/glory-goat-milk-soap | main | 3000 |
| theseers | theseersconnect.com, www | tenishamiller/theseersconnect | main | 80 |

Enable **HTTPS** (Let's Encrypt) per domain in Coolify.

### Build-time variables (Docker `ARG`)

Set these as **Build Variables** in Coolify so `NEXT_PUBLIC_*` embed correctly:

**repentance101meet**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` = `https://repentance101ministry.com`
- `NEXT_PUBLIC_APP_NAME` = `Repentance 101`
- `NEXT_PUBLIC_LIVEKIT_URL` = your LiveKit WSS URL (self-hosted or cloud)

**braidappt**

- `NEXT_PUBLIC_APP_URL` = `https://braidappt.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_TEST_MODE` (if still in test)
- `NEXT_PUBLIC_SHOW_PLAYGROUND_LOGINS` (optional)
- `NEXT_PUBLIC_ADMIN_LOGIN_PATH` = `/ops`

**glory-goat / theseers** — no build args (static / Node server only).

### Runtime environment variables

Copy from Vercel (or local `.env.local`). Run locally:

```bash
npm run coolify:env
```

Paste the output into Coolify → **Environment Variables** for each app.

**repentance101meet** needs at minimum:

- `DATABASE_URL`, `DIRECT_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- YouTube keys if streaming to YouTube

**braidappt** needs Stripe, Resend, cron secret, Supabase service role, etc. — see `braidbook/.env.example`.

**glory-goat** needs:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`

**theseers** — none (static nginx site).

---

## 3. BraidAppt cron jobs (Vercel → Coolify)

Vercel crons in `braidbook/vercel.json` must become Coolify **Scheduled Tasks** (or system cron hitting your domain):

| Schedule | URL |
|----------|-----|
| `*/5 * * * *` | `https://braidappt.com/api/cron/expire-pending-bookings` |
| `0 13 * * *` | `https://braidappt.com/api/cron/daily-digest` |
| `0 14 * * *` | `https://braidappt.com/api/cron/appointment-reminders` |
| `0 15 * * *` | `https://braidappt.com/api/cron/trial-ending-reminders` |
| `0 16 * * *` | `https://braidappt.com/api/cron/dispute-deadline-reminders` |
| `0 17 * * *` | `https://braidappt.com/api/cron/purge-deleted-accounts` |

Each request must include header `Authorization: Bearer YOUR_CRON_SECRET`.

---

## 4. Stripe / webhooks

After braidappt is live on the VPS, update Stripe webhook URL to:

`https://braidappt.com/api/billing/webhook`

Resend inbound webhooks similarly if used.

---

## 5. DNS cutover (when each app health-checks OK)

At your registrar, point each domain **A record** `@` and `www` to **YOUR_SERVER_IP**.

| Domain | Was (Vercel) | Now (VPS) |
|--------|--------------|-----------|
| repentance101ministry.com | 76.76.21.21 | YOUR_SERVER_IP |
| braidappt.com | Vercel | YOUR_SERVER_IP |
| glorygoatmilksoap.com | Vercel | YOUR_SERVER_IP |
| theseersconnect.com | Vercel | YOUR_SERVER_IP |

Lower TTL to 300 a few hours before switching. Keep Vercel projects until all four sites are verified on Coolify.

---

## 6. Suggested migration order

1. **theseersconnect** (static — lowest risk)
2. **glory-goat** (small Node shop)
3. **repentance101ministry** (ministry + LiveKit)
4. **braidappt** (largest — Stripe + crons last)

---

## 7. Self-hosted LiveKit (optional, same VPS)

When ready to leave LiveKit Cloud, add a second Coolify service using [LiveKit's Docker image](https://docs.livekit.io/home/self-hosting/deployment/) + coturn, then point `LIVEKIT_URL` / `NEXT_PUBLIC_LIVEKIT_URL` at `wss://livekit.repentance101ministry.com`.

---

## 8. Deploy updates after migration

Push to GitHub → Coolify auto-rebuilds (enable webhook) or click **Redeploy** in the UI.

Vercel `npm run deploy` is no longer needed once DNS points to the VPS.

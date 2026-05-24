# Deployment guide

How to take SybilShield from local Docker to live production. Target stack: Vercel + Railway + Supabase + Upstash. Total cost ~$310/mo at small scale.

## Architecture target

```
                   ┌─────────────────────┐
   Users ───────→  │  Vercel (frontend)  │  https://sybilshield.com
                   │   Next.js apps/web  │
                   └──────────┬──────────┘
                              │ HTTPS
                              ▼
                   ┌─────────────────────┐
                   │  Railway (api)      │  https://api.sybilshield.com
                   │   Fastify           │
                   └────┬───────────┬────┘
                        │           │
            ┌───────────▼──┐    ┌───▼──────────┐
            │  Railway     │    │  Railway     │
            │  worker      │    │  ml service  │
            │  BullMQ      │    │  FastAPI     │
            └───┬──────────┘    └──────────────┘
                │
        ┌───────▼─────┐  ┌──────────────┐  ┌──────────────┐
        │  Supabase   │  │  Upstash     │  │  Alchemy     │
        │  Postgres   │  │  Redis       │  │  on-chain    │
        └─────────────┘  └──────────────┘  └──────────────┘
```

## Costs

| Service | Plan | Monthly |
|---|---|---|
| Vercel | Hobby (or Pro $20) | $0–20 |
| Railway | Hobby ($5 starter + usage) | ~$50 |
| Supabase | Pro | $25 |
| Upstash | Pay-as-you-go | ~$10 |
| Alchemy | Scale | $199 |
| Domain (Namecheap) | sybilshield.com | $15/year |
| Google Workspace | hello@/appeals@/security@ | $6 |
| **Subtotal** | | **~$310/mo** |

## One-time setup (~2 hours)

### 1. Domain + email

```bash
# Buy domain
namecheap.com → sybilshield.com → checkout (~$15)

# Google Workspace
workspace.google.com → buy "Business Starter" → verify domain via DNS TXT
# Create: hello@, appeals@, security@, privacy@, legal@, grants@
```

### 2. Supabase (Postgres)

1. https://supabase.com/dashboard → New Project → name `sybilshield-prod`
2. Region: same as Railway (e.g. iad)
3. Copy connection string → save as `DATABASE_URL`
4. Settings → Database → Connection pooling → enable (transaction mode)

### 3. Upstash (Redis)

1. https://console.upstash.com → Create Database → name `sybilshield-prod`
2. Region: same as Railway
3. Copy URL with auth → save as `REDIS_URL`

### 4. Alchemy (on-chain data)

1. https://dashboard.alchemy.com → Create App → Scale tier ($199/mo)
2. Enable: Ethereum, Arbitrum, Optimism, Base, Polygon, BSC, Avalanche, Linea
3. Copy API key → save as `ALCHEMY_API_KEY`

### 5. NowPayments (crypto checkout)

1. https://account.nowpayments.io → Sign up
2. Submit merchant verification (24–48h approval)
3. Settings → API Keys → create one → save as `NOWPAYMENTS_API_KEY`
4. Settings → IPN → set callback URL to `https://api.sybilshield.com/v1/billing/ipn`
5. Set IPN secret → save as `NOWPAYMENTS_IPN_SECRET`

### 6. Vercel (frontend)

```bash
npm i -g vercel
cd apps/web
vercel link
vercel env add NEXT_PUBLIC_API_URL  # https://api.sybilshield.com
vercel --prod
```

Custom domain: Vercel → Settings → Domains → add `sybilshield.com`.

### 7. Railway (backend services)

```bash
npm i -g @railway/cli
railway login
railway link  # or railway init for new project
```

Add env vars in Railway dashboard for all services (api, ml, worker):
- `DATABASE_URL` (from Supabase)
- `REDIS_URL` (from Upstash)
- `ALCHEMY_API_KEY`
- `USE_MOCK_PROVIDERS=false`
- `ML_SERVICE_URL=http://ml.railway.internal:PORT` (Railway service discovery)
- `API_PUBLIC_URL=https://api.sybilshield.com`
- `WEB_PUBLIC_URL=https://sybilshield.com`
- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`

Deploy:
```bash
railway up
```

Custom domain in Railway → api service → Settings → Domains → `api.sybilshield.com`.

Run migrations once:
```bash
railway run --service=migrate npx tsx src/db/migrate.ts
```

### 8. Verify

```bash
curl https://api.sybilshield.com/health
# {"status":"ok",...}

curl https://sybilshield.com
# Genesis landing
```

## Ongoing

### Scheduled jobs

In Railway → Settings → Cron Jobs:

```
# Weekly drift check (Sundays 00:00 UTC)
0 0 * * 0  cd /app/apps/ml && python -m sybilshield.eval.drift_check_job

# Monthly retrain (1st of month 02:00 UTC)
0 2 1 * *  cd /app/apps/ml && python -m sybilshield.scoring.retrain --model-dir /app/apps/ml/sybilshield/data/models
```

### Backups

Supabase auto-backups daily (Pro plan). Verify in Settings → Database → Backups.

### Monitoring

Free tier of Sentry/PostHog covers initial:
- Sentry → install `@sentry/nextjs` in apps/web and `@sentry/node` in apps/api
- Set `SENTRY_DSN` env var
- PostHog for product analytics later

### Rollback

Each Railway deployment is immutable; rollback via dashboard. Each Vercel deployment same.

### Disaster recovery

Postgres dump weekly to S3 (via cron Job in Railway):
```bash
pg_dump $DATABASE_URL | gzip > /tmp/db.sql.gz
aws s3 cp /tmp/db.sql.gz s3://sybilshield-backups/$(date +%F).sql.gz
```

## Day-2 hardening

- Defamation insurance ($2-5K/yr — Hiscox / Embroker)
- SOC 2 starter (Vanta or Drata) once revenue justifies
- Bug bounty program (Immunefi for Web3-flavor)
- WAF in front of api.sybilshield.com (Cloudflare free)

## Killing the stack

If you need to shut down:
1. Railway → suspend all services (preserves data)
2. Vercel → keep landing as marketing
3. Supabase → keep DB for 90 days then export + delete
4. Alchemy → cancel subscription
5. NowPayments → leave (no monthly fee)

All open-source code stays on GitHub regardless.

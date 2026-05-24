# Deploy on Hetzner CX22 + Cloudflare + Vercel hybrid

Target: full SybilShield backend (api + worker + ml + postgres + redis) on a single
Hetzner CX22 VPS (€4.59/mo), TLS via Let's Encrypt, fronted by Cloudflare DNS.
Frontend stays on Vercel.

**Server:** `178.105.176.105` (Nuremberg)
**Domain:** `sybilshield.org`
**Subdomain for API:** `api.sybilshield.org`

---

## 0. Cloudflare DNS — add `api` record (do this first)

Cloudflare → `sybilshield.org` → DNS → Records → Add:

| Type | Name | Content              | Proxy   | TTL  |
|------|------|----------------------|---------|------|
| A    | `api`  | `178.105.176.105`    | DNS only (grey cloud) | Auto |

⚠️ Keep proxy OFF — we use Let's Encrypt directly on the VPS. You can flip it
to orange-proxy later once you've confirmed the cert works.

---

## 1. First SSH + harden the box

```bash
ssh root@178.105.176.105

# update + install everything we need
apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 git nginx certbot python3-certbot-nginx \
               ufw fail2ban unattended-upgrades

# firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

# automatic security updates
dpkg-reconfigure -plow unattended-upgrades   # accept defaults

# fail2ban (default config blocks SSH brute force, no tweaks needed)
systemctl enable --now fail2ban

# non-root user
adduser --disabled-password --gecos "" sybil
usermod -aG docker sybil
mkdir -p /home/sybil/.ssh
cp ~/.ssh/authorized_keys /home/sybil/.ssh/
chown -R sybil:sybil /home/sybil/.ssh
chmod 700 /home/sybil/.ssh && chmod 600 /home/sybil/.ssh/authorized_keys

# disable root SSH login (optional but recommended)
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl reload ssh
```

From now on, log in as `sybil`:
```bash
ssh sybil@178.105.176.105
```

---

## 2. Clone repo + configure secrets

```bash
git clone https://github.com/Dev-In-Crypt/Sybil-Shield-.git sybilshield
cd sybilshield

# Generate strong Postgres password
PGPASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
echo "Postgres password: $PGPASS   <-- save this somewhere"

cp .env.example .env
nano .env
```

Set at minimum:
```dotenv
# DB password (paste the generated one from above)
POSTGRES_PASSWORD=<paste here>

# Public URLs
API_PUBLIC_URL=https://api.sybilshield.org
WEB_PUBLIC_URL=https://sybilshield.org

# Chain provider — leave empty for mock, paste real key when you have one
ALCHEMY_API_KEY=
USE_MOCK_PROVIDERS=true

# Logging
LOG_LEVEL=info
WORKER_CONCURRENCY=2

# Stripe + NowPayments — leave blank until you wire payments
```

---

## 3. Build + start the stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose ps
# Expect: postgres healthy, redis healthy, migrate exited 0, api/worker/ml Up
```

Check API answers locally:
```bash
curl http://127.0.0.1:3001/health
# {"status":"ok","service":"sybilshield-api",...}
```

If something is unhappy:
```bash
docker compose logs api      # or worker / ml / migrate
docker compose logs -f api   # follow
```

---

## 4. Nginx reverse proxy + Let's Encrypt TLS

```bash
sudo tee /etc/nginx/sites-available/api.sybilshield.org > /dev/null <<'NGINX'
server {
    listen 80;
    server_name api.sybilshield.org;

    # Allow large request bodies for big address-list uploads
    client_max_body_size 32M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_read_timeout 120s;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/api.sybilshield.org /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Issue TLS cert (Let's Encrypt will modify nginx config to add 443 + redirect)
sudo certbot --nginx -d api.sybilshield.org \
  --non-interactive --agree-tos -m hello@sybilshield.org

# Verify
curl https://api.sybilshield.org/health
```

certbot auto-installs a systemd timer for renewal — nothing else to do.

---

## 5. Daily Postgres backup → off-server

```bash
sudo tee /usr/local/bin/sybil-pg-backup.sh > /dev/null <<'BACKUP'
#!/bin/bash
set -e
DATE=$(date +%Y%m%d-%H%M)
OUT=/home/sybil/backups
mkdir -p "$OUT"
cd /home/sybil/sybilshield
docker compose exec -T postgres pg_dump -U sybilshield -Fc sybilshield \
  | gzip > "$OUT/sybilshield-$DATE.sql.gz"
# Keep last 14 days locally
find "$OUT" -name 'sybilshield-*.sql.gz' -mtime +14 -delete
BACKUP

sudo chmod +x /usr/local/bin/sybil-pg-backup.sh

# Daily at 03:00
( sudo crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/sybil-pg-backup.sh" ) \
  | sudo crontab -
```

Later: push backups to S3-compatible storage (Hetzner Storage Box €4/mo or
Backblaze B2 ~$0.50/mo). For now local copy is enough.

### 5a. Monthly billing quota reset

The API increments `customers.api_calls_this_month` on every authed request and
returns `429 monthly_quota_exceeded` when the per-plan limit is hit. To zero
the counter on the 1st of each month, add a cron:

```bash
( sudo crontab -l 2>/dev/null
  echo '5 0 1 * * cd /home/sybil/sybilshield && docker compose exec -T api npx tsx src/scripts/reset-monthly-quota.ts >> /var/log/sybilshield-quota-reset.log 2>&1'
) | sudo crontab -

sudo crontab -l   # verify both backup and reset crons are present
```

Runs at 00:05 on day 1 of every month. Idempotent — safe to re-run.

---

## 6. Wire frontend to the live API

In Vercel → Project → Settings → Environment Variables, update:
```
NEXT_PUBLIC_API_URL = https://api.sybilshield.org
```
Redeploy. The dashboard, lookup, scoring, and playground pages will now hit the
real API.

---

## 7. Smoke test from your laptop

```bash
# Register an account
curl -X POST https://api.sybilshield.org/v1/account/register \
  -H 'content-type: application/json' \
  -d '{"email":"smoke@sybilshield.org"}'
# -> {"api_key":"sk_live_...", ...}

export KEY="sk_live_..."   # paste

# Create a tiny analysis (mock provider gives deterministic random scores)
curl -X POST https://api.sybilshield.org/v1/analyses \
  -H "Authorization: Bearer $KEY" \
  -H 'content-type: application/json' \
  -d '{
    "name":"smoke",
    "chains":["ethereum"],
    "addresses":[
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000002",
      "0x0000000000000000000000000000000000000003"
    ]
  }'

# Wait ~5s, then list analyses
curl -H "Authorization: Bearer $KEY" https://api.sybilshield.org/v1/analyses

# Confirm audit log row was written
ssh sybil@178.105.176.105 \
  "cd sybilshield && docker compose exec -T postgres \
   psql -U sybilshield -c 'SELECT count(*) FROM evidence_audit_log'"
```

Open `https://sybilshield.org` and the dashboard should be live.

---

## 8. Swap mock provider for real Alchemy

Once you have an Alchemy key:
```bash
ssh sybil@178.105.176.105
cd sybilshield
nano .env
# Set:
#   ALCHEMY_API_KEY=alch_live_xxxxxxxxxxxx
#   USE_MOCK_PROVIDERS=false

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d ml worker
# Only ml + worker need to be restarted; api keeps running
```

---

## 9. Updating the deploy when you push to GitHub

```bash
ssh sybil@178.105.176.105
cd sybilshield
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

For zero-downtime updates later, add a GitHub Actions deploy job that SSHes in
and runs the above two lines. Not needed yet.

---

## Common problems

**`docker compose ps` shows api restarting**
→ `docker compose logs api` — usually a missing env var. Check `.env` exists in
the same dir as `docker-compose.yml`.

**`certbot` says "DNS problem: NXDOMAIN looking up A for api.sybilshield.org"**
→ The A record hasn't propagated yet. Wait 5 min and rerun the certbot command.

**Vercel dashboard loads but API calls return CORS errors**
→ Check `WEB_PUBLIC_URL` in `.env` matches your Vercel domain exactly. CORS is
permissive (`origin: true`) by default but a wrong public URL can still break
some checks.

**Out of disk on the VPS**
→ Old docker images pile up. `docker system prune -af --volumes` reclaims
gigabytes. Be careful — this removes anonymous volumes too; the named
`pg_data` / `ml_models` volumes stay.

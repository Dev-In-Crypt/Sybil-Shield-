# Ops scripts

Operational scripts that run on the Hetzner VPS via cron. Source of truth
lives in this repo; deployed copies live at `/home/sybil/sybilshield/scripts/`
after `git pull` (or auto-deploy via `.github/workflows/deploy.yml`).

## `backup.sh`

Daily Postgres backup. Writes a gzipped `pg_dump` to
`/home/sybil/backups/postgres/`, expires copies older than `RETENTION_DAYS`
(default 7), and optionally syncs to Backblaze B2 via `rclone`.

Install cron:

```bash
crontab -l 2>/dev/null > /tmp/cron
echo '0 3 * * *  /home/sybil/sybilshield/scripts/backup.sh >> /home/sybil/sybilshield/logs/backup.log 2>&1' >> /tmp/cron
crontab /tmp/cron
```

Off-site B2 setup (one-time):

```bash
# As root or with sudo:
sudo apt install -y rclone
rclone config         # add a remote named "b2" with your B2 application key
sudo mkdir -p /etc/sybilshield
sudo tee /etc/sybilshield/backup.env >/dev/null <<EOF
B2_BUCKET=sybilshield-backups
B2_RETENTION_DAYS=30
POSTGRES_USER=sybilshield
POSTGRES_DB=sybilshield
EOF
sudo chmod 600 /etc/sybilshield/backup.env
```

Without B2 config, the script just does local rotation — no errors.

### Verifying restore

Backup is only as good as the restore test. Run quarterly:

```bash
docker run --rm -v /home/sybil/backups/postgres:/b -v $(mktemp -d):/restore \
  postgres:16-alpine sh -c \
  'gunzip < /b/$(ls /b | tail -1) | psql -h /restore/test_only.sock'
```

If that errors, your backups are decorative.

## `monitor.sh`

External uptime probe. Hits `/health`, the homepage, `/pricing`, and the
public `/v1/score` lookup every 2 minutes via cron. Sends a Discord (and/or
Telegram) message on state transitions only — no spam every minute.

State is kept in `/var/lib/sybilshield/monitor/` so DOWN→DOWN is silent,
DOWN→UP is a recovery ping, UP→DOWN is an alert.

Install:

```bash
sudo mkdir -p /var/lib/sybilshield/monitor /etc/sybilshield /home/sybil/sybilshield/logs
sudo tee /etc/sybilshield/monitor.env >/dev/null <<EOF
DISCORD_WEBHOOK=https://discord.com/api/webhooks/REPLACE_ME
EOF
sudo chmod 600 /etc/sybilshield/monitor.env

crontab -l 2>/dev/null > /tmp/cron
echo '*/2 * * * *  /home/sybil/sybilshield/scripts/monitor.sh >> /home/sybil/sybilshield/logs/monitor.log 2>&1' >> /tmp/cron
crontab /tmp/cron
```

Without `DISCORD_WEBHOOK`, the script still runs and logs but doesn't ping.

### Add a new probe

Edit the `PROBES` array in `monitor.sh`:

```
"label|url|expected-substring-in-body"
```

If the substring is absent or HTTP isn't 200, the probe is DOWN.

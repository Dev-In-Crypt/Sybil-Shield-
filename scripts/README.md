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

Backup is only as good as the restore test. Run `restore-drill.sh` quarterly
(or after any Postgres major-version bump):

```bash
# Drill the latest local backup file:
scripts/restore-drill.sh /home/sybil/backups/postgres/$(ls -t /home/sybil/backups/postgres | head -1)

# Or, on a dev box with the stack running, drill a freshly-generated dump
# (same pg_dump command backup.sh uses) with no arguments:
scripts/restore-drill.sh
```

It restores into a brand-new, throwaway `docker run postgres:16-alpine`
container (never the real dev/prod database), checks that `customers` and
`analyses` actually have rows afterward, and removes the throwaway container
on exit either way. Exits non-zero — with the last 40 lines of `psql`
output — if anything fails, so it's a real pass/fail gate, not just a manual
eyeball check.

Last executed: 2026-07-15 (TODO-002), against a locally-generated dump — 13
`customers` / 2 `analyses` rows restored correctly. The restore drill has
NOT yet been run against a real Hetzner-produced backup file pulled over SSH
(that step needs separate approval — see AGENTS.md's Forbidden list); this
drill validates that the backup FORMAT + restore PROCEDURE genuinely work,
which is the part that was previously undocumented and untested. See
STATE.md for the full writeup.

(The previous version of this snippet piped a restore into a phantom
`/restore/test_only.sock` that nothing ever started a server on — it would
have failed if anyone had actually run it. Replaced with a version that
was.)

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

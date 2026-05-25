#!/usr/bin/env bash
# Lightweight uptime monitor. Hits each registered probe and posts to a
# Discord webhook on failure (or recovery). State is kept in /tmp so we
# only ping on transitions, not every minute.
#
# Cron: */2 * * * *  /home/sybil/sybilshield/scripts/monitor.sh >> /home/sybil/sybilshield/logs/monitor.log 2>&1
#
# Configure via /etc/sybilshield/monitor.env:
#   DISCORD_WEBHOOK=https://discord.com/api/webhooks/.../...
#   (optional) TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID — pings both if both set

set -euo pipefail

CONFIG=/etc/sybilshield/monitor.env
[ -r "$CONFIG" ] && . "$CONFIG"

STATE_DIR="${STATE_DIR:-/var/lib/sybilshield/monitor}"
mkdir -p "$STATE_DIR"

# label | url | expected substring (optional)
PROBES=(
  "api-health|https://api.sybilshield.org/health|status"
  "web-home|https://www.sybilshield.org/|SybilShield"
  "web-pricing|https://www.sybilshield.org/pricing|Free Sandbox"
  "public-score|https://api.sybilshield.org/v1/score/0xd8da6bf26964af9d7eed9e03e53415d37aa96045|address"
)

notify() {
  local msg="$1"
  echo "[$(date -u +%FT%TZ)] NOTIFY: $msg"
  if [ -n "${DISCORD_WEBHOOK:-}" ]; then
    curl -sS -m 10 -X POST -H "content-type: application/json" \
      -d "{\"content\":\"$msg\"}" "$DISCORD_WEBHOOK" >/dev/null || true
  fi
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -sS -m 10 -X POST \
      "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
      -d "chat_id=$TELEGRAM_CHAT_ID" -d "text=$msg" >/dev/null || true
  fi
}

for entry in "${PROBES[@]}"; do
  IFS='|' read -r label url expect <<< "$entry"
  state_file="$STATE_DIR/$label.state"
  prev_state=$(cat "$state_file" 2>/dev/null || echo "UNKNOWN")

  body=$(curl -sS -m 15 -L --retry 1 -w "\n__HTTP__%{http_code}" "$url" 2>/dev/null || echo "__HTTP__000")
  code=$(echo "$body" | tail -1 | sed 's/__HTTP__//')
  payload=$(echo "$body" | head -n -1)

  status="UP"
  reason=""
  if [ "$code" != "200" ]; then
    status="DOWN"
    reason="http=$code"
  elif [ -n "$expect" ] && ! echo "$payload" | grep -q "$expect"; then
    status="DOWN"
    reason="missing-substring=$expect"
  fi

  echo "$label: $status ($code) prev=$prev_state"

  if [ "$status" != "$prev_state" ]; then
    if [ "$status" = "DOWN" ]; then
      notify "🔴 [$label] DOWN — $reason — $url"
    else
      notify "🟢 [$label] recovered — $url"
    fi
    echo "$status" > "$state_file"
  fi
done

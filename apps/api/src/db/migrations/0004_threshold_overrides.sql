-- Per-analysis threshold overrides (pilot tuning on top of a preset).
-- Nullable jsonb so existing rows stay valid; no backfill needed.

ALTER TABLE "analyses" ADD COLUMN IF NOT EXISTS "threshold_overrides" jsonb;

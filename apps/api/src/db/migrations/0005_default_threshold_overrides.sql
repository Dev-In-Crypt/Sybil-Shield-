-- Per-customer default threshold overrides (TODO-102). Same shape as
-- analyses.threshold_overrides; applied to a new analysis only when the
-- create-analysis request omits its own threshold_overrides.
-- Nullable jsonb so existing rows stay valid; no backfill needed.

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "default_threshold_overrides" jsonb;

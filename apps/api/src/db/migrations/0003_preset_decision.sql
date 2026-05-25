-- Block 1 of the "decision-ready API" iteration.
-- Adds preset + mode to analyses, decision payload + counts to address_scores.
-- All columns nullable / defaulted so existing rows stay valid.

ALTER TABLE "analyses" ADD COLUMN IF NOT EXISTS "preset" text DEFAULT 'balanced';--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN IF NOT EXISTS "mode" text DEFAULT 'full';--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN IF NOT EXISTS "drop_count" integer;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN IF NOT EXISTS "review_count" integer;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN IF NOT EXISTS "keep_count" integer;--> statement-breakpoint

ALTER TABLE "address_scores" ADD COLUMN IF NOT EXISTS "decision" text;--> statement-breakpoint
ALTER TABLE "address_scores" ADD COLUMN IF NOT EXISTS "decision_confidence" text;--> statement-breakpoint
ALTER TABLE "address_scores" ADD COLUMN IF NOT EXISTS "rationale_codes" text[];--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_scores_decision" ON "address_scores" ("analysis_id","decision");

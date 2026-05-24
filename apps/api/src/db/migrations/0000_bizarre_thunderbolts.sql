CREATE TABLE IF NOT EXISTS "address_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"run_id" uuid,
	"address" text NOT NULL,
	"chain" text NOT NULL,
	"sybil_score" integer NOT NULL,
	"confidence" numeric(4, 3),
	"label" text NOT NULL,
	"cluster_id" text,
	"cluster_size" integer,
	"features" jsonb NOT NULL,
	"evidence" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"chains" text[] NOT NULL,
	"address_count" integer NOT NULL,
	"addresses_file_url" text,
	"sensitivity" text DEFAULT 'balanced',
	"include_evidence" boolean DEFAULT true,
	"total_scored" integer,
	"sybil_count" integer,
	"suspicious_count" integer,
	"genuine_count" integer,
	"cluster_count" integer,
	"largest_cluster_size" integer,
	"cu_consumed" bigint,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"processing_time_seconds" integer,
	"results_file_url" text,
	"report_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"model_version_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT true,
	"cu_consumed" bigint,
	"cost_usd" numeric(10, 2),
	"pipeline_config" jsonb,
	"started_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"cluster_id" text NOT NULL,
	"size" integer NOT NULL,
	"detection_method" text NOT NULL,
	"avg_sybil_score" numeric(5, 2),
	"common_funding_source" text,
	"common_pattern" text,
	"temporal_window" text,
	"evidence_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"company" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"api_key_hash" text,
	"api_key_prefix" text,
	"api_calls_this_month" integer DEFAULT 0 NOT NULL,
	"api_calls_limit" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email"),
	CONSTRAINT "customers_api_key_hash_unique" UNIQUE("api_key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidence_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"address" text NOT NULL,
	"chain" text NOT NULL,
	"event_type" text NOT NULL,
	"actor" text NOT NULL,
	"prior_score" integer,
	"new_score" integer,
	"reason" text,
	"evidence_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_store" (
	"address" text NOT NULL,
	"chain" text NOT NULL,
	"features" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_store_address_chain_pk" PRIMARY KEY("address","chain")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"analysis_id" uuid,
	"address" text NOT NULL,
	"chain" text NOT NULL,
	"verdict" text NOT NULL,
	"evidence" text,
	"reviewed" boolean DEFAULT false,
	"promoted_to_label_tier" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "known_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"chain" text NOT NULL,
	"entity_label" text,
	"first_seen_analysis" uuid,
	"times_flagged" integer DEFAULT 1,
	"avg_score" numeric(5, 2),
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "model_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" text NOT NULL,
	"model_artifact_url" text NOT NULL,
	"feature_schema_hash" text NOT NULL,
	"training_manifest_hash" text NOT NULL,
	"eval_metrics" jsonb NOT NULL,
	"trained_at" timestamp with time zone NOT NULL,
	"deployed_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "model_versions_version_unique" UNIQUE("version")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "address_scores" ADD CONSTRAINT "address_scores_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "address_scores" ADD CONSTRAINT "address_scores_run_id_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analyses" ADD CONSTRAINT "analyses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_model_version_id_model_versions_id_fk" FOREIGN KEY ("model_version_id") REFERENCES "public"."model_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clusters" ADD CONSTRAINT "clusters_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evidence_audit_log" ADD CONSTRAINT "evidence_audit_log_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback" ADD CONSTRAINT "feedback_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback" ADD CONSTRAINT "feedback_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "known_entities" ADD CONSTRAINT "known_entities_first_seen_analysis_analyses_id_fk" FOREIGN KEY ("first_seen_analysis") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scores_analysis" ON "address_scores" ("analysis_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scores_address" ON "address_scores" ("address","chain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scores_cluster" ON "address_scores" ("cluster_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scores_label" ON "address_scores" ("analysis_id","label");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analyses_customer" ON "analyses" ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analyses_status" ON "analyses" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_runs_analysis" ON "analysis_runs" ("analysis_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_address" ON "evidence_audit_log" ("address","chain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_analysis" ON "evidence_audit_log" ("analysis_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_known_entity" ON "known_entities" ("address","chain");
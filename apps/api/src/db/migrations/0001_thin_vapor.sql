ALTER TABLE "feedback" ALTER COLUMN "customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "webhook_url" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "webhook_secret" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "source" text DEFAULT 'customer' NOT NULL;
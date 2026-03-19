CREATE TABLE "billable_usage_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"run_id" uuid,
	"source" text NOT NULL,
	"metric" text NOT NULL,
	"quantity" real DEFAULT 0 NOT NULL,
	"unit" text NOT NULL,
	"billable" boolean DEFAULT true NOT NULL,
	"unit_amount" real DEFAULT 0 NOT NULL,
	"amount" real DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"period_key" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"provider_customer_id" text,
	"billing_email" text,
	"portal_url" text,
	"status" text DEFAULT 'not_configured' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_accounts_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "billing_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"billing_account_id" uuid,
	"provider_invoice_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"amount" real DEFAULT 0 NOT NULL,
	"period_key" text,
	"period_start" timestamp,
	"period_end" timestamp,
	"invoice_date" timestamp DEFAULT now() NOT NULL,
	"hosted_invoice_url" text,
	"pdf_url" text,
	"items" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_invoices_provider_invoice_id_unique" UNIQUE("provider_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "billing_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"billing_account_id" uuid,
	"provider_subscription_id" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'not_configured' NOT NULL,
	"interval" text DEFAULT 'month' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"included_runs" integer DEFAULT 0 NOT NULL,
	"included_agents" integer DEFAULT 0 NOT NULL,
	"included_team_members" integer DEFAULT 0 NOT NULL,
	"log_retention_days" integer DEFAULT 30 NOT NULL,
	"overage_unit_amount" real DEFAULT 0 NOT NULL,
	"base_amount" real DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"safety_cap_amount" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_subscriptions_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "public_knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"heading" text,
	"content" text NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"token_count" integer DEFAULT 0 NOT NULL,
	"embedding_model" text,
	"embedding" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"source_path" text NOT NULL,
	"source_type" text DEFAULT 'curated' NOT NULL,
	"summary" text,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"content" text NOT NULL,
	"checksum" text,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "public_knowledge_documents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"tenant_id" uuid,
	"type" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"signature" text,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	CONSTRAINT "webhook_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
ALTER TABLE "billable_usage_ledger" ADD CONSTRAINT "billable_usage_ledger_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billable_usage_ledger" ADD CONSTRAINT "billable_usage_ledger_run_id_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."execution_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_billing_account_id_billing_accounts_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "public"."billing_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_billing_account_id_billing_accounts_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "public"."billing_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_knowledge_chunks" ADD CONSTRAINT "public_knowledge_chunks_document_id_public_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."public_knowledge_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
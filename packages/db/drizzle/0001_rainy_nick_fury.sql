CREATE TABLE "connector_oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"state" text NOT NULL,
	"redirect_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "connector_oauth_states_state_unique" UNIQUE("state")
);
--> statement-breakpoint
ALTER TABLE "connector_accounts" ADD COLUMN "access_token" text;--> statement-breakpoint
ALTER TABLE "connector_accounts" ADD COLUMN "refresh_token" text;--> statement-breakpoint
ALTER TABLE "connector_accounts" ADD COLUMN "token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "connector_accounts" ADD COLUMN "external_account_id" text;--> statement-breakpoint
ALTER TABLE "connector_accounts" ADD COLUMN "connected_at" timestamp;--> statement-breakpoint
ALTER TABLE "connector_oauth_states" ADD CONSTRAINT "connector_oauth_states_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
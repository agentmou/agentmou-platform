-- Migration: AI Receptionist tables and columns

-- clinic_ai_configs: tenant-scoped AI receptionist configuration
CREATE TABLE IF NOT EXISTS "clinic_ai_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
	"enabled" boolean DEFAULT false NOT NULL,
	"persona" text,
	"languages" jsonb DEFAULT '["es"]'::jsonb,
	"business_rules" jsonb DEFAULT '{}'::jsonb,
	"tools_policy" jsonb DEFAULT '{}'::jsonb,
	"model_whatsapp" text DEFAULT 'gpt-4.1-mini' NOT NULL,
	"model_voice" text DEFAULT 'gpt-4.1-mini' NOT NULL,
	"retell_agent_id" text,
	"knowledge_base_enabled" boolean DEFAULT false NOT NULL,
	"handoff_rules" jsonb DEFAULT '{}'::jsonb,
	"daily_token_budget" integer DEFAULT 500000 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "clinic_ai_configs_tenant_uidx"
	ON "clinic_ai_configs" USING btree ("tenant_id");

-- clinic_ai_tool_invocations: audit records for AI tool calls
CREATE TABLE IF NOT EXISTS "clinic_ai_tool_invocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
	"thread_id" uuid REFERENCES "conversation_threads"("id"),
	"run_id" text,
	"tool_name" text NOT NULL,
	"args" jsonb DEFAULT '{}'::jsonb,
	"result" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'success' NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "clinic_ai_tool_invocations_tenant_idx"
	ON "clinic_ai_tool_invocations" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "clinic_ai_tool_invocations_thread_idx"
	ON "clinic_ai_tool_invocations" USING btree ("thread_id");
CREATE INDEX IF NOT EXISTS "clinic_ai_tool_invocations_tenant_created_idx"
	ON "clinic_ai_tool_invocations" USING btree ("tenant_id", "created_at");

-- Add provider and external_call_id to call_sessions
ALTER TABLE "call_sessions" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "call_sessions" ADD COLUMN IF NOT EXISTS "external_call_id" text;
ALTER TABLE "call_sessions" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;

-- Add metadata column to conversation_threads for aiState
ALTER TABLE "conversation_threads" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;

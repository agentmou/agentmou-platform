CREATE TABLE "internal_agent_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role_title" text NOT NULL,
	"department" text NOT NULL,
	"mission" text NOT NULL,
	"parent_agent_id" text,
	"kpis" jsonb DEFAULT '[]'::jsonb,
	"allowed_tools" jsonb DEFAULT '[]'::jsonb,
	"allowed_capabilities" jsonb DEFAULT '[]'::jsonb,
	"allowed_workflow_tags" jsonb DEFAULT '[]'::jsonb,
	"memory_scope" text NOT NULL,
	"risk_budget" text DEFAULT 'low' NOT NULL,
	"participant_budget" integer DEFAULT 4 NOT NULL,
	"max_delegation_depth" integer DEFAULT 3 NOT NULL,
	"escalation_policy" text NOT NULL,
	"playbooks" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_agent_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"parent_agent_id" text NOT NULL,
	"child_agent_id" text NOT NULL,
	"relationship" text DEFAULT 'manages' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"objective_id" uuid NOT NULL,
	"work_order_id" uuid,
	"execution_run_id" uuid,
	"agent_id" text NOT NULL,
	"artifact_type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_capability_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"capability_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_type" text NOT NULL,
	"agent_installation_id" uuid,
	"workflow_installation_id" uuid,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_conversation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"external_chat_id" text NOT NULL,
	"external_user_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_objective_id" uuid,
	"openclaw_session_id" text,
	"last_message" text,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"objective_id" uuid NOT NULL,
	"work_order_id" uuid,
	"agent_id" text NOT NULL,
	"outcome" text NOT NULL,
	"summary" text NOT NULL,
	"rationale" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_delegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"objective_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"sender_agent_id" text NOT NULL,
	"recipient_agent_id" text NOT NULL,
	"parent_delegation_id" uuid,
	"depth" integer DEFAULT 0 NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"envelope" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "internal_memory_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"objective_id" uuid,
	"session_id" uuid,
	"agent_id" text,
	"scope" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"owner_agent_id" text NOT NULL,
	"root_agent_id" text NOT NULL,
	"openclaw_session_id" text,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"requested_by" text NOT NULL,
	"source_message" text NOT NULL,
	"coherence_summary" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "internal_openclaw_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"objective_id" uuid NOT NULL,
	"remote_session_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"active_agent_id" text NOT NULL,
	"primary_agent_id" text NOT NULL,
	"trace_reference" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"last_turn_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "internal_openclaw_sessions_remote_session_id_unique" UNIQUE("remote_session_id")
);
--> statement-breakpoint
CREATE TABLE "internal_protocol_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid,
	"objective_id" uuid,
	"delegation_id" uuid,
	"remote_session_id" text,
	"source" text NOT NULL,
	"source_event_id" text,
	"event_key" text,
	"event_type" text NOT NULL,
	"business_envelope" jsonb DEFAULT '{}'::jsonb,
	"coherence_artifacts" jsonb DEFAULT '{}'::jsonb,
	"trace_reference" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "internal_protocol_events_event_key_unique" UNIQUE("event_key")
);
--> statement-breakpoint
CREATE TABLE "internal_telegram_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid,
	"objective_id" uuid,
	"direction" text NOT NULL,
	"mode" text NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text,
	"update_id" integer,
	"message_id" integer,
	"callback_query_id" text,
	"dedupe_key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "internal_telegram_messages_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "internal_work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"objective_id" uuid NOT NULL,
	"delegation_id" uuid,
	"parent_delegation_id" uuid,
	"agent_id" text NOT NULL,
	"work_type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"execution_target" text DEFAULT 'native' NOT NULL,
	"capability_key" text,
	"openclaw_session_id" text,
	"execution_run_id" uuid,
	"resume_from_work_order_id" uuid,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"approval_request_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "approval_requests" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD COLUMN "source_metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD COLUMN "resume_token" text;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD COLUMN "objective_id" uuid;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD COLUMN "work_order_id" uuid;--> statement-breakpoint
ALTER TABLE "internal_agent_profiles" ADD CONSTRAINT "internal_agent_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_agent_relationships" ADD CONSTRAINT "internal_agent_relationships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_agent_relationships" ADD CONSTRAINT "internal_agent_relationships_parent_agent_id_internal_agent_profiles_id_fk" FOREIGN KEY ("parent_agent_id") REFERENCES "public"."internal_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_agent_relationships" ADD CONSTRAINT "internal_agent_relationships_child_agent_id_internal_agent_profiles_id_fk" FOREIGN KEY ("child_agent_id") REFERENCES "public"."internal_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_artifacts" ADD CONSTRAINT "internal_artifacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_artifacts" ADD CONSTRAINT "internal_artifacts_objective_id_internal_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."internal_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_artifacts" ADD CONSTRAINT "internal_artifacts_work_order_id_internal_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."internal_work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_artifacts" ADD CONSTRAINT "internal_artifacts_execution_run_id_execution_runs_id_fk" FOREIGN KEY ("execution_run_id") REFERENCES "public"."execution_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_artifacts" ADD CONSTRAINT "internal_artifacts_agent_id_internal_agent_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."internal_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_capability_bindings" ADD CONSTRAINT "internal_capability_bindings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_capability_bindings" ADD CONSTRAINT "internal_capability_bindings_agent_installation_id_agent_installations_id_fk" FOREIGN KEY ("agent_installation_id") REFERENCES "public"."agent_installations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_capability_bindings" ADD CONSTRAINT "internal_capability_bindings_workflow_installation_id_workflow_installations_id_fk" FOREIGN KEY ("workflow_installation_id") REFERENCES "public"."workflow_installations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_conversation_sessions" ADD CONSTRAINT "internal_conversation_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_decisions" ADD CONSTRAINT "internal_decisions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_decisions" ADD CONSTRAINT "internal_decisions_objective_id_internal_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."internal_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_decisions" ADD CONSTRAINT "internal_decisions_work_order_id_internal_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."internal_work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_decisions" ADD CONSTRAINT "internal_decisions_agent_id_internal_agent_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."internal_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_delegations" ADD CONSTRAINT "internal_delegations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_delegations" ADD CONSTRAINT "internal_delegations_objective_id_internal_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."internal_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_delegations" ADD CONSTRAINT "internal_delegations_session_id_internal_conversation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."internal_conversation_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_delegations" ADD CONSTRAINT "internal_delegations_sender_agent_id_internal_agent_profiles_id_fk" FOREIGN KEY ("sender_agent_id") REFERENCES "public"."internal_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_delegations" ADD CONSTRAINT "internal_delegations_recipient_agent_id_internal_agent_profiles_id_fk" FOREIGN KEY ("recipient_agent_id") REFERENCES "public"."internal_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_memory_entries" ADD CONSTRAINT "internal_memory_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_memory_entries" ADD CONSTRAINT "internal_memory_entries_objective_id_internal_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."internal_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_memory_entries" ADD CONSTRAINT "internal_memory_entries_session_id_internal_conversation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."internal_conversation_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_memory_entries" ADD CONSTRAINT "internal_memory_entries_agent_id_internal_agent_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."internal_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_objectives" ADD CONSTRAINT "internal_objectives_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_objectives" ADD CONSTRAINT "internal_objectives_session_id_internal_conversation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."internal_conversation_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_objectives" ADD CONSTRAINT "internal_objectives_run_id_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."execution_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_objectives" ADD CONSTRAINT "internal_objectives_owner_agent_id_internal_agent_profiles_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."internal_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_objectives" ADD CONSTRAINT "internal_objectives_root_agent_id_internal_agent_profiles_id_fk" FOREIGN KEY ("root_agent_id") REFERENCES "public"."internal_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_openclaw_sessions" ADD CONSTRAINT "internal_openclaw_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_openclaw_sessions" ADD CONSTRAINT "internal_openclaw_sessions_objective_id_internal_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."internal_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_openclaw_sessions" ADD CONSTRAINT "internal_openclaw_sessions_active_agent_id_internal_agent_profiles_id_fk" FOREIGN KEY ("active_agent_id") REFERENCES "public"."internal_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_openclaw_sessions" ADD CONSTRAINT "internal_openclaw_sessions_primary_agent_id_internal_agent_profiles_id_fk" FOREIGN KEY ("primary_agent_id") REFERENCES "public"."internal_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_protocol_events" ADD CONSTRAINT "internal_protocol_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_protocol_events" ADD CONSTRAINT "internal_protocol_events_session_id_internal_conversation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."internal_conversation_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_protocol_events" ADD CONSTRAINT "internal_protocol_events_objective_id_internal_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."internal_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_protocol_events" ADD CONSTRAINT "internal_protocol_events_delegation_id_internal_delegations_id_fk" FOREIGN KEY ("delegation_id") REFERENCES "public"."internal_delegations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_telegram_messages" ADD CONSTRAINT "internal_telegram_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_telegram_messages" ADD CONSTRAINT "internal_telegram_messages_session_id_internal_conversation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."internal_conversation_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_telegram_messages" ADD CONSTRAINT "internal_telegram_messages_objective_id_internal_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."internal_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_work_orders" ADD CONSTRAINT "internal_work_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_work_orders" ADD CONSTRAINT "internal_work_orders_objective_id_internal_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."internal_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_work_orders" ADD CONSTRAINT "internal_work_orders_delegation_id_internal_delegations_id_fk" FOREIGN KEY ("delegation_id") REFERENCES "public"."internal_delegations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_work_orders" ADD CONSTRAINT "internal_work_orders_parent_delegation_id_internal_delegations_id_fk" FOREIGN KEY ("parent_delegation_id") REFERENCES "public"."internal_delegations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_work_orders" ADD CONSTRAINT "internal_work_orders_agent_id_internal_agent_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."internal_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_work_orders" ADD CONSTRAINT "internal_work_orders_execution_run_id_execution_runs_id_fk" FOREIGN KEY ("execution_run_id") REFERENCES "public"."execution_runs"("id") ON DELETE no action ON UPDATE no action;
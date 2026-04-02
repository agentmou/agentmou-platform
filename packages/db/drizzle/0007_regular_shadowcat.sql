CREATE TABLE "appointment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"actor_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"external_appointment_id" text,
	"service_id" uuid,
	"practitioner_id" uuid,
	"location_id" uuid,
	"thread_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"booked_at" timestamp DEFAULT now() NOT NULL,
	"confirmation_status" text DEFAULT 'pending' NOT NULL,
	"reminder_status" text DEFAULT 'pending' NOT NULL,
	"cancellation_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid,
	"thread_id" uuid,
	"direction" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"provider_call_id" text,
	"from_number" text NOT NULL,
	"to_number" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"summary" text,
	"transcript" text,
	"resolution" text,
	"requires_human_review" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinic_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel_type" text NOT NULL,
	"direction_policy" jsonb DEFAULT '{}'::jsonb,
	"provider" text NOT NULL,
	"connector_account_id" uuid,
	"status" text DEFAULT 'inactive' NOT NULL,
	"phone_number" text,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinic_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_location_id" text,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinic_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vertical" text DEFAULT 'clinic_dental' NOT NULL,
	"specialty" text,
	"display_name" text NOT NULL,
	"timezone" text NOT NULL,
	"business_hours" jsonb DEFAULT '{}'::jsonb,
	"default_inbound_channel" text,
	"requires_new_patient_form" boolean DEFAULT false NOT NULL,
	"confirmation_policy" jsonb DEFAULT '{}'::jsonb,
	"gap_recovery_policy" jsonb DEFAULT '{}'::jsonb,
	"reactivation_policy" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinic_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_service_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confirmation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"channel_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"due_at" timestamp NOT NULL,
	"responded_at" timestamp,
	"response_payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"patient_id" uuid,
	"direction" text NOT NULL,
	"channel_type" text NOT NULL,
	"message_type" text DEFAULT 'text' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"delivery_status" text DEFAULT 'received' NOT NULL,
	"provider_message_id" text,
	"sent_at" timestamp,
	"received_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid,
	"channel_type" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"intent" text DEFAULT 'general_inquiry' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"source" text DEFAULT 'system' NOT NULL,
	"assigned_user_id" uuid,
	"last_message_at" timestamp,
	"last_inbound_at" timestamp,
	"last_outbound_at" timestamp,
	"requires_human_review" boolean DEFAULT false NOT NULL,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gap_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"origin_appointment_id" uuid,
	"service_id" uuid,
	"practitioner_id" uuid,
	"location_id" uuid,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"origin" text DEFAULT 'cancellation' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gap_outreach_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"gap_opportunity_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"channel_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"responded_at" timestamp,
	"result" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"patient_id" uuid,
	"thread_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"required_for_booking" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_form_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"version" text NOT NULL,
	"schema" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"identity_type" text NOT NULL,
	"identity_value" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"confidence_score" real DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_patient_id" text,
	"status" text DEFAULT 'new_lead' NOT NULL,
	"is_existing" boolean DEFAULT false NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"email" text,
	"date_of_birth" date,
	"notes" text,
	"consent_flags" jsonb DEFAULT '{}'::jsonb,
	"source" text DEFAULT 'manual' NOT NULL,
	"last_interaction_at" timestamp,
	"next_suggested_action_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practitioners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_practitioner_id" text,
	"name" text NOT NULL,
	"specialty" text,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactivation_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"campaign_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"audience_definition" jsonb DEFAULT '{}'::jsonb,
	"message_template" jsonb DEFAULT '{}'::jsonb,
	"channel_policy" jsonb DEFAULT '{}'::jsonb,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactivation_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_contact_at" timestamp,
	"last_response_at" timestamp,
	"result" text,
	"generated_appointment_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"channel_type" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"sent_at" timestamp,
	"template_key" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_key" text NOT NULL,
	"status" text DEFAULT 'enabled' NOT NULL,
	"visible_to_client" boolean DEFAULT true NOT NULL,
	"plan_level" text DEFAULT 'free' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"service_id" uuid,
	"practitioner_id" uuid,
	"location_id" uuid,
	"preferred_windows" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"priority_score" real DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_clinic_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."clinic_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_location_id_clinic_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."clinic_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_thread_id_conversation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."conversation_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_thread_id_conversation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."conversation_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_channels" ADD CONSTRAINT "clinic_channels_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_channels" ADD CONSTRAINT "clinic_channels_connector_account_id_connector_accounts_id_fk" FOREIGN KEY ("connector_account_id") REFERENCES "public"."connector_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_locations" ADD CONSTRAINT "clinic_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_profiles" ADD CONSTRAINT "clinic_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_services" ADD CONSTRAINT "clinic_services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmation_requests" ADD CONSTRAINT "confirmation_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmation_requests" ADD CONSTRAINT "confirmation_requests_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_thread_id_conversation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."conversation_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_opportunities" ADD CONSTRAINT "gap_opportunities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_opportunities" ADD CONSTRAINT "gap_opportunities_origin_appointment_id_appointments_id_fk" FOREIGN KEY ("origin_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_opportunities" ADD CONSTRAINT "gap_opportunities_service_id_clinic_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."clinic_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_opportunities" ADD CONSTRAINT "gap_opportunities_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_opportunities" ADD CONSTRAINT "gap_opportunities_location_id_clinic_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."clinic_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_outreach_attempts" ADD CONSTRAINT "gap_outreach_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_outreach_attempts" ADD CONSTRAINT "gap_outreach_attempts_gap_opportunity_id_gap_opportunities_id_fk" FOREIGN KEY ("gap_opportunity_id") REFERENCES "public"."gap_opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_outreach_attempts" ADD CONSTRAINT "gap_outreach_attempts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_form_submissions" ADD CONSTRAINT "intake_form_submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_form_submissions" ADD CONSTRAINT "intake_form_submissions_template_id_intake_form_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."intake_form_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_form_submissions" ADD CONSTRAINT "intake_form_submissions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_form_submissions" ADD CONSTRAINT "intake_form_submissions_thread_id_conversation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."conversation_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_form_templates" ADD CONSTRAINT "intake_form_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_identities" ADD CONSTRAINT "patient_identities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_identities" ADD CONSTRAINT "patient_identities_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactivation_campaigns" ADD CONSTRAINT "reactivation_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactivation_recipients" ADD CONSTRAINT "reactivation_recipients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactivation_recipients" ADD CONSTRAINT "reactivation_recipients_campaign_id_reactivation_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."reactivation_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactivation_recipients" ADD CONSTRAINT "reactivation_recipients_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactivation_recipients" ADD CONSTRAINT "reactivation_recipients_generated_appointment_id_appointments_id_fk" FOREIGN KEY ("generated_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_jobs" ADD CONSTRAINT "reminder_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_jobs" ADD CONSTRAINT "reminder_jobs_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_modules" ADD CONSTRAINT "tenant_modules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_requests" ADD CONSTRAINT "waitlist_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_requests" ADD CONSTRAINT "waitlist_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_requests" ADD CONSTRAINT "waitlist_requests_service_id_clinic_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."clinic_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_requests" ADD CONSTRAINT "waitlist_requests_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_requests" ADD CONSTRAINT "waitlist_requests_location_id_clinic_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."clinic_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_events_appt_idx" ON "appointment_events" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "appointment_events_tenant_event_idx" ON "appointment_events" USING btree ("tenant_id","event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_tenant_ext_uidx" ON "appointments" USING btree ("tenant_id","external_appointment_id");--> statement-breakpoint
CREATE INDEX "appointments_tenant_status_idx" ON "appointments" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "appointments_tenant_starts_at_idx" ON "appointments" USING btree ("tenant_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_tenant_conf_idx" ON "appointments" USING btree ("tenant_id","confirmation_status");--> statement-breakpoint
CREATE INDEX "appointments_patient_idx" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "call_sessions_provider_uidx" ON "call_sessions" USING btree ("tenant_id","provider_call_id");--> statement-breakpoint
CREATE INDEX "call_sessions_tenant_status_idx" ON "call_sessions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "call_sessions_tenant_started_idx" ON "call_sessions" USING btree ("tenant_id","started_at");--> statement-breakpoint
CREATE INDEX "call_sessions_patient_idx" ON "call_sessions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "call_sessions_thread_idx" ON "call_sessions" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "clinic_channels_tenant_idx" ON "clinic_channels" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "clinic_channels_tenant_status_idx" ON "clinic_channels" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "clinic_channels_tenant_phone_idx" ON "clinic_channels" USING btree ("tenant_id","phone_number");--> statement-breakpoint
CREATE INDEX "clinic_channels_tenant_type_status_idx" ON "clinic_channels" USING btree ("tenant_id","channel_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_locations_tenant_ext_uidx" ON "clinic_locations" USING btree ("tenant_id","external_location_id");--> statement-breakpoint
CREATE INDEX "clinic_locations_tenant_active_idx" ON "clinic_locations" USING btree ("tenant_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_profiles_tenant_uidx" ON "clinic_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "clinic_profiles_vertical_idx" ON "clinic_profiles" USING btree ("vertical");--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_services_tenant_slug_uidx" ON "clinic_services" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_services_tenant_ext_uidx" ON "clinic_services" USING btree ("tenant_id","external_service_id");--> statement-breakpoint
CREATE INDEX "clinic_services_tenant_active_idx" ON "clinic_services" USING btree ("tenant_id","active");--> statement-breakpoint
CREATE INDEX "confirmation_requests_tenant_status_idx" ON "confirmation_requests" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "confirmation_requests_tenant_due_idx" ON "confirmation_requests" USING btree ("tenant_id","due_at");--> statement-breakpoint
CREATE INDEX "confirmation_requests_appt_idx" ON "confirmation_requests" USING btree ("appointment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_messages_provider_uidx" ON "conversation_messages" USING btree ("tenant_id","provider_message_id");--> statement-breakpoint
CREATE INDEX "conversation_messages_thread_idx" ON "conversation_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "conversation_messages_tenant_thread_idx" ON "conversation_messages" USING btree ("tenant_id","thread_id");--> statement-breakpoint
CREATE INDEX "conversation_messages_tenant_status_idx" ON "conversation_messages" USING btree ("tenant_id","delivery_status");--> statement-breakpoint
CREATE INDEX "conversation_threads_tenant_status_idx" ON "conversation_threads" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "conversation_threads_tenant_last_msg_idx" ON "conversation_threads" USING btree ("tenant_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversation_threads_tenant_type_status_idx" ON "conversation_threads" USING btree ("tenant_id","channel_type","status");--> statement-breakpoint
CREATE INDEX "conversation_threads_patient_idx" ON "conversation_threads" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "gap_opps_tenant_status_idx" ON "gap_opportunities" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "gap_opps_tenant_starts_idx" ON "gap_opportunities" USING btree ("tenant_id","starts_at");--> statement-breakpoint
CREATE INDEX "gap_opps_origin_appt_idx" ON "gap_opportunities" USING btree ("origin_appointment_id");--> statement-breakpoint
CREATE INDEX "gap_outreach_tenant_status_idx" ON "gap_outreach_attempts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "gap_outreach_gap_idx" ON "gap_outreach_attempts" USING btree ("gap_opportunity_id");--> statement-breakpoint
CREATE INDEX "gap_outreach_patient_idx" ON "gap_outreach_attempts" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "intake_form_submissions_tenant_status_idx" ON "intake_form_submissions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "intake_form_submissions_patient_idx" ON "intake_form_submissions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "intake_form_submissions_thread_idx" ON "intake_form_submissions" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "intake_form_submissions_template_idx" ON "intake_form_submissions" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intake_form_templates_uidx" ON "intake_form_templates" USING btree ("tenant_id","slug","version");--> statement-breakpoint
CREATE INDEX "intake_form_templates_tenant_active_idx" ON "intake_form_templates" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_identities_value_uidx" ON "patient_identities" USING btree ("tenant_id","patient_id","identity_type","identity_value");--> statement-breakpoint
CREATE INDEX "patient_identities_match_idx" ON "patient_identities" USING btree ("tenant_id","identity_type","identity_value");--> statement-breakpoint
CREATE INDEX "patient_identities_patient_idx" ON "patient_identities" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patients_tenant_external_uidx" ON "patients" USING btree ("tenant_id","external_patient_id");--> statement-breakpoint
CREATE INDEX "patients_tenant_status_idx" ON "patients" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "patients_tenant_phone_idx" ON "patients" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "patients_tenant_last_inter_idx" ON "patients" USING btree ("tenant_id","last_interaction_at");--> statement-breakpoint
CREATE INDEX "patients_tenant_next_action_idx" ON "patients" USING btree ("tenant_id","next_suggested_action_at");--> statement-breakpoint
CREATE UNIQUE INDEX "practitioners_tenant_ext_uidx" ON "practitioners" USING btree ("tenant_id","external_practitioner_id");--> statement-breakpoint
CREATE INDEX "practitioners_tenant_active_idx" ON "practitioners" USING btree ("tenant_id","active");--> statement-breakpoint
CREATE INDEX "reactivation_campaigns_tenant_status_idx" ON "reactivation_campaigns" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "reactivation_campaigns_tenant_sched_idx" ON "reactivation_campaigns" USING btree ("tenant_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "reactivation_recipients_tenant_campaign_idx" ON "reactivation_recipients" USING btree ("tenant_id","campaign_id");--> statement-breakpoint
CREATE INDEX "reactivation_recipients_tenant_status_idx" ON "reactivation_recipients" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "reactivation_recipients_patient_idx" ON "reactivation_recipients" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "reminder_jobs_tenant_status_idx" ON "reminder_jobs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "reminder_jobs_tenant_sched_idx" ON "reminder_jobs" USING btree ("tenant_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "reminder_jobs_appt_idx" ON "reminder_jobs" USING btree ("appointment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_modules_tenant_key_uidx" ON "tenant_modules" USING btree ("tenant_id","module_key");--> statement-breakpoint
CREATE INDEX "tenant_modules_tenant_status_idx" ON "tenant_modules" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "waitlist_requests_tenant_status_idx" ON "waitlist_requests" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "waitlist_requests_patient_idx" ON "waitlist_requests" USING btree ("patient_id");
CREATE TABLE IF NOT EXISTS "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token_hash" text NOT NULL,
	"session_type" text DEFAULT 'standard' NOT NULL,
	"admin_impersonation_session_id" uuid,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'auth_sessions_user_id_users_id_fk'
	) THEN
		ALTER TABLE "auth_sessions"
			ADD CONSTRAINT "auth_sessions_user_id_users_id_fk"
			FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
			ON DELETE cascade
			ON UPDATE no action;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'auth_sessions_admin_impersonation_session_id_admin_impersonation_sessions_id_fk'
	) THEN
		ALTER TABLE "auth_sessions"
			ADD CONSTRAINT "auth_sessions_admin_impersonation_session_id_admin_impersonation_sessions_id_fk"
			FOREIGN KEY ("admin_impersonation_session_id")
			REFERENCES "public"."admin_impersonation_sessions"("id")
			ON DELETE set null
			ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_session_token_hash_uidx"
	ON "auth_sessions" USING btree ("session_token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_user_idx"
	ON "auth_sessions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_expires_idx"
	ON "auth_sessions" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_impersonation_idx"
	ON "auth_sessions" USING btree ("admin_impersonation_session_id");

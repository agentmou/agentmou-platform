WITH duplicate_sets AS (
	SELECT
		tenant_id,
		user_id
	FROM memberships
	GROUP BY tenant_id, user_id
	HAVING COUNT(*) > 1
),
canonical_memberships AS (
	SELECT DISTINCT ON (m.tenant_id, m.user_id)
		m.tenant_id,
		m.user_id,
		m.id AS canonical_id
	FROM memberships m
	INNER JOIN duplicate_sets duplicates
		ON duplicates.tenant_id = m.tenant_id
		AND duplicates.user_id = m.user_id
	ORDER BY m.tenant_id, m.user_id, m.joined_at ASC, m.id ASC
),
best_roles AS (
	SELECT DISTINCT ON (m.tenant_id, m.user_id)
		m.tenant_id,
		m.user_id,
		m.role
	FROM memberships m
	INNER JOIN duplicate_sets duplicates
		ON duplicates.tenant_id = m.tenant_id
		AND duplicates.user_id = m.user_id
	ORDER BY
		m.tenant_id,
		m.user_id,
		CASE m.role
			WHEN 'owner' THEN 0
			WHEN 'admin' THEN 1
			WHEN 'member' THEN 2
			WHEN 'operator' THEN 3
			ELSE 4
		END ASC,
		m.joined_at ASC,
		m.id ASC
),
latest_activity AS (
	SELECT
		m.tenant_id,
		m.user_id,
		MAX(m.last_active_at) AS latest_last_active_at
	FROM memberships m
	INNER JOIN duplicate_sets duplicates
		ON duplicates.tenant_id = m.tenant_id
		AND duplicates.user_id = m.user_id
	GROUP BY m.tenant_id, m.user_id
)
UPDATE memberships AS memberships_to_keep
SET
	role = best_roles.role,
	last_active_at = latest_activity.latest_last_active_at
FROM canonical_memberships
INNER JOIN best_roles
	ON best_roles.tenant_id = canonical_memberships.tenant_id
	AND best_roles.user_id = canonical_memberships.user_id
INNER JOIN latest_activity
	ON latest_activity.tenant_id = canonical_memberships.tenant_id
	AND latest_activity.user_id = canonical_memberships.user_id
WHERE memberships_to_keep.id = canonical_memberships.canonical_id;
--> statement-breakpoint
DELETE FROM memberships AS memberships_to_delete
USING (
	WITH duplicate_sets AS (
		SELECT
			tenant_id,
			user_id
		FROM memberships
		GROUP BY tenant_id, user_id
		HAVING COUNT(*) > 1
	),
	canonical_memberships AS (
		SELECT DISTINCT ON (m.tenant_id, m.user_id)
			m.tenant_id,
			m.user_id,
			m.id AS canonical_id
		FROM memberships m
		INNER JOIN duplicate_sets duplicates
			ON duplicates.tenant_id = m.tenant_id
			AND duplicates.user_id = m.user_id
		ORDER BY m.tenant_id, m.user_id, m.joined_at ASC, m.id ASC
	)
	SELECT
		tenant_id,
		user_id,
		canonical_id
	FROM canonical_memberships
) AS canonical_memberships
WHERE memberships_to_delete.tenant_id = canonical_memberships.tenant_id
	AND memberships_to_delete.user_id = canonical_memberships.user_id
	AND memberships_to_delete.id <> canonical_memberships.canonical_id;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "memberships_tenant_user_uidx"
	ON "memberships" USING btree ("tenant_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_tenant_idx"
	ON "memberships" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_user_idx"
	ON "memberships" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_impersonation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_tenant_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"target_tenant_id" uuid NOT NULL,
	"reason" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'admin_impersonation_sessions_actor_user_id_users_id_fk'
	) THEN
		ALTER TABLE "admin_impersonation_sessions"
			ADD CONSTRAINT "admin_impersonation_sessions_actor_user_id_users_id_fk"
			FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id")
			ON DELETE no action
			ON UPDATE no action;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'admin_impersonation_sessions_actor_tenant_id_tenants_id_fk'
	) THEN
		ALTER TABLE "admin_impersonation_sessions"
			ADD CONSTRAINT "admin_impersonation_sessions_actor_tenant_id_tenants_id_fk"
			FOREIGN KEY ("actor_tenant_id") REFERENCES "public"."tenants"("id")
			ON DELETE no action
			ON UPDATE no action;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'admin_impersonation_sessions_target_user_id_users_id_fk'
	) THEN
		ALTER TABLE "admin_impersonation_sessions"
			ADD CONSTRAINT "admin_impersonation_sessions_target_user_id_users_id_fk"
			FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id")
			ON DELETE no action
			ON UPDATE no action;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'admin_impersonation_sessions_target_tenant_id_tenants_id_fk'
	) THEN
		ALTER TABLE "admin_impersonation_sessions"
			ADD CONSTRAINT "admin_impersonation_sessions_target_tenant_id_tenants_id_fk"
			FOREIGN KEY ("target_tenant_id") REFERENCES "public"."tenants"("id")
			ON DELETE no action
			ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_impersonation_sessions_actor_tenant_idx"
	ON "admin_impersonation_sessions" USING btree ("actor_tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_impersonation_sessions_target_tenant_idx"
	ON "admin_impersonation_sessions" USING btree ("target_tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_impersonation_sessions_target_user_idx"
	ON "admin_impersonation_sessions" USING btree ("target_user_id");

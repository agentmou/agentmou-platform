CREATE TABLE IF NOT EXISTS "tenant_vertical_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vertical_key" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'tenant_vertical_configs_tenant_id_tenants_id_fk'
	) THEN
		ALTER TABLE "tenant_vertical_configs"
			ADD CONSTRAINT "tenant_vertical_configs_tenant_id_tenants_id_fk"
			FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
			ON DELETE cascade
			ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_vertical_configs_tenant_vertical_uidx"
	ON "tenant_vertical_configs" USING btree ("tenant_id","vertical_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_vertical_configs_tenant_idx"
	ON "tenant_vertical_configs" USING btree ("tenant_id");
--> statement-breakpoint
UPDATE "tenants"
SET "settings" = jsonb_set(
	jsonb_set(
		jsonb_set(
			COALESCE("settings", '{}'::jsonb),
			'{activeVertical}',
			CASE
				WHEN COALESCE("settings", '{}'::jsonb) ? 'activeVertical'
					THEN COALESCE("settings", '{}'::jsonb)->'activeVertical'
				WHEN COALESCE((COALESCE("settings", '{}'::jsonb)->>'verticalClinicUi')::boolean, false)
					THEN to_jsonb('clinic'::text)
				ELSE to_jsonb('internal'::text)
			END,
			true
		),
		'{isPlatformAdminTenant}',
		CASE
			WHEN COALESCE("settings", '{}'::jsonb) ? 'isPlatformAdminTenant'
				THEN COALESCE("settings", '{}'::jsonb)->'isPlatformAdminTenant'
			ELSE to_jsonb(false)
		END,
		true
	),
	'{settingsVersion}',
	CASE
		WHEN COALESCE("settings", '{}'::jsonb) ? 'settingsVersion'
			THEN COALESCE("settings", '{}'::jsonb)->'settingsVersion'
		ELSE to_jsonb(2)
	END,
	true
)
WHERE NOT (
	COALESCE("settings", '{}'::jsonb) ? 'activeVertical'
	AND COALESCE("settings", '{}'::jsonb) ? 'isPlatformAdminTenant'
	AND COALESCE("settings", '{}'::jsonb) ? 'settingsVersion'
);

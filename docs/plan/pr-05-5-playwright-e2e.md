# PR-05.5: Playwright e2e smoke (Q7-A)

## Objetivo

Instalar Playwright y dejar 4 tests de flujo crítico verdes antes de arrancar PR-06
y PR-07. Estos tests son el cinturón de seguridad para los rediseños visuales
posteriores: si algún refactor rompe login, cambio de vertical, impersonation o
logout, el CI lo pilla antes del review.

## Contexto

Hoy:
- Tests unit en `apps/web/` via Vitest (p.ej. `tenant-routing.test.ts`,
  `tenant-experience.test.ts`) cubren helpers puros.
- **No hay test e2e** de navegación real de usuario.
- PR-06 y PR-07 tocan mucha UI (tokens, primitives, layouts). Alto riesgo de
  regresión invisible.

## Alcance

### Sí entra
- `@playwright/test` como dev-dep en `apps/web`.
- Config `playwright.config.ts` en `apps/web/` con base URL configurable.
- 4 tests críticos en `apps/web/e2e/`:
  1. **login-flow.spec.ts** — login con demo tenant → landing en dashboard clinic.
  2. **vertical-switch.spec.ts** — admin cambia vertical de un tenant → reflejo
     visible en listado.
  3. **impersonation.spec.ts** — admin arranca impersonation → banner visible →
     stop vuelve a actor.
  4. **logout.spec.ts** — logout desde clinic shell → landing en `/login` (blinda
     PR-01).
- Integración mínima en CI (GitHub Actions): job `e2e` que corre contra un server
  `pnpm --filter @agentmou/web dev` levantado por Playwright.
- Script local: `pnpm --filter @agentmou/web test:e2e`.

### No entra
- Visual regression (screenshots pixel-diff). Añadir solo si un regreso nos muerde.
- Cobertura exhaustiva — los 4 tests cubren flujos críticos, nada más.
- Stubbing complejo — usamos el tenant `demo-workspace` y un tenant seed real con
  admin account.

## Cambios técnicos

### Nuevos archivos

- `apps/web/playwright.config.ts` — config con:
  - `baseURL` leído de `E2E_BASE_URL` env var (default `http://localhost:3000`).
  - `webServer` optional (si no hay env var, levanta `next dev`).
  - Browsers: solo chromium en CI para empezar; añadimos firefox/webkit si hace falta.
  - Retries: 2 en CI, 0 local.
  - `use.viewport: { width: 1440, height: 900 }`.
- `apps/web/e2e/login-flow.spec.ts`
- `apps/web/e2e/vertical-switch.spec.ts`
- `apps/web/e2e/impersonation.spec.ts`
- `apps/web/e2e/logout.spec.ts`
- `apps/web/e2e/fixtures.ts` — fixtures comunes (credential helpers, selectors).
- `.github/workflows/e2e.yml` — job CI (si no hay workflow genérico que lo capture).

### Modificados

- `apps/web/package.json`:
  - `devDependencies`: `@playwright/test`.
  - Scripts: `test:e2e`, `test:e2e:ui`, `test:e2e:headed`.
- `apps/web/.gitignore`: añadir `test-results/`, `playwright-report/`, `playwright/.cache/`.
- `pnpm-lock.yaml` regenerado.

### Requisitos de entorno

- Un usuario admin en seed (`pnpm db:seed` debe dejarlo).
- Env vars en CI:
  - `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` (credentials del admin seed).
  - `E2E_API_BASE_URL` (punto de API que levanta la CI en local compose).

## Decisiones de diseño

### ¿Playwright vs Cypress?

**Decisión: Playwright.** Mejor parallel execution, mejor API multi-browser,
mantenido por Microsoft, no hay vendor lock-in con servicio managed. Equipo SaaS
typical. Cypress también vale pero Playwright es lo que yo recomendaría empezando
hoy.

### ¿Tests contra `demo-workspace` o contra seed real?

**Decisión: mix.** Login/logout contra seed real (necesita auth). Vertical switch
e impersonation contra seed real (necesitan admin). `demo-workspace` lo usamos
para verificar que sigue siendo public (bonus check en login-flow).

### ¿Screenshots en los tests?

**Decisión: solo en failure.** Playwright los guarda automáticamente en fallo.
Screenshot comparison (visual regression) lo dejamos para futuro si hay demanda.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Flaky tests por timing | `await expect(...).toBeVisible()` en vez de `waitForTimeout`; retries en CI |
| Seed admin credentials expuestos | Env vars en CI secrets; `.env.e2e.example` con placeholders |
| CI tarda mucho más | Job e2e separado, no bloquea merge inicialmente (`if: github.event.pull_request.draft != true`) |
| Necesita servicios levantados (API, DB) | Workflow levanta compose local; CI runner tiene Docker |

## Criterios de aceptación

- [ ] `pnpm --filter @agentmou/web test:e2e` pasa localmente con compose dev.
- [ ] 4 tests presentes y pasando: login, vertical-switch, impersonation, logout.
- [ ] CI corre el job e2e en PRs no-draft.
- [ ] Report HTML disponible en artifact del job.
- [ ] README de `apps/web/e2e/` explicando cómo arrancar local.
- [ ] No introducir flakiness — tests tirados 10x seguidas pasan ≥ 9/10.

## Plan de pruebas

**Auto-test:**
- Lanzar cada test 3 veces local; asegurar todos pasan.
- Simular fallo: cambiar label de botón → test rompe con mensaje claro.

**CI:**
- Ejecutar en el PR. Debe pasar o fallar honesto.

## Rollback plan

- Revert PR. No afecta a producción. Solo quita tooling de dev.

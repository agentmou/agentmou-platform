# PR-01: Fix logout + routing hardening

## Objetivo

Resolver el bug de logout que deja al usuario en `/app` (pantalla blanca). Endurecer
el gating auth en `proxy.ts`. Uniformar los dos handlers de logout y limpiar los
alias `/platform/*` legacy.

## Contexto

Hoy hay dos formas de cerrar sesión, con handlers distintos:

- `apps/web/components/clinic/clinic-topbar.tsx:112-117` → `await logout(); router.push('/login')`
- `apps/web/components/control-plane/app-shell.tsx:475-484` → `await logout(); window.location.href='/login'`

`router.push` es soft-nav y, si el cookie aún está en el browser por cualquier razón
(dominio cross-subdomain que no coincide exactamente, intermitencia de red en
`logoutApi`), el RSC fetch de `/login` pasa por `proxy.ts:41-44` que detecta
`token && pathname === '/login'` y redirige a `/app`. En `/app/page.tsx:24-31` el
componente devuelve `null` mientras hidrata → pantalla percibida como blanca.

Además, `app/app/[tenantId]/layout.tsx:47` puede redirigir a `/app` (no a `/login`) en
estados transitorios del store (`authUser` truthy, `authTenants` vacío).

## Alcance

### Sí entra
- Route handler `POST /logout` en `apps/web/app/logout/route.ts` que borra cookie
  server-side, llama a `POST /api/v1/auth/logout`, y responde `redirect('/login')`.
- Actualizar ambos handlers para apuntar al nuevo route handler.
- Endurecer `proxy.ts` para que no haga el bounce `/login → /app` si la response
  `me` en el server snapshot daría 401.
- Tests unit del store y route handler.
- Smoke e2e simple (script node) del flujo.
- **Permanent redirect** `/platform/*` → ruta canónica, borrar las páginas duplicadas
  en `apps/web/app/app/[tenantId]/platform/`.

### No entra
- Cambios visuales en el login page.
- Rediseño de la topbar.
- Multi-vertical.
- Refresh tokens / rotación de sesiones.

## Cambios técnicos

### Nuevos archivos
- `apps/web/app/logout/route.ts` — POST + GET handlers.
- `apps/web/app/logout/route.test.ts` — vitest del handler.
- `scripts/test-e2e-logout.ts` — node script que sigue el flujo con cookie jar.

### Archivos modificados
- `apps/web/components/clinic/clinic-topbar.tsx` — sustituir handler client por
  `<form action="/logout" method="post">` envuelto en el DropdownMenuItem.
- `apps/web/components/control-plane/app-shell.tsx` — idem.
- `apps/web/lib/auth/store.ts:158-168` — el `logout()` del store pasa a ser **solo**
  para limpiar estado en cliente tras el submit; ya no llama a `logoutApi` (eso lo
  hace el route handler en servidor).
- `apps/web/proxy.ts` — añadir check de pathname `/logout` en el matcher. Corregir
  el bounce: si el cookie existe pero es inválido, no redirigir `/login → /app`
  ciegamente (alternativa: validar el cookie haciendo una request a `/me` es demasiado
  costoso en middleware; decisión — **dejar que el cliente gestione el edge case**
  y solo hacer el bounce cuando `getServerAuthSnapshot` realmente devuelve algo
  válido en el AuthLayout).
- `apps/web/app/app/[tenantId]/layout.tsx:47` — cambiar
  `router.replace(authUser ? '/app' : '/login')` por
  `router.replace('/login')` cuando el usuario no tiene tenants (es más seguro).
- `apps/web/app/app/[tenantId]/platform/` — borrar completamente; la lógica de alias
  ya está en `tenant-routing.ts:86-107`. Añadir redirects permanentes en `next.config.mjs`.
- `apps/web/lib/auth/constants.ts` — añadir `AUTH_SESSION_COOKIE_PATH = '/'` y
  `AUTH_SESSION_COOKIE_DOMAIN` leído de env; garantizar coincidencia con lo que
  el API pone.

### Migraciones DB
- Ninguna.

### Nuevas rutas (Next)
- `POST /logout` (route handler)
- `GET /logout` → redirige a `POST` mediante meta-refresh si algún link plano lo llama
  (o simplemente `redirect('/login')`).

## Decisiones de diseño

### Server-side logout vs client-side

**Decisión: server-side.** Un route handler garantiza:
1. Clear-cookie determinista con `Set-Cookie` correcto (`Domain`, `Path`, `Max-Age=0`).
2. Forward al API de logout sin depender del CORS en el browser.
3. Redirect server-side (HTTP 303), invisible a la race condition del cliente.

**Alternativa:** mantener client-side con `window.location.href`. Descartada — aún
sufre el race condition de H2, y no borra cookie si el API está caído.

### Borrar `/platform/*` vs mantener

**Decisión: borrar.** El alias ya está en `tenant-routing.ts`. Duplicar las páginas
en `app/app/[tenantId]/platform/` es deuda. Los redirects permanentes preservan
deeplinks externos.

**Alternativa:** mantener por seguridad. Descartada — `docs/architecture/apps-web.md:113`
ya dice que es "compat layer". Mejor momento que ahora no hay.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Borrar `/platform/*` rompe deeplinks externos | Redirects 301 + deja 2 sprints para monitorizar logs |
| `/logout` route handler no acepta CSRF | Usa `method=POST` con form + `same-origin`; si viene GET, redirige con warning (soft deprecation) |
| Proxy endurecido rompe acceso demo | Caso `/app/demo-workspace` ya está excluido en `proxy.ts:30`. Regresión test añadido |
| Cookie domain mal configurado en prod | Documentar explícitamente `AUTH_SESSION_COOKIE_DOMAIN=.agentmou.io` en `.env.example`, validar en boot de API |

## Criterios de aceptación

- [ ] `POST /logout` existe y devuelve `303 Location: /login` con `Set-Cookie: agentmou-session=; Max-Age=0`.
- [ ] Clinic topbar y control-plane shell usan el mismo mecanismo (form POST).
- [ ] El store `logout()` ya no hace fetch directo a `/api/v1/auth/logout` (solo resetea estado, si se sigue usando).
- [ ] Tras logout en cualquiera de los dos shells, la URL final es `/login` sin pasar por `/app`.
- [ ] Si el cookie está corrupto/stale, `/app/*` redirige siempre a `/login`.
- [ ] Los archivos `apps/web/app/app/[tenantId]/platform/` están borrados.
- [ ] `next.config.mjs` tiene redirects 301 de `/app/:t/platform/:path*` → canónico.
- [ ] Tests: `logout/route.test.ts` pasa; vitest del store cubre el nuevo flujo; smoke e2e verde.
- [ ] Ningún `console.log` nuevo.
- [ ] Docs: `docs/runbooks/auth-logout.md` con el flujo documentado.

## Plan de pruebas

**Unit:**
- Store: `logout` ya no llama `logoutApi`; sí limpia estado. Mock `fetch` no debe dispararse.
- Route handler: con cookie presente → llama API mock + responde 303 + Set-Cookie.
- Route handler: sin cookie → responde 303 igualmente (idempotente).
- Route handler: API 500 → sigue limpiando cookie y redirige.

**Integration:**
- Proxy test (existe en `proxy.test.ts`) — añadir caso "cookie + /logout".
- Proxy test "stale cookie + /app" → redirige a /login.

**Manual:**
1. Login con tenant clínica → logout → landing en `/login`.
2. Login con tenant admin → logout → landing en `/login`.
3. Login → abrir segunda pestaña → logout en pestaña 1 → refresh pestaña 2 → landing
   en `/login`.
4. Impersonation activo → logout → acabar con la sesión actor también.

**Smoke script:**
`scripts/test-e2e-logout.ts` con `fetch` + cookie jar siguiendo el flujo completo.

## Rollback plan

- Revert PR completo. No hay migración DB.
- Si el bug volviera en prod antes del revert: hotfix temporal —
  forzar `window.location.href = '/login'` en clinic-topbar.

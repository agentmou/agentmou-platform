# 02 — Preguntas abiertas

Decisiones que necesito que tomes antes de arrancar la ejecución. Bloqueantes al inicio
de cada PR señalados explícitamente.

---

### Q1: ¿El admin vive en `/admin/*` top-level o sigue en `/app/[tenantId]/admin/*`?

**Contexto:**
Hoy el admin está en `/app/[tenantId]/admin/tenants/...` dentro del tenant admin.
Tu briefing propone moverlo a `/admin/clients/...` top-level.

**Opciones:**

- **A) Mover a `/admin/*` top-level** — URLs limpias, independiente del tenantId,
  más natural para impersonación y deep-linking.
  - Pros: clarity, URLs cortas, desacopla admin de tenant en el que el operador esté.
  - Contras: requiere un middleware guard nuevo (`/admin/*` exige `session.actorTenant.isPlatformAdminTenant`), y duplica lógica ya existente en `/app/[t]/admin/*`. También hay que decidir qué pasa si un admin abre `/admin/*` estando en modo impersonation (¿se auto-desimpersona?).
- **B) Mantener en `/app/[tenantId]/admin/*`** — más pragmático, cero migración.
  - Pros: cero esfuerzo, todo sigue funcionando.
  - Contras: URLs largas, `tenantId` ambiguo (¿del admin? ¿del cliente impersonado?).
- **C) Híbrido: canonical `/admin/*` + redirects de `/app/[t]/admin/*`** — lo mejor de los dos.
  - Pros: URLs limpias, retrocompatibilidad.
  - Contras: ~1 PR adicional al plan (añadir a PR-01 o PR-06).

**Mi recomendación: C**.

Motivo: el tiempo extra es bajo (añadir `app/admin/*` que re-use los mismos componentes
y redirigir `app/[t]/admin/*` → `/admin/*`), el benefit UX es grande (copiar URL del
admin no expone el tenantId actual).

---

### Q2: ¿Un tenant puede tener N verticales activas, o solo una?

**Contexto:**
Hoy el modelo es 1 vertical por tenant (`tenants.settings.activeVertical`). Tu
brief pide prepararlo para N sin decidir todavía. En código ya existe
`tenant_vertical_configs` (vacío).

**Opciones:**

- **A) Solo 1 activa, siempre** — más simple, suficiente para MVP.
  - Pros: menos código, menos bugs, modelo mental claro.
  - Contras: no vale para un grupo que quiera dental + fisio en el mismo tenant.
- **B) Modelo preparado para N, UI muestra 1** — lo que hace PR-02 y es la propuesta
  actual. `verticalConfig.enabled` queda como lista pero con length=1 hoy.
  - Pros: contrato futuro-proof sin añadir UX compleja.
  - Contras: si nunca llega demanda, es complejidad muerta (pero limitada).
- **C) Full multi-vertical desde el arranque** — PR-09 en la primera ola.
  - Pros: arranca el patrón desde el principio.
  - Contras: sobre-ingeniería si no hay piloto — UX no probada, riesgo de
    reescribir después.

**Mi recomendación: B**.

Motivo: contratos limpios cuestan barato, UX compleja cuesta caro. Si llega el cliente
piloto, PR-09 se ejecuta con el contrato ya listo y solo hay que hacer UI.

---

### Q3: ¿Client-side Reflag SDK? ¿Para qué?

**Contexto:**
Hoy los flags llegan server-resolved en `TenantExperience.flags`. No hay SDK browser
ni publishable key. Tu brief pide "hook client-side para UI condicional".

**Opciones:**

- **A) No client SDK** — todo server-resolved.
  - Pros: una fuente, determinista, sin bundle extra, imposible de manipular.
  - Contras: cualquier flag nuevo requiere pasar por `TenantExperience` + refactor;
    A/B tests visuales requieren round-trip.
- **B) Client SDK para UI hints no críticos, autz sigue server-side** — lo que plantea PR-03.
  - Pros: flexibilidad para A/B visuales (banners, orden de items, copy variants) sin
    tocar backend; autz sigue siendo segura.
  - Contras: dos fuentes de verdad — riesgo de operador que marque un flag como UI-only
    y alguien lo consuma para autz.
- **C) Client SDK full con decisiones de autz en cliente** — descartada por seguridad.

**Mi recomendación: B con policy estricta**.

Motivo: el valor marginal de A/B visuales ya es tangible (ordenar CTAs, texto), y
prohibir estrictamente autz en cliente se aplica con 1 regla de lint + review. Lo
plasmo como CLAUDE.md rule si se valida.

**Punto a confirmar:** ¿quieres que ponga un ESLint custom rule que prohiba
`useFeatureFlag` en archivos bajo `lib/auth/`, `lib/*-access.ts`, etc.?

---

### Q4: ¿Quién valida la paleta final de tokens en PR-05?

**Contexto:**
PR-05 añade tokens semánticos (surface raised/subtle, border subtle/strong, estados
subtle, radius explícito, type scale). La paleta base (neutro + mint) se mantiene,
pero los nuevos tonos (info-subtle, warning-subtle, etc.) requieren aprobación
visual.

**Opciones:**

- **A) Adoptar los valores propuestos en PR-05** — mi propuesta está calibrada para
  mint + Swiss editorial.
  - Pros: rápido.
  - Contras: riesgo de tener que re-ajustar tras feedback visual.
- **B) Iteración con un diseñador** — antes de merge, pasar el PR por quien haga
  diseño.
  - Pros: mejor resultado.
  - Contras: bloqueado hasta review externa.
- **C) Pasar el PR en modo "draft" y pulir en PR-06/07** donde se ven aplicados.
  - Pros: feedback con pantallas reales.
  - Contras: dos PRs tocando lo mismo.

**Mi recomendación: A, con commit de "refine palette" separado si hay feedback**.

Motivo: los tokens son configurables post-factum sin reescribir componentes si se
cambian en `globals.css`.

---

### Q5: Colores por estado de evento de agenda (PR-07)

**Contexto:**
PR-07 propone:
- `scheduled` → info
- `confirmed` → success
- `cancelled` → muted
- `no-show` → warning
- `complete` → success (icono distinto)

**Opciones:**

- **A) Acepto la propuesta tal cual.**
- **B) Simplificar a 3 estados** (pending / active / closed).
- **C) Otra taxonomía** — tú sabes mejor qué pasa en producción.

**Mi recomendación: A + discutir `no-show` vs `cancelled`**.

Motivo: `no-show` es operacionalmente distinto (paciente no vino) y justifica un
warning explícito para revisión de recepcionista. Pero si esto es un dato que no
se captura de forma fiable, usar warning puede confundir.

---

### Q6: Multi-vertical — ¿qué se comparte entre verticales del mismo tenant? (bloqueante solo para PR-09)

**Contexto:**
Un grupo con dental + fisio: ¿canales compartidos? ¿usuarios compartidos? ¿datos de
paciente compartidos?

**Opciones:**

- **A) Todo compartido a nivel tenant, solo la experiencia cambia** — un usuario ve
  dos shells, pero los datos base son comunes.
- **B) Todo aislado por vertical dentro del tenant** — cada vertical con su propio
  WhatsApp, usuarios, pacientes. Tenant es solo un "wrapper" de billing.
- **C) Híbrido**: identidad+billing+admins compartidos; datos operativos (pacientes,
  canales, citas) por vertical.

**Mi recomendación: esperar al piloto y validar con producto**.

No es una decisión que se pueda tomar en frío — depende de cómo opere el cliente
piloto. Flag PR-09 como "requiere discovery de 1-2 semanas con el cliente antes".

---

### Q7: (No me pediste, pero me importa) ¿Queremos un Playwright e2e antes de PR-06/07?

**Contexto:**
Hoy hay tests unit. PR-06 y PR-07 tocan mucha UI. Sin e2e, el riesgo de regresión
no detectada es real.

**Opciones:**

- **A) Añadir Playwright como PR-05.5** (entre PR-05 y PR-06) con 4 escenarios
  críticos: login, cambio de vertical, impersonation, logout.
- **B) Aceptar el riesgo, confiar en QA manual** previo a merge.
- **C) Contratar un vendor de e2e** (Checkly, Mabl...) externamente.

**Mi recomendación: A**.

Motivo: el coste inicial de Playwright es 1-2 días. Cada regresión cuesta >1 día
de triage + fix + hotfix. En 2 sprints el ROI es positivo.

---

### Q8: ¿Mantener o retirar `/platform/*` en PR-01?

**Contexto:**
`apps/web/app/app/[tenantId]/platform/*` tiene copias de las páginas internas.
`tenant-routing.ts:86` ya hace alias server-side. Propongo borrar las páginas duplicadas
y dejar solo redirect 301.

**Opciones:**

- **A) Borrar páginas + redirect 301.**
- **B) Mantener** por seguridad / preservar routing interno.
- **C) Borrar ahora, pero marcar en changelog que se espera regresión en 1 sprint.**

**Mi recomendación: A**.

Motivo: deuda de alineación con naming canónico. Si algo se rompe, el revert es
trivial y los deeplinks tampoco se pierden (redirect).

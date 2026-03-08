# Resultado

Voy a cruzar tu VPS real, el repo/web actual y la arquitectura objetivo para aterrizar una propuesta que puedas llevar a Cursor sin rehacer todo. Luego te devuelvo una arquitectura cerrada: repo strategy, bounded contexts, runtime y plan por fases.

Ya está bastante claro el cuadro: el frontend actual ya actúa como proto control plane, pero vive sobre catálogo/estado mock, y n8n debe quedar como capability engine, no como producto.

## 1) LECTURA DEL ESTADO ACTUAL (“AS-IS”)

La lectura brutal es esta: **hoy tienes una demo de producto muy convincente, un VPS sano, y n8n funcionando; pero todavía no tienes una plataforma**.

En frontend ya no estás en fase “landing bonita”. El repo actual tiene una parte de marketing, una `app/api/chat`, y un árbol tenantizado con dashboard, marketplace, installer, fleet, observability, runs, security y settings. Además, la base técnica del frontend ya es moderna: Next 16, React 19, Zod, Zustand, Recharts y Radix/shadcn-style components.

En el modelo de datos del frontend ya hay semántica de producto seria: `Tenant`, `AgentTemplate`, `WorkflowTemplate`, `PackTemplate`, instalaciones, approvals, security findings, billing, dashboard metrics y `N8nConnection`. Y `lib/fleetops/mock-data.ts` ya compone el catálogo desde módulos por dominio (`agents-core`, `agents-support`, `agents-sales`, `agents-research`, `agents-personal`, `agents-ops-finance`, `workflows-public`, `workflows-planned`, `integrations`).

Pero detrás de esa semántica, **el backend real todavía no existe**. `mock-api.ts` simula latencia y opera sobre arrays en memoria; y `/api/chat` sigue usando un mock engine con un TODO explícito para sustituirlo por una integración real con OpenAI. O sea: la UI ya habla como producto, pero la ejecución real sigue siendo fake.

Además, el repo actual mezcla **dos generaciones de producto**. Por un lado, tienes la línea nueva `fleetops`; por otro, sobreviven restos de un modelo anterior en `lib/store.ts`, con otros agentes, otro workspace model y persistencia local. Incluso hay pantallas como Settings todavía atadas a mocks heredados (`mockTenants`, `mockBillingInfo`). Eso te dice que el repo actual es útil como semilla UI, pero **no debe convertirse en el sistema maestro del producto**.

La buena noticia es que la **semántica correcta ya está insinuada** en la UI: el marketplace filtra por categoría, riesgo, availability y audience; oculta variants/hidden/deprecated; deriva workflows a partir de los agentes visibles; y el command palette/search ya indexa familia, tags, availability y audience. Es decir: ya tienes el lenguaje de producto correcto para un marketplace de agentes.

La web pública, además, ya vende exactamente la promesa que luego tendrás que cumplir: “AI Agent Fleet + n8n Orchestration”, 88+ agents, 43+ workflows, packs, workspace isolation, HITL, observability y secrets vault. Eso es bueno como visión comercial, pero hoy esa promesa está adelantada respecto al backend real.

Hay costuras claras. La más importante: partes del app siguen confundiendo **catálogo global** con **estado instalado por tenant**. Por ejemplo, la página de observability filtra `agentTemplates` por `tenantId`, aunque `AgentTemplate` no tiene ese campo. Eso confirma que todavía no separaste bien plantilla vs instalación vs ejecución.

Sobre el VPS real, mi lectura es esta:

Lo que está bien:

- Tienes un stack pequeño y limpio: Traefik, Postgres, Redis, n8n, un servicio `agents`, Uptime Kuma.
- Hay separación de red pública e interna.
- La máquina tiene margen de RAM, disco y carga.
- Ya tienes backups y monitoreo básico.
- No estás sobreinfraestructurado. Eso es una ventaja.

Lo que está acoplado o verde:

- `n8n` es hoy el corazón de facto del plano de ejecución, porque es el servicio que está tanto en red pública como interna.
- El servicio `agents` actual parece un contenedor mínimo, más placeholder que runtime serio.
- Los backups están en el mismo VPS: mejor que nada, pero insuficiente.
- `n8n:latest` en producción es mala práctica.
- No veo todavía un control plane real ni una capa de connectors/secrets seria.
- Tampoco veo object storage, ni un modelo claro de tenancy, ni un runtime/event model real.

Mi resumen honesto:

- **Infra base: suficiente.**
- **Producto frontend: muy bien encaminado.**
- **Backend real / separación de responsabilidades: todavía inmaduro.**
- **Momento ideal para rehacer estructura antes de que se convierta en deuda seria.**

---

## 2) VISIÓN DE ARQUITECTURA OBJETIVO (“TO-BE”)

Mi recomendación es esta:

**Un solo producto, dos planos lógicos, un solo catálogo versionado y un runtime orientado a jobs/eventos.**

### Plano 1: Control Plane

Es la parte que “opera el negocio” y que el usuario ve/configura.

Incluye:

- marketing + catálogo
- auth
- workspaces/tenants
- stack builder / installer
- catálogo de agentes, workflows y packs
- connectors / OAuth / secrets
- políticas, approvals y governance
- billing / usage
- consultas de runs / observability

### Plano 2: Data Plane

Es la parte que realmente ejecuta.

Incluye:

- runtime de agentes
- jobs/colas
- invocación de workflows n8n
- integración con LLMs
- RAG / memory
- conectores normalizados
- logs de ejecución
- programaciones y retries

### Arquitectura objetivo, en limpio

```
[ Browser / Web App ]
        |
        v
[ Control Plane API ]
   |        |        \
   |        |         \
   |        |          -> [ Auth / Tenant / Billing / Policies ]
   |        |
   |        -> [ Connectors + Secrets Gateway ]
   |
   -> [ Installations / Workflow Registry / Catalog Loader ]
   |
   -> enqueue jobs
        |
        v
[ Redis / BullMQ ]
        |
        v
[ Worker + Agent Engine ]
   |         |         \
   |         |          -> [ RAG / Memory ]
   |         |
   |         -> [ n8n Adapter / Workflow Runner ]
   |
   -> [ Run Events / Approvals / Audit ]
        |
        v
[ Postgres + pgvector ]    [ Object Storage ]
```

### Cómo se relacionan las capas

**Frontend/web**

- No ejecuta nada importante.
- Presenta catálogo.
- Configura workspaces, integraciones, packs y políticas.
- Consulta runs, approvals y métricas.
- Llama al Control Plane API.

**Control Plane API**

- Es el sistema de registro.
- Guarda tenants, connectors, secrets refs, instalaciones, políticas, approvals y runs resumidos.
- Expone endpoints para instalar agentes/workflows/packs.
- Publica jobs al worker.
- Sirve catálogo al frontend.
- Es también el “integration gateway” lógico al principio.

**Agent Runtime**

- No lo haría como microservicio público desde el día 1.
- Lo haría primero como **motor dentro del worker**.
- Su trabajo es: cargar plantilla del agente, construir contexto, aplicar policy, decidir si responde/actúa/llama workflow, pedir approvals si toca, y registrar pasos.

**n8n**

- Debe pasar de ser “el producto” a ser **el motor de automatización determinista**.
- Lo usaría para cadenas reproducibles, transformaciones, integraciones y scheduling.
- No lo usaría como source of truth de catálogo, tenancy o secretos.
- No dejaría que posea la lógica principal del producto.

**Storage**

- Postgres = source of truth.
- Redis = colas, locks, rate limits y caches.
- Object storage = adjuntos, documentos, exports, ingestas, backups remotos.
- pgvector sobre Postgres para RAG/memory inicial.

**Auth**

- En el control plane.
- Workspace-centric desde el inicio.
- Usuarios, membresías y roles.

**Observability**

- No solo logs técnicos.
- Necesitas observabilidad de producto:
  - instalación
  - runs
  - step timeline
  - approval pending
  - coste por run
  - fallo por integración
  - outcome por agente
- Eso vive en tu DB y lo pinta el frontend.

**Tenant isolation**

- Multi-tenant shared-first.
- `tenant_id` en todo.
- Secrets cifrados por tenant.
- n8n compartido al principio, pero aislado por input/policy/runtime.
- Enterprise después: single-tenant deployment opcional.

**Deployment model**

- Web en Vercel.
- API + worker + n8n + Postgres + Redis + Traefik en VPS.
- n8n interno, no como UI pública de cliente.

La clave aquí es esta:

**No dejes que ni el frontend ni n8n sean el centro del sistema. El centro debe ser el control plane + el modelo de instalaciones/runs/policies.**

---

## 3) RECOMENDACIÓN DE ESTRUCTURA DE REPOS

### Recomendación principal: **monorepo sí**

Y no en empate.

Mi recomendación firme es:

**Crea un monorepo nuevo y absorbe el frontend actual como `apps/web`.**

### Por qué monorepo en tu caso

Porque tu producto no son piezas independientes. Es un sistema donde:

- el catálogo define lo que vende la web,
- el installer usa ese mismo catálogo,
- el backend usa ese mismo catálogo para instalar,
- el runtime usa esos manifests para ejecutar,
- y los workflows n8n también son assets versionados del producto.

Si separas eso demasiado pronto en varios repos, te vas a meter en:

- contratos duplicados,
- slugs y catálogos descuadrados,
- drift entre frontend y backend,
- y una fricción absurda para versionar packs, agentes y workflows.

### Mi stack recomendado

**TypeScript end-to-end** para la base del producto.

- `apps/web`: Next.js
- `services/api`: Fastify
- `services/worker`: Node + BullMQ
- `packages/agent-engine`: runtime lógico de agentes
- `packages/db`: Drizzle + Postgres
- `packages/contracts`: Zod + tipos compartidos
- `packages/catalog-sdk`: carga/valida manifests
- `packages/n8n-client`: adapter de n8n
- `packages/connectors`: clientes normalizados a herramientas externas

### Qué haría con Python

**No lo usaría como base principal ahora.**

Tu servicio actual `agents` en Python no parece un activo estratégico todavía; parece más un placeholder. Si hoy rehaces todo en TS:

- unificas lenguaje,
- compartes tipos,
- reduces contexto mental,
- y avanzas más rápido desde Cursor.

Mi postura:

- **runtime inicial en TS**
- **Python sólo más adelante** si aparece una necesidad clara: OCR avanzado, pipelines ML, extracción compleja, etc.

### Alternativa secundaria

La única alternativa que te aceptaría sería:

- monorepo principal para producto
- repo aparte sólo para infra/IaC cuando ya tengas staging/prod/enterprise más serios

Pero **no ahora**.

---

## 4) PROPUESTA DE ESTRUCTURA DE PROYECTO / MONOREPO

Yo montaría algo así:

```
agentmou-platform/
├─ apps/
│  └─ web/                        # Next.js: marketing + app/control plane
│
├─ services/
│  ├─ api/                        # Control Plane API (Fastify)
│  └─ worker/                     # BullMQ workers + execution jobs
│
├─ packages/
│  ├─ agent-engine/               # Runtime de agentes (library, no público)
│  ├─ catalog-sdk/                # Carga/valida manifests de agentes/workflows/packs
│  ├─ connectors/                 # Abstracciones de Gmail, Slack, Drive, etc.
│  ├─ contracts/                  # Zod schemas, DTOs, shared types
│  ├─ db/                         # Drizzle schema, queries, migrations helpers
│  ├─ n8n-client/                 # Adapter para registrar/ejecutar workflows n8n
│  ├─ observability/              # logger, trace ids, event helpers
│  ├─ auth/                       # auth/session helpers
│  └─ ui/                         # componentes compartidos del frontend si extraes
│
├─ catalog/
│  ├─ agents/
│  │  ├─ inbox-triage/
│  │  │  ├─ manifest.yaml
│  │  │  ├─ prompt.md
│  │  │  ├─ policy.yaml
│  │  │  └─ README.md
│  │  └─ ...
│  ├─ packs/
│  │  ├─ support-starter.yaml
│  │  ├─ sales-accelerator.yaml
│  │  └─ ...
│  └─ categories.yaml
│
├─ workflows/
│  ├─ public/
│  │  ├─ wf-01-auto-label-gmail/
│  │  │  ├─ manifest.yaml
│  │  │  ├─ workflow.json
│  │  │  ├─ fixtures/
│  │  │  └─ README.md
│  │  └─ ...
│  └─ planned/
│     ├─ wf-plan-rag-kb-answer/
│     │  └─ manifest.yaml
│     └─ ...
│
├─ infra/
│  ├─ compose/
│  │  ├─ docker-compose.local.yml
│  │  ├─ docker-compose.prod.yml
│  │  └─ .env.example
│  ├─ traefik/
│  ├─ scripts/
│  └─ backups/
│
├─ docs/
│  ├─ adr/
│  ├─ architecture/
│  ├─ product/
│  └─ runbooks/
│
├─ turbo.json
├─ pnpm-workspace.yaml
└─ README.md
```

### Subestructura interna que sí te recomiendo

### `services/api/src/modules/`

```
auth/
tenants/
memberships/
catalog/
installations/
connectors/
secrets/
approvals/
runs/
usage/
billing/
security/
webhooks/
n8n/
```

### `services/worker/src/jobs/`

```
install-pack/
install-agent/
run-agent/
run-workflow/
schedule-trigger/
approval-timeout/
ingest-document/
rebuild-embeddings/
daily-digest/
```

### `packages/agent-engine/src/`

```
templates/
planner/
policies/
tools/
memory/
workflow-dispatch/
approval-gates/
run-logger/
```

Esto no es un árbol “bonito”; es un árbol que te permite crecer sin liarte.

---

## 5) CÓMO ENCAJA EL FRONTEND DE V0 EN TODO ESTO

Mi recomendación: **sí, absorberlo dentro del repo principal**.

No como repo soberano.

No como proyecto separado eterno.

Sino como:

**`apps/web`**

### Qué reutilizaría

Reutilizaría bastante:

- estructura visual
- componentes UI
- páginas de marketplace
- detail pages
- installer flow
- command palette
- shell del tenant
- semántica de badges / availability / packs / approvals / observability

Porque esa UI ya codifica el producto que quieres vender. El repo ya está organizado entre una parte `(marketing)` y una app tenantizada, y el `FleetOpsShell`/command palette ya apuntan a un control plane bastante reconocible.

### Qué no reutilizaría como base de verdad

No dejaría como fuente de verdad:

- `lib/fleetops/mock-data.ts`
- `mock-api.ts`
- `lib/store.ts`
- `lib/mock-data.ts`
- lógica de páginas que mezcla catálogo global con estado tenant
- el viejo shell/store legacy

El ejemplo más claro es que todavía conviven el modelo viejo de `lib/store.ts` con agentes/instancias locales y el nuevo modelo `fleetops`; además Settings sigue enganchado a mocks heredados. Eso no es base de plataforma; eso es material de migración.

### Cómo lo separaría dentro de `apps/web`

Mantendría una sola app Next, pero con fronteras claras:

- `app/(marketing)` → landing, pricing, docs, catálogo público
- `app/(app)/app/[tenantId]/...` → control plane autenticado
- `lib/server/` → fetchers reales al API
- `lib/catalog/` → lectura build-time del catálogo si quieres SSG para marketing
- `lib/client/` → typed API client

### Qué evolución concreta haría

1. Primero absorbes el repo actual como `apps/web`.
2. Luego sustituyes `mock-data` por:
    - lectura de manifests del catálogo
    - fetch real al API para instalaciones, runs, approvals, connectors
3. Después matas el legacy store viejo.

En resumen:

- **UI actual: sí**
- **mock state actual: no**
- **repo actual como repo maestro: no**

---

## 6) QUÉ HACER CON EL VPS ACTUAL

Mi recomendación concreta:

### Déjalo tal cual, de momento, en estas piezas

Mantendría:

- Traefik
- Postgres
- Redis
- Uptime Kuma
- n8n

Porque eso ya te da una base operativa suficiente para la siguiente fase.

### Qué cambiaría ya

1. **Pin de versiones**
    - Nada de `n8n:latest`.
    - Lo mismo para el resto cuando rehagas compose.
2. **n8n deja de ser cara pública**
    - Mantén n8n en el VPS, sí.
    - Pero no como interfaz pública del producto.
    - Yo lo dejaría sólo en red interna o como mínimo detrás de acceso muy restringido.
3. **El servicio `agents` actual no lo elevaría**
    - No lo trataría como el futuro backend.
    - Lo sustituiría por:
        - `api`
        - `worker`
    - Y el runtime viviría en el worker a través de `packages/agent-engine`.
4. **Redes**
    - Te quedas con dos planos:
        - `edge` / pública
        - `core` / interna
    - `api` en ambas
    - `worker`, `n8n`, `postgres`, `redis` sólo en `core`
    - `web` no en el VPS si la dejas en Vercel
5. **Backups**
    - Mantén tu script actual mientras migras.
    - Pero añade backup remoto ya:
        - Postgres dumps a R2/B2/S3
        - export/versionado de workflows n8n en git
    - Backup en el mismo disco no es backup suficiente.
6. **Storage**
    - Añade object storage externo para:
        - documentos
        - adjuntos
        - exports
        - KB ingestion
    - No metas eso como archivos de producto en `/srv/stack`.

### Qué rol le daría a n8n

**n8n se queda, pero cambia de rol.**

Antes:

- sitio donde “vive la automatización”

Después:

- motor determinista invocado por tu plataforma

Eso significa:

- workflows versionados en git
- instalación/control desde tu backend
- ejecución disparada por tu worker
- integraciones canalizadas por tu gateway
- no usar n8n como catálogo, ni como tenancy model, ni como secret store del producto

### Cómo se conecta con el futuro backend real

Así:

- `apps/web` → `services/api`
- `services/api` → DB / Redis / Connectors / Installations
- `services/api` encola jobs → `services/worker`
- `services/worker` ejecuta `agent-engine`
- `agent-engine` puede:
  - llamar LLM
  - consultar memory/RAG
  - pedir approval
  - invocar un workflow vía `n8n-client`
- `n8n` llama, cuando toca, a endpoints internos del API/connectors gateway

Eso te deja un sistema gobernable.

---

## 7) DOMINIOS / BOUNDED CONTEXTS

Estos son los bounded contexts que yo definiría para este negocio:

### 1. Catalog

Responsable de:

- Agent Templates
- Workflow Templates
- Pack Templates
- categorías, familias, tags
- versiones de templates

Source of truth:

- manifests en git

No debe depender de instalaciones ni tenants.

---

### 2. Tenancy & Identity

Responsable de:

- workspaces/tenants
- members
- roles
- planes
- entornos
- ownership

Source of truth:

- Postgres

---

### 3. Connectors & Secrets

Responsable de:

- definiciones de conectores
- OAuth accounts por tenant
- tokens y refresh tokens
- secret refs / cifrado
- scopes
- test connection

Este contexto es crítico.

No debe vivir dentro de n8n.

---

### 4. Stack Builder & Installations

Responsable de:

- instalar packs/agentes/workflows
- resolver dependencias
- variables de config
- estado de instalación
- rollback/retry de provisioning

Aquí es donde conviertes catálogo en runtime real.

---

### 5. Workflow Registry & Deployment

Responsable de:

- artifacts n8n versionados
- manifest de cada workflow
- install/uninstall
- revision pinning
- compatibilidad template ↔ workflow revision

---

### 6. Agent Runtime

Responsable de:

- cargar plantilla del agente
- construir contexto
- policy checks
- decidir siguiente acción
- invocar tools/workflows
- producir run steps

No tiene por qué ser microservicio público de entrada.

---

### 7. Execution & Jobs

Responsable de:

- colas
- scheduling
- retries
- rate limits
- locks
- fan-out/fan-in
- replays

Este es el motor operativo.

---

### 8. Knowledge & Memory

Responsable de:

- fuentes de conocimiento
- documentos
- chunks
- embeddings
- retrieval
- memory por tenant / por instalación / por usuario

Al principio: simple.

No construyas una “teoría general de la memoria” aún.

---

### 9. Approvals & Governance

Responsable de:

- HITL
- approval requests
- policies por riesgo
- audit trail
- retención
- AI inventory básico
- execution evidence

---

### 10. Observability & Audit

Responsable de:

- execution runs
- run steps
- tool calls
- errores
- costes
- métricas por agente/workflow
- trazabilidad por tenant

No lo confundas con logs técnicos.

Esto es observabilidad de producto.

---

### 11. Usage & Billing

Responsable de:

- metering
- límites
- cuotas
- invoices
- pricing tiers
- add-ons

No hace falta que lo construyas entero en Fase 1, pero el modelo debe existir.

---

### 12. Webhook / Event Ingress

Responsable de:

- recibir eventos externos
- validar firmas
- normalizar payloads
- convertirlos en jobs internos

Esto te ahorra exponer n8n por todos lados.

---

## 8) MODELO DE EJECUCIÓN DEL PRODUCTO

Así debería funcionar el producto de verdad:

### 1. Descubrimiento

El usuario entra en la web.

- navega marketplace
- ve agentes, workflows y packs
- entiende outcomes
- compara opciones

### 2. Creación de workspace

Se registra o entra.

Crea un workspace/tenant.

### 3. Selección de stack

En el builder:

- elige pack o combinación de agentes
- el sistema resuelve workflows requeridos
- ve integraciones necesarias
- ve riesgo/HITL recomendado

### 4. Conexión de herramientas

Conecta Gmail, Slack, Notion, etc.

Los tokens no van a n8n.

Van a tu contexto de Connectors & Secrets.

### 5. Instalación

El usuario confirma instalación.

`api` crea `InstallationRun`.

`worker` provisiona:

- AgentInstallations
- WorkflowInstallations
- schedules
- policies
- defaults
- mapping a workflow revisions

### 6. Activación

El stack queda activo.

Desde aquí, los triggers pueden venir de:

- cron
- webhooks
- inbox/email
- manual run
- acciones desde la app

### 7. Ejecución real

Entra un evento.

`api` lo valida y encola.

`worker` levanta el `agent-engine`.

El agente:

- carga plantilla
- construye contexto
- consulta memoria si toca
- decide si responder, invocar workflow, o pedir aprobación

### 8. Invocación de workflows

Si toca workflow:

- el worker llama a `n8n-client`
- `n8n` ejecuta el workflow versionado
- si hace falta tocar Gmail/Slack/HubSpot, lo hace a través de tu Integration Gateway o de endpoints controlados por tu plataforma

### 9. Governance

Si la acción es de riesgo:

- se crea `ApprovalRequest`
- el run queda `pending_approval`
- el humano aprueba/rechaza
- se reanuda o termina

### 10. Resultado

El resultado queda guardado en:

- run
- run steps
- output payload
- costes
- logs de auditoría
- métricas

### 11. Observación

El usuario entra en:

- Dashboard
- Fleet
- Runs
- Approvals
- Observability
- Security

Y ve:

- qué está instalado
- qué corrió
- qué falló
- qué necesita aprobación
- qué valor generó

Ese es el producto real.

No “chat con IA”, sino **catálogo + instalación + ejecución + gobierno + observabilidad**.

---

## 9) PLAN DE EVOLUCIÓN EN FASES

## Fase 0: ordenar lo actual

Objetivo: dejar de mezclar demo/UI y backend real.

Haría:

- crear monorepo nuevo
- importar frontend actual a `apps/web`
- congelar repo viejo como referencia
- pin de imágenes Docker
- endurecer n8n (interno o acceso restringido)
- preparar backups remotos
- documentar ADRs base
- decidir catálogo como manifests en git

No haría todavía:

- multi-region
- Kubernetes
- billing real complejo
- vector DB separado
- runtime multi-model sofisticado

Deuda aceptable:

- catálogo todavía leído desde archivos
- auth sencilla
- un único VPS

---

## Fase 1: base técnica correcta

Objetivo: tener el esqueleto correcto.

Construiría:

- `packages/contracts`
- `packages/db`
- `packages/catalog-sdk`
- `services/api`
- auth + tenants + memberships
- catálogo servido desde manifests
- connectors/secrets model
- installation model
- workflow registry model

Resultado:

- la web deja de depender de mocks para catálogo estático
- el backend ya existe como control plane real

No haría todavía:

- RAG complejo
- todos los conectores
- enterprise SSO

---

## Fase 2: primer runtime usable

Objetivo: una vertical slice real.

Elegiría un slice pequeño y vendible.

Mi recomendación: **Support Starter**.

Implementaría de verdad:

- install pack
- connect Gmail/Slack
- activar `wf-01`, `wf-02`, `wf-26`
- ejecutar runs
- guardar timeline
- approvals si aplica
- observability mínima

Resultado:

- ya no es “demo”
- ya instala algo
- ya ejecuta algo
- ya deja trazas reales

No haría todavía:

- catálogos enterprise enormes
- planner muy abierto
- memory “mágica”

---

## Fase 3: control plane / multi-tenant / marketplace real

Objetivo: convertirlo en producto utilizable por varios tenants.

Añadiría:

- RBAC básica
- catálogo dinámico desde manifests
- packs reales
- installers con dependencias
- usage metering
- search real
- knowledge sources
- pgvector para KB y memory básica
- políticas por tenant y por instalación

---

## Fase 4: enterprise hardening

Objetivo: poder vender serio.

Añadiría:

- SSO/SAML
- audit export
- retención configurable
- per-tenant encryption strategy
- offsite backups formalizados
- single-tenant deployment option
- AI inventory / policy engine más duro
- staging real y release process

---

## 10) NEXT STEPS DESDE CURSOR / IDE

Esto es lo que yo haría **ya mismo**.

### Paso 1: crear repo nuevo

Nombre sugerido:

- `agentmou-platform`

No sigas extendiendo el repo actual como si fuera el definitivo.

### Paso 2: bootstrap del monorepo

Primero crea:

- `apps/web`
- `services/api`
- `services/worker`
- `packages/contracts`
- `packages/db`
- `packages/catalog-sdk`
- `packages/agent-engine`
- `packages/n8n-client`
- `packages/connectors`
- `infra/compose`
- `catalog/`
- `workflows/`
- `docs/adr`

### Paso 3: migrar el frontend actual

Mueve el repo de v0 a `apps/web`.

Pero hazlo así:

- conserva UI/pages/components
- elimina la idea de que `mock-data.ts` es el core del producto
- empieza a desacoplarlo desde el primer día

### Paso 4: definir contratos antes de programar demasiado

Estos contratos los escribiría antes de casi todo:

### Catálogo

- `AgentTemplateManifest`
- `WorkflowTemplateManifest`
- `PackManifest`

### Instalación

- `AgentInstallation`
- `WorkflowInstallation`
- `StackInstallation`
- `InstallationRun`

### Connectors

- `ConnectorDefinition`
- `ConnectorAccount`
- `SecretEnvelope`
- `ConnectorTestResult`

### Ejecución

- `ExecutionRun`
- `ExecutionStep`
- `RunEvent`
- `ApprovalRequest`
- `ApprovalDecision`

### Runtime

- `StartRunCommand`
- `InvokeWorkflowCommand`
- `ToolInvocation`
- `PolicyCheckResult`

### Knowledge

- `KnowledgeSource`
- `DocumentRecord`
- `ChunkRecord`
- `EmbeddingRecord`

### Paso 5: escribir 5 ADRs antes de construir demasiado

Yo escribiría estas:

- `ADR-001-monorepo.md`
- `ADR-002-control-plane-vs-data-plane.md`
- `ADR-003-n8n-role.md`
- `ADR-004-typescript-runtime-first.md`
- `ADR-005-postgres-pgvector-redis.md`

### Paso 6: primer servicio a codificar

**Primero codificaría `services/api`.**

No el runtime.

Porque el API te fuerza a modelar bien:

- tenants
- catálogo
- instalaciones
- connectors
- secrets
- approvals
- runs query

Y sin eso, el runtime no tiene casa.

### Paso 7: después codificaría `packages/catalog-sdk`

Para leer desde:

- `catalog/agents/*`
- `catalog/packs/*`
- `workflows/public/*`
- `workflows/planned/*`

Con validación fuerte.

### Paso 8: luego `packages/db`

Schema inicial mínimo:

- `tenants`
- `users`
- `memberships`
- `connector_accounts`
- `secret_envelopes`
- `agent_installations`
- `workflow_installations`
- `installation_runs`
- `execution_runs`
- `execution_steps`
- `approval_requests`
- `audit_events`
- `knowledge_sources`
- `documents`
- `chunks`
- `usage_events`

### Paso 9: backlog inicial de 2 semanas

Yo haría este backlog, no 40 cosas a la vez.

### Semana 1

1. Crear monorepo
2. Mover `v0-agentmou` a `apps/web`
3. Crear `contracts`, `catalog-sdk`, `db`
4. Definir manifests de 1 pack + 3 agentes + 3 workflows
5. Crear schema DB y migraciones iniciales
6. Crear `services/api` con:
    - auth placeholder
    - tenants
    - catalog read
    - installations create/list
    - connectors list

### Semana 2

1. Crear `services/worker`
2. Crear `packages/agent-engine`
3. Crear `packages/n8n-client`
4. Implementar vertical slice:

- instalar Support Starter
- conectar Gmail/Slack mock-real
- disparar un run
- invocar un workflow n8n
- guardar timeline
- mostrarlo en la web

Si al final de dos semanas puedes:

- instalar un pack,
- correr una ejecución real,
- ver el run en la UI,

vas por el camino correcto.

---

## 11) DECISIONES RECOMENDADAS

Estas son mis decisiones recomendadas, sin empate:

- **Repo strategy:** monorepo nuevo
- **Monorepo tooling:** `pnpm` + `turborepo`
- **Frontend:** Next.js en `apps/web`
- **Control plane API:** Fastify
- **Runtime:** TypeScript, implementado primero como engine usado por worker
- **Queue / jobs:** Redis + BullMQ
- **Primary DB:** PostgreSQL 16
- **Vector store inicial:** `pgvector` en el mismo Postgres
- **Object storage:** Cloudflare R2 o Backblaze B2
- **Auth:** Better Auth sobre Postgres
- **Enterprise SSO después:** WorkOS o equivalente
- **Catalog source of truth:** manifests versionados en git
- **Workflow registry source of truth:** carpetas versionadas con `manifest.yaml` + `workflow.json`
- **n8n role:** motor de workflows deterministas, no control plane, no catálogo, no secrets store
- **Connectors/secrets:** en tu plataforma, no en n8n
- **Observability:** tablas de runs/steps + structured logs + Sentry + Uptime Kuma
- **Deployment:** web en Vercel; API/worker/n8n/Postgres/Redis/Traefik en VPS
- **Tenancy:** shared multi-tenant primero; single-tenant enterprise después
- **Backup strategy:** dumps + artifacts offsite
- **Infra strategy:** Docker Compose ahora, no Kubernetes
- **Language policy:** TS-first; Python sólo si aparece un caso claro que lo merezca

---

## 12) RIESGOS / ANTIPATRONES A EVITAR

Evita estos errores porque te frenarán muchísimo:

### 1. Convertir n8n en el producto

Si n8n acaba siendo:

- tu catálogo,
- tu secret store,
- tu tenancy layer,
- tu lógica principal,

te vas a bloquear.

### 2. Seguir extendiendo el repo de v0 como si ya fuese la plataforma

No lo es.

Es una muy buena semilla de UI y semántica.

No es la base arquitectónica final.

### 3. Mantener dos modelos de dominio en paralelo

Ahora mismo ya tienes señales de eso:

- `lib/store.ts` legacy
- `fleetops` nuevo
- pages que mezclan catálogo con tenant state

Eso hay que cortar pronto.

### 4. Hacer “falso SaaS”

Es decir:

- una web excelente,
- catálogo enorme,
- packs preciosos,
- pero detrás todo sigue siendo mock + n8n manual + secretos en cualquier sitio

Eso vende una vez y te destruye después.

### 5. Hacer microservicios demasiado pronto

No necesitas 12 servicios desplegables desde el día 1.

Necesitas límites claros y un monorepo limpio.

Servicios reales al principio: `web`, `api`, `worker`.

### 6. Meter Qdrant, Temporal, Kafka, Kubernetes y diez piezas más ahora

Te mata la velocidad.

Con Postgres + pgvector + Redis + BullMQ + n8n ya puedes construir mucho.

### 7. Dejar backups en la misma máquina demasiado tiempo

Eso no es resiliencia.

Es comodidad temporal.

### 8. Exponer n8n como plano público del producto

Mala idea.

Que sea herramienta interna del sistema.

### 9. Clonar workflows por tenant sin estrategia

Si lo haces sin un registry y sin abstraction layer, acabarás con un zoo imposible de mantener.

### 10. No versionar catálogo y workflows como assets del producto

Tus agentes y workflows no son “contenido del frontend”.

Son **artefactos versionados del producto**.

### 11. Hacer un runtime demasiado autónomo demasiado pronto

No empieces con “agentes generales”.

Empieza con:

- plantillas
- policies
- tools
- workflow calls
- approvals
- run logs

Producto serio antes que magia.

### 12. No separar plantilla, instalación y ejecución

Este es el modelo mental más importante:

- **template** = lo que vendes
- **installation** = lo que el tenant activó
- **execution** = lo que realmente corrió

Si mezclas esas tres cosas, el sistema se vuelve inmanejable.

---

Mi recomendación final, sin rodeos:

**Crea un monorepo nuevo. Mete el frontend actual como `apps/web`. Construye un control plane real en `services/api`. Implementa el runtime como engine dentro de `services/worker`. Deja n8n como executor determinista interno. Versiona catálogo y workflows en git. Usa Postgres como source of truth, Redis como cola y pgvector como RAG inicial. Y tu primer slice real debe ser “instalar un pack y ejecutar un run observable”, no “añadir más catálogo”.**

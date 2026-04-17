# PR-07: Clinic dashboard polish

## Objetivo

Aplicar tokens semánticos + jerarquía clara a la experiencia principal del usuario
clínica: dashboard, bandeja (inbox), agenda y sidebar. Esta es la pantalla que el
cliente ve cada día — debe sentirse más madura que la demo actual.

## Contexto

Audit de pantallas (ver `00-audit.md`, sección 7):
- Dashboard: 12/20. Stats cards uniformes y frías.
- Bandeja: 10/20. Pills "READ-ONLY" repetidos, columnas sin peso tipográfico.
- Agenda: (no auditada en detalle, asumido 10/20).
- Sidebar: jerárquicamente plana — todos los items iguales, módulos disabled
  indistinguibles.

Dependencia dura: **PR-05 (tokens)** debe estar merged.

## Alcance

### Sí entra
- Refactor de `apps/web/components/clinic/clinic-dashboard/*` o equivalente
  (leer la estructura real al arrancar la PR).
- Refactor de bandeja: columnas con jerarquía tipográfica, tono por estado.
- Sidebar con "secciones" agrupadas y separación visual entre módulos enabled vs
  disabled.
- Stats cards consolidados — un solo `StatCard` component con 2 tamaños (hero /
  compact).
- Consolidación de `apps/web/components/stat-card.tsx` con otros equivalentes.

### No entra
- Pantallas de configuración / settings (no son daily-driver).
- Pricing / marketing.
- Nuevas features funcionales.

## Cambios técnicos

### Stats cards

Un componente unificado:

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  delta?: { value: string; tone: 'success' | 'warning' | 'destructive' };
  icon?: LucideIcon;
  variant?: 'hero' | 'compact';
}
```

- Hero: big value, label below, optional delta+icon top-right.
- Compact: inline label + value + delta.
- Usa `Card variant="raised"` para hero, `Card variant="subtle"` para compact.

### Bandeja (inbox)

Problemas:
- Todas las filas se ven igual (sender, subject, snippet con mismo weight).
- "READ-ONLY" pill en cada fila (demo workspace).

Solución:
- `Sender` con `--text-primary font-medium`.
- `Subject` con `--text-primary font-normal`.
- `Snippet` con `--text-muted text-sm`.
- `Timestamp` con `--text-muted text-xs font-mono`.
- Status chip (`pendiente`, `confirmado`, `cerrado`) con badge tonal.
- "READ-ONLY" pill → solo en el header de demo workspace, no en cada fila. Usar
  `<DemoBanner>` global (crear si no existe).
- Hover state de fila con `--card-hover`.
- Selected row con `--accent` subtle background.

### Agenda

- Events con tono por estado (`scheduled`, `confirmed`, `cancelled`, `no-show`).
- Cada tipo con color + icono consistente.
- Header con navegación de fecha, búsqueda, filtros.

### Sidebar

- Grupos con `--text-editorial-label` como heading (HOY / SEGUIMIENTO / CONFIG).
- Items disabled con `text-muted-foreground opacity-50` + tooltip "Requires
  `voice` module".
- Indicator dot a la derecha para módulos beta/rollout (si lo traen los flags).
- Active item con `--accent` subtle bg y border-left `--accent`.

### Honest-UI / READ-ONLY pills

- `components/honest-surface.tsx` hoy pinta "READ-ONLY" en cada tarjeta. En el
  tenant demo-workspace, mejor un banner superior una sola vez: "Modo demostración,
  datos ficticios. [Contactar ventas]".
- En el resto de tenants (reales), no debe aparecer.

## Decisiones de diseño

### ¿Unificar `StatCard` sin mirar antes lo que hay?

Hay que **leer primero** `components/stat-card.tsx` y ver qué variantes están en
uso. El plan aquí asume que existe un StatCard principal, pero la PR real debe
confirmarlo antes de refactor.

### Colores por estado de evento

Propuesta:
- scheduled → `info`
- confirmed → `success`
- cancelled → `muted`
- no-show → `warning`
- complete → `success` (distinto icon)

Validar con producto antes de merge (Q5 en `02-open-questions.md`).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Dashboard tiene muchas sub-cards distintas, PR infla | Partir en PR-07a (stats + sidebar) + PR-07b (inbox + agenda) |
| Semántica de estados poco clara | Validar con producto (Q5) antes de mergear |
| Demo workspace depende del pill READ-ONLY en cada card | Verificar que el banner superior es suficiente UX-wise |

## Criterios de aceptación

- [ ] Stats cards unificados y con jerarquía clara.
- [ ] Bandeja con tipografía escalada y tono por estado.
- [ ] Agenda con colors consistentes por estado.
- [ ] Sidebar con grupos + indicadores de módulo disabled.
- [ ] "READ-ONLY" pill solo en demo workspace como banner global, no por item.
- [ ] Screenshots antes/después adjuntos.
- [ ] Modo dark coherente.

## Plan de pruebas

**Visual:**
- Dashboard, bandeja, agenda en light+dark.
- Demo workspace vs tenant real: banner aparece solo en demo.

**Manual:**
- Hover / selected row en inbox.
- Tooltip sobre módulos disabled en sidebar.
- Cambios de estado en agenda reflejan bien.

**Unit:**
- Nuevos tests del StatCard unificado (variant / delta / icon).

## Rollback plan

- Revert. Ningún cambio de API ni DB.

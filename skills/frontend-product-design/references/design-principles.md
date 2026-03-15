# Design Principles — Product Design Reference

Reference for applying product design principles to frontend components (React, Tailwind, shadcn). Read when you need deeper guidance on typography, color, spacing, or accessibility.

## Table of contents

1. [Typographic hierarchy](#typographic-hierarchy)
2. [Spacing system](#spacing-system)
3. [Color and semantics](#color-and-semantics)
4. [Borders and surfaces](#borders-and-surfaces)
5. [Visual feedback and states](#visual-feedback-and-states)
6. [Visual accessibility](#visual-accessibility)
7. [Marketing vs App surfaces](#marketing-vs-app-surfaces)

---

## Typographic hierarchy

### Recommended scales

| Role | Size | Weight | Use |
|------|------|--------|-----|
| Editorial headline | `text-5xl`–`text-8xl` | `font-bold` | Hero, landing |
| Page title | `text-3xl`–`text-4xl` | `font-bold` | Page heading |
| Section title | `text-lg`–`text-xl` | `font-semibold` | Content blocks |
| Body | `text-base` | `font-normal` | Paragraphs |
| Secondary / caption | `text-sm` | `font-normal` | Secondary text |
| Label / micro | `text-xs` or `text-[11px]` | `font-medium` | Labels, breadcrumbs |
| Uppercase label | `text-xs uppercase tracking-[0.05em]` | - | Navigation, categories |

### Tracking

- **Headings**: `tracking-tight` or `leading-[0.95]` for impact
- **Uppercase labels**: `tracking-[0.05em]`–`tracking-[0.1em]`
- **Body**: normal tracking

### Editorial utility classes (when present in the project)

- `text-editorial-headline` — large headlines
- `text-editorial-subhead` — soft subtitles
- `text-editorial-tiny` — micro-copy
- `text-editorial-label` — labels

---

## Spacing system

### Base scale (Tailwind)

| Token | Value | Typical use |
|-------|-------|-------------|
| `space-1` | 4px | Between icons and text |
| `space-2` | 8px | Within small groups |
| `space-3` | 12px | Between related elements |
| `space-4` | 16px | Small card padding |
| `space-5` | 20px | - |
| `space-6` | 24px | Card padding, sections |
| `space-8` | 32px | Between blocks |
| `space-10`–`space-16` | 40–64px | Large sections |

### Rules

- Group with less space; separate with more space (proximity law)
- Cards: `p-4` or `p-6` depending on density
- Grid/flex gaps: `gap-4`–`gap-6`
- Avoid arbitrary values (`p-[13px]`) unless specifically needed

---

## Color and semantics

### Color hierarchy

- **foreground**: main text
- **muted-foreground**: secondary text, labels
- **primary**: CTAs, primary actions
- **accent**: highlights, active states
- **destructive**: destructive actions

### Correct usage

- Do not decorate with color; each use should communicate hierarchy or state
- Subtle backgrounds: `bg-muted`, `bg-secondary`
- Borders: `border-border`, `border-input`
- Avoid raw `#hex`; use project CSS variables

### Contrast

- Text on background: minimum 4.5:1 (WCAG AA)
- Large text: 3:1
- `muted-foreground` on `background`: verify contrast

---

## Borders and surfaces

- **Radius**: use `rounded-sm`, `rounded-md`, `rounded-lg` from the design system
- **Borders**: `border` + `border-border`; optionally `border-border/50` for subtlety
- **Cards**: `border border-border/50 rounded-md` or system equivalent
- Avoid heavy shadows except on modals/popovers; prefer defined borders

---

## Visual feedback and states

### Interactive states

- **Hover**: slight `bg-muted` or brightness change
- **Focus**: `ring` with system color (`ring-accent` or `ring-ring`)
- **Active**: immediate feedback
- **Disabled**: `opacity-50` + `cursor-not-allowed`

### Transitions

- `transition-colors duration-150` or similar for smooth changes
- Respect `prefers-reduced-motion: reduce` (minimal durations)

---

## Visual accessibility

- Do not rely on color alone for information
- Use icons + text when possible
- Visible focus on all interactive elements
- Sufficient contrast in light and dark mode

---

## Marketing vs App surfaces

When the project defines surfaces (`data-surface`):

- **marketing**: allows decorative backgrounds, halftone, more motion
- **app**: clean, functional; avoid decoration; mint/accent as indicator, not as mass fill

On `[data-surface="app"]`, maintain minimalism and prioritize operational readability.

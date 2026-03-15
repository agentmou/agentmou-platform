---
name: frontend-product-design
description: Apply professional product design aesthetics to frontend code. Use when the user wants to refine visual design, improve UI polish, elevate component aesthetics, apply design-system principles, adjust typography/color/spacing like a product designer, make interfaces look more intentional and professional, or integrate a specific component (e.g. from reactbits.dev, shadcn registry) and style it to match the design system. Triggers for "looks better", "polish the UI", "product design", "visual refinement", "aesthetic improvements", "use this component for X", or design feedback on React/Next.js/Tailwind/shadcn components.
---

# Frontend Product Design

## Overview

Refine frontend visual aesthetics by applying professional product design principles: typographic hierarchy, consistent spacing, coherent color palette, micro-interactions, and adherence to the existing design system.

## Preserving user-chosen components

When the user explicitly selects a component (from reactbits.dev, shadcn registry, or any external source):

- **Do not replace** the chosen component with a different one for "design-system purity"
- **Integrate** the component as requested
- **Apply** design tokens (colors, spacing, typography) so it fits the surrounding UI
- **Style** overrides only where needed for consistency (e.g. `border-border`, `text-muted-foreground`, `rounded-md`)
- The user's component choice takes precedence; the skill refines how it looks, not what it is

## Workflow

### 1. Audit context

Before modifying:

- Review `components.json`, `globals.css`, or equivalents to understand the design system
- Identify CSS variables (`--primary`, `--muted`, `--radius`, etc.) and design tokens
- Check for `data-surface` (marketing vs app) or other surface conventions
- Review similar components in the repo for consistency

### 2. Evaluate by dimensions

Apply a quick checklist:

| Dimension | Question |
|-----------|----------|
| **Hierarchy** | Do headings stand out? Is size/weight contrast clear? |
| **Spacing** | Is there consistent visual rhythm? Do padding/margin follow scale (4, 8, 16, 24, 32)? |
| **Color** | Does color usage communicate state/hierarchy correctly? Are arbitrary colors avoided? |
| **Borders/surface** | Do cards, inputs, and containers use system tokens? |
| **Typography** | Are system utility classes used (e.g. `text-editorial-*`) when applicable? |
| **Visual feedback** | Are hover, focus, and active states clear and accessible? |

### 3. Refine without breaking

- Prefer existing tokens over hardcoded values
- Preserve semantic structure (heading levels, landmarks)
- Respect `prefers-reduced-motion`
- Do not introduce colors or fonts outside the system unless explicitly justified

## Key principles

### Typographic hierarchy

- Headings: `tracking-tight`, clear weights (600–700)
- Body: relaxed line-height (`leading-relaxed`) for readability
- Labels / micro-copy: `text-xs` or `text-[11px]`, optional uppercase, `text-muted-foreground`
- Avoid too many sizes; use system scale when available

### Spacing

- Use consistent scales: `space-2` (8px) to `space-8` (32px)
- Group related elements; separate blocks with more space
- Cards/containers: `p-4`–`p-6` for content; consistent margins between cards

### Color and contrast

- Prefer `foreground`/`muted-foreground` for textual hierarchy
- Accent/primary for CTAs and emphasis, not for decoration
- Avoid arbitrary backgrounds or borders; use tokens (`bg-muted`, `border-border`)

### Surfaces and context

- Distinguish marketing (decorative, halftone) vs app (clean, functional)
- On `[data-surface="app"]`, maintain minimalism and functional clarity

## Resources

- **Design principles**: See [references/design-principles.md](references/design-principles.md) for detailed guidance on typography, color, spacing, and accessibility when needed.

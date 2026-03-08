/**
 * UI helpers for category filtering and display.
 *
 * The canonical Category type and CATEGORIES array are defined in
 * @agentmou/contracts and re-exported here for convenience.
 */

import { type Category, CATEGORIES } from '@agentmou/contracts';

export type { Category };
export { CATEGORIES };

// Category dropdown options for filters - these are the ONLY categories shown in dropdowns
export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'core', label: 'Core' },
  { value: 'support', label: 'Support' },
  { value: 'sales', label: 'Sales' },
  { value: 'research', label: 'Research' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finance', label: 'Finance' },
  { value: 'ops', label: 'Ops' },
  { value: 'personal', label: 'Personal' },
]

// Legacy category mapping - normalizes old category strings to canonical categories
const LEGACY_CATEGORY_MAP: Record<string, Category> = {
  // Canonical mappings (identity)
  'core': 'core',
  'support': 'support',
  'sales': 'sales',
  'research': 'research',
  'marketing': 'marketing',
  'finance': 'finance',
  'ops': 'ops',
  'personal': 'personal',
  
  // Legacy label mappings (long form)
  'core & infrastructure': 'core',
  'support & customer ops': 'support',
  'sales & revops': 'sales',
  'research & intelligence': 'research',
  'marketing & content': 'marketing',
  'finance & collections': 'finance',
  'operations / admin / it': 'ops',
  'personal / creator / learning': 'personal',
  
  // Old domain values that need remapping to 'personal'
  'creator': 'personal',
  'education': 'personal',
  'productivity': 'personal',
  
  // Other legacy variations
  'operations': 'ops',
  'admin': 'ops',
  'it': 'ops',
  'intelligence': 'research',
  'revops': 'sales',
  'customer ops': 'support',
  'customer success': 'support',
  'collections': 'finance',
  'content': 'marketing',
  'learning': 'personal',
}

/**
 * Normalizes any category string to a canonical Category.
 * Handles legacy labels, case differences, and whitespace.
 * Returns 'core' as fallback for unknown categories.
 */
export function normalizeCategory(input: string | undefined | null): Category {
  if (!input) return 'core'
  
  // Normalize: lowercase, trim, collapse whitespace
  const normalized = input.toLowerCase().trim().replace(/\s+/g, ' ')
  
  const mapped = LEGACY_CATEGORY_MAP[normalized]
  return mapped ?? 'core' // Default to 'core' for any unknown value
}

/**
 * Checks if a string is a valid canonical category.
 */
export function isValidCategory(input: string): input is Category {
  return CATEGORIES.includes(input as Category)
}

/**
 * Gets the display label for a category (just the category name itself).
 * Returns the input unchanged if not a valid category.
 */
export function getCategoryLabel(category: string): string {
  return isValidCategory(category) ? category : category
}

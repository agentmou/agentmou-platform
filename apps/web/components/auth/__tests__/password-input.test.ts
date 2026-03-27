import { describe, expect, it } from 'vitest'
import { passwordStrengthLabel } from '../password-input'

describe('passwordStrengthLabel', () => {
  it('returns Very weak for empty password', () => {
    expect(passwordStrengthLabel('')).toBe('Very weak')
  })

  it('increases strength with length and complexity', () => {
    expect(passwordStrengthLabel('short')).toBe('Very weak')
    expect(passwordStrengthLabel('longenough')).toBe('Weak')
    const strong = 'Aa1!longenoughpass'
    expect(['Good', 'Strong']).toContain(passwordStrengthLabel(strong))
  })
})

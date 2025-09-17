import { describe, it, expect } from 'vitest'
import { 
  validateSignalInput, 
  validateSignalType, 
  validateSignalValue, 
  validateSignalDate,
  validateDateRange 
} from '../server/signals'

describe('Signal Input Validation', () => {
  describe('Type validation', () => {
    it('rejects undefined type', () => {
      const result = validateSignalType(undefined)
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal type is required')
    })

    it('rejects null type', () => {
      const result = validateSignalType(null as any)
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal type is required')
    })

    it('rejects empty string type', () => {
      const result = validateSignalType('')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal type must be SLEEP or WELLBEING')
    })

    it('rejects invalid type', () => {
      const result = validateSignalType('invalid')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal type must be SLEEP or WELLBEING')
    })

    it('rejects lowercase sleep', () => {
      const result = validateSignalType('sleep')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal type must be SLEEP or WELLBEING')
    })

    it('rejects lowercase wellbeing', () => {
      const result = validateSignalType('wellbeing')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal type must be SLEEP or WELLBEING')
    })

    it('accepts SLEEP type', () => {
      const result = validateSignalType('SLEEP')
      expect(result.ok).toBe(true)
      expect(result.type).toBe('SLEEP')
    })

    it('accepts WELLBEING type', () => {
      const result = validateSignalType('WELLBEING')
      expect(result.ok).toBe(true)
      expect(result.type).toBe('WELLBEING')
    })

    it('trims whitespace around type', () => {
      const result = validateSignalType('  SLEEP  ')
      expect(result.ok).toBe(true)
      expect(result.type).toBe('SLEEP')
    })
  })

  describe('SLEEP value validation', () => {
    it('rejects undefined value', () => {
      const result = validateSignalValue(undefined, 'SLEEP')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal value is required')
    })

    it('rejects null value', () => {
      const result = validateSignalValue(null as any, 'SLEEP')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal value is required')
    })

    it('rejects NaN value', () => {
      const result = validateSignalValue(NaN, 'SLEEP')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal value must be a valid number')
    })

    it('rejects Infinity value', () => {
      const result = validateSignalValue(Infinity, 'SLEEP')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal value must be a valid number')
    })

    it('rejects negative values', () => {
      const result = validateSignalValue(-1, 'SLEEP')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Sleep hours must be in 0.25-hour increments (7.25, 7.50, 7.75, etc.)')
    })

    it('accepts 0', () => {
      const result = validateSignalValue(0, 'SLEEP')
      expect(result.ok).toBe(true)
      expect(result.value).toBe(0)
    })

    it('accepts 0.25', () => {
      const result = validateSignalValue(0.25, 'SLEEP')
      expect(result.ok).toBe(true)
      expect(result.value).toBe(0.25)
    })

    it('accepts 7.25', () => {
      const result = validateSignalValue(7.25, 'SLEEP')
      expect(result.ok).toBe(true)
      expect(result.value).toBe(7.25)
    })

    it('accepts 7.50', () => {
      const result = validateSignalValue(7.5, 'SLEEP')
      expect(result.ok).toBe(true)
      expect(result.value).toBe(7.5)
    })

    it('accepts 7.75', () => {
      const result = validateSignalValue(7.75, 'SLEEP')
      expect(result.ok).toBe(true)
      expect(result.value).toBe(7.75)
    })

    it('accepts 14 (upper bound)', () => {
      const result = validateSignalValue(14, 'SLEEP')
      expect(result.ok).toBe(true)
      expect(result.value).toBe(14)
    })

    it('rejects 7.3 (not 0.25 increment)', () => {
      const result = validateSignalValue(7.3, 'SLEEP')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Sleep hours must be in 0.25-hour increments (7.25, 7.50, 7.75, etc.)')
    })

    it('rejects 14.25 (exceeds upper bound)', () => {
      const result = validateSignalValue(14.25, 'SLEEP')
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Sleep hours can't exceed 14")
    })

    it('rejects 15 (exceeds upper bound)', () => {
      const result = validateSignalValue(15, 'SLEEP')
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Sleep hours can't exceed 14")
    })

    it('rejects 0.1 (not 0.25 increment)', () => {
      const result = validateSignalValue(0.1, 'SLEEP')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Sleep hours must be in 0.25-hour increments (7.25, 7.50, 7.75, etc.)')
    })
  })

  describe('WELLBEING value validation', () => {
    it('rejects 0', () => {
      const result = validateSignalValue(0, 'WELLBEING')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Wellbeing must be a whole number between 1 and 10')
    })

    it('accepts 1', () => {
      const result = validateSignalValue(1, 'WELLBEING')
      expect(result.ok).toBe(true)
      expect(result.value).toBe(1)
    })

    it('accepts 5', () => {
      const result = validateSignalValue(5, 'WELLBEING')
      expect(result.ok).toBe(true)
      expect(result.value).toBe(5)
    })

    it('accepts 10', () => {
      const result = validateSignalValue(10, 'WELLBEING')
      expect(result.ok).toBe(true)
      expect(result.value).toBe(10)
    })

    it('rejects 11', () => {
      const result = validateSignalValue(11, 'WELLBEING')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Wellbeing must be a whole number between 1 and 10')
    })

    it('rejects 7.5 (not integer)', () => {
      const result = validateSignalValue(7.5, 'WELLBEING')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Wellbeing must be a whole number between 1 and 10')
    })

    it('rejects negative values', () => {
      const result = validateSignalValue(-1, 'WELLBEING')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Wellbeing must be a whole number between 1 and 10')
    })
  })

  describe('Date validation', () => {
    it('rejects undefined date', () => {
      const result = validateSignalDate(undefined)
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Date is required')
    })

    it('rejects null date', () => {
      const result = validateSignalDate(null as any)
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Date is required')
    })

    it('rejects empty string date', () => {
      const result = validateSignalDate('')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Date must be valid')
    })

    it('rejects invalid date format', () => {
      const result = validateSignalDate('invalid-date')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Date must be valid')
    })

    it('rejects MM/DD/YYYY format', () => {
      const result = validateSignalDate('12/25/2024')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Date must be valid')
    })

    it('rejects impossible date', () => {
      const result = validateSignalDate('2024-02-30')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Date must be valid')
    })

    it('rejects impossible month', () => {
      const result = validateSignalDate('2024-13-01')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Date must be valid')
    })

    it('accepts valid date', () => {
      const result = validateSignalDate('2024-12-25')
      expect(result.ok).toBe(true)
      expect(result.date).toEqual(new Date('2024-12-25T00:00:00.000Z'))
    })

    it('trims whitespace around date', () => {
      const result = validateSignalDate('  2024-12-25  ')
      expect(result.ok).toBe(true)
      expect(result.date).toEqual(new Date('2024-12-25T00:00:00.000Z'))
    })

    it('accepts leap year date', () => {
      const result = validateSignalDate('2024-02-29')
      expect(result.ok).toBe(true)
      expect(result.date).toEqual(new Date('2024-02-29T00:00:00.000Z'))
    })

    it('rejects Feb 29 on non-leap year', () => {
      const result = validateSignalDate('2023-02-29')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Date must be valid')
    })
  })

  describe('Complete signal input validation', () => {
    it('accepts complete valid SLEEP signal', () => {
      const result = validateSignalInput({
        type: 'SLEEP',
        date: '2024-12-25',
        value: 7.75
      })
      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        type: 'SLEEP',
        date: new Date('2024-12-25T00:00:00.000Z'),
        value: 7.75
      })
    })

    it('accepts complete valid WELLBEING signal', () => {
      const result = validateSignalInput({
        type: 'WELLBEING',
        date: '2024-12-25',
        value: 8
      })
      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        type: 'WELLBEING',
        date: new Date('2024-12-25T00:00:00.000Z'),
        value: 8
      })
    })

    it('rejects missing type', () => {
      const result = validateSignalInput({
        date: '2024-12-25',
        value: 8
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal type is required')
    })

    it('rejects missing date', () => {
      const result = validateSignalInput({
        type: 'SLEEP',
        value: 8
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Date is required')
    })

    it('rejects missing value', () => {
      const result = validateSignalInput({
        type: 'SLEEP',
        date: '2024-12-25'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal value is required')
    })
  })

  describe('Partial signal input validation', () => {
    it('allows only type in partial mode', () => {
      const result = validateSignalInput({
        type: 'SLEEP'
      }, { partial: true })
      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        type: 'SLEEP'
      })
    })

    it('allows only date in partial mode', () => {
      const result = validateSignalInput({
        date: '2024-12-25'
      }, { partial: true })
      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        date: new Date('2024-12-25T00:00:00.000Z')
      })
    })

    it('allows only value in partial mode', () => {
      const result = validateSignalInput({
        value: 7.5,
        type: 'SLEEP' // Need type context for value validation
      }, { partial: true })
      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        type: 'SLEEP',
        value: 7.5
      })
    })

    it('still validates field constraints in partial mode', () => {
      const result = validateSignalInput({
        type: 'invalid'
      }, { partial: true })
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Signal type must be SLEEP or WELLBEING')
    })

    it('validates multiple fields in partial mode', () => {
      const result = validateSignalInput({
        type: 'WELLBEING',
        value: 9
      }, { partial: true })
      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        type: 'WELLBEING',
        value: 9
      })
    })
  })
})

describe('Date Range Validation', () => {
  it('allows no filters', () => {
    const result = validateDateRange({})
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({})
  })

  it('allows only type filter', () => {
    const result = validateDateRange({ type: 'SLEEP' })
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({ type: 'SLEEP' })
  })

  it('allows only from filter', () => {
    const result = validateDateRange({ from: '2024-01-01' })
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({
      from: new Date('2024-01-01T00:00:00.000Z')
    })
  })

  it('allows only to filter', () => {
    const result = validateDateRange({ to: '2024-12-31' })
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({
      to: new Date('2024-12-31T00:00:00.000Z')
    })
  })

  it('allows from and to filters', () => {
    const result = validateDateRange({
      from: '2024-01-01',
      to: '2024-12-31'
    })
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({
      from: new Date('2024-01-01T00:00:00.000Z'),
      to: new Date('2024-12-31T00:00:00.000Z')
    })
  })

  it('rejects invalid type', () => {
    const result = validateDateRange({ type: 'invalid' })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Signal type must be SLEEP or WELLBEING')
  })

  it('rejects invalid from date', () => {
    const result = validateDateRange({ from: 'invalid-date' })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Date must be valid')
  })

  it('rejects invalid to date', () => {
    const result = validateDateRange({ to: 'invalid-date' })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Date must be valid')
  })

  it('rejects empty from date', () => {
    const result = validateDateRange({ from: '' })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Date must be valid')
  })

  it('rejects empty to date', () => {
    const result = validateDateRange({ to: '' })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Date must be valid')
  })

  it('rejects from > to', () => {
    const result = validateDateRange({
      from: '2024-12-31',
      to: '2024-01-01'
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('From date must be before or equal to to date')
  })

  it('accepts from = to', () => {
    const result = validateDateRange({
      from: '2024-01-01',
      to: '2024-01-01'
    })
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({
      from: new Date('2024-01-01T00:00:00.000Z'),
      to: new Date('2024-01-01T00:00:00.000Z')
    })
  })

  it('rejects date range > 400 days', () => {
    const result = validateDateRange({
      from: '2024-01-01',
      to: '2025-02-06' // More than 400 days
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Date range cannot exceed 400 days')
  })

  it('accepts date range of exactly 400 days', () => {
    const result = validateDateRange({
      from: '2024-01-01',
      to: '2025-02-04' // Exactly 400 days
    })
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({
      from: new Date('2024-01-01T00:00:00.000Z'),
      to: new Date('2025-02-04T00:00:00.000Z')
    })
  })
})
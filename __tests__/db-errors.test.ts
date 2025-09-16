/**
 * Unit Tests for Database Error to User Copy Mapper (Strict)
 * 
 * Tests exact scenarios specified for stable constraint identifiers
 * and verifies exact Domain Specification v1.3 copy.
 */

import { describe, it, expect } from 'vitest'
import { mapDbErrorToUserCopy, isUniqueViolation, getConstraintName } from '../lib/db-errors'

describe('Database Error Mapper (Strict)', () => {
  describe('mapDbErrorToUserCopy', () => {
    it('should handle LifeArea duplicate (P2002 with nameNorm target)', () => {
      const error = {
        code: 'P2002',
        meta: {
          target: ['userId', 'nameNorm']
        }
      }

      const ctx = { lifeAreaName: 'Health' }
      
      const result = mapDbErrorToUserCopy(error, ctx)
      expect(result).toBe("You already have a life area named 'Health'")
    })

    it('should handle WeeklyTask duplicate (P2002 with meta target)', () => {
      const error = {
        code: 'P2002',
        meta: {
          target: ['userId', 'weekStart', 'titleNorm']
        }
      }

      const ctx = { 
        title: 'Meditate', 
        weekStart: '2025-09-15' 
      }
      
      const result = mapDbErrorToUserCopy(error, ctx)
      expect(result).toBe("You already have a task called 'Meditate' for the week of 2025-09-15")
    })

    it('should handle WeeklyTask duplicate (PG 23505 with constraint name)', () => {
      const error = {
        code: '23505',
        constraint: 'uniq_weeklytask_user_week_title'
      }

      const ctx = { 
        title: 'Meditate', 
        weekStart: '2025-09-15' 
      }
      
      const result = mapDbErrorToUserCopy(error, ctx)
      expect(result).toBe("You already have a task called 'Meditate' for the week of 2025-09-15")
    })

    it('should handle WeeklyFocusTheme duplicate (constraint name)', () => {
      const error = {
        constraint: 'uniq_focus_user_week'
      }

      const ctx = { weekStart: '2025-09-15' }
      
      const result = mapDbErrorToUserCopy(error, ctx)
      expect(result).toBe('You already set a focus for the week of 2025-09-15')
    })

    it('should handle Focus↔Goal duplicate link', () => {
      const error = {
        constraint: 'uniq_focus_goal_link'
      }
      
      const result = mapDbErrorToUserCopy(error)
      expect(result).toBe("Can't link the same goal multiple times")
    })

    it('should handle SLEEP bounds check (23514)', () => {
      const error = {
        code: '23514',
        constraint: 'chk_signal_sleep_bounds'
      }
      
      const result = mapDbErrorToUserCopy(error)
      expect(result).toBe("Sleep hours can't exceed 14")
    })

    it('should handle SLEEP increment check (23514)', () => {
      const error = {
        code: '23514',
        constraint: 'chk_signal_sleep_quarter'
      }
      
      const result = mapDbErrorToUserCopy(error)
      expect(result).toBe('Sleep hours must be in 0.25-hour increments (7.25, 7.50, 7.75, etc.)')
    })

    it('should handle WELLBEING range/int check (23514)', () => {
      const error = {
        code: '23514',
        constraint: 'chk_signal_wellbeing_range'
      }
      
      const result = mapDbErrorToUserCopy(error)
      expect(result).toBe('Wellbeing must be a whole number between 1 and 10')
    })

    it('should handle unknown error shape', () => {
      const error = {
        message: 'Some random database error'
      }
      
      const result = mapDbErrorToUserCopy(error)
      expect(result).toBe('Something went wrong. Please try again.')
    })

    it('should handle null/undefined errors', () => {
      expect(mapDbErrorToUserCopy(null)).toBe('Something went wrong. Please try again.')
      expect(mapDbErrorToUserCopy(undefined)).toBe('Something went wrong. Please try again.')
      expect(mapDbErrorToUserCopy('not an object')).toBe('Something went wrong. Please try again.')
    })

    it('should use fallback values when context is missing', () => {
      const error = {
        code: 'P2002',
        meta: {
          target: ['userId', 'nameNorm']
        }
      }
      
      const result = mapDbErrorToUserCopy(error)
      expect(result).toBe("You already have a life area named 'that name'")
    })
  })

  describe('isUniqueViolation', () => {
    it('should detect Prisma unique violations (P2002)', () => {
      const error = { code: 'P2002' }
      expect(isUniqueViolation(error)).toBe(true)
    })

    it('should detect PostgreSQL unique violations (23505)', () => {
      const error = { code: '23505' }
      expect(isUniqueViolation(error)).toBe(true)
    })

    it('should return false for check constraints', () => {
      const error = { code: '23514' }
      expect(isUniqueViolation(error)).toBe(false)
    })

    it('should return false for unknown errors', () => {
      expect(isUniqueViolation(null)).toBe(false)
      expect(isUniqueViolation({ code: 'UNKNOWN' })).toBe(false)
      expect(isUniqueViolation('not an object')).toBe(false)
    })
  })

  describe('getConstraintName', () => {
    it('should extract direct constraint property', () => {
      const error = { constraint: 'uniq_lifearea_user_namenorm' }
      expect(getConstraintName(error)).toBe('uniq_lifearea_user_namenorm')
    })

    it('should extract Prisma meta constraint', () => {
      const error = { 
        meta: { 
          constraint: 'uniq_weeklytask_user_week_title' 
        } 
      }
      expect(getConstraintName(error)).toBe('uniq_weeklytask_user_week_title')
    })

    it('should return undefined for errors without constraints', () => {
      expect(getConstraintName({ code: 'P2002' })).toBeUndefined()
      expect(getConstraintName(null)).toBeUndefined()
      expect(getConstraintName('not an object')).toBeUndefined()
    })

    it('should prefer direct constraint over meta constraint', () => {
      const error = { 
        constraint: 'direct_constraint',
        meta: { 
          constraint: 'meta_constraint' 
        } 
      }
      expect(getConstraintName(error)).toBe('direct_constraint')
    })
  })
})
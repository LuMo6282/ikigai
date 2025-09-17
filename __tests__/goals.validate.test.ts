import { describe, it, expect } from 'vitest'
import { validateGoalInput } from '../server/goals'

describe('Goals Input Validation', () => {
  describe('Title validation', () => {
    it('rejects empty title', () => {
      const result = validateGoalInput({ title: '' })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Goal title can't be empty")
    })

    it('rejects whitespace-only title', () => {
      const result = validateGoalInput({ title: '   ' })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Goal title can't be empty")
    })

    it('trims title whitespace', () => {
      const result = validateGoalInput({
        title: '  Learn Spanish  ',
        horizon: 'YEAR',
        status: 'active'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe('Learn Spanish')
    })

    it('rejects title over 100 characters', () => {
      const longTitle = 'a'.repeat(101)
      const result = validateGoalInput({ title: longTitle })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Goal title can't exceed 100 characters")
    })

    it('accepts title exactly 100 characters', () => {
      const maxTitle = 'a'.repeat(100)
      const result = validateGoalInput({
        title: maxTitle,
        horizon: 'YEAR',
        status: 'active'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe(maxTitle)
    })

    it('accepts title with 1 character', () => {
      const result = validateGoalInput({
        title: 'A',
        horizon: 'YEAR',
        status: 'active'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe('A')
    })
  })

  describe('Description validation', () => {
    it('allows null description', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        description: null,
        horizon: 'YEAR',
        status: 'active'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.description).toBe(null)
    })

    it('allows undefined description', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.description).toBe(null)
    })

    it('rejects empty description when provided', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        description: '',
        horizon: 'YEAR',
        status: 'active'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Description can't be empty when provided")
    })

    it('rejects whitespace-only description', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        description: '   ',
        horizon: 'YEAR',
        status: 'active'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Description can't be empty when provided")
    })

    it('trims description whitespace', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        description: '  Great description  ',
        horizon: 'YEAR',
        status: 'active'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.description).toBe('Great description')
    })

    it('rejects description over 1000 characters', () => {
      const longDesc = 'a'.repeat(1001)
      const result = validateGoalInput({
        title: 'Test Goal',
        description: longDesc,
        horizon: 'YEAR',
        status: 'active'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Description can't exceed 1000 characters")
    })

    it('accepts description exactly 1000 characters', () => {
      const maxDesc = 'a'.repeat(1000)
      const result = validateGoalInput({
        title: 'Test Goal',
        description: maxDesc,
        horizon: 'YEAR',
        status: 'active'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.description).toBe(maxDesc)
    })
  })

  describe('Horizon validation', () => {
    it('accepts valid horizons', () => {
      const validHorizons = ['YEAR', 'SIX_MONTH', 'MONTH', 'WEEK']
      
      validHorizons.forEach(horizon => {
        const result = validateGoalInput({
          title: 'Test Goal',
          horizon,
          status: 'active'
        })
        expect(result.ok).toBe(true)
        expect(result.data?.horizon).toBe(horizon)
      })
    })

    it('rejects invalid horizon', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'INVALID',
        status: 'active'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Horizon must be one of: YEAR, SIX_MONTH, MONTH, WEEK")
    })

    it('rejects missing horizon', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        status: 'active'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Horizon must be one of: YEAR, SIX_MONTH, MONTH, WEEK")
    })

    it('rejects empty horizon', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: '',
        status: 'active'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Horizon must be one of: YEAR, SIX_MONTH, MONTH, WEEK")
    })
  })

  describe('Status validation', () => {
    it('accepts valid statuses', () => {
      const validStatuses = ['active', 'paused', 'done']
      
      validStatuses.forEach(status => {
        const result = validateGoalInput({
          title: 'Test Goal',
          horizon: 'YEAR',
          status
        })
        expect(result.ok).toBe(true)
        expect(result.data?.status).toBe(status)
      })
    })

    it('rejects invalid status', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'invalid'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Status must be one of: active, paused, done")
    })

    it('rejects missing status', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Status must be one of: active, paused, done")
    })

    it('rejects empty status', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: ''
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Status must be one of: active, paused, done")
    })
  })

  describe('Target date validation', () => {
    it('allows null targetDate', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active',
        targetDate: null
      })
      expect(result.ok).toBe(true)
      expect(result.data?.targetDate).toBe(null)
    })

    it('allows undefined targetDate', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.targetDate).toBe(null)
    })

    it('converts empty string to null', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active',
        targetDate: ''
      })
      expect(result.ok).toBe(true)
      expect(result.data?.targetDate).toBe(null)
    })

    it('converts whitespace-only string to null', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active',
        targetDate: '   '
      })
      expect(result.ok).toBe(true)
      expect(result.data?.targetDate).toBe(null)
    })

    it('accepts valid YYYY-MM-DD format', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active',
        targetDate: '2025-12-31'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.targetDate).toEqual(new Date('2025-12-31T00:00:00.000Z'))
    })

    it('rejects invalid date format', () => {
      const invalidFormats = [
        '2025-1-31', // Single digit month
        '2025-12-1', // Single digit day
        '25-12-31',  // Two digit year
        '12/31/2025', // MM/DD/YYYY format
        '31-12-2025', // DD-MM-YYYY format
        '2025/12/31', // YYYY/MM/DD format
        'December 31, 2025', // Written format
        '2025-12',    // Missing day
        '2025'        // Only year
      ]

      invalidFormats.forEach(dateStr => {
        const result = validateGoalInput({
          title: 'Test Goal',
          horizon: 'YEAR',
          status: 'active',
          targetDate: dateStr
        })
        expect(result.ok).toBe(false)
        expect(result.error).toBe("Target date must be in YYYY-MM-DD format")
      })
    })

    it('rejects impossible dates', () => {
      const impossibleDates = [
        '2025-02-30', // Feb 30th doesn't exist
        '2025-02-29', // 2025 is not a leap year
        '2025-13-01', // Month 13 doesn't exist
        '2025-12-32', // Dec 32nd doesn't exist
        '2025-04-31', // April only has 30 days
        '2025-00-15', // Month 0 doesn't exist
        '2025-06-00'  // Day 0 doesn't exist
      ]

      impossibleDates.forEach(dateStr => {
        const result = validateGoalInput({
          title: 'Test Goal',
          horizon: 'YEAR',
          status: 'active',
          targetDate: dateStr
        })
        expect(result.ok).toBe(false)
        expect(result.error).toBe("Target date must be in YYYY-MM-DD format")
      })
    })

    it('accepts leap year dates', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active',
        targetDate: '2024-02-29' // 2024 is a leap year
      })
      expect(result.ok).toBe(true)
      expect(result.data?.targetDate).toEqual(new Date('2024-02-29T00:00:00.000Z'))
    })
  })

  describe('LifeAreaId validation', () => {
    it('allows null lifeAreaId', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active',
        lifeAreaId: null
      })
      expect(result.ok).toBe(true)
      expect(result.data?.lifeAreaId).toBe(null)
    })

    it('allows undefined lifeAreaId', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.lifeAreaId).toBe(null)
    })

    it('converts empty string to null', () => {
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active',
        lifeAreaId: ''
      })
      expect(result.ok).toBe(true)
      expect(result.data?.lifeAreaId).toBe(null)
    })

    it('trims and accepts valid UUID', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      const result = validateGoalInput({
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active',
        lifeAreaId: `  ${uuid}  `
      })
      expect(result.ok).toBe(true)
      expect(result.data?.lifeAreaId).toBe(uuid)
    })
  })

  describe('Partial updates', () => {
    it('validates only provided fields in partial mode', () => {
      const result = validateGoalInput({
        title: '  Updated Title  '
      }, { partial: true })
      
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe('Updated Title')
      expect(result.data).not.toHaveProperty('horizon')
      expect(result.data).not.toHaveProperty('status')
    })

    it('still validates required field constraints in partial mode', () => {
      const result = validateGoalInput({
        title: ''
      }, { partial: true })
      
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Goal title can't be empty")
    })

    it('validates multiple fields in partial mode', () => {
      const result = validateGoalInput({
        title: '  New Title  ',
        status: 'paused',
        targetDate: '2025-06-15'
      }, { partial: true })
      
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe('New Title')
      expect(result.data?.status).toBe('paused')
      expect(result.data?.targetDate).toEqual(new Date('2025-06-15T00:00:00.000Z'))
      expect(result.data).not.toHaveProperty('horizon')
    })

    it('rejects invalid fields even in partial mode', () => {
      const result = validateGoalInput({
        horizon: 'INVALID_HORIZON'
      }, { partial: true })
      
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Horizon must be one of: YEAR, SIX_MONTH, MONTH, WEEK")
    })
  })

  describe('Complete valid input', () => {
    it('accepts complete valid goal', () => {
      const result = validateGoalInput({
        title: '  Learn Machine Learning  ',
        description: '  Complete Andrew Ng\'s course and build 3 projects  ',
        horizon: 'YEAR',
        status: 'active',
        targetDate: '2025-12-31',
        lifeAreaId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      })

      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        title: 'Learn Machine Learning',
        description: 'Complete Andrew Ng\'s course and build 3 projects',
        horizon: 'YEAR',
        status: 'active',
        targetDate: new Date('2025-12-31T00:00:00.000Z'),
        lifeAreaId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      })
    })

    it('accepts minimal valid goal', () => {
      const result = validateGoalInput({
        title: 'Simple Goal',
        horizon: 'WEEK',
        status: 'active'
      })

      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        title: 'Simple Goal',
        description: null,
        horizon: 'WEEK',
        status: 'active',
        targetDate: null,
        lifeAreaId: null
      })
    })
  })
})
import { describe, it, expect } from 'vitest'
import { validateWeeklyTaskInput, validateWeekStart } from '../server/tasks'

describe('WeeklyTask Input Validation', () => {
  describe('Title validation', () => {
    it('rejects empty title', () => {
      const result = validateWeeklyTaskInput({ 
        title: '', 
        weekStart: '2025-01-07', // Monday
        monday: true,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Task title can't be empty")
    })

    it('rejects whitespace-only title', () => {
      const result = validateWeeklyTaskInput({
        title: '   ',
        weekStart: '2025-01-07',
        monday: true,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Task title can't be empty")
    })

    it('trims title whitespace', () => {
      const result = validateWeeklyTaskInput({
        title: '  Morning Exercise  ',
        weekStart: '2025-01-07',
        monday: true,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      })
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe('Morning Exercise')
    })

    it('rejects title over 80 characters', () => {
      const longTitle = 'a'.repeat(81)
      const result = validateWeeklyTaskInput({
        title: longTitle,
        weekStart: '2025-01-07',
        monday: true,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Task title can't exceed 80 characters")
    })

    it('accepts title exactly 80 characters', () => {
      const maxTitle = 'a'.repeat(80)
      const result = validateWeeklyTaskInput({
        title: maxTitle,
        weekStart: '2025-01-07',
        monday: true,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      })
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe(maxTitle)
    })

    it('accepts title with 1 character', () => {
      const result = validateWeeklyTaskInput({
        title: 'A',
        weekStart: '2025-01-07',
        monday: true,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      })
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe('A')
    })
  })

  describe('WeekStart validation', () => {
    it('rejects missing weekStart', () => {
      const result = validateWeeklyTaskInput({
        title: 'Test Task',
        monday: true,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Week start date is required")
    })

    it('rejects empty weekStart', () => {
      const result = validateWeeklyTaskInput({
        title: 'Test Task',
        weekStart: '',
        monday: true,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Week start date is required")
    })

    it('rejects invalid date format', () => {
      const invalidFormats = [
        '2025-1-6',    // Single digit month/day
        '25-01-06',    // Two digit year
        '01/06/2025',  // MM/DD/YYYY format
        '06-01-2025',  // DD-MM-YYYY format
        '2025/01/06',  // YYYY/MM/DD format
        'January 6, 2025', // Written format
        '2025-01',     // Missing day
        '2025'         // Only year
      ]

      invalidFormats.forEach(dateStr => {
        const result = validateWeeklyTaskInput({
          title: 'Test Task',
          weekStart: dateStr,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        })
        expect(result.ok).toBe(false)
        expect(result.error).toBe("Week start must be in YYYY-MM-DD format")
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
        const result = validateWeeklyTaskInput({
          title: 'Test Task',
          weekStart: dateStr,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        })
        expect(result.ok).toBe(false)
        expect(result.error).toBe("Week start must be in YYYY-MM-DD format")
      })
    })

    it('rejects non-Monday dates', () => {
      const nonMondayDates = [
        '2025-01-05', // Sunday
        '2025-01-08', // Tuesday
        '2025-01-09', // Wednesday
        '2025-01-10', // Thursday
        '2025-01-11', // Friday
        '2025-01-12', // Saturday
      ]

      nonMondayDates.forEach(dateStr => {
        const result = validateWeeklyTaskInput({
          title: 'Test Task',
          weekStart: dateStr,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        })
        expect(result.ok).toBe(false)
        expect(result.error).toBe("Week start must be a Monday")
      })
    })

    it('accepts valid Monday dates', () => {
      const mondayDates = [
        '2025-01-07', // Monday Jan 7, 2025
        '2025-01-14', // Monday Jan 14, 2025
        '2024-12-31', // Monday Dec 31, 2024
        '2024-02-27', // Monday Feb 27, 2024 (leap year)
      ]

      mondayDates.forEach(dateStr => {
        const result = validateWeeklyTaskInput({
          title: 'Test Task',
          weekStart: dateStr,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        })
        expect(result.ok).toBe(true)
        expect(result.data?.weekStart).toEqual(new Date(dateStr + 'T00:00:00.000Z'))
      })
    })
  })

  describe('Day boolean validation', () => {
    const validBase = {
      title: 'Test Task',
      weekStart: '2025-01-07'
    }

    it('requires all day booleans for create', () => {
      const result = validateWeeklyTaskInput({
        ...validBase,
        monday: true
        // Missing other days
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Tuesday is required")
    })

    it('rejects null day values', () => {
      const result = validateWeeklyTaskInput({
        ...validBase,
        monday: true,
        tuesday: null as any,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Tuesday is required")
    })

    it('rejects non-boolean day values', () => {
      const result = validateWeeklyTaskInput({
        ...validBase,
        monday: true,
        tuesday: 'yes' as any,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Tuesday must be true or false")
    })

    it('accepts all day combinations', () => {
      const testCases = [
        // All false
        { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
        // All true
        { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true },
        // Mixed
        { monday: true, tuesday: false, wednesday: true, thursday: false, friday: true, saturday: false, sunday: false },
      ]

      testCases.forEach(days => {
        const result = validateWeeklyTaskInput({
          ...validBase,
          ...days
        })
        expect(result.ok).toBe(true)
        expect(result.data?.monday).toBe(days.monday)
        expect(result.data?.tuesday).toBe(days.tuesday)
        expect(result.data?.wednesday).toBe(days.wednesday)
        expect(result.data?.thursday).toBe(days.thursday)
        expect(result.data?.friday).toBe(days.friday)
        expect(result.data?.saturday).toBe(days.saturday)
        expect(result.data?.sunday).toBe(days.sunday)
      })
    })
  })

  describe('GoalId validation', () => {
    const validBase = {
      title: 'Test Task',
      weekStart: '2025-01-07',
      monday: true,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    }

    it('allows null goalId', () => {
      const result = validateWeeklyTaskInput({
        ...validBase,
        goalId: null
      })
      expect(result.ok).toBe(true)
      expect(result.data?.goalId).toBe(null)
    })

    it('allows undefined goalId', () => {
      const result = validateWeeklyTaskInput(validBase)
      expect(result.ok).toBe(true)
      expect(result.data?.goalId).toBe(null)
    })

    it('converts empty string to null', () => {
      const result = validateWeeklyTaskInput({
        ...validBase,
        goalId: ''
      })
      expect(result.ok).toBe(true)
      expect(result.data?.goalId).toBe(null)
    })

    it('trims and accepts valid UUID', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      const result = validateWeeklyTaskInput({
        ...validBase,
        goalId: `  ${uuid}  `
      })
      expect(result.ok).toBe(true)
      expect(result.data?.goalId).toBe(uuid)
    })
  })

  describe('Partial updates', () => {
    it('validates only provided fields in partial mode', () => {
      const result = validateWeeklyTaskInput({
        title: '  Updated Title  '
      }, { partial: true })
      
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe('Updated Title')
      expect(result.data).not.toHaveProperty('weekStart')
      expect(result.data).not.toHaveProperty('monday')
    })

    it('still validates field constraints in partial mode', () => {
      const result = validateWeeklyTaskInput({
        title: ''
      }, { partial: true })
      
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Task title can't be empty")
    })

    it('validates multiple fields in partial mode', () => {
      const result = validateWeeklyTaskInput({
        title: '  New Title  ',
        monday: true,
        friday: false,
        goalId: 'test-goal-id'
      }, { partial: true })
      
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe('New Title')
      expect(result.data?.monday).toBe(true)
      expect(result.data?.friday).toBe(false)
      expect(result.data?.goalId).toBe('test-goal-id')
      expect(result.data).not.toHaveProperty('weekStart')
      expect(result.data).not.toHaveProperty('tuesday')
    })

    it('rejects invalid weekStart even in partial mode', () => {
      const result = validateWeeklyTaskInput({
        weekStart: '2025-01-08' // Tuesday, not Monday
      }, { partial: true })
      
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Week start must be a Monday")
    })

    it('validates day booleans in partial mode', () => {
      const result = validateWeeklyTaskInput({
        tuesday: 'invalid' as any
      }, { partial: true })
      
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Tuesday must be true or false")
    })
  })

  describe('Complete valid input', () => {
    it('accepts complete valid task', () => {
      const result = validateWeeklyTaskInput({
        title: '  Morning Workout  ',
        weekStart: '2025-01-07',
        monday: true,
        tuesday: true,
        wednesday: false,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
        goalId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      })

      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        title: 'Morning Workout',
        weekStart: new Date('2025-01-07T00:00:00.000Z'),
        monday: true,
        tuesday: true,
        wednesday: false,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
        goalId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      })
    })

    it('accepts minimal valid task', () => {
      const result = validateWeeklyTaskInput({
        title: 'Simple Task',
        weekStart: '2025-01-07',
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: true
      })

      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        title: 'Simple Task',
        weekStart: new Date('2025-01-07T00:00:00.000Z'),
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: true,
        goalId: null
      })
    })
  })
})

describe('WeekStart standalone validation', () => {
  it('rejects missing weekStart', () => {
    const result = validateWeekStart()
    expect(result.ok).toBe(false)
    expect(result.error).toBe("Week start date is required")
  })

  it('rejects empty weekStart', () => {
    const result = validateWeekStart('')
    expect(result.ok).toBe(false)
    expect(result.error).toBe("Week start date is required")
  })

  it('rejects whitespace-only weekStart', () => {
    const result = validateWeekStart('   ')
    expect(result.ok).toBe(false)
    expect(result.error).toBe("Week start date is required")
  })

  it('accepts valid Monday', () => {
    const result = validateWeekStart('2025-01-07')
    expect(result.ok).toBe(true)
    expect(result.weekStart).toEqual(new Date('2025-01-07T00:00:00.000Z'))
  })

  it('rejects Tuesday', () => {
    const result = validateWeekStart('2025-01-08')
    expect(result.ok).toBe(false)
    expect(result.error).toBe("Week start must be a Monday")
  })

  it('trims input', () => {
    const result = validateWeekStart('  2025-01-07  ')
    expect(result.ok).toBe(true)
    expect(result.weekStart).toEqual(new Date('2025-01-07T00:00:00.000Z'))
  })
})

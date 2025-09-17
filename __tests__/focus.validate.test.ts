import { describe, it, expect } from 'vitest'
import { validateFocusInput, validateLinkedGoals } from '../server/focus'

describe('WeeklyFocusTheme Input Validation', () => {
  describe('Title validation', () => {
    it('rejects empty title', () => {
      const result = validateFocusInput({
        title: '',
        weekStart: '2025-01-07' // Monday
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Focus title can't be empty")
    })

    it('rejects whitespace-only title', () => {
      const result = validateFocusInput({
        title: '   ',
        weekStart: '2025-01-07'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Focus title can't be empty")
    })

    it('trims title whitespace', () => {
      const result = validateFocusInput({
        title: '  Weekly Focus Theme  ',
        weekStart: '2025-01-07'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe('Weekly Focus Theme')
    })

    it('rejects title over 60 characters', () => {
      const longTitle = 'a'.repeat(61)
      const result = validateFocusInput({
        title: longTitle,
        weekStart: '2025-01-07'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Focus title can't exceed 60 characters")
    })

    it('accepts title exactly 60 characters', () => {
      const maxTitle = 'a'.repeat(60)
      const result = validateFocusInput({
        title: maxTitle,
        weekStart: '2025-01-07'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe(maxTitle)
    })

    it('accepts title with 1 character', () => {
      const result = validateFocusInput({
        title: 'A',
        weekStart: '2025-01-07'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe('A')
    })
  })

  describe('Note validation', () => {
    it('allows null note', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        note: null
      })
      expect(result.ok).toBe(true)
      expect(result.data?.note).toBe(null)
    })

    it('allows undefined note', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.note).toBe(null)
    })

    it('allows empty string note (converts to null)', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        note: ''
      })
      expect(result.ok).toBe(true)
      expect(result.data?.note).toBe(null)
    })

    it('trims note whitespace', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        note: '  This is a note  '
      })
      expect(result.ok).toBe(true)
      expect(result.data?.note).toBe('This is a note')
    })

    it('converts whitespace-only note to null', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        note: '   '
      })
      expect(result.ok).toBe(true)
      expect(result.data?.note).toBe(null)
    })

    it('rejects note over 400 characters', () => {
      const longNote = 'a'.repeat(401)
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        note: longNote
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Focus note can't exceed 400 characters")
    })

    it('accepts note exactly 400 characters', () => {
      const maxNote = 'a'.repeat(400)
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        note: maxNote
      })
      expect(result.ok).toBe(true)
      expect(result.data?.note).toBe(maxNote)
    })
  })

  describe('WeekStart validation', () => {
    it('rejects missing weekStart', () => {
      const result = validateFocusInput({
        title: 'Focus Title'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Week start date is required")
    })

    it('rejects empty weekStart', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: ''
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Week start date is required")
    })

    it('rejects invalid date format', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-1-7' // Invalid format
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Week start must be in YYYY-MM-DD format")
    })

    it('rejects impossible dates', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-02-30' // Feb 30th doesn't exist
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Week start must be in YYYY-MM-DD format")
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
        const result = validateFocusInput({
          title: 'Focus Title',
          weekStart: dateStr
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
        const result = validateFocusInput({
          title: 'Focus Title',
          weekStart: dateStr
        })
        expect(result.ok).toBe(true)
        expect(result.data?.weekStart).toEqual(new Date(dateStr + 'T00:00:00.000Z'))
      })
    })
  })

  describe('LinkedGoals validation', () => {
    it('allows undefined linkedGoals', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07'
      })
      expect(result.ok).toBe(true)
      expect(result.data?.linkedGoals).toEqual([])
    })

    it('allows empty linkedGoals array', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        linkedGoals: []
      })
      expect(result.ok).toBe(true)
      expect(result.data?.linkedGoals).toEqual([])
    })

    it('allows 1 valid UUID', () => {
      const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        linkedGoals: [uuid]
      })
      expect(result.ok).toBe(true)
      expect(result.data?.linkedGoals).toEqual([uuid])
    })

    it('allows 2 valid UUIDs', () => {
      const uuid1 = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
      const uuid2 = 'b2c3d4e5-f6a7-4901-bcde-f12345678901'
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        linkedGoals: [uuid1, uuid2]
      })
      expect(result.ok).toBe(true)
      expect(result.data?.linkedGoals).toEqual([uuid1, uuid2])
    })

    it('allows 3 valid UUIDs', () => {
      const uuid1 = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
      const uuid2 = 'b2c3d4e5-f6a7-4901-bcde-f12345678901'  
      const uuid3 = 'c3d4e5f6-a7b8-4012-8def-123456789012'
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        linkedGoals: [uuid1, uuid2, uuid3]
      })
      expect(result.ok).toBe(true)
      expect(result.data?.linkedGoals).toEqual([uuid1, uuid2, uuid3])
    })

    it('rejects more than 3 UUIDs', () => {
      const uuid1 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      const uuid2 = 'b2c3d4e5-f6g7-8901-bcde-f12345678901'
      const uuid3 = 'c3d4e5f6-g7h8-9012-cdef-123456789012'
      const uuid4 = 'd4e5f6g7-h8i9-0123-def0-234567890123'
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        linkedGoals: [uuid1, uuid2, uuid3, uuid4]
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Can't link more than 3 goals")
    })

    it('rejects duplicate UUIDs', () => {
      const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        linkedGoals: [uuid, uuid]
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Can't link the same goal multiple times")
    })

    it('rejects invalid UUID format', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        linkedGoals: ['not-a-uuid']
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("All goal IDs must be valid UUIDs")
    })

    it('rejects non-string values in array', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        linkedGoals: [123 as any]
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("All goal IDs must be valid UUIDs")
    })

    it('rejects non-array linkedGoals', () => {
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        linkedGoals: 'not-an-array' as any
      })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("All goal IDs must be valid UUIDs")
    })

    it('trims UUID whitespace', () => {
      const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
      const result = validateFocusInput({
        title: 'Focus Title',
        weekStart: '2025-01-07',
        linkedGoals: [`  ${uuid}  `]
      })
      expect(result.ok).toBe(true)
      expect(result.data?.linkedGoals).toEqual([uuid])
    })
  })

  describe('Partial updates', () => {
    it('validates only provided fields in partial mode', () => {
      const result = validateFocusInput({
        title: 'Updated Title'
      }, { partial: true })
      
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe('Updated Title')
      expect(result.data?.weekStart).toBeUndefined()
      expect(result.data?.note).toBeUndefined()
      expect(result.data?.linkedGoals).toBeUndefined()
    })

    it('still validates field constraints in partial mode', () => {
      const result = validateFocusInput({
        title: 'a'.repeat(61) // Too long
      }, { partial: true })
      
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Focus title can't exceed 60 characters")
    })

    it('validates multiple fields in partial mode', () => {
      const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
      const result = validateFocusInput({
        title: 'Updated Title',
        note: 'Updated note',
        linkedGoals: [uuid]
      }, { partial: true })
      
      expect(result.ok).toBe(true)
      expect(result.data?.title).toBe('Updated Title')
      expect(result.data?.note).toBe('Updated note')
      expect(result.data?.linkedGoals).toEqual([uuid])
      expect(result.data?.weekStart).toBeUndefined()
    })

    it('rejects invalid weekStart even in partial mode', () => {
      const result = validateFocusInput({
        weekStart: '2025-01-08' // Tuesday, not Monday
      }, { partial: true })
      
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Week start must be a Monday")
    })

    it('validates linkedGoals in partial mode', () => {
      const result = validateFocusInput({
        linkedGoals: ['invalid-uuid']
      }, { partial: true })
      
      expect(result.ok).toBe(false)
      expect(result.error).toBe("All goal IDs must be valid UUIDs")
    })
  })

  describe('Complete valid input', () => {
    it('accepts complete valid focus theme', () => {
      const uuid1 = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
      const uuid2 = 'b2c3d4e5-f6a7-4901-bcde-f12345678901'
      const result = validateFocusInput({
        title: 'Weekly Focus',
        note: 'This is my focus for the week',
        weekStart: '2025-01-07',
        linkedGoals: [uuid1, uuid2]
      })
      
      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        title: 'Weekly Focus',
        note: 'This is my focus for the week',
        weekStart: new Date('2025-01-07T00:00:00.000Z'),
        linkedGoals: [uuid1, uuid2]
      })
    })

    it('accepts minimal valid focus theme', () => {
      const result = validateFocusInput({
        title: 'Simple Focus',
        weekStart: '2025-01-07'
      })
      
      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        title: 'Simple Focus',
        note: null,
        weekStart: new Date('2025-01-07T00:00:00.000Z'),
        linkedGoals: []
      })
    })
  })
})

describe('LinkedGoals standalone validation', () => {
  describe('validateLinkedGoals function', () => {
    it('allows undefined input', () => {
      const result = validateLinkedGoals(undefined)
      expect(result.ok).toBe(true)
      expect(result.goalIds).toEqual([])
    })

    it('allows empty array', () => {
      const result = validateLinkedGoals([])
      expect(result.ok).toBe(true)
      expect(result.goalIds).toEqual([])
    })

    it('accepts valid UUID', () => {
      const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
      const result = validateLinkedGoals([uuid])
      expect(result.ok).toBe(true)
      expect(result.goalIds).toEqual([uuid])
    })

    it('rejects non-array input', () => {
      const result = validateLinkedGoals('not-array' as any)
      expect(result.ok).toBe(false)
      expect(result.error).toBe("All goal IDs must be valid UUIDs")
    })

    it('rejects more than 3 items', () => {
      const uuids = [
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'b2c3d4e5-f6g7-8901-bcde-f12345678901',
        'c3d4e5f6-g7h8-9012-cdef-123456789012',
        'd4e5f6g7-h8i9-0123-def0-234567890123'
      ]
      const result = validateLinkedGoals(uuids)
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Can't link more than 3 goals")
    })

    it('rejects duplicate UUIDs', () => {
      const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
      const result = validateLinkedGoals([uuid, uuid])
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Can't link the same goal multiple times")
    })

    it('rejects invalid UUID format', () => {
      const result = validateLinkedGoals(['invalid-uuid'])
      expect(result.ok).toBe(false)
      expect(result.error).toBe("All goal IDs must be valid UUIDs")
    })

    it('trims whitespace from UUIDs', () => {
      const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
      const result = validateLinkedGoals([`  ${uuid}  `])
      expect(result.ok).toBe(true)
      expect(result.goalIds).toEqual([uuid])
    })
  })
})
import { describe, it, expect } from 'vitest'
import { validateLifeAreaInput } from '../server/areas'

describe('validateLifeAreaInput', () => {
  describe('Name validation', () => {
    it('should trim and accept valid names', () => {
      const result = validateLifeAreaInput({ name: '  Health  ' })
      expect(result.ok).toBe(true)
      expect(result.data?.name).toBe('Health')
    })

    it('should reject empty names', () => {
      const result = validateLifeAreaInput({ name: '' })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Name can't be empty")
    })

    it('should reject whitespace-only names', () => {
      const result = validateLifeAreaInput({ name: '   ' })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Name can't be empty")
    })

    it('should reject names longer than 50 characters', () => {
      const longName = 'a'.repeat(51)
      const result = validateLifeAreaInput({ name: longName })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Life area name can't exceed 50 characters")
    })

    it('should accept names exactly 50 characters', () => {
      const maxName = 'a'.repeat(50)
      const result = validateLifeAreaInput({ name: maxName })
      expect(result.ok).toBe(true)
      expect(result.data?.name).toBe(maxName)
    })

    it('should require name for create operations', () => {
      const result = validateLifeAreaInput({}, false)
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Name can't be empty")
    })

    it('should allow undefined name for updates', () => {
      const result = validateLifeAreaInput({ color: '#FF0000' }, true)
      expect(result.ok).toBe(true)
      expect(result.data?.color).toBe('#FF0000')
    })
  })

  describe('Color validation', () => {
    it('should accept valid hex colors', () => {
      const validColors = ['#FF0000', '#00FF00', '#0000FF', '#123456', '#ABCDEF', '#abcdef']
      
      validColors.forEach(color => {
        const result = validateLifeAreaInput({ name: 'Test', color })
        expect(result.ok).toBe(true)
        expect(result.data?.color).toBe(color)
      })
    })

    it('should reject invalid hex colors', () => {
      const invalidColors = [
        'FF0000',     // Missing #
        '#FF00',      // Too short
        '#FF00000',   // Too long
        '#GGGGGG',    // Invalid hex digits
        '#ff 000',    // Contains space
        ' #FF0000 '   // Will be trimmed and should be valid
      ]
      
      // Test all invalid except the last one which should be valid after trim
      for (let i = 0; i < invalidColors.length - 1; i++) {
        const result = validateLifeAreaInput({ name: 'Test', color: invalidColors[i] })
        expect(result.ok).toBe(false)
        expect(result.error).toBe('Color must be exactly 6 hex digits after # (e.g., #FF6B35)')
      }

      // Test the trimmed valid one
      const result = validateLifeAreaInput({ name: 'Test', color: ' #FF0000 ' })
      expect(result.ok).toBe(true)
      expect(result.data?.color).toBe('#FF0000')
    })

    it('should accept null/undefined color', () => {
      let result = validateLifeAreaInput({ name: 'Test', color: null })
      expect(result.ok).toBe(true)
      expect(result.data?.color).toBe(null)

      result = validateLifeAreaInput({ name: 'Test' })
      expect(result.ok).toBe(true)
      expect(result.data?.color).toBe(null)
    })

    it('should handle empty color string as null', () => {
      const result = validateLifeAreaInput({ name: 'Test', color: '' })
      expect(result.ok).toBe(true)
      expect(result.data?.color).toBe(null)
    })
  })

  describe('Vision validation', () => {
    it('should trim and accept valid vision', () => {
      const result = validateLifeAreaInput({ 
        name: 'Test', 
        vision: '  Live a healthy life  ' 
      })
      expect(result.ok).toBe(true)
      expect(result.data?.vision).toBe('Live a healthy life')
    })

    it('should reject empty vision when provided', () => {
      const result = validateLifeAreaInput({ name: 'Test', vision: '' })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Vision can't be empty when provided")
    })

    it('should reject whitespace-only vision', () => {
      const result = validateLifeAreaInput({ name: 'Test', vision: '   ' })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Vision can't be empty when provided")
    })

    it('should accept null/undefined vision', () => {
      let result = validateLifeAreaInput({ name: 'Test', vision: null })
      expect(result.ok).toBe(true)
      expect(result.data?.vision).toBe(null)

      result = validateLifeAreaInput({ name: 'Test' })
      expect(result.ok).toBe(true)
      expect(result.data?.vision).toBe(null)
    })

    it('should reject vision longer than 500 characters', () => {
      const longVision = 'a'.repeat(501)
      const result = validateLifeAreaInput({ name: 'Test', vision: longVision })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Vision can't exceed 500 characters")
    })

    it('should accept vision exactly 500 characters', () => {
      const maxVision = 'a'.repeat(500)
      const result = validateLifeAreaInput({ name: 'Test', vision: maxVision })
      expect(result.ok).toBe(true)
      expect(result.data?.vision).toBe(maxVision)
    })
  })

  describe('Strategy validation', () => {
    it('should trim and accept valid strategy', () => {
      const result = validateLifeAreaInput({ 
        name: 'Test', 
        strategy: '  Exercise daily  ' 
      })
      expect(result.ok).toBe(true)
      expect(result.data?.strategy).toBe('Exercise daily')
    })

    it('should reject empty strategy when provided', () => {
      const result = validateLifeAreaInput({ name: 'Test', strategy: '' })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Strategy can't be empty when provided")
    })

    it('should reject whitespace-only strategy', () => {
      const result = validateLifeAreaInput({ name: 'Test', strategy: '   ' })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Strategy can't be empty when provided")
    })

    it('should accept null/undefined strategy', () => {
      let result = validateLifeAreaInput({ name: 'Test', strategy: null })
      expect(result.ok).toBe(true)
      expect(result.data?.strategy).toBe(null)

      result = validateLifeAreaInput({ name: 'Test' })
      expect(result.ok).toBe(true)
      expect(result.data?.strategy).toBe(null)
    })

    it('should reject strategy longer than 500 characters', () => {
      const longStrategy = 'a'.repeat(501)
      const result = validateLifeAreaInput({ name: 'Test', strategy: longStrategy })
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Strategy can't exceed 500 characters")
    })

    it('should accept strategy exactly 500 characters', () => {
      const maxStrategy = 'a'.repeat(500)
      const result = validateLifeAreaInput({ name: 'Test', strategy: maxStrategy })
      expect(result.ok).toBe(true)
      expect(result.data?.strategy).toBe(maxStrategy)
    })
  })

  describe('Order validation', () => {
    it('should accept valid order numbers', () => {
      const result = validateLifeAreaInput({ name: 'Test', order: 5 })
      expect(result.ok).toBe(true)
      expect(result.data?.order).toBe(5)
    })

    it('should accept undefined order', () => {
      const result = validateLifeAreaInput({ name: 'Test' })
      expect(result.ok).toBe(true)
      expect(result.data?.order).toBe(undefined)
    })
  })

  describe('Combined validation', () => {
    it('should handle all valid fields together', () => {
      const result = validateLifeAreaInput({
        name: '  Health & Fitness  ',
        color: '#00FF00',
        vision: '  Be physically and mentally strong  ',
        strategy: '  Exercise daily and eat well  ',
        order: 1
      })
      
      expect(result.ok).toBe(true)
      expect(result.data).toEqual({
        name: 'Health & Fitness',
        color: '#00FF00',
        vision: 'Be physically and mentally strong',
        strategy: 'Exercise daily and eat well',
        order: 1
      })
    })

    it('should return first validation error encountered', () => {
      const result = validateLifeAreaInput({
        name: '', // Invalid
        color: 'invalid', // Also invalid
        vision: '' // Also invalid
      })
      
      expect(result.ok).toBe(false)
      expect(result.error).toBe("Name can't be empty")
    })
  })
})
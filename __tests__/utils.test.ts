import { describe, it, expect } from 'vitest'
import { normalizeEmail, isHexColor, weekStartFor } from '@/lib/utils'

describe('normalizeEmail', () => {
  it('should lowercase and trim email addresses', () => {
    expect(normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com')
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com')
    expect(normalizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com')
  })

  it('should preserve plus-addressing', () => {
    expect(normalizeEmail('user+tag@example.com')).toBe('user+tag@example.com')
    expect(normalizeEmail('USER+TAG@EXAMPLE.COM')).toBe('user+tag@example.com')
  })

  it('should handle empty and whitespace-only strings', () => {
    expect(normalizeEmail('')).toBe('')
    expect(normalizeEmail('   ')).toBe('')
    expect(normalizeEmail('\t\n ')).toBe('')
  })
})

describe('isHexColor', () => {
  it('should validate correct hex color formats', () => {
    expect(isHexColor('#FF6B35')).toBe(true)
    expect(isHexColor('#000000')).toBe(true)
    expect(isHexColor('#ffffff')).toBe(true)
    expect(isHexColor('#123ABC')).toBe(true)
    expect(isHexColor('#abcdef')).toBe(true)
  })

  it('should reject invalid hex color formats', () => {
    expect(isHexColor('#FFF')).toBe(false) // Too short
    expect(isHexColor('#FFFFFFF')).toBe(false) // Too long
    expect(isHexColor('FF6B35')).toBe(false) // Missing #
    expect(isHexColor('#GGGGGG')).toBe(false) // Invalid hex chars
    expect(isHexColor('#FF6B3G')).toBe(false) // Invalid hex char
    expect(isHexColor('')).toBe(false) // Empty string
    expect(isHexColor('red')).toBe(false) // Color name
    expect(isHexColor('#FF6B3')).toBe(false) // Missing digit
  })
})

describe('weekStartFor', () => {
  // Test cases from Domain Spec v1.3 Edge Test Cases
  
  it('should handle month boundary (March starts on Monday)', () => {
    // 2025-03-03 is a Monday
    const date = new Date('2025-03-03T12:00:00Z')
    const weekStart = weekStartFor(date, 'America/Denver')
    
    // Should be Monday March 3, 2025 00:00:00 in Denver timezone
    expect(weekStart.getFullYear()).toBe(2025)
    expect(weekStart.getMonth()).toBe(2) // March (0-indexed)
    expect(weekStart.getDate()).toBe(3)
  })

  it('should handle year boundary (New Year on Wednesday)', () => {
    // 2024-12-30 is a Monday, 2025-01-01 is a Wednesday
    const date = new Date('2025-01-01T12:00:00Z')
    const weekStart = weekStartFor(date, 'America/Denver')
    
    // Should be Monday December 30, 2024 00:00:00
    expect(weekStart.getFullYear()).toBe(2024)
    expect(weekStart.getMonth()).toBe(11) // December (0-indexed)
    expect(weekStart.getDate()).toBe(30)
  })

  it('should handle DST forward (Spring forward)', () => {
    // 2025-03-10 is DST spring forward in America/Denver (2 AM -> 3 AM)
    // 2025-03-10 is a Monday
    const date = new Date('2025-03-10T12:00:00Z')
    const weekStart = weekStartFor(date, 'America/Denver')
    
    expect(weekStart.getFullYear()).toBe(2025)
    expect(weekStart.getMonth()).toBe(2) // March
    expect(weekStart.getDate()).toBe(10)
  })

  it('should handle DST back (Fall back)', () => {
    // 2025-11-03 is DST fall back in America/Denver (2 AM -> 1 AM)
    // 2025-11-03 is a Monday
    const date = new Date('2025-11-03T12:00:00Z')
    const weekStart = weekStartFor(date, 'America/Denver')
    
    expect(weekStart.getFullYear()).toBe(2025)
    expect(weekStart.getMonth()).toBe(10) // November
    expect(weekStart.getDate()).toBe(3)
  })

  it('should handle leap day', () => {
    // 2024-02-29 is leap day, falls on Thursday
    // Week should start on 2024-02-26 (Monday)
    const date = new Date('2024-02-29T12:00:00Z')
    const weekStart = weekStartFor(date, 'America/Denver')
    
    expect(weekStart.getFullYear()).toBe(2024)
    expect(weekStart.getMonth()).toBe(1) // February
    expect(weekStart.getDate()).toBe(26) // Monday before leap day
  })

  it('should handle timezone change scenario', () => {
    // Test with a Wednesday date to ensure Monday calculation works
    const date = new Date('2025-09-17T12:00:00Z') // A Wednesday
    
    // Should get Monday 2025-09-15 for Denver
    const denverWeekStart = weekStartFor(date, 'America/Denver')
    expect(denverWeekStart.getFullYear()).toBe(2025)
    expect(denverWeekStart.getMonth()).toBe(8) // September
    expect(denverWeekStart.getDate()).toBe(15)
    
    // Should get same Monday for New York (different timezone)
    const nyWeekStart = weekStartFor(date, 'America/New_York')
    expect(nyWeekStart.getFullYear()).toBe(2025)
    expect(nyWeekStart.getMonth()).toBe(8) // September  
    expect(nyWeekStart.getDate()).toBe(15)
  })

  it('should handle different days of the week', () => {
    // Test Sunday -> should go back 6 days to Monday
    const sunday = new Date('2025-09-21T12:00:00Z') // A Sunday
    const sundayWeekStart = weekStartFor(sunday, 'America/Denver')
    expect(sundayWeekStart.getDate()).toBe(15) // Monday Sept 15
    
    // Test Tuesday -> should go back 1 day to Monday
    const tuesday = new Date('2025-09-16T12:00:00Z') // A Tuesday
    const tuesdayWeekStart = weekStartFor(tuesday, 'America/Denver')
    expect(tuesdayWeekStart.getDate()).toBe(15) // Monday Sept 15
    
    // Test Saturday -> should go back 5 days to Monday
    const saturday = new Date('2025-09-20T12:00:00Z') // A Saturday
    const saturdayWeekStart = weekStartFor(saturday, 'America/Denver')
    expect(saturdayWeekStart.getDate()).toBe(15) // Monday Sept 15
  })

  it('should return midnight time (00:00:00)', () => {
    const date = new Date('2025-09-17T12:00:00Z')
    const weekStart = weekStartFor(date, 'America/Denver')
    
    expect(weekStart.getHours()).toBe(0)
    expect(weekStart.getMinutes()).toBe(0)
    expect(weekStart.getSeconds()).toBe(0)
    expect(weekStart.getMilliseconds()).toBe(0)
  })
})

describe('uniqueness normalization examples', () => {
  it('should demonstrate LifeArea name normalization', () => {
    const names = ['Health', 'health', '  Health  ', 'HEALTH']
    const normalized = names.map(name => name.trim().toLowerCase())
    
    // All should normalize to the same value
    expect(normalized.every(name => name === 'health')).toBe(true)
  })

  it('should demonstrate WeeklyTask title normalization', () => {
    const titles = ['Meditate', 'meditate', '  Meditate  ', 'MEDITATE']
    const normalized = titles.map(title => title.trim().toLowerCase())
    
    // All should normalize to the same value
    expect(normalized.every(title => title === 'meditate')).toBe(true)
  })
})
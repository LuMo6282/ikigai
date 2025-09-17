import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Test will be skipped if DATABASE_URL is not configured
const isDbAvailable = !!process.env.DATABASE_URL

let testUserId: string

describe('Signal Database Integration Tests', () => {
  if (!isDbAvailable) {
    it('Skipping database tests - DATABASE_URL not set', () => {
      console.log('Skipping database tests - DATABASE_URL not set')
      expect(true).toBe(true)
    })
    return
  }

  beforeEach(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User'
      }
    })
    testUserId = testUser.id
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.signal.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.user.delete({
      where: { id: testUserId }
    })
  })

  describe('Signal creation', () => {
    it('should create SLEEP signal', async () => {
      const signal = await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date: new Date('2025-01-15T00:00:00.000Z'),
          value: 7.5,
          userId: testUserId
        }
      })

      expect(signal.type).toBe('SLEEP')
      expect(signal.date).toEqual(new Date('2025-01-15T00:00:00.000Z'))
      expect(signal.value).toBe(7.5)
      expect(signal.userId).toBe(testUserId)
    })

    it('should create WELLBEING signal', async () => {
      const signal = await prisma.signal.create({
        data: {
          type: 'WELLBEING',
          date: new Date('2025-01-15T00:00:00.000Z'),
          value: 8,
          userId: testUserId
        }
      })

      expect(signal.type).toBe('WELLBEING')
      expect(signal.date).toEqual(new Date('2025-01-15T00:00:00.000Z'))
      expect(signal.value).toBe(8)
      expect(signal.userId).toBe(testUserId)
    })

    it('should allow both SLEEP and WELLBEING signals for same date', async () => {
      const date = new Date('2025-01-15T00:00:00.000Z')

      const sleepSignal = await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date,
          value: 8,
          userId: testUserId
        }
      })

      const wellbeingSignal = await prisma.signal.create({
        data: {
          type: 'WELLBEING',
          date,
          value: 9,
          userId: testUserId
        }
      })

      expect(sleepSignal.type).toBe('SLEEP')
      expect(sleepSignal.value).toBe(8)
      expect(wellbeingSignal.type).toBe('WELLBEING')
      expect(wellbeingSignal.value).toBe(9)
    })
  })

  describe('Unique constraint (userId, date, type)', () => {
    it('should prevent duplicate SLEEP signals for same user and date', async () => {
      const date = new Date('2025-01-15T00:00:00.000Z')

      // First signal should succeed
      await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date,
          value: 7.5,
          userId: testUserId
        }
      })

      // Second signal with same type/date should fail
      await expect(
        prisma.signal.create({
          data: {
            type: 'SLEEP',
            date,
            value: 8.0,
            userId: testUserId
          }
        })
      ).rejects.toThrow()
    })

    it('should prevent duplicate WELLBEING signals for same user and date', async () => {
      const date = new Date('2025-01-15T00:00:00.000Z')

      // First signal should succeed
      await prisma.signal.create({
        data: {
          type: 'WELLBEING',
          date,
          value: 8,
          userId: testUserId
        }
      })

      // Second signal with same type/date should fail
      await expect(
        prisma.signal.create({
          data: {
            type: 'WELLBEING',
            date,
            value: 9,
            userId: testUserId
          }
        })
      ).rejects.toThrow()
    })

    it('should allow different users to have same type/date signals', async () => {
      // Create another test user
      const otherUser = await prisma.user.create({
        data: {
          email: `other-${Date.now()}@example.com`,
          name: 'Other User'
        }
      })

      const date = new Date('2025-01-15T00:00:00.000Z')

      // First user creates signal
      await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date,
          value: 7.5,
          userId: testUserId
        }
      })

      // Second user creates signal with same type/date - should succeed
      const otherSignal = await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date,
          value: 8.0,
          userId: otherUser.id
        }
      })

      expect(otherSignal.type).toBe('SLEEP')
      expect(otherSignal.value).toBe(8.0)
      expect(otherSignal.userId).toBe(otherUser.id)

      // Clean up
      await prisma.user.delete({
        where: { id: otherUser.id }
      })
    })
  })

  describe('Signal updates', () => {
    it('should update signal value', async () => {
      const signal = await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date: new Date('2025-01-15T00:00:00.000Z'),
          value: 7.5,
          userId: testUserId
        }
      })

      const updatedSignal = await prisma.signal.update({
        where: { id: signal.id },
        data: { value: 8.0 }
      })

      expect(updatedSignal.value).toBe(8.0)
      expect(updatedSignal.type).toBe('SLEEP') // Other fields unchanged
    })

    it('should update signal type and handle uniqueness', async () => {
      const date = new Date('2025-01-15T00:00:00.000Z')

      // Create SLEEP signal
      const signal = await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date,
          value: 7.5,
          userId: testUserId
        }
      })

      // Update type to WELLBEING - should work
      const updatedSignal = await prisma.signal.update({
        where: { id: signal.id },
        data: {
          type: 'WELLBEING',
          value: 8 // Update value to valid WELLBEING value
        }
      })

      expect(updatedSignal.type).toBe('WELLBEING')
      expect(updatedSignal.value).toBe(8)
    })

    it('should fail when update would violate uniqueness constraint', async () => {
      const date = new Date('2025-01-15T00:00:00.000Z')

      // Create two signals for different dates
      const signal1 = await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date,
          value: 7.5,
          userId: testUserId
        }
      })

      const signal2 = await prisma.signal.create({
        data: {
          type: 'WELLBEING',
          date,
          value: 8,
          userId: testUserId
        }
      })

      // Try to update signal2 to have same type as signal1 - should fail
      await expect(
        prisma.signal.update({
          where: { id: signal2.id },
          data: { type: 'SLEEP', value: 8.0 }
        })
      ).rejects.toThrow()
    })

    it('should update signal date', async () => {
      const signal = await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date: new Date('2025-01-15T00:00:00.000Z'),
          value: 7.5,
          userId: testUserId
        }
      })

      const newDate = new Date('2025-01-16T00:00:00.000Z')
      const updatedSignal = await prisma.signal.update({
        where: { id: signal.id },
        data: { date: newDate }
      })

      expect(updatedSignal.date).toEqual(newDate)
    })
  })

  describe('Signal deletion', () => {
    it('should delete signal', async () => {
      const signal = await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date: new Date('2025-01-15T00:00:00.000Z'),
          value: 7.5,
          userId: testUserId
        }
      })

      await prisma.signal.delete({
        where: { id: signal.id }
      })

      const deletedSignal = await prisma.signal.findUnique({
        where: { id: signal.id }
      })

      expect(deletedSignal).toBeNull()
    })

    it('should cascade delete signals when user is deleted', async () => {
      const signal = await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date: new Date('2025-01-15T00:00:00.000Z'),
          value: 7.5,
          userId: testUserId
        }
      })

      // Delete user
      await prisma.user.delete({
        where: { id: testUserId }
      })

      // Signal should also be deleted
      const deletedSignal = await prisma.signal.findUnique({
        where: { id: signal.id }
      })

      expect(deletedSignal).toBeNull()
      
      // Reset testUserId so cleanup doesn't fail
      testUserId = 'deleted'
    })
  })

  describe('Signal queries', () => {
    beforeEach(async () => {
      // Create test signals
      const baseDate = new Date('2025-01-15T00:00:00.000Z')
      
      await prisma.signal.createMany({
        data: [
          { type: 'SLEEP', date: baseDate, value: 7.5, userId: testUserId },
          { type: 'WELLBEING', date: baseDate, value: 8, userId: testUserId },
          { 
            type: 'SLEEP', 
            date: new Date('2025-01-16T00:00:00.000Z'), 
            value: 8.0, 
            userId: testUserId 
          },
          { 
            type: 'WELLBEING', 
            date: new Date('2025-01-17T00:00:00.000Z'), 
            value: 9, 
            userId: testUserId 
          }
        ]
      })
    })

    it('should find signals by type', async () => {
      const sleepSignals = await prisma.signal.findMany({
        where: { userId: testUserId, type: 'SLEEP' },
        orderBy: { date: 'asc' }
      })

      expect(sleepSignals).toHaveLength(2)
      expect(sleepSignals[0].type).toBe('SLEEP')
      expect(sleepSignals[1].type).toBe('SLEEP')
    })

    it('should find signals by date range', async () => {
      const signals = await prisma.signal.findMany({
        where: {
          userId: testUserId,
          date: {
            gte: new Date('2025-01-15T00:00:00.000Z'),
            lte: new Date('2025-01-16T23:59:59.999Z')
          }
        },
        orderBy: { date: 'asc' }
      })

      expect(signals).toHaveLength(3) // 2 on Jan 15, 1 on Jan 16
    })

    it('should find signals by type and date range', async () => {
      const signals = await prisma.signal.findMany({
        where: {
          userId: testUserId,
          type: 'WELLBEING',
          date: {
            gte: new Date('2025-01-15T00:00:00.000Z'),
            lte: new Date('2025-01-16T23:59:59.999Z')
          }
        },
        orderBy: { date: 'asc' }
      })

      expect(signals).toHaveLength(1) // Only Jan 15 WELLBEING
      expect(signals[0].type).toBe('WELLBEING')
      expect(signals[0].value).toBe(8)
    })

    it('should order signals by date ascending', async () => {
      const signals = await prisma.signal.findMany({
        where: { userId: testUserId },
        orderBy: { date: 'asc' }
      })

      expect(signals).toHaveLength(4)
      expect(signals[0].date).toEqual(new Date('2025-01-15T00:00:00.000Z'))
      expect(signals[signals.length - 1].date).toEqual(new Date('2025-01-17T00:00:00.000Z'))
    })
  })

  describe('Data integrity', () => {
    it('should preserve precise decimal values for SLEEP', async () => {
      const signal = await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date: new Date('2025-01-15T00:00:00.000Z'),
          value: 7.25, // Quarter hour precision
          userId: testUserId
        }
      })

      expect(signal.value).toBe(7.25)

      const retrieved = await prisma.signal.findUnique({
        where: { id: signal.id }
      })

      expect(retrieved?.value).toBe(7.25)
    })

    it('should preserve integer values for WELLBEING', async () => {
      const signal = await prisma.signal.create({
        data: {
          type: 'WELLBEING',
          date: new Date('2025-01-15T00:00:00.000Z'),
          value: 10,
          userId: testUserId
        }
      })

      expect(signal.value).toBe(10)

      const retrieved = await prisma.signal.findUnique({
        where: { id: signal.id }
      })

      expect(retrieved?.value).toBe(10)
    })

    it('should preserve date without time zone issues', async () => {
      const testDate = new Date('2025-01-15T00:00:00.000Z')
      
      const signal = await prisma.signal.create({
        data: {
          type: 'SLEEP',
          date: testDate,
          value: 8,
          userId: testUserId
        }
      })

      expect(signal.date).toEqual(testDate)

      const retrieved = await prisma.signal.findUnique({
        where: { id: signal.id }
      })

      expect(retrieved?.date).toEqual(testDate)
    })
  })
})
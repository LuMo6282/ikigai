/**
 * Database-Level Integration Tests for Case-Insensitive Constraints
 * 
 * These tests verify that database constraints work correctly at the database level,
 * proving that case-insensitive uniqueness and join table constraints are enforced
 * by PostgreSQL itself rather than just application logic.
 * 
 * Current Schema Test Requirements:
 * - LifeArea.nameNorm: Case-insensitive unique constraints using normalized columns
 * - WeeklyTask.titleNorm: Case-insensitive unique within same user+week
 * - Signal validation: Valid types (SLEEP, WELLBEING) with appropriate value ranges
 */

import { describe, expect, test, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  // Clean up test data
  await prisma.signal.deleteMany()
  await prisma.weeklyFocusThemeGoal.deleteMany()
  await prisma.weeklyFocusTheme.deleteMany()
  await prisma.weeklyTask.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.lifeArea.deleteMany()
  await prisma.user.deleteMany()
  await prisma.$disconnect()
})

describe('Database Constraint Tests', () => {
  describe('Case-Insensitive Uniqueness', () => {
    test('LifeArea.name enforces case-insensitive uniqueness via nameNorm', async () => {
      // Create user first
      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'lifearea-test@example.com',
          name: 'LifeArea Tester'
        }
      })

      // Create first life area with lowercase
      const lifeArea1 = await prisma.lifeArea.create({
        data: {
          id: uuidv4(),
          name: 'health',
          color: '#4ade80',
          order: 1,
          userId: user.id
        }
      })

      // Attempt to create second with different case - should fail due to nameNorm constraint
      await expect(
        prisma.lifeArea.create({
          data: {
            id: uuidv4(),
            name: 'Health',
            color: '#22c55e',
            order: 2,
            userId: user.id
          }
        })
      ).rejects.toThrow(/unique constraint/i)

      // Also test with all caps
      await expect(
        prisma.lifeArea.create({
          data: {
            id: uuidv4(),
            name: 'HEALTH',
            color: '#16a34a',
            order: 3,
            userId: user.id
          }
        })
      ).rejects.toThrow(/unique constraint/i)
    })

    test('WeeklyTask.title enforces case-insensitive uniqueness via titleNorm within same user+week', async () => {
      // Setup: Create user and goal
      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'weeklytask-test@example.com',
          name: 'WeeklyTask Tester'
        }
      })

      const lifeArea = await prisma.lifeArea.create({
        data: {
          id: uuidv4(),
          name: 'fitness',
          color: '#f59e0b',
          order: 1,
          userId: user.id
        }
      })

      const goal = await prisma.goal.create({
        data: {
          id: uuidv4(),
          title: 'Get fit',
          horizon: 'MONTH',
          status: 'active',
          userId: user.id,
          lifeAreaId: lifeArea.id
        }
      })

      const weekStart = new Date('2024-01-01')

      // Create first task with lowercase
      const task1 = await prisma.weeklyTask.create({
        data: {
          id: uuidv4(),
          title: 'morning run',
          weekStart: weekStart,
          userId: user.id,
          goalId: goal.id
        }
      })

      // Attempt to create second task with different case in same week+user - should fail due to titleNorm constraint
      await expect(
        prisma.weeklyTask.create({
          data: {
            id: uuidv4(),
            title: 'Morning Run',
            weekStart: weekStart,
            userId: user.id,
            goalId: goal.id
          }
        })
      ).rejects.toThrow(/unique constraint/i)

      // But same title should work for different week
      const differentWeek = new Date('2024-01-08')
      const task3 = await prisma.weeklyTask.create({
        data: {
          id: uuidv4(),
          title: 'Morning Run',
          weekStart: differentWeek,
          userId: user.id,
          goalId: goal.id
        }
      })
      expect(task3).toBeTruthy()
      expect(task3.title).toBe('Morning Run')
    })
  })

  describe('Signal Validation Constraints', () => {
    test('Signal.type and value validation with CHECK constraints', async () => {
      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'signal-test@example.com',
          name: 'Signal Tester'
        }
      })

      const testDate = new Date('2024-01-01')

      // Valid SLEEP signal (0-14 hours in 0.25 increments)
      const sleepSignal = await prisma.signal.create({
        data: {
          id: uuidv4(),
          type: 'SLEEP',
          date: testDate,
          value: 8.5,
          userId: user.id
        }
      })
      expect(sleepSignal.value).toBe(8.5)

      // Valid WELLBEING signal (1-10 integers)
      const wellbeingSignal = await prisma.signal.create({
        data: {
          id: uuidv4(),
          type: 'WELLBEING',
          date: new Date('2024-01-02'),
          value: 7,
          userId: user.id
        }
      })
      expect(wellbeingSignal.value).toBe(7)

      // Invalid SLEEP value (above 14)
      await expect(
        prisma.signal.create({
          data: {
            id: uuidv4(),
            type: 'SLEEP',
            date: new Date('2024-01-03'),
            value: 15,
            userId: user.id
          }
        })
      ).rejects.toThrow(/check constraint/i)

      // Invalid WELLBEING value (below 1)
      await expect(
        prisma.signal.create({
          data: {
            id: uuidv4(),
            type: 'WELLBEING',
            date: new Date('2024-01-04'),
            value: 0,
            userId: user.id
          }
        })
      ).rejects.toThrow(/check constraint/i)
    })

    test('Signal unique constraint per user-date-type', async () => {
      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'signal-unique-test@example.com',
          name: 'Signal Unique Tester'
        }
      })

      const testDate = new Date('2024-01-01')

      // Create first signal
      const signal1 = await prisma.signal.create({
        data: {
          id: uuidv4(),
          type: 'SLEEP',
          date: testDate,
          value: 8,
          userId: user.id
        }
      })

      // Attempt to create second signal with same user-date-type - should fail
      await expect(
        prisma.signal.create({
          data: {
            id: uuidv4(),
            type: 'SLEEP',
            date: testDate,
            value: 9,
            userId: user.id
          }
        })
      ).rejects.toThrow(/unique constraint/i)

      // But different type on same date should work
      const signal2 = await prisma.signal.create({
        data: {
          id: uuidv4(),
          type: 'WELLBEING',
          date: testDate,
          value: 7,
          userId: user.id
        }
      })
      expect(signal2).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    test('Unicode and special characters in names', async () => {
      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'unicode-test@example.com',
          name: 'Unicode Tester'
        }
      })

      // Unicode characters should work
      const unicodeArea = await prisma.lifeArea.create({
        data: {
          id: uuidv4(),
          name: '健康', // "Health" in Japanese
          color: '#22c55e',
          order: 1,
          userId: user.id
        }
      })
      expect(unicodeArea.name).toBe('健康')

      // Special characters should work
      const specialArea = await prisma.lifeArea.create({
        data: {
          id: uuidv4(),
          name: 'Work/Life Balance',
          color: '#8b5cf6',
          order: 2,
          userId: user.id
        }
      })
      expect(specialArea.name).toBe('Work/Life Balance')

      // But case insensitivity should still apply via nameNorm
      await expect(
        prisma.lifeArea.create({
          data: {
            id: uuidv4(),
            name: 'work/life balance',
            color: '#ec4899',
            order: 3,
            userId: user.id
          }
        })
      ).rejects.toThrow(/unique constraint/i)
    })
  })
})
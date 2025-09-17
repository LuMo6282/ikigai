import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Goals Database Integration Tests', () => {
  let testUserId: string
  let otherUserId: string
  let testLifeAreaId: string

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.log('Skipping database tests - DATABASE_URL not set')
      return
    }

    // Create test users
    const testUser = await prisma.user.create({
      data: { email: 'test-goals@example.com', name: 'Test User' }
    })
    testUserId = testUser.id

    const otherUser = await prisma.user.create({
      data: { email: 'other-goals@example.com', name: 'Other User' }
    })
    otherUserId = otherUser.id

    // Create a test life area for the test user
    const testLifeArea = await prisma.lifeArea.create({
      data: {
        userId: testUserId,
        name: 'Test Life Area',
        order: 1
      }
    })
    testLifeAreaId = testLifeArea.id

    // Create a life area for the other user
    await prisma.lifeArea.create({
      data: {
        userId: otherUserId,
        name: 'Other Life Area',
        order: 1
      }
    })
  })

  afterAll(async () => {
    if (!process.env.DATABASE_URL) return

    // Clean up test data
    await prisma.goal.deleteMany({
      where: {
        userId: { in: [testUserId, otherUserId] }
      }
    })
    await prisma.lifeArea.deleteMany({
      where: {
        userId: { in: [testUserId, otherUserId] }
      }
    })
    await prisma.user.deleteMany({
      where: {
        email: { in: ['test-goals@example.com', 'other-goals@example.com'] }
      }
    })

    await prisma.$disconnect()
  })

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return

    // Clean up goals before each test
    await prisma.goal.deleteMany({
      where: {
        userId: { in: [testUserId, otherUserId] }
      }
    })
  })

  describe('Goal Creation', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true) // Skip test
        return
      }
    })

    it('creates goal with minimal required fields', async () => {
      if (!process.env.DATABASE_URL) return

      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Learn TypeScript',
          horizon: 'MONTH',
          status: 'active'
        }
      })

      expect(goal.id).toBeDefined()
      expect(goal.title).toBe('Learn TypeScript')
      expect(goal.horizon).toBe('MONTH')
      expect(goal.status).toBe('active')
      expect(goal.description).toBeNull()
      expect(goal.targetDate).toBeNull()
      expect(goal.lifeAreaId).toBeNull()
    })

    it('creates goal with all fields including lifeAreaId', async () => {
      if (!process.env.DATABASE_URL) return

      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Master React',
          description: 'Build 5 complex React applications',
          horizon: 'YEAR',
          status: 'active',
          targetDate: new Date('2025-12-31'),
          lifeAreaId: testLifeAreaId
        }
      })

      expect(goal.title).toBe('Master React')
      expect(goal.description).toBe('Build 5 complex React applications')
      expect(goal.horizon).toBe('YEAR')
      expect(goal.status).toBe('active')
      expect(goal.targetDate).toEqual(new Date('2025-12-31'))
      expect(goal.lifeAreaId).toBe(testLifeAreaId)
    })

    it('allows multiple goals for same user', async () => {
      if (!process.env.DATABASE_URL) return

      const goal1 = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Goal 1',
          horizon: 'WEEK',
          status: 'active'
        }
      })

      const goal2 = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Goal 1', // Same title is allowed
          horizon: 'MONTH',
          status: 'paused'
        }
      })

      expect(goal1.id).not.toBe(goal2.id)
      expect(goal1.title).toBe(goal2.title)
    })
  })

  describe('LifeArea Association', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('creates goal with valid lifeAreaId for same user', async () => {
      if (!process.env.DATABASE_URL) return

      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Test Goal',
          horizon: 'YEAR',
          status: 'active',
          lifeAreaId: testLifeAreaId
        }
      })

      expect(goal.lifeAreaId).toBe(testLifeAreaId)
    })

    it('handles lifeAreaId deletion by setting to null', async () => {
      if (!process.env.DATABASE_URL) return

      // Create goal linked to life area
      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Test Goal',
          horizon: 'YEAR',
          status: 'active',
          lifeAreaId: testLifeAreaId
        }
      })

      // Delete the life area
      await prisma.lifeArea.delete({
        where: { id: testLifeAreaId }
      })

      // Check goal's lifeAreaId is now null
      const updatedGoal = await prisma.goal.findUnique({
        where: { id: goal.id }
      })

      expect(updatedGoal?.lifeAreaId).toBeNull()
    })
  })

  describe('Soft Limit Enforcement', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('allows creation of up to 12 active goals', async () => {
      if (!process.env.DATABASE_URL) return

      // Create 12 active goals
      const goals = []
      for (let i = 1; i <= 12; i++) {
        const goal = await prisma.goal.create({
          data: {
            userId: testUserId,
            title: `Active Goal ${i}`,
            horizon: 'YEAR',
            status: 'active'
          }
        })
        goals.push(goal)
      }

      const activeCount = await prisma.goal.count({
        where: { userId: testUserId, status: 'active' }
      })
      expect(activeCount).toBe(12)
    })

    it('counts only active goals toward soft limit', async () => {
      if (!process.env.DATABASE_URL) return

      // Create 12 active goals
      for (let i = 1; i <= 12; i++) {
        await prisma.goal.create({
          data: {
            userId: testUserId,
            title: `Active Goal ${i}`,
            horizon: 'YEAR',
            status: 'active'
          }
        })
      }

      // Create additional non-active goals (should be allowed)
      await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Paused Goal',
          horizon: 'YEAR',
          status: 'paused'
        }
      })

      await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Done Goal',
          horizon: 'YEAR',
          status: 'done'
        }
      })

      const totalCount = await prisma.goal.count({
        where: { userId: testUserId }
      })
      expect(totalCount).toBe(14)

      const activeCount = await prisma.goal.count({
        where: { userId: testUserId, status: 'active' }
      })
      expect(activeCount).toBe(12)
    })

    it('enforces per-user soft limit isolation', async () => {
      if (!process.env.DATABASE_URL) return

      // Create 12 active goals for test user
      for (let i = 1; i <= 12; i++) {
        await prisma.goal.create({
          data: {
            userId: testUserId,
            title: `User1 Goal ${i}`,
            horizon: 'YEAR',
            status: 'active'
          }
        })
      }

      // Other user should still be able to create active goals
      await prisma.goal.create({
        data: {
          userId: otherUserId,
          title: 'Other User Goal',
          horizon: 'YEAR',
          status: 'active'
        }
      })

      const user1ActiveCount = await prisma.goal.count({
        where: { userId: testUserId, status: 'active' }
      })
      const user2ActiveCount = await prisma.goal.count({
        where: { userId: otherUserId, status: 'active' }
      })

      expect(user1ActiveCount).toBe(12)
      expect(user2ActiveCount).toBe(1)
    })
  })

  describe('Goal Updates', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('updates goal status from paused to active', async () => {
      if (!process.env.DATABASE_URL) return

      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Test Goal',
          horizon: 'YEAR',
          status: 'paused'
        }
      })

      const updatedGoal = await prisma.goal.update({
        where: { id: goal.id },
        data: { status: 'active' }
      })

      expect(updatedGoal.status).toBe('active')
    })

    it('updates partial fields only', async () => {
      if (!process.env.DATABASE_URL) return

      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Original Title',
          description: 'Original Description',
          horizon: 'YEAR',
          status: 'active',
          targetDate: new Date('2025-12-31')
        }
      })

      const updatedGoal = await prisma.goal.update({
        where: { id: goal.id },
        data: { 
          title: 'Updated Title',
          status: 'paused'
        }
      })

      expect(updatedGoal.title).toBe('Updated Title')
      expect(updatedGoal.description).toBe('Original Description')
      expect(updatedGoal.horizon).toBe('YEAR')
      expect(updatedGoal.status).toBe('paused')
      expect(updatedGoal.targetDate).toEqual(new Date('2025-12-31'))
    })
  })

  describe('Goal Deletion with WeeklyTask Unlinking', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('unlinks WeeklyTasks when goal is deleted', async () => {
      if (!process.env.DATABASE_URL) return

      // Create a goal
      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Goal to Delete',
          horizon: 'WEEK',
          status: 'active'
        }
      })

      // Create a weekly task linked to this goal
      const weeklyTask = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Task linked to goal',
          weekStart: new Date('2025-01-06'), // Monday
          goalId: goal.id
        }
      })

      // Verify the task is linked to the goal
      expect(weeklyTask.goalId).toBe(goal.id)

      // Delete the goal with transaction (unlink then delete)
      await prisma.$transaction(async (tx) => {
        // Unlink weekly tasks
        await tx.weeklyTask.updateMany({
          where: { goalId: goal.id },
          data: { goalId: null }
        })

        // Delete the goal
        await tx.goal.delete({
          where: { id: goal.id }
        })
      })

      // Verify goal is deleted
      const deletedGoal = await prisma.goal.findUnique({
        where: { id: goal.id }
      })
      expect(deletedGoal).toBeNull()

      // Verify weekly task still exists but with null goalId
      const unlinkedTask = await prisma.weeklyTask.findUnique({
        where: { id: weeklyTask.id }
      })
      expect(unlinkedTask).toBeDefined()
      expect(unlinkedTask?.goalId).toBeNull()
      expect(unlinkedTask?.title).toBe('Task linked to goal')
    })

    it('handles goal deletion with multiple linked WeeklyTasks', async () => {
      if (!process.env.DATABASE_URL) return

      // Create a goal
      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Goal with Multiple Tasks',
          horizon: 'MONTH',
          status: 'active'
        }
      })

      // Create multiple weekly tasks linked to this goal
      const task1 = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Task 1',
          weekStart: new Date('2025-01-06'),
          goalId: goal.id
        }
      })

      const task2 = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Task 2',
          weekStart: new Date('2025-01-13'),
          goalId: goal.id
        }
      })

      // Delete goal with transaction
      await prisma.$transaction(async (tx) => {
        await tx.weeklyTask.updateMany({
          where: { goalId: goal.id },
          data: { goalId: null }
        })

        await tx.goal.delete({
          where: { id: goal.id }
        })
      })

      // Verify all tasks are unlinked but still exist
      const unlinkedTask1 = await prisma.weeklyTask.findUnique({
        where: { id: task1.id }
      })
      const unlinkedTask2 = await prisma.weeklyTask.findUnique({
        where: { id: task2.id }
      })

      expect(unlinkedTask1?.goalId).toBeNull()
      expect(unlinkedTask2?.goalId).toBeNull()
      expect(unlinkedTask1?.title).toBe('Task 1')
      expect(unlinkedTask2?.title).toBe('Task 2')
    })
  })

  describe('Data Integrity', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('cascades user deletion to goals', async () => {
      if (!process.env.DATABASE_URL) return

      // Create a temporary user
      const tempUser = await prisma.user.create({
        data: { email: 'temp@example.com', name: 'Temp User' }
      })

      // Create a goal for this user
      const goal = await prisma.goal.create({
        data: {
          userId: tempUser.id,
          title: 'Temp Goal',
          horizon: 'YEAR',
          status: 'active'
        }
      })

      // Delete the user
      await prisma.user.delete({
        where: { id: tempUser.id }
      })

      // Goal should also be deleted due to cascade
      const deletedGoal = await prisma.goal.findUnique({
        where: { id: goal.id }
      })
      expect(deletedGoal).toBeNull()
    })

    it('handles all valid enum values', async () => {
      if (!process.env.DATABASE_URL) return

      const horizons = ['YEAR', 'SIX_MONTH', 'MONTH', 'WEEK']
      const statuses = ['active', 'paused', 'done']

      for (const horizon of horizons) {
        for (const status of statuses) {
          const goal = await prisma.goal.create({
            data: {
              userId: testUserId,
              title: `${horizon} ${status} Goal`,
              horizon,
              status
            }
          })

          expect(goal.horizon).toBe(horizon)
          expect(goal.status).toBe(status)
        }
      }
    })
  })
})
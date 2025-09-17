import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('WeeklyTasks Database Integration Tests', () => {
  let testUserId: string
  let otherUserId: string
  let testGoalId: string
  let testWeekGoalId: string
  let testWeekStart: Date

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.log('Skipping database tests - DATABASE_URL not set')
      return
    }

    // Create test users
    const testUser = await prisma.user.create({
      data: { email: 'test-tasks@example.com', name: 'Test User' }
    })
    testUserId = testUser.id

    const otherUser = await prisma.user.create({
      data: { email: 'other-tasks@example.com', name: 'Other User' }
    })
    otherUserId = otherUser.id

    // Set up test week start (Monday)
    testWeekStart = new Date('2025-01-06T00:00:00.000Z') // Monday

    // Create test goals
    testGoalId = (await prisma.goal.create({
      data: {
        userId: testUserId,
        title: 'Test Year Goal',
        horizon: 'YEAR',
        status: 'active'
      }
    })).id

    testWeekGoalId = (await prisma.goal.create({
      data: {
        userId: testUserId,
        title: 'Test Week Goal',
        horizon: 'WEEK',
        status: 'active',
        targetDate: testWeekStart // Same week as test tasks
      }
    })).id
  })

  afterAll(async () => {
    if (!process.env.DATABASE_URL) return

    // Clean up test data
    await prisma.weeklyTask.deleteMany({
      where: {
        userId: { in: [testUserId, otherUserId] }
      }
    })
    await prisma.goal.deleteMany({
      where: {
        userId: { in: [testUserId, otherUserId] }
      }
    })
    await prisma.user.deleteMany({
      where: {
        email: { in: ['test-tasks@example.com', 'other-tasks@example.com'] }
      }
    })

    await prisma.$disconnect()
  })

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return

    // Clean up tasks before each test
    await prisma.weeklyTask.deleteMany({
      where: {
        userId: { in: [testUserId, otherUserId] }
      }
    })
  })

  describe('WeeklyTask Creation', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true) // Skip test
        return
      }
    })

    it('creates task with minimal required fields', async () => {
      if (!process.env.DATABASE_URL) return

      const task = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Morning Exercise',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: true,
          thursday: false,
          friday: true,
          saturday: false,
          sunday: false
        }
      })

      expect(task.id).toBeDefined()
      expect(task.title).toBe('Morning Exercise')
      expect(task.weekStart).toEqual(testWeekStart)
      expect(task.monday).toBe(true)
      expect(task.tuesday).toBe(false)
      expect(task.goalId).toBeNull()
    })

    it('creates task with goalId', async () => {
      if (!process.env.DATABASE_URL) return

      const task = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Weekly Goal Task',
          weekStart: testWeekStart,
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
          goalId: testWeekGoalId
        }
      })

      expect(task.goalId).toBe(testWeekGoalId)
    })

    it('allows multiple tasks for same user and week', async () => {
      if (!process.env.DATABASE_URL) return

      const task1 = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Task 1',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      const task2 = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Task 2', // Different title
          weekStart: testWeekStart,
          monday: false,
          tuesday: true,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      expect(task1.id).not.toBe(task2.id)
      expect(task1.title).toBe('Task 1')
      expect(task2.title).toBe('Task 2')
    })
  })

  describe('Unique Constraints', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('prevents duplicate titles for same user and week', async () => {
      if (!process.env.DATABASE_URL) return

      // Create first task
      await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Duplicate Title',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      // Try to create second task with same title
      await expect(prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Duplicate Title', // Same title
          weekStart: testWeekStart, // Same week
          monday: false,
          tuesday: true,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })).rejects.toThrow()
    })

    it('enforces case-insensitive uniqueness via database', async () => {
      if (!process.env.DATABASE_URL) return

      // Create first task
      await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Morning Run',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      // Try to create second task with different case
      await expect(prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'MORNING RUN', // Different case
          weekStart: testWeekStart,
          monday: false,
          tuesday: true,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })).rejects.toThrow()
    })

    it('allows same title for different users', async () => {
      if (!process.env.DATABASE_URL) return

      // Create task for first user
      const task1 = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Shared Title',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      // Create task for second user with same title
      const task2 = await prisma.weeklyTask.create({
        data: {
          userId: otherUserId,
          title: 'Shared Title', // Same title but different user
          weekStart: testWeekStart,
          monday: false,
          tuesday: true,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      expect(task1.title).toBe(task2.title)
      expect(task1.userId).not.toBe(task2.userId)
    })

    it('allows same title for different weeks', async () => {
      if (!process.env.DATABASE_URL) return

      const nextWeek = new Date('2025-01-13T00:00:00.000Z') // Next Monday

      // Create task for first week
      const task1 = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Weekly Routine',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      // Create task for next week with same title
      const task2 = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Weekly Routine', // Same title but different week
          weekStart: nextWeek,
          monday: false,
          tuesday: true,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      expect(task1.title).toBe(task2.title)
      expect(task1.weekStart).not.toEqual(task2.weekStart)
    })
  })

  describe('Goal Relationships', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('sets goalId to null when goal is deleted', async () => {
      if (!process.env.DATABASE_URL) return

      // Create task linked to goal
      const task = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Task with Goal',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
          goalId: testWeekGoalId
        }
      })

      expect(task.goalId).toBe(testWeekGoalId)

      // Delete the goal
      await prisma.goal.delete({
        where: { id: testWeekGoalId }
      })

      // Check that task's goalId is now null
      const updatedTask = await prisma.weeklyTask.findUnique({
        where: { id: task.id }
      })

      expect(updatedTask?.goalId).toBeNull()
    })

    it('allows linking to WEEK horizon goal', async () => {
      if (!process.env.DATABASE_URL) return

      const weekGoal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Another Week Goal',
          horizon: 'WEEK',
          status: 'active',
          targetDate: testWeekStart
        }
      })

      const task = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Week Goal Task',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
          goalId: weekGoal.id
        }
      })

      expect(task.goalId).toBe(weekGoal.id)

      // Clean up
      await prisma.goal.delete({ where: { id: weekGoal.id } })
    })
  })

  describe('Soft Limits Enforcement', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('allows creation of up to 7 tasks per week', async () => {
      if (!process.env.DATABASE_URL) return

      // Create 7 tasks for the same week
      const tasks = []
      for (let i = 1; i <= 7; i++) {
        const task = await prisma.weeklyTask.create({
          data: {
            userId: testUserId,
            title: `Task ${i}`,
            weekStart: testWeekStart,
            monday: i % 2 === 1,
            tuesday: i % 3 === 1,
            wednesday: i % 4 === 1,
            thursday: i % 5 === 1,
            friday: i % 6 === 1,
            saturday: i % 7 === 1,
            sunday: i % 8 === 1
          }
        })
        tasks.push(task)
      }

      const taskCount = await prisma.weeklyTask.count({
        where: { userId: testUserId, weekStart: testWeekStart }
      })
      expect(taskCount).toBe(7)
    })

    it('enforces per-user per-week isolation', async () => {
      if (!process.env.DATABASE_URL) return

      // Create 7 tasks for test user
      for (let i = 1; i <= 7; i++) {
        await prisma.weeklyTask.create({
          data: {
            userId: testUserId,
            title: `User1 Task ${i}`,
            weekStart: testWeekStart,
            monday: true,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false,
            sunday: false
          }
        })
      }

      // Other user should still be able to create tasks for the same week
      await prisma.weeklyTask.create({
        data: {
          userId: otherUserId,
          title: 'Other User Task',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      // Test user should also be able to create tasks for different week
      const nextWeek = new Date('2025-01-13T00:00:00.000Z')
      await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Next Week Task',
          weekStart: nextWeek,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      const user1ThisWeekCount = await prisma.weeklyTask.count({
        where: { userId: testUserId, weekStart: testWeekStart }
      })
      const user2ThisWeekCount = await prisma.weeklyTask.count({
        where: { userId: otherUserId, weekStart: testWeekStart }
      })
      const user1NextWeekCount = await prisma.weeklyTask.count({
        where: { userId: testUserId, weekStart: nextWeek }
      })

      expect(user1ThisWeekCount).toBe(7)
      expect(user2ThisWeekCount).toBe(1)
      expect(user1NextWeekCount).toBe(1)
    })
  })

  describe('WeeklyTask Updates', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('updates task fields', async () => {
      if (!process.env.DATABASE_URL) return

      const task = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Original Title',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      const updatedTask = await prisma.weeklyTask.update({
        where: { id: task.id },
        data: {
          title: 'Updated Title',
          tuesday: true,
          friday: true
        }
      })

      expect(updatedTask.title).toBe('Updated Title')
      expect(updatedTask.monday).toBe(true) // Unchanged
      expect(updatedTask.tuesday).toBe(true) // Updated
      expect(updatedTask.friday).toBe(true) // Updated
      expect(updatedTask.sunday).toBe(false) // Unchanged
    })

    it('updates goalId linkage', async () => {
      if (!process.env.DATABASE_URL) return

      const task = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Task to Link',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      expect(task.goalId).toBeNull()

      // Create a new WEEK goal for linking
      const newWeekGoal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Link Goal',
          horizon: 'WEEK',
          status: 'active',
          targetDate: testWeekStart
        }
      })

      const updatedTask = await prisma.weeklyTask.update({
        where: { id: task.id },
        data: { goalId: newWeekGoal.id }
      })

      expect(updatedTask.goalId).toBe(newWeekGoal.id)

      // Clean up
      await prisma.goal.delete({ where: { id: newWeekGoal.id } })
    })
  })

  describe('WeeklyTask Deletion', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('deletes task without affecting goal', async () => {
      if (!process.env.DATABASE_URL) return

      // Create a WEEK goal
      const weekGoal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Goal to Keep',
          horizon: 'WEEK',
          status: 'active',
          targetDate: testWeekStart
        }
      })

      const task = await prisma.weeklyTask.create({
        data: {
          userId: testUserId,
          title: 'Task to Delete',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
          goalId: weekGoal.id
        }
      })

      // Delete the task
      await prisma.weeklyTask.delete({
        where: { id: task.id }
      })

      // Check task is deleted
      const deletedTask = await prisma.weeklyTask.findUnique({
        where: { id: task.id }
      })
      expect(deletedTask).toBeNull()

      // Check goal still exists
      const remainingGoal = await prisma.goal.findUnique({
        where: { id: weekGoal.id }
      })
      expect(remainingGoal).toBeDefined()
      expect(remainingGoal?.title).toBe('Goal to Keep')

      // Clean up
      await prisma.goal.delete({ where: { id: weekGoal.id } })
    })
  })

  describe('Data Integrity', () => {
    it('should skip if DATABASE_URL not set', async () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('cascades user deletion to tasks', async () => {
      if (!process.env.DATABASE_URL) return

      // Create a temporary user
      const tempUser = await prisma.user.create({
        data: { email: 'temp-tasks@example.com', name: 'Temp User' }
      })

      // Create a task for this user
      const task = await prisma.weeklyTask.create({
        data: {
          userId: tempUser.id,
          title: 'Temp Task',
          weekStart: testWeekStart,
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }
      })

      // Delete the user
      await prisma.user.delete({
        where: { id: tempUser.id }
      })

      // Task should also be deleted due to cascade
      const deletedTask = await prisma.weeklyTask.findUnique({
        where: { id: task.id }
      })
      expect(deletedTask).toBeNull()
    })

    it('handles all day combinations correctly', async () => {
      if (!process.env.DATABASE_URL) return

      const testCases = [
        { monday: true, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
        { monday: false, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false },
        { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true },
        { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
      ]

      for (let i = 0; i < testCases.length; i++) {
        const days = testCases[i]
        const task = await prisma.weeklyTask.create({
          data: {
            userId: testUserId,
            title: `Day Test ${i}`,
            weekStart: testWeekStart,
            ...days
          }
        })

        expect(task.monday).toBe(days.monday)
        expect(task.tuesday).toBe(days.tuesday)
        expect(task.wednesday).toBe(days.wednesday)
        expect(task.thursday).toBe(days.thursday)
        expect(task.friday).toBe(days.friday)
        expect(task.saturday).toBe(days.saturday)
        expect(task.sunday).toBe(days.sunday)
      }
    })
  })
})
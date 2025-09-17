import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('WeeklyFocusTheme Database Integration Tests', () => {
  let testUserId: string
  let otherUserId: string
  let testGoalId1: string
  let testGoalId2: string
  let testGoalId3: string
  let otherUserGoalId: string
  let testWeekStart: Date
  let otherWeekStart: Date

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.log('Skipping database tests - DATABASE_URL not set')
      return
    }

    // Create test users
    const testUser = await prisma.user.create({
      data: { email: 'test-focus@example.com', name: 'Test Focus User' }
    })
    testUserId = testUser.id

    const otherUser = await prisma.user.create({
      data: { email: 'other-focus@example.com', name: 'Other Focus User' }
    })
    otherUserId = otherUser.id

    // Set up test week starts (Mondays)
    testWeekStart = new Date('2025-01-07T00:00:00.000Z') // Monday
    otherWeekStart = new Date('2025-01-14T00:00:00.000Z') // Next Monday

    // Create test goals for linking
    testGoalId1 = (await prisma.goal.create({
      data: {
        userId: testUserId,
        title: 'Test Goal 1',
        horizon: 'YEAR',
        status: 'active'
      }
    })).id

    testGoalId2 = (await prisma.goal.create({
      data: {
        userId: testUserId,
        title: 'Test Goal 2',
        horizon: 'MONTH',
        status: 'active'
      }
    })).id

    testGoalId3 = (await prisma.goal.create({
      data: {
        userId: testUserId,
        title: 'Test Goal 3',
        horizon: 'WEEK',
        status: 'active'
      }
    })).id

    // Create goal for other user
    otherUserGoalId = (await prisma.goal.create({
      data: {
        userId: otherUserId,
        title: 'Other User Goal',
        horizon: 'YEAR',
        status: 'active'
      }
    })).id
  })

  afterAll(async () => {
    if (!process.env.DATABASE_URL) {
      return
    }

    // Cleanup test data
    await prisma.weeklyFocusThemeGoal.deleteMany({})
    await prisma.weeklyFocusTheme.deleteMany({})
    await prisma.goal.deleteMany({})
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test-focus@example.com', 'other-focus@example.com']
        }
      }
    })

    await prisma.$disconnect()
  })

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) {
      return
    }

    // Clean focus themes between tests
    await prisma.weeklyFocusThemeGoal.deleteMany({})
    await prisma.weeklyFocusTheme.deleteMany({})
  })

  describe('WeeklyFocusTheme Creation', () => {
    it('should skip if DATABASE_URL not set', () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true) // Test passes when skipped
        return
      }
    })

    it('creates theme with minimal required fields', async () => {
      if (!process.env.DATABASE_URL) return

      const theme = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Test Focus',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      expect(theme.title).toBe('Test Focus')
      expect(theme.note).toBeNull()
      expect(theme.weekStart).toEqual(testWeekStart)
      expect(theme.userId).toBe(testUserId)
    })

    it('creates theme with all fields including note', async () => {
      if (!process.env.DATABASE_URL) return

      const theme = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Detailed Focus',
          note: 'This is my focus note',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      expect(theme.title).toBe('Detailed Focus')
      expect(theme.note).toBe('This is my focus note')
      expect(theme.weekStart).toEqual(testWeekStart)
      expect(theme.userId).toBe(testUserId)
    })

    it('creates theme with linked goals', async () => {
      if (!process.env.DATABASE_URL) return

      const theme = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Focus with Goals',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      // Create goal links
      await prisma.weeklyFocusThemeGoal.createMany({
        data: [
          { weeklyFocusThemeId: theme.id, goalId: testGoalId1 },
          { weeklyFocusThemeId: theme.id, goalId: testGoalId2 }
        ]
      })

      // Verify links were created
      const links = await prisma.weeklyFocusThemeGoal.findMany({
        where: { weeklyFocusThemeId: theme.id },
        include: { goal: true }
      })

      expect(links).toHaveLength(2)
      expect(links.map(l => l.goalId)).toContain(testGoalId1)
      expect(links.map(l => l.goalId)).toContain(testGoalId2)
    })

    it('allows multiple themes for same user in different weeks', async () => {
      if (!process.env.DATABASE_URL) return

      const theme1 = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Focus Week 1',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      const theme2 = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Focus Week 2',
          weekStart: otherWeekStart,
          userId: testUserId
        }
      })

      expect(theme1.weekStart).toEqual(testWeekStart)
      expect(theme2.weekStart).toEqual(otherWeekStart)
      expect(theme1.userId).toBe(testUserId)
      expect(theme2.userId).toBe(testUserId)
    })
  })

  describe('Unique Constraints', () => {
    it('should skip if DATABASE_URL not set', () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('prevents duplicate themes for same user and week', async () => {
      if (!process.env.DATABASE_URL) return

      // Create first theme
      await prisma.weeklyFocusTheme.create({
        data: {
          title: 'First Focus',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      // Try to create second theme for same user and week
      await expect(
        prisma.weeklyFocusTheme.create({
          data: {
            title: 'Second Focus',
            weekStart: testWeekStart,
            userId: testUserId
          }
        })
      ).rejects.toThrow()
    })

    it('allows same week for different users', async () => {
      if (!process.env.DATABASE_URL) return

      const theme1 = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'User 1 Focus',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      const theme2 = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'User 2 Focus',
          weekStart: testWeekStart,
          userId: otherUserId
        }
      })

      expect(theme1.userId).toBe(testUserId)
      expect(theme2.userId).toBe(otherUserId)
      expect(theme1.weekStart).toEqual(theme2.weekStart)
    })

    it('prevents duplicate goal links for same theme', async () => {
      if (!process.env.DATABASE_URL) return

      const theme = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Focus with Duplicate Goals',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      // Create first link
      await prisma.weeklyFocusThemeGoal.create({
        data: {
          weeklyFocusThemeId: theme.id,
          goalId: testGoalId1
        }
      })

      // Try to create duplicate link
      await expect(
        prisma.weeklyFocusThemeGoal.create({
          data: {
            weeklyFocusThemeId: theme.id,
            goalId: testGoalId1
          }
        })
      ).rejects.toThrow()
    })

    it('allows same goal linked to different themes', async () => {
      if (!process.env.DATABASE_URL) return

      const theme1 = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Theme 1',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      const theme2 = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Theme 2',
          weekStart: otherWeekStart,
          userId: testUserId
        }
      })

      // Link same goal to both themes
      await prisma.weeklyFocusThemeGoal.create({
        data: {
          weeklyFocusThemeId: theme1.id,
          goalId: testGoalId1
        }
      })

      await prisma.weeklyFocusThemeGoal.create({
        data: {
          weeklyFocusThemeId: theme2.id,
          goalId: testGoalId1
        }
      })

      const links = await prisma.weeklyFocusThemeGoal.findMany({
        where: { goalId: testGoalId1 }
      })

      expect(links).toHaveLength(2)
    })
  })

  describe('Goal Relationships', () => {
    it('should skip if DATABASE_URL not set', () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('sets goal links to null when goal is deleted', async () => {
      if (!process.env.DATABASE_URL) return

      const theme = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Focus with Temp Goal',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      // Create a temporary goal
      const tempGoal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Temporary Goal',
          horizon: 'MONTH',
          status: 'active'
        }
      })

      // Link goal to theme
      await prisma.weeklyFocusThemeGoal.create({
        data: {
          weeklyFocusThemeId: theme.id,
          goalId: tempGoal.id
        }
      })

      // Delete the goal (should cascade delete the link)
      await prisma.goal.delete({
        where: { id: tempGoal.id }
      })

      // Verify link was deleted
      const links = await prisma.weeklyFocusThemeGoal.findMany({
        where: { weeklyFocusThemeId: theme.id }
      })

      expect(links).toHaveLength(0)
    })

    it('allows linking goals with any horizon (no restriction)', async () => {
      if (!process.env.DATABASE_URL) return

      const theme = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Multi-Horizon Focus',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      // Link goals with different horizons
      await prisma.weeklyFocusThemeGoal.createMany({
        data: [
          { weeklyFocusThemeId: theme.id, goalId: testGoalId1 }, // YEAR
          { weeklyFocusThemeId: theme.id, goalId: testGoalId2 }, // MONTH
          { weeklyFocusThemeId: theme.id, goalId: testGoalId3 }  // WEEK
        ]
      })

      const links = await prisma.weeklyFocusThemeGoal.findMany({
        where: { weeklyFocusThemeId: theme.id },
        include: { goal: true }
      })

      expect(links).toHaveLength(3)
      const horizons = links.map(l => l.goal.horizon)
      expect(horizons).toContain('YEAR')
      expect(horizons).toContain('MONTH')
      expect(horizons).toContain('WEEK')
    })
  })

  describe('WeeklyFocusTheme Updates', () => {
    it('should skip if DATABASE_URL not set', () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('updates theme fields', async () => {
      if (!process.env.DATABASE_URL) return

      const theme = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Original Focus',
          note: 'Original note',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      const updatedTheme = await prisma.weeklyFocusTheme.update({
        where: { id: theme.id },
        data: {
          title: 'Updated Focus',
          note: 'Updated note'
        }
      })

      expect(updatedTheme.title).toBe('Updated Focus')
      expect(updatedTheme.note).toBe('Updated note')
      expect(updatedTheme.weekStart).toEqual(testWeekStart) // Unchanged
      expect(updatedTheme.userId).toBe(testUserId) // Unchanged
    })

    it('updates linked goals by replacing set', async () => {
      if (!process.env.DATABASE_URL) return

      const theme = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Focus with Goals',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      // Create initial links
      await prisma.weeklyFocusThemeGoal.createMany({
        data: [
          { weeklyFocusThemeId: theme.id, goalId: testGoalId1 },
          { weeklyFocusThemeId: theme.id, goalId: testGoalId2 }
        ]
      })

      // Replace with new set of goals
      await prisma.weeklyFocusThemeGoal.deleteMany({
        where: { weeklyFocusThemeId: theme.id }
      })

      await prisma.weeklyFocusThemeGoal.createMany({
        data: [
          { weeklyFocusThemeId: theme.id, goalId: testGoalId2 },
          { weeklyFocusThemeId: theme.id, goalId: testGoalId3 }
        ]
      })

      // Verify new links
      const links = await prisma.weeklyFocusThemeGoal.findMany({
        where: { weeklyFocusThemeId: theme.id }
      })

      expect(links).toHaveLength(2)
      expect(links.map(l => l.goalId)).toContain(testGoalId2)
      expect(links.map(l => l.goalId)).toContain(testGoalId3)
      expect(links.map(l => l.goalId)).not.toContain(testGoalId1)
    })

    it('removes all linked goals when set to empty', async () => {
      if (!process.env.DATABASE_URL) return

      const theme = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Focus with Goals',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      // Create initial links
      await prisma.weeklyFocusThemeGoal.createMany({
        data: [
          { weeklyFocusThemeId: theme.id, goalId: testGoalId1 },
          { weeklyFocusThemeId: theme.id, goalId: testGoalId2 }
        ]
      })

      // Remove all links
      await prisma.weeklyFocusThemeGoal.deleteMany({
        where: { weeklyFocusThemeId: theme.id }
      })

      // Verify no links remain
      const links = await prisma.weeklyFocusThemeGoal.findMany({
        where: { weeklyFocusThemeId: theme.id }
      })

      expect(links).toHaveLength(0)
    })
  })

  describe('WeeklyFocusTheme Deletion', () => {
    it('should skip if DATABASE_URL not set', () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('deletes theme without affecting goals', async () => {
      if (!process.env.DATABASE_URL) return

      const theme = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Deletable Focus',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      // Link to goals
      await prisma.weeklyFocusThemeGoal.createMany({
        data: [
          { weeklyFocusThemeId: theme.id, goalId: testGoalId1 },
          { weeklyFocusThemeId: theme.id, goalId: testGoalId2 }
        ]
      })

      // Delete theme
      await prisma.weeklyFocusTheme.delete({
        where: { id: theme.id }
      })

      // Verify theme is gone
      const deletedTheme = await prisma.weeklyFocusTheme.findUnique({
        where: { id: theme.id }
      })
      expect(deletedTheme).toBeNull()

      // Verify links are gone (cascade delete)
      const links = await prisma.weeklyFocusThemeGoal.findMany({
        where: { weeklyFocusThemeId: theme.id }
      })
      expect(links).toHaveLength(0)

      // Verify goals still exist
      const goal1 = await prisma.goal.findUnique({
        where: { id: testGoalId1 }
      })
      const goal2 = await prisma.goal.findUnique({
        where: { id: testGoalId2 }
      })
      expect(goal1).not.toBeNull()
      expect(goal2).not.toBeNull()
    })
  })

  describe('Data Integrity', () => {
    it('should skip if DATABASE_URL not set', () => {
      if (!process.env.DATABASE_URL) {
        expect(true).toBe(true)
        return
      }
    })

    it('cascades user deletion to themes', async () => {
      if (!process.env.DATABASE_URL) return

      // Create temporary user
      const tempUser = await prisma.user.create({
        data: { email: 'temp-focus@example.com', name: 'Temp User' }
      })

      // Create theme for temp user
      const theme = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Temp User Focus',
          weekStart: testWeekStart,
          userId: tempUser.id
        }
      })

      // Delete user (should cascade delete theme)
      await prisma.user.delete({
        where: { id: tempUser.id }
      })

      // Verify theme was deleted
      const deletedTheme = await prisma.weeklyFocusTheme.findUnique({
        where: { id: theme.id }
      })
      expect(deletedTheme).toBeNull()
    })

    it('handles complex goal linking scenarios', async () => {
      if (!process.env.DATABASE_URL) return

      const theme = await prisma.weeklyFocusTheme.create({
        data: {
          title: 'Complex Focus',
          note: 'Focus with all 3 allowed goals',
          weekStart: testWeekStart,
          userId: testUserId
        }
      })

      // Link maximum allowed goals (3)
      await prisma.weeklyFocusThemeGoal.createMany({
        data: [
          { weeklyFocusThemeId: theme.id, goalId: testGoalId1 },
          { weeklyFocusThemeId: theme.id, goalId: testGoalId2 },
          { weeklyFocusThemeId: theme.id, goalId: testGoalId3 }
        ]
      })

      // Verify all links exist
      const links = await prisma.weeklyFocusThemeGoal.findMany({
        where: { weeklyFocusThemeId: theme.id },
        include: { goal: true }
      })

      expect(links).toHaveLength(3)
      
      // Verify goals are different
      const goalIds = links.map(l => l.goalId)
      expect(new Set(goalIds).size).toBe(3)
      
      // Verify all goals belong to correct user
      const goals = links.map(l => l.goal)
      goals.forEach(goal => {
        expect(goal.userId).toBe(testUserId)
      })
    })
  })
})
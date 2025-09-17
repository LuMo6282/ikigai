import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { 
  insertAtOrder, 
  resequenceOrders, 
  countUserLifeAreas, 
  checkNameExists 
} from '../server/areas'

const prisma = new PrismaClient()

describe('Areas Database Integration', () => {
  let testUserId: string

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
    await prisma.lifeArea.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.user.delete({
      where: { id: testUserId }
    })
  })

  describe('insertAtOrder', () => {
    it('should assign order 1 for first area', async () => {
      const { order } = await insertAtOrder(testUserId)
      expect(order).toBe(1)
    })

    it('should append to end when no order specified', async () => {
      // Create some existing areas
      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Health', order: 1 }
      })
      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Career', order: 2 }
      })

      const { order } = await insertAtOrder(testUserId)
      expect(order).toBe(3)
    })

    it('should insert at specified position and shift others', async () => {
      // Create existing areas
      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Health', order: 1 }
      })
      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Career', order: 2 }
      })

      // Insert at position 1 - should shift others down
      const { order } = await insertAtOrder(testUserId, 1)
      expect(order).toBe(1)

      // Verify existing areas were shifted
      const areas = await prisma.lifeArea.findMany({
        where: { userId: testUserId },
        orderBy: { order: 'asc' }
      })
      
      expect(areas).toHaveLength(2)
      expect(areas[0].order).toBe(2) // Health shifted from 1 to 2
      expect(areas[1].order).toBe(3) // Career shifted from 2 to 3
    })

    it('should clamp order to valid range', async () => {
      // Create two areas
      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Health', order: 1 }
      })
      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Career', order: 2 }
      })

      // Try to insert at position 10 (beyond max)
      const { order } = await insertAtOrder(testUserId, 10)
      expect(order).toBe(3) // Should be clamped to max + 1

      // Try to insert at position 0 (below min)
      const { order: order2 } = await insertAtOrder(testUserId, 0)
      expect(order2).toBe(1) // Should be clamped to 1
    })
  })

  describe('resequenceOrders', () => {
    it('should fix gaps in ordering', async () => {
      // Create areas with gaps
      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Health', order: 1 }
      })
      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Career', order: 5 }
      })
      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Family', order: 10 }
      })

      await resequenceOrders(testUserId)

      const areas = await prisma.lifeArea.findMany({
        where: { userId: testUserId },
        orderBy: { order: 'asc' }
      })

      expect(areas[0].order).toBe(1)
      expect(areas[1].order).toBe(2)
      expect(areas[2].order).toBe(3)
    })

    it('should maintain relative ordering', async () => {
      // Create areas in specific order
      const health = await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Health', order: 2 }
      })
      const career = await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Career', order: 7 }
      })
      const family = await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Family', order: 4 }
      })

      await resequenceOrders(testUserId)

      const areas = await prisma.lifeArea.findMany({
        where: { userId: testUserId },
        orderBy: { order: 'asc' }
      })

      // Should be: Health (was 2), Family (was 4), Career (was 7)
      expect(areas[0].id).toBe(health.id)
      expect(areas[0].order).toBe(1)
      expect(areas[1].id).toBe(family.id)
      expect(areas[1].order).toBe(2)
      expect(areas[2].id).toBe(career.id)
      expect(areas[2].order).toBe(3)
    })
  })

  describe('checkNameExists', () => {
    it('should detect case-insensitive duplicates', async () => {
      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Health', order: 1 }
      })

      // Test different cases
      let result = await checkNameExists(testUserId, 'health')
      expect(result.exists).toBe(true)
      expect(result.existingName).toBe('Health')

      result = await checkNameExists(testUserId, 'HEALTH')
      expect(result.exists).toBe(true)
      expect(result.existingName).toBe('Health')

      result = await checkNameExists(testUserId, ' Health ')
      expect(result.exists).toBe(true)
      expect(result.existingName).toBe('Health')
    })

    it('should exclude specific ID when checking', async () => {
      const area = await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Health', order: 1 }
      })

      // Should not find duplicate when excluding the same area
      const result = await checkNameExists(testUserId, 'Health', area.id)
      expect(result.exists).toBe(false)
    })

    it('should not find matches for different users', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          email: `other-${Date.now()}@example.com`,
          name: 'Other User'
        }
      })

      await prisma.lifeArea.create({
        data: { userId: otherUser.id, name: 'Health', order: 1 }
      })

      const result = await checkNameExists(testUserId, 'Health')
      expect(result.exists).toBe(false)

      // Cleanup
      await prisma.lifeArea.deleteMany({ where: { userId: otherUser.id } })
      await prisma.user.delete({ where: { id: otherUser.id } })
    })
  })

  describe('countUserLifeAreas', () => {
    it('should count areas correctly', async () => {
      let count = await countUserLifeAreas(testUserId)
      expect(count).toBe(0)

      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Health', order: 1 }
      })

      count = await countUserLifeAreas(testUserId)
      expect(count).toBe(1)

      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Career', order: 2 }
      })

      count = await countUserLifeAreas(testUserId)
      expect(count).toBe(2)
    })
  })

  describe('Full workflow scenarios', () => {
    it('should handle creating areas up to limit', async () => {
      // Create 12 areas (the soft limit)
      for (let i = 1; i <= 12; i++) {
        await prisma.lifeArea.create({
          data: { 
            userId: testUserId, 
            name: `Area ${i}`, 
            order: i 
          }
        })
      }

      const count = await countUserLifeAreas(testUserId)
      expect(count).toBe(12)

      // Verify they're all properly ordered
      const areas = await prisma.lifeArea.findMany({
        where: { userId: testUserId },
        orderBy: { order: 'asc' }
      })

      for (let i = 0; i < 12; i++) {
        expect(areas[i].order).toBe(i + 1)
        expect(areas[i].name).toBe(`Area ${i + 1}`)
      }
    })

    it('should handle deletion and resequencing with related goals', async () => {
      // Create areas
      const health = await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Health', order: 1 }
      })
      const career = await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Career', order: 2 }
      })
      const family = await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Family', order: 3 }
      })

      // Create a goal linked to the middle area
      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          lifeAreaId: career.id,
          title: 'Get promotion',
          horizon: 'YEAR',
          status: 'active'
        }
      })

      // Delete the middle area
      await prisma.$transaction(async (tx) => {
        // Set related goals' lifeAreaId to null
        await tx.goal.updateMany({
          where: { lifeAreaId: career.id },
          data: { lifeAreaId: null }
        })

        // Delete the area
        await tx.lifeArea.delete({
          where: { id: career.id }
        })

        // Resequence remaining areas
        await resequenceOrders(testUserId, tx)
      })

      // Verify remaining areas are properly sequenced
      const remainingAreas = await prisma.lifeArea.findMany({
        where: { userId: testUserId },
        orderBy: { order: 'asc' }
      })

      expect(remainingAreas).toHaveLength(2)
      expect(remainingAreas[0].name).toBe('Health')
      expect(remainingAreas[0].order).toBe(1)
      expect(remainingAreas[1].name).toBe('Family')
      expect(remainingAreas[1].order).toBe(2)

      // Verify goal is preserved with null lifeAreaId
      const updatedGoal = await prisma.goal.findUnique({
        where: { id: goal.id }
      })
      expect(updatedGoal?.lifeAreaId).toBe(null)
      expect(updatedGoal?.title).toBe('Get promotion')

      // Cleanup goal
      await prisma.goal.delete({ where: { id: goal.id } })
    })

    it('should enforce case-insensitive uniqueness via database', async () => {
      await prisma.lifeArea.create({
        data: { userId: testUserId, name: 'Health', order: 1 }
      })

      // Attempt to create duplicate with different case should fail
      await expect(
        prisma.lifeArea.create({
          data: { userId: testUserId, name: 'health', order: 2 }
        })
      ).rejects.toThrow()
    })
  })
})
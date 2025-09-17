import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'
import { validateGoalInput, ensureLifeAreaOwnership, enforceActiveGoalSoftLimit } from '@/server/goals'
import { mapDbErrorToUserCopy } from '@/lib/db-errors'

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const goalId = params.id
    const body = await request.json()

    // Validate input for partial update
    const validation = validateGoalInput(body, { partial: true })
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const updates = validation.data!

    // Use transaction for all operations
    const result = await prisma.$transaction(async (tx) => {
      // Check if goal exists and belongs to user
      const existingGoal = await tx.goal.findFirst({
        where: {
          id: goalId,
          userId: session.user.id
        }
      })

      if (!existingGoal) {
        const error = new Error('Goal not found')
        ;(error as any).statusCode = 404
        throw error
      }

      // Validate lifeAreaId ownership if it's being updated
      if (updates.lifeAreaId !== undefined && updates.lifeAreaId) {
        await ensureLifeAreaOwnership(session.user.id, updates.lifeAreaId, tx)
      }

      // Check soft limit if status is being set to active
      if (updates.status === 'active') {
        await enforceActiveGoalSoftLimit(session.user.id, { excludingGoalId: goalId }, tx)
      }

      // Update the goal
      const updatedGoal = await tx.goal.update({
        where: { id: goalId },
        data: updates,
        select: {
          id: true,
          title: true,
          description: true,
          horizon: true,
          status: true,
          targetDate: true,
          lifeAreaId: true
        }
      })

      return updatedGoal
    })

    // Format targetDate for response (YYYY-MM-DD or null)
    const responseGoal = {
      ...result,
      targetDate: result.targetDate ? result.targetDate.toISOString().split('T')[0] : null
    }

    return NextResponse.json(responseGoal)
  } catch (error: any) {
    console.error('Error updating goal:', error)

    // Handle custom validation errors
    if (error.statusCode === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }

    // Handle database errors
    const userError = mapDbErrorToUserCopy(error)
    return NextResponse.json(
      { error: userError },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const goalId = params.id

    // Use transaction to unlink WeeklyTasks and delete Goal
    await prisma.$transaction(async (tx) => {
      // Check if goal exists and belongs to user
      const existingGoal = await tx.goal.findFirst({
        where: {
          id: goalId,
          userId: session.user.id
        }
      })

      if (!existingGoal) {
        const error = new Error('Goal not found')
        ;(error as any).statusCode = 404
        throw error
      }

      // Set WeeklyTask.goalId = null for all tasks linked to this goal
      await tx.weeklyTask.updateMany({
        where: { goalId },
        data: { goalId: null }
      })

      // Delete the goal
      await tx.goal.delete({
        where: { id: goalId }
      })
    })

    return NextResponse.json({
      ok: true,
      message: "Weekly tasks were kept and unlinked from this goal."
    })
  } catch (error: any) {
    console.error('Error deleting goal:', error)

    // Handle custom validation errors
    if (error.statusCode === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    // Handle database errors
    const userError = mapDbErrorToUserCopy(error)
    return NextResponse.json(
      { error: userError },
      { status: 500 }
    )
  }
}
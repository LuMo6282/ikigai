import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'
import { 
  validateWeeklyTaskInput, 
  validateGoalLinkage, 
  enforceSoftLimits,
  checkTaskTitleExists,
  validateMinimumTasks
} from '@/server/tasks'
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

    const taskId = params.id
    const body = await request.json()

    // Validate input for partial update
    const validation = validateWeeklyTaskInput(body, { partial: true })
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const updates = validation.data!

    // Use transaction for all operations
    const result = await prisma.$transaction(async (tx) => {
      // Check if task exists and belongs to user
      const existingTask = await tx.weeklyTask.findFirst({
        where: {
          id: taskId,
          userId: session.user.id
        }
      })

      if (!existingTask) {
        const error = new Error('Weekly task not found')
        ;(error as any).statusCode = 404
        throw error
      }

      // If title is being updated, check for duplicates
      if (updates.title !== undefined) {
        const weekStart = updates.weekStart || existingTask.weekStart
        const titleCheck = await checkTaskTitleExists(session.user.id, weekStart, updates.title, taskId, tx)
        if (titleCheck.exists) {
          const weekStartStr = weekStart.toISOString().split('T')[0]
          const error = new Error(`You already have a task called '${titleCheck.existingTitle}' for the week of ${weekStartStr}`)
          ;(error as any).statusCode = 409
          throw error
        }
      }

      // If weekStart is being updated, check soft limits for the new week
      if (updates.weekStart !== undefined && updates.weekStart.getTime() !== existingTask.weekStart.getTime()) {
        await enforceSoftLimits(session.user.id, updates.weekStart, {}, tx)
      }

      // Validate goal linkage if goalId is being updated
      if (updates.goalId !== undefined && updates.goalId) {
        const weekStart = updates.weekStart || existingTask.weekStart
        await validateGoalLinkage(updates.goalId, weekStart, session.user.id, tx)
      }

      // Update the task
      const updatedTask = await tx.weeklyTask.update({
        where: { id: taskId },
        data: updates,
        select: {
          id: true,
          title: true,
          weekStart: true,
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true,
          goalId: true
        }
      })

      return updatedTask
    })

    // Format weekStart for response (YYYY-MM-DD)
    const responseTask = {
      ...result,
      weekStart: result.weekStart.toISOString().split('T')[0]
    }

    return NextResponse.json(responseTask)
  } catch (error: any) {
    console.error('Error updating weekly task:', error)

    // Handle custom validation errors
    if (error.statusCode === 400) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
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

    const taskId = params.id

    // Use transaction for deletion and minimum task validation
    const result = await prisma.$transaction(async (tx) => {
      // Check if task exists and belongs to user
      const existingTask = await tx.weeklyTask.findFirst({
        where: {
          id: taskId,
          userId: session.user.id
        }
      })

      if (!existingTask) {
        const error = new Error('Weekly task not found')
        ;(error as any).statusCode = 404
        throw error
      }

      // Delete the task
      await tx.weeklyTask.delete({
        where: { id: taskId }
      })

      // Check if user still has minimum tasks for the week after deletion
      try {
        await validateMinimumTasks(session.user.id, existingTask.weekStart, tx)
      } catch (minError: any) {
        // If minimum validation fails, it's not an error for deletion - just a warning
        // But we'll let the deletion succeed
        console.log('Warning: User may have fewer than 2 tasks after deletion')
      }

      return { ok: true }
    })

    return NextResponse.json({
      ok: true,
      message: "Weekly task deleted successfully."
    })
  } catch (error: any) {
    console.error('Error deleting weekly task:', error)

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
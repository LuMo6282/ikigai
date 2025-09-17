import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'
import { 
  validateWeeklyTaskInput, 
  validateWeekStart, 
  validateGoalLinkage, 
  enforceSoftLimits,
  checkTaskTitleExists 
} from '@/server/tasks'
import { mapDbErrorToUserCopy } from '@/lib/db-errors'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse required weekStart query parameter
    const { searchParams } = new URL(request.url)
    const weekStartStr = searchParams.get('weekStart')
    
    if (!weekStartStr) {
      return NextResponse.json({ error: 'weekStart query parameter is required' }, { status: 400 })
    }

    // Validate weekStart format and Monday requirement
    const weekStartValidation = validateWeekStart(weekStartStr)
    if (!weekStartValidation.ok) {
      return NextResponse.json({ error: weekStartValidation.error }, { status: 400 })
    }

    const weekStart = weekStartValidation.weekStart!

    // Fetch tasks for the specified week
    const tasks = await prisma.weeklyTask.findMany({
      where: { 
        userId: session.user.id,
        weekStart 
      },
      orderBy: { title: 'asc' },
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

    // Format weekStart for response (YYYY-MM-DD)
    const formattedTasks = tasks.map(task => ({
      ...task,
      weekStart: task.weekStart.toISOString().split('T')[0]
    }))

    return NextResponse.json(formattedTasks)
  } catch (error) {
    console.error('Error fetching weekly tasks:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validation = validateWeeklyTaskInput(body)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, weekStart, monday, tuesday, wednesday, thursday, friday, saturday, sunday, goalId } = validation.data!

    // Use transaction for all operations
    const result = await prisma.$transaction(async (tx) => {
      // Check for duplicate title in the same week
      const titleCheck = await checkTaskTitleExists(session.user.id, weekStart, title, undefined, tx)
      if (titleCheck.exists) {
        const weekStartStr = weekStart.toISOString().split('T')[0]
        const error = new Error(`You already have a task called '${titleCheck.existingTitle}' for the week of ${weekStartStr}`)
        ;(error as any).statusCode = 409
        throw error
      }

      // Check soft limits (upper limit)
      await enforceSoftLimits(session.user.id, weekStart, {}, tx)

      // Validate goal linkage if goalId provided
      if (goalId) {
        await validateGoalLinkage(goalId, weekStart, session.user.id, tx)
      }

      // Create the weekly task
      const task = await tx.weeklyTask.create({
        data: {
          title,
          weekStart,
          monday,
          tuesday,
          wednesday,
          thursday,
          friday,
          saturday,
          sunday,
          goalId,
          userId: session.user.id
        },
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

      return task
    })

    // Format weekStart for response (YYYY-MM-DD)
    const responseTask = {
      ...result,
      weekStart: result.weekStart.toISOString().split('T')[0]
    }

    return NextResponse.json(responseTask, { status: 201 })
  } catch (error: any) {
    console.error('Error creating weekly task:', error)

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
    const userError = mapDbErrorToUserCopy(error, {
      title: 'unknown',
      weekStart: 'unknown'
    })
    return NextResponse.json(
      { error: userError },
      { status: 500 }
    )
  }
}
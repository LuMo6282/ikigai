import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'
import { validateGoalInput, ensureLifeAreaOwnership, enforceActiveGoalSoftLimit } from '@/server/goals'
import { mapDbErrorToUserCopy } from '@/lib/db-errors'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const horizonFilter = searchParams.get('horizon')

    // Build where clause
    const where: any = { userId: session.user.id }
    
    if (statusFilter && ['active', 'paused', 'done'].includes(statusFilter)) {
      where.status = statusFilter
    }
    
    if (horizonFilter && ['YEAR', 'SIX_MONTH', 'MONTH', 'WEEK'].includes(horizonFilter)) {
      where.horizon = horizonFilter
    }

    const goals = await prisma.goal.findMany({
      where,
      orderBy: { title: 'asc' }, // Order by title since createdAt doesn't exist
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

    // Format targetDate for response (YYYY-MM-DD or null)
    const formattedGoals = goals.map(goal => ({
      ...goal,
      targetDate: goal.targetDate ? goal.targetDate.toISOString().split('T')[0] : null
    }))

    return NextResponse.json(formattedGoals)
  } catch (error) {
    console.error('Error fetching goals:', error)
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
    const validation = validateGoalInput(body)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, description, horizon, status, targetDate, lifeAreaId } = validation.data!

    // Use transaction for all operations
    const result = await prisma.$transaction(async (tx) => {
      // Validate lifeAreaId ownership if provided
      if (lifeAreaId) {
        await ensureLifeAreaOwnership(session.user.id, lifeAreaId, tx)
      }

      // Check soft limit if creating an active goal
      if (status === 'active') {
        await enforceActiveGoalSoftLimit(session.user.id, {}, tx)
      }

      // Create the goal
      const goal = await tx.goal.create({
        data: {
          title,
          description,
          horizon,
          status,
          targetDate,
          lifeAreaId,
          userId: session.user.id
        },
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

      return goal
    })

    // Format targetDate for response (YYYY-MM-DD or null)
    const responseGoal = {
      ...result,
      targetDate: result.targetDate ? result.targetDate.toISOString().split('T')[0] : null
    }

    return NextResponse.json(responseGoal, { status: 201 })
  } catch (error: any) {
    console.error('Error creating goal:', error)

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
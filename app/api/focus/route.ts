import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'
import { 
  validateFocusInput,
  validateGoalOwnership,
  formatDateForError
} from '@/server/focus'
import { validateWeekStart } from '@/server/tasks'
import { mapDbErrorToUserCopy } from '@/lib/db-errors'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse optional weekStart query parameter
    const { searchParams } = new URL(request.url)
    const weekStartStr = searchParams.get('weekStart')
    
    if (weekStartStr) {
      // Return single theme for specific week or null
      const weekStartValidation = validateWeekStart(weekStartStr)
      if (!weekStartValidation.ok) {
        return NextResponse.json({ error: weekStartValidation.error }, { status: 400 })
      }

      const weekStart = weekStartValidation.weekStart!

      const theme = await prisma.weeklyFocusTheme.findUnique({
        where: { 
          userId_weekStart: {
            userId: session.user.id,
            weekStart 
          }
        },
        include: {
          linkedGoals: {
            include: {
              goal: {
                select: {
                  id: true,
                  title: true,
                  horizon: true,
                  status: true
                }
              }
            }
          }
        }
      })

      if (!theme) {
        return NextResponse.json(null, { status: 200 })
      }

      // Transform the response to include goals directly
      const responseTheme = {
        id: theme.id,
        title: theme.title,
        note: theme.note,
        weekStart: theme.weekStart,
        linkedGoals: theme.linkedGoals.map(link => link.goal)
      }

      return NextResponse.json(responseTheme, { status: 200 })
    } else {
      // Return all themes for the user sorted by weekStart DESC
      const themes = await prisma.weeklyFocusTheme.findMany({
        where: { userId: session.user.id },
        include: {
          linkedGoals: {
            include: {
              goal: {
                select: {
                  id: true,
                  title: true,
                  horizon: true,
                  status: true
                }
              }
            }
          }
        },
        orderBy: { weekStart: 'desc' }
      })

      // Transform the response to include goals directly
      const responseThemes = themes.map(theme => ({
        id: theme.id,
        title: theme.title,
        note: theme.note,
        weekStart: theme.weekStart,
        linkedGoals: theme.linkedGoals.map(link => link.goal)
      }))

      return NextResponse.json(responseThemes, { status: 200 })
    }
  } catch (error) {
    console.error('GET /api/focus error:', error)
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
    const validation = validateFocusInput(body, { partial: false })
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, note, weekStart, linkedGoals } = validation.data!

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Validate goal ownership if linkedGoals provided
      if (linkedGoals.length > 0) {
        await validateGoalOwnership(linkedGoals, session.user.id, tx)
      }

      // Create the theme
      const theme = await tx.weeklyFocusTheme.create({
        data: {
          title,
          note,
          weekStart,
          userId: session.user.id
        }
      })

      // Create goal links if any
      if (linkedGoals.length > 0) {
        await tx.weeklyFocusThemeGoal.createMany({
          data: linkedGoals.map(goalId => ({
            weeklyFocusThemeId: theme.id,
            goalId
          }))
        })
      }

      // Fetch the complete theme with linked goals for response
      const completeTheme = await tx.weeklyFocusTheme.findUnique({
        where: { id: theme.id },
        include: {
          linkedGoals: {
            include: {
              goal: {
                select: {
                  id: true,
                  title: true,
                  horizon: true,
                  status: true
                }
              }
            }
          }
        }
      })

      return completeTheme
    })

    // Transform the response to include goals directly
    const responseTheme = {
      id: result!.id,
      title: result!.title,
      note: result!.note,
      weekStart: result!.weekStart,
      linkedGoals: result!.linkedGoals.map(link => link.goal)
    }

    return NextResponse.json(responseTheme, { status: 201 })

  } catch (error: any) {
    console.error('POST /api/focus error:', error)

    // Handle validation errors
    if (error.statusCode === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    // Handle database constraint errors
    const weekStartStr = formatDateForError(new Date())
    const errorMessage = mapDbErrorToUserCopy(error, { 
      weekStart: weekStartStr 
    })

    // Determine status code based on error type
    if (errorMessage.includes('You already set a focus')) {
      return NextResponse.json({ error: errorMessage }, { status: 409 })
    }

    if (errorMessage.includes("Can't link the same goal")) {
      return NextResponse.json({ error: errorMessage }, { status: 409 })
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
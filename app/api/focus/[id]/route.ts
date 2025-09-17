import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'
import { 
  validateFocusInput,
  validateGoalOwnership,
  updateLinkedGoals,
  formatDateForError
} from '@/server/focus'
import { mapDbErrorToUserCopy } from '@/lib/db-errors'

const prisma = new PrismaClient()

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    // Validate input (partial update)
    const validation = validateFocusInput(body, { partial: true })
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // First check if theme exists and belongs to user
      const existingTheme = await tx.weeklyFocusTheme.findUnique({
        where: { id },
        select: { 
          id: true, 
          userId: true, 
          weekStart: true,
          linkedGoals: {
            select: { goalId: true }
          }
        }
      })

      if (!existingTheme) {
        const error = new Error('Focus theme not found')
        ;(error as any).statusCode = 404
        throw error
      }

      if (existingTheme.userId !== session.user.id) {
        const error = new Error('Unauthorized')
        ;(error as any).statusCode = 403
        throw error
      }

      const updateData: any = {}

      // Add fields that were validated
      if (validation.data!.title !== undefined) {
        updateData.title = validation.data!.title
      }
      if (validation.data!.note !== undefined) {
        updateData.note = validation.data!.note
      }
      if (validation.data!.weekStart !== undefined) {
        updateData.weekStart = validation.data!.weekStart
      }

      // Update the theme fields
      if (Object.keys(updateData).length > 0) {
        await tx.weeklyFocusTheme.update({
          where: { id },
          data: updateData
        })
      }

      // Handle linkedGoals update if provided
      if (validation.data!.linkedGoals !== undefined) {
        const newGoalIds = validation.data!.linkedGoals

        // Validate goal ownership
        if (newGoalIds.length > 0) {
          await validateGoalOwnership(newGoalIds, session.user.id, tx)
        }

        // Update linked goals atomically
        await updateLinkedGoals(id, newGoalIds, tx)
      }

      // Fetch the complete updated theme with linked goals for response
      const updatedTheme = await tx.weeklyFocusTheme.findUnique({
        where: { id },
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

      return updatedTheme
    })

    // Transform the response to include goals directly
    const responseTheme = {
      id: result!.id,
      title: result!.title,
      note: result!.note,
      weekStart: result!.weekStart,
      linkedGoals: result!.linkedGoals.map(link => link.goal)
    }

    return NextResponse.json(responseTheme, { status: 200 })

  } catch (error: any) {
    console.error(`PATCH /api/focus/${params.id} error:`, error)

    // Handle validation errors
    if (error.statusCode === 404) {
      return NextResponse.json({ error: 'Focus theme not found' }, { status: 404 })
    }

    if (error.statusCode === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Handle database constraint errors
    const errorMessage = mapDbErrorToUserCopy(error)

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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // First check if theme exists and belongs to user
      const existingTheme = await tx.weeklyFocusTheme.findUnique({
        where: { id },
        select: { 
          id: true, 
          userId: true,
          title: true
        }
      })

      if (!existingTheme) {
        const error = new Error('Focus theme not found')
        ;(error as any).statusCode = 404
        throw error
      }

      if (existingTheme.userId !== session.user.id) {
        const error = new Error('Unauthorized')
        ;(error as any).statusCode = 403
        throw error
      }

      // Delete the theme (cascade will handle linked goals)
      await tx.weeklyFocusTheme.delete({
        where: { id }
      })
    })

    return NextResponse.json({ 
      message: 'Focus theme deleted successfully' 
    }, { status: 200 })

  } catch (error: any) {
    console.error(`DELETE /api/focus/${params.id} error:`, error)

    // Handle validation errors
    if (error.statusCode === 404) {
      return NextResponse.json({ error: 'Focus theme not found' }, { status: 404 })
    }

    if (error.statusCode === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
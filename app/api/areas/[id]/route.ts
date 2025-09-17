import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'
import { validateLifeAreaInput, insertAtOrder, resequenceOrders, checkNameExists } from '@/server/areas'
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

    const { id } = params
    
    // Verify ownership
    const existingArea = await prisma.lifeArea.findUnique({
      where: { id },
      select: { userId: true, name: true, order: true }
    })

    if (!existingArea) {
      return NextResponse.json({ error: 'Life area not found' }, { status: 404 })
    }

    if (existingArea.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Validate input for update
    const validation = validateLifeAreaInput(body, true)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { name, color, vision, strategy, order } = validation.data!

    // Check for case-insensitive duplicate name if name is being updated
    if (name && name !== existingArea.name) {
      const nameCheck = await checkNameExists(session.user.id, name, id)
      if (nameCheck.exists) {
        return NextResponse.json(
          { error: `You already have a life area named '${nameCheck.existingName}'` },
          { status: 409 }
        )
      }
    }

    // Handle order change with transaction
    const result = await prisma.$transaction(async (tx) => {
      let finalOrder = existingArea.order
      
      // If order is being changed, handle resequencing
      if (order !== undefined && order !== existingArea.order) {
        // First, temporarily set this area to a high order to avoid conflicts
        await tx.lifeArea.update({
          where: { id },
          data: { order: 999999 }
        })

        // Calculate new position and shift others
        const { order: newOrder } = await insertAtOrder(session.user.id, order, tx)
        finalOrder = newOrder

        // Update this area to final position
        await tx.lifeArea.update({
          where: { id },
          data: { order: finalOrder }
        })

        // Clean up any gaps in the sequence
        await resequenceOrders(session.user.id, tx)
      }

      // Update the area with provided fields
      const updatedArea = await tx.lifeArea.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(color !== undefined && { color }),
          ...(vision !== undefined && { vision }),
          ...(strategy !== undefined && { strategy })
        },
        select: {
          id: true,
          name: true,
          color: true,
          order: true,
          vision: true,
          strategy: true
        }
      })

      return updatedArea
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('PATCH /api/areas/[id] error:', error)

    // Use db-errors mapper for constraint violations
    const mappedError = mapDbErrorToUserCopy(error)
    if (mappedError !== 'Something went wrong. Please try again.') {
      const status = mappedError.includes('already have') ? 409 : 400
      return NextResponse.json({ error: mappedError }, { status })
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
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

    const { id } = params
    
    // Verify ownership
    const existingArea = await prisma.lifeArea.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!existingArea) {
      return NextResponse.json({ error: 'Life area not found' }, { status: 404 })
    }

    if (existingArea.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete with transaction to preserve goals and resequence orders
    await prisma.$transaction(async (tx) => {
      // First, set all related goals' lifeAreaId to null
      await tx.goal.updateMany({
        where: { lifeAreaId: id },
        data: { lifeAreaId: null }
      })

      // Delete the life area
      await tx.lifeArea.delete({
        where: { id }
      })

      // Resequence remaining areas to maintain dense 1..N ordering
      await resequenceOrders(session.user.id, tx)
    })

    return NextResponse.json({
      ok: true,
      message: 'Goals were kept. You can reassign them to another life area anytime.'
    })
  } catch (error) {
    console.error('DELETE /api/areas/[id] error:', error)

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
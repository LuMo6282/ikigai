import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { validateSignalInput, validateSignalOwnership } from '../../../../server/signals'
import { mapDbErrorToUserCopy } from '../../../../lib/db-errors'

const prisma = new PrismaClient()

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Authentication required
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const signalId = params.id

    // Verify ownership
    const ownershipValidation = await validateSignalOwnership(signalId, userId)
    if (!ownershipValidation.ok) {
      if (ownershipValidation.error === 'Signal not found') {
        return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
      }
      if (ownershipValidation.error === 'Access denied') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      return NextResponse.json({ error: ownershipValidation.error }, { status: 400 })
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    // Validate partial input
    const validation = validateSignalInput(body, { partial: true })
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const updateData = validation.data!
    
    // Build clean update data object without undefined values
    const cleanUpdateData: any = {}
    if (updateData.type !== undefined) cleanUpdateData.type = updateData.type
    if (updateData.date !== undefined) cleanUpdateData.date = updateData.date  
    if (updateData.value !== undefined) cleanUpdateData.value = updateData.value

    try {
      // Update the signal
      const signal = await prisma.signal.update({
        where: { id: signalId },
        data: cleanUpdateData,
        select: {
          id: true,
          type: true,
          date: true,
          value: true
        }
      })

      // Format date for response
      const formattedSignal = {
        ...signal,
        date: signal.date.toISOString().substring(0, 10)
      }

      return NextResponse.json(formattedSignal, { status: 200 })
    } catch (error) {
      // Map database errors to user-friendly messages
      const errorMessage = mapDbErrorToUserCopy(error)
      
      // Check if it's a unique constraint violation for proper status code
      if (errorMessage.includes('already')) {
        return NextResponse.json({ error: errorMessage }, { status: 409 })
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating signal:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Authentication required
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const signalId = params.id

    // Verify ownership
    const ownershipValidation = await validateSignalOwnership(signalId, userId)
    if (!ownershipValidation.ok) {
      if (ownershipValidation.error === 'Signal not found') {
        return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
      }
      if (ownershipValidation.error === 'Access denied') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      return NextResponse.json({ error: ownershipValidation.error }, { status: 400 })
    }

    try {
      // Delete the signal
      await prisma.signal.delete({
        where: { id: signalId }
      })

      return NextResponse.json({ message: 'Signal deleted successfully' }, { status: 200 })
    } catch (error) {
      console.error('Error deleting signal:', error)
      const errorMessage = mapDbErrorToUserCopy(error)
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
  } catch (error) {
    console.error('Error deleting signal:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
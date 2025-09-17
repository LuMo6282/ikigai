import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'
import { validateLifeAreaInput, insertAtOrder, countUserLifeAreas, checkNameExists } from '@/server/areas'
import { mapDbErrorToUserCopy } from '@/lib/db-errors'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const areas = await prisma.lifeArea.findMany({
      where: { userId: session.user.id },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        order: true,
        vision: true,
        strategy: true
      }
    })

    return NextResponse.json(areas)
  } catch (error) {
    console.error('GET /api/areas error:', error)
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
    const validation = validateLifeAreaInput(body, false)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { name, color, vision, strategy, order } = validation.data!

    // Check soft limit of 12 life areas
    const currentCount = await countUserLifeAreas(session.user.id)
    if (currentCount >= 12) {
      return NextResponse.json(
        { error: 'You\'ve reached the maximum of 12 life areas. Consider consolidating similar areas to stay focused.' },
        { status: 409 }
      )
    }

    // Check for case-insensitive duplicate name
    const nameCheck = await checkNameExists(session.user.id, name)
    if (nameCheck.exists) {
      return NextResponse.json(
        { error: `You already have a life area named '${nameCheck.existingName}'` },
        { status: 409 }
      )
    }

    // Use transaction for atomic order calculation and insertion
    const result = await prisma.$transaction(async (tx) => {
      // Calculate insertion order
      const { order: finalOrder } = await insertAtOrder(session.user.id, order, tx)

      // Create the new LifeArea
      const newArea = await tx.lifeArea.create({
        data: {
          userId: session.user.id,
          name,
          color,
          vision,
          strategy,
          order: finalOrder
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

      return newArea
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('POST /api/areas error:', error)

    // Use db-errors mapper for constraint violations
    const mappedError = mapDbErrorToUserCopy(error, {
      lifeAreaName: 'unknown' // We can't access the name here due to scope
    })
    if (mappedError) {
      const status = mappedError.includes('already have') ? 409 : 400
      return NextResponse.json({ error: mappedError }, { status })
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { 
  validateSignalInput, 
  validateDateRange, 
  getDefaultDateRange, 
  buildSignalWhereClause,
  DateRangeFilters 
} from '../../../server/signals'
import { mapDbErrorToUserCopy } from '../../../lib/db-errors'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authentication required
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const filters: DateRangeFilters = {
      type: searchParams.get('type') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined
    }

    // Validate filters
    const filtersValidation = validateDateRange(filters)
    if (!filtersValidation.ok) {
      return NextResponse.json({ error: filtersValidation.error }, { status: 400 })
    }

    const validatedFilters = filtersValidation.data || {}

    // Use default date range if no from/to provided
    if (!validatedFilters.from && !validatedFilters.to) {
      const defaultRange = getDefaultDateRange()
      validatedFilters.from = defaultRange.from
      validatedFilters.to = defaultRange.to
    }

    // Build where clause and query signals
    const whereClause = buildSignalWhereClause(userId, validatedFilters)
    
    const signals = await prisma.signal.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
      select: {
        id: true,
        type: true,
        date: true,
        value: true
      }
    })

    // Format dates to ISO strings for response
    const formattedSignals = signals.map(signal => ({
      ...signal,
      date: signal.date.toISOString().substring(0, 10) // YYYY-MM-DD format
    }))

    return NextResponse.json(formattedSignals, { status: 200 })
  } catch (error) {
    console.error('Error fetching signals:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication required
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    // Validate input
    const validation = validateSignalInput(body)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { type, date, value } = validation.data!

    try {
      // Create the signal
      const signal = await prisma.signal.create({
        data: {
          type: type!,
          date: date!,
          value: value!,
          userId
        },
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

      return NextResponse.json(formattedSignal, { status: 201 })
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
    console.error('Error creating signal:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
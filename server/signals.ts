import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface SignalInput {
  type?: string
  date?: string
  value?: number
}

export interface DateRangeFilters {
  type?: string
  from?: string
  to?: string
}

/**
 * Helper to trim string fields
 */
function trimField(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Validates signal input according to Domain Spec v1.3
 */
export function validateSignalInput(input: SignalInput, options: { partial?: boolean } = {}): {
  ok: boolean
  data?: { type?: string; date?: Date; value?: number }
  error?: string
} {
  const { partial = false } = options
  const result: any = { ok: true }

  // Process type (required for create, optional for partial update)
  let type: string | undefined = undefined
  if (!partial || input.type !== undefined) {
    const typeValidation = validateSignalType(input.type)
    if (!typeValidation.ok) {
      return { ok: false, error: typeValidation.error! }
    }
    type = typeValidation.type!
  }

  // Process date (required for create, optional for partial update)
  let date: Date | undefined = undefined
  if (!partial || input.date !== undefined) {
    const dateValidation = validateSignalDate(input.date)
    if (!dateValidation.ok) {
      return { ok: false, error: dateValidation.error! }
    }
    date = dateValidation.date!
  }

  // Process value (required for create, optional for partial update)
  let value: number | undefined = undefined
  if (!partial || input.value !== undefined) {
    // For validation, we need the type context
    const contextType = type || input.type // Use validated type or provided type for context
    const valueValidation = validateSignalValue(input.value, contextType)
    if (!valueValidation.ok) {
      return { ok: false, error: valueValidation.error! }
    }
    value = valueValidation.value!
  }

  // Build result data
  const data: any = {}
  if (type !== undefined) data.type = type
  if (date !== undefined) data.date = date
  if (value !== undefined) data.value = value

  // For non-partial updates, ensure all required fields are present
  if (!partial) {
    result.data = {
      type: type!,
      date: date!,
      value: value!
    }
  } else {
    result.data = data
  }

  return result
}

/**
 * Validates signal type according to Domain Spec v1.3
 */
export function validateSignalType(type?: string): { ok: boolean; type?: string; error?: string } {
  if (type === undefined || type === null || typeof type !== 'string') {
    return { ok: false, error: 'Signal type is required' }
  }

  const trimmedType = type.trim()
  
  if (!trimmedType || (trimmedType !== 'SLEEP' && trimmedType !== 'WELLBEING')) {
    return { ok: false, error: 'Signal type must be SLEEP or WELLBEING' }
  }

  return { ok: true, type: trimmedType }
}

/**
 * Validates signal value based on type according to Domain Spec v1.3
 */
export function validateSignalValue(value?: number, type?: string): { ok: boolean; value?: number; error?: string } {
  if (value === null || value === undefined || typeof value !== 'number') {
    return { ok: false, error: 'Signal value is required' }
  }

  if (isNaN(value) || !isFinite(value)) {
    return { ok: false, error: 'Signal value must be a valid number' }
  }

  if (!type) {
    return { ok: false, error: 'Signal type is required for value validation' }
  }

  if (type === 'SLEEP') {
    // Check bounds first - sleep can't exceed 14 hours
    if (value > 14) {
      return { ok: false, error: "Sleep hours can't exceed 14" }
    }

    // Check lower bound
    if (value < 0) {
      return { ok: false, error: 'Sleep hours must be in 0.25-hour increments (7.25, 7.50, 7.75, etc.)' }
    }

    // Check 0.25 increments using safe integer check
    if (Math.round(value * 4) !== value * 4) {
      return { ok: false, error: 'Sleep hours must be in 0.25-hour increments (7.25, 7.50, 7.75, etc.)' }
    }

    return { ok: true, value }
  }

  if (type === 'WELLBEING') {
    // Check bounds and integer requirement
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      return { ok: false, error: 'Wellbeing must be a whole number between 1 and 10' }
    }

    return { ok: true, value }
  }

  return { ok: false, error: 'Invalid signal type for value validation' }
}

/**
 * Validates signal date according to Domain Spec v1.3
 */
export function validateSignalDate(date?: string): { ok: boolean; date?: Date; error?: string } {
  if (date === undefined || date === null || typeof date !== 'string') {
    return { ok: false, error: 'Date is required' }
  }

  const trimmedDate = date.trim()
  
  if (!trimmedDate) {
    return { ok: false, error: 'Date must be valid' }
  }
  
  // Check ISO date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return { ok: false, error: 'Date must be valid' }
  }

  // Parse the date and validate it's a real date
  const parsedDate = new Date(trimmedDate + 'T00:00:00.000Z')
  
  // Check if date is valid (not NaN) and matches the input format
  if (isNaN(parsedDate.getTime())) {
    return { ok: false, error: 'Date must be valid' }
  }

  // Verify the parsed date matches the input (catches impossible dates like Feb 30)
  const expectedDateString = parsedDate.toISOString().substring(0, 10)
  if (expectedDateString !== trimmedDate) {
    return { ok: false, error: 'Date must be valid' }
  }

  return { ok: true, date: parsedDate }
}

/**
 * Validates date range filters for GET endpoint
 */
export function validateDateRange(filters: DateRangeFilters): {
  ok: boolean
  data?: { type?: string; from?: Date; to?: Date }
  error?: string
} {
  const data: any = {}

  // Validate type if provided
  if (filters.type !== undefined) {
    const typeValidation = validateSignalType(filters.type)
    if (!typeValidation.ok) {
      return { ok: false, error: typeValidation.error! }
    }
    data.type = typeValidation.type
  }

  // Validate from date if provided
  if (filters.from !== undefined) {
    if (filters.from === '') {
      return { ok: false, error: 'Date must be valid' }
    }
    const fromValidation = validateSignalDate(filters.from)
    if (!fromValidation.ok) {
      return { ok: false, error: fromValidation.error! }
    }
    data.from = fromValidation.date
  }

  // Validate to date if provided
  if (filters.to !== undefined) {
    if (filters.to === '') {
      return { ok: false, error: 'Date must be valid' }
    }
    const toValidation = validateSignalDate(filters.to)
    if (!toValidation.ok) {
      return { ok: false, error: toValidation.error! }
    }
    data.to = toValidation.date
  }

  // Check that from <= to if both provided
  if (data.from && data.to) {
    if (data.from > data.to) {
      return { ok: false, error: 'From date must be before or equal to to date' }
    }
  }

  // Check for absurd date ranges (> 400 days)
  if (data.from && data.to) {
    const daysDiff = Math.ceil((data.to.getTime() - data.from.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 400) {
      return { ok: false, error: 'Date range cannot exceed 400 days' }
    }
  }

  return { ok: true, data }
}

/**
 * Validates that a signal exists and belongs to the user
 */
export async function validateSignalOwnership(signalId: string, userId: string): Promise<{
  ok: boolean
  signal?: any
  error?: string
}> {
  try {
    const signal = await prisma.signal.findUnique({
      where: { id: signalId }
    })

    if (!signal) {
      return { ok: false, error: 'Signal not found' }
    }

    if (signal.userId !== userId) {
      return { ok: false, error: 'Access denied' }
    }

    return { ok: true, signal }
  } catch (error) {
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

/**
 * Gets default date range (last 30 days) if no from/to provided
 */
export function getDefaultDateRange(): { from: Date; to: Date } {
  const to = new Date()
  to.setUTCHours(23, 59, 59, 999) // End of today

  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - 29) // 30 days ago (including today)
  from.setUTCHours(0, 0, 0, 0) // Start of day

  return { from, to }
}

/**
 * Builds the WHERE clause for signal queries
 */
export function buildSignalWhereClause(userId: string, filters: { type?: string; from?: Date; to?: Date }) {
  const where: any = { userId }

  if (filters.type) {
    where.type = filters.type
  }

  if (filters.from || filters.to) {
    where.date = {}
    if (filters.from) {
      where.date.gte = filters.from
    }
    if (filters.to) {
      where.date.lte = filters.to
    }
  }

  return where
}
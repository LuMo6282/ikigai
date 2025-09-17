import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export interface WeeklyTaskInput {
  title?: string
  weekStart?: string
  monday?: boolean
  tuesday?: boolean
  wednesday?: boolean
  thursday?: boolean
  friday?: boolean
  saturday?: boolean
  sunday?: boolean
  goalId?: string | null
}

export interface ValidationResult {
  ok: boolean
  data?: {
    title: string
    weekStart: Date
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
    goalId: string | null
  }
  error?: string
}

// Type for Prisma transaction client
type PrismaTransaction = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

/**
 * Validates and trims WeeklyTask input according to Domain Spec v1.3
 */
export function validateWeeklyTaskInput(input: WeeklyTaskInput, options: { partial?: boolean } = {}): ValidationResult {
  const { partial = false } = options
  const result: ValidationResult = { ok: true }

  // Helper to trim and validate string fields
  const trimField = (value: string | null | undefined): string | null => {
    if (value === undefined || value === null) return null
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  // Process title (required for create, optional for partial update)
  const title = trimField(input.title)
  if (!partial || input.title !== undefined) {
    if (!title) {
      return { ok: false, error: "Task title can't be empty" }
    }
    if (title.length > 80) {
      return { ok: false, error: "Task title can't exceed 80 characters" }
    }
  }

  // Process weekStart (required for create, optional for partial update)
  let weekStart: Date | undefined = undefined
  if (!partial || input.weekStart !== undefined) {
    const weekStartValidation = validateWeekStart(input.weekStart)
    if (!weekStartValidation.ok) {
      return { ok: false, error: weekStartValidation.error! }
    }
    weekStart = weekStartValidation.weekStart!
  }

  // Process day booleans (required for create, optional for partial update)
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
  const dayValues: Partial<Record<typeof days[number], boolean>> = {}
  
  for (const day of days) {
    if (!partial || input[day] !== undefined) {
      if (input[day] === undefined || input[day] === null) {
        return { ok: false, error: `${day.charAt(0).toUpperCase() + day.slice(1)} is required` }
      }
      if (typeof input[day] !== 'boolean') {
        return { ok: false, error: `${day.charAt(0).toUpperCase() + day.slice(1)} must be true or false` }
      }
      dayValues[day] = input[day]!
    }
  }

  // Process goalId (optional)
  let goalId: string | null = null
  if (input.goalId !== undefined) {
    if (input.goalId === null || input.goalId?.trim() === '') {
      goalId = null
    } else {
      goalId = input.goalId.trim()
    }
  }

  // Build result data
  const data: any = {}
  if (title !== undefined) data.title = title
  if (weekStart !== undefined) data.weekStart = weekStart
  Object.assign(data, dayValues)
  if (input.goalId !== undefined) data.goalId = goalId

  // For non-partial updates, ensure all required fields are present
  if (!partial) {
    result.data = {
      title: title!,
      weekStart: weekStart!,
      monday: dayValues.monday!,
      tuesday: dayValues.tuesday!,
      wednesday: dayValues.wednesday!,
      thursday: dayValues.thursday!,
      friday: dayValues.friday!,
      saturday: dayValues.saturday!,
      sunday: dayValues.sunday!,
      goalId: goalId
    }
  } else {
    result.data = data
  }

  return result
}

/**
 * Validates that weekStart is a valid Monday date
 */
export function validateWeekStart(weekStartStr?: string): { ok: boolean; weekStart?: Date; error?: string } {
  if (!weekStartStr || weekStartStr.trim() === '') {
    return { ok: false, error: "Week start date is required" }
  }

  const trimmed = weekStartStr.trim()
  
  // Validate YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(trimmed)) {
    return { ok: false, error: "Week start must be in YYYY-MM-DD format" }
  }
  
  // Validate actual date
  const parsedDate = new Date(trimmed + 'T00:00:00.000Z')
  if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().split('T')[0] !== trimmed) {
    return { ok: false, error: "Week start must be in YYYY-MM-DD format" }
  }
  
  // Check if it's a Monday (getDay() returns 0 for Sunday, 1 for Monday, etc.)
  if (parsedDate.getDay() !== 1) {
    return { ok: false, error: "Week start must be a Monday" }
  }
  
  return { ok: true, weekStart: parsedDate }
}

/**
 * Validates goal linkage rules for WeeklyTask
 */
export async function validateGoalLinkage(
  goalId: string, 
  weekStart: Date, 
  userId: string,
  tx: PrismaTransaction | PrismaClient = prisma
): Promise<void> {
  const goal = await tx.goal.findFirst({
    where: {
      id: goalId,
      userId
    }
  })

  if (!goal) {
    const error = new Error('Goal not found')
    ;(error as any).statusCode = 404
    throw error
  }

  // Check horizon is WEEK
  if (goal.horizon !== 'WEEK') {
    const error = new Error('Goal must have horizon WEEK to link to weekly tasks')
    ;(error as any).statusCode = 400
    throw error
  }

  // Check targetDate is in the same week as weekStart
  if (goal.targetDate) {
    // Get Monday of the goal's target date week
    const targetMonday = getWeekStartDate(goal.targetDate)
    
    // Compare with weekStart (both should be Mondays)
    if (targetMonday.getTime() !== weekStart.getTime()) {
      const weekStartStr = weekStart.toISOString().split('T')[0]
      const targetWeekStr = targetMonday.toISOString().split('T')[0]
      const error = new Error(`Goal target date is for week ${targetWeekStr}, but task is for week ${weekStartStr}`)
      ;(error as any).statusCode = 400
      throw error
    }
  }
}

/**
 * Gets the Monday date for a given date's week
 */
function getWeekStartDate(date: Date): Date {
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Sunday is 6 days from Monday
  
  const monday = new Date(date)
  monday.setDate(date.getDate() - daysFromMonday)
  monday.setHours(0, 0, 0, 0)
  
  return monday
}

/**
 * Enforces soft limits on weekly tasks per user per week
 */
export async function enforceSoftLimits(
  userId: string,
  weekStart: Date,
  options: { excludingTaskId?: string } = {},
  tx: PrismaTransaction | PrismaClient = prisma
): Promise<void> {
  const { excludingTaskId } = options

  const taskCount = await tx.weeklyTask.count({
    where: {
      userId,
      weekStart,
      ...(excludingTaskId && { id: { not: excludingTaskId } })
    }
  })

  // Check upper limit (>7)
  if (taskCount >= 7) {
    const error = new Error("You can't have more than 7 tasks per week. Focus on the most important habits first.")
    ;(error as any).statusCode = 409
    throw error
  }
}

/**
 * Validates minimum task count requirement for a week
 */
export async function validateMinimumTasks(
  userId: string,
  weekStart: Date,
  tx: PrismaTransaction | PrismaClient = prisma
): Promise<void> {
  const taskCount = await tx.weeklyTask.count({
    where: {
      userId,
      weekStart
    }
  })

  if (taskCount < 2) {
    const error = new Error("Add at least 2 weekly tasks to build momentum and consistency.")
    ;(error as any).statusCode = 409
    throw error
  }
}

/**
 * Counts WeeklyTasks for a user and week (for soft limit checks)
 */
export async function countWeeklyTasks(
  userId: string,
  weekStart: Date,
  tx: PrismaTransaction | PrismaClient = prisma
): Promise<number> {
  return await tx.weeklyTask.count({
    where: {
      userId,
      weekStart
    }
  })
}

/**
 * Checks if a WeeklyTask title is already taken by the user for the week (case-insensitive)
 */
export async function checkTaskTitleExists(
  userId: string,
  weekStart: Date,
  title: string,
  excludeId?: string,
  tx: PrismaTransaction | PrismaClient = prisma
): Promise<{ exists: boolean, existingTitle?: string }> {
  const existing = await tx.weeklyTask.findFirst({
    where: {
      userId,
      weekStart,
      titleNorm: title.toLowerCase(),
      ...(excludeId && { id: { not: excludeId } })
    },
    select: { title: true }
  })

  return {
    exists: !!existing,
    existingTitle: existing?.title
  }
}
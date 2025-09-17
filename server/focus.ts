import { PrismaClient, Prisma } from '@prisma/client'
import { validateWeekStart } from './tasks' // Reuse existing week validation

const prisma = new PrismaClient()

export interface WeeklyFocusThemeInput {
  title?: string
  note?: string | null
  weekStart?: string
  linkedGoals?: string[]
}

export interface FocusValidationResult {
  ok: boolean
  data?: {
    title: string
    note: string | null
    weekStart: Date
    linkedGoals: string[]
  }
  error?: string
}

// Type for Prisma transaction client
type PrismaTransaction = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

/**
 * Validates and trims WeeklyFocusTheme input according to Domain Spec v1.3
 */
export function validateFocusInput(input: WeeklyFocusThemeInput, options: { partial?: boolean } = {}): FocusValidationResult {
  const { partial = false } = options
  const result: FocusValidationResult = { ok: true }

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
      return { ok: false, error: "Focus title can't be empty" }
    }
    if (title.length > 60) {
      return { ok: false, error: "Focus title can't exceed 60 characters" }
    }
  }

  // Process note (always optional)
  let note: string | null = null
  if (input.note !== undefined) {
    note = trimField(input.note)
    if (note && note.length > 400) {
      return { ok: false, error: "Focus note can't exceed 400 characters" }
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

  // Process linkedGoals (always optional, but validate when provided)
  let linkedGoals: string[] = []
  if (input.linkedGoals !== undefined) {
    const linkedGoalsValidation = validateLinkedGoals(input.linkedGoals)
    if (!linkedGoalsValidation.ok) {
      return { ok: false, error: linkedGoalsValidation.error! }
    }
    linkedGoals = linkedGoalsValidation.goalIds!
  }

  // Build result data
  const data: any = {}
  if (title !== undefined) data.title = title
  if (input.note !== undefined) data.note = note
  if (weekStart !== undefined) data.weekStart = weekStart
  if (input.linkedGoals !== undefined) data.linkedGoals = linkedGoals

  // For non-partial updates, ensure all required fields are present
  if (!partial) {
    result.data = {
      title: title!,
      note: note,
      weekStart: weekStart!,
      linkedGoals: linkedGoals
    }
  } else {
    result.data = data
  }

  return result
}

/**
 * Validates linkedGoals array according to Domain Spec v1.3
 */
export function validateLinkedGoals(goalIds?: string[]): { ok: boolean; goalIds?: string[]; error?: string } {
  if (!goalIds) {
    return { ok: true, goalIds: [] }
  }

  if (!Array.isArray(goalIds)) {
    return { ok: false, error: "All goal IDs must be valid UUIDs" }
  }

  // Check array length (0-3)
  if (goalIds.length > 3) {
    return { ok: false, error: "Can't link more than 3 goals" }
  }

  // Validate each UUID and check for duplicates
  const cleanedIds: string[] = []
  const seenIds = new Set<string>()

  for (const id of goalIds) {
    if (typeof id !== 'string') {
      return { ok: false, error: "All goal IDs must be valid UUIDs" }
    }

    const cleanId = id.trim()
    if (!isValidUUID(cleanId)) {
      return { ok: false, error: "All goal IDs must be valid UUIDs" }
    }

    if (seenIds.has(cleanId)) {
      return { ok: false, error: "Can't link the same goal multiple times" }
    }

    seenIds.add(cleanId)
    cleanedIds.push(cleanId)
  }

  return { ok: true, goalIds: cleanedIds }
}

/**
 * Validates that all linked goals exist and belong to the user
 */
export async function validateGoalOwnership(
  goalIds: string[],
  userId: string,
  tx: PrismaTransaction | PrismaClient = prisma
): Promise<void> {
  if (goalIds.length === 0) {
    return // No goals to validate
  }

  const goals = await tx.goal.findMany({
    where: {
      id: { in: goalIds },
      userId
    },
    select: { id: true }
  })

  if (goals.length !== goalIds.length) {
    // Some goals don't exist or don't belong to the user
    const error = new Error('Goal not found')
    ;(error as any).statusCode = 404
    throw error
  }
}

/**
 * Updates linkedGoals for a WeeklyFocusTheme atomically
 */
export async function updateLinkedGoals(
  themeId: string,
  newGoalIds: string[],
  tx: PrismaTransaction | PrismaClient = prisma
): Promise<void> {
  // First delete all existing links
  await tx.weeklyFocusThemeGoal.deleteMany({
    where: { weeklyFocusThemeId: themeId }
  })

  // Then create new links if any
  if (newGoalIds.length > 0) {
    await tx.weeklyFocusThemeGoal.createMany({
      data: newGoalIds.map(goalId => ({
        weeklyFocusThemeId: themeId,
        goalId
      }))
    })
  }
}

/**
 * Checks if a UUID string is valid
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Formats a Date as YYYY-MM-DD for error messages
 */
export function formatDateForError(date: Date): string {
  return date.toISOString().split('T')[0]
}
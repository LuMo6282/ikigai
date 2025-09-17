import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export interface GoalInput {
  title?: string
  description?: string | null
  horizon?: string
  status?: string
  targetDate?: string | null
  lifeAreaId?: string | null
}

export interface ValidationResult {
  ok: boolean
  data?: {
    title: string
    description: string | null
    horizon: string
    status: string
    targetDate: Date | null
    lifeAreaId: string | null
  }
  error?: string
}

// Type for Prisma transaction client
type PrismaTransaction = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

// Valid enum values per Domain Spec v1.3
const VALID_HORIZONS = ['YEAR', 'SIX_MONTH', 'MONTH', 'WEEK'] as const
const VALID_STATUSES = ['active', 'paused', 'done'] as const

/**
 * Validates and trims Goal input according to Domain Spec v1.3
 */
export function validateGoalInput(input: GoalInput, options: { partial?: boolean } = {}): ValidationResult {
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
      return { ok: false, error: "Goal title can't be empty" }
    }
    if (title.length > 100) {
      return { ok: false, error: "Goal title can't exceed 100 characters" }
    }
  }

  // Process description (optional)
  const description = trimField(input.description)
  if (input.description !== undefined && input.description !== null && description === null) {
    return { ok: false, error: "Description can't be empty when provided" }
  }
  if (description && description.length > 1000) {
    return { ok: false, error: "Description can't exceed 1000 characters" }
  }

  // Process horizon (required for create, optional for partial update)
  let horizon: string = ''
  if (!partial || input.horizon !== undefined) {
    if (!input.horizon || !VALID_HORIZONS.includes(input.horizon as any)) {
      return { ok: false, error: "Horizon must be one of: YEAR, SIX_MONTH, MONTH, WEEK" }
    }
    horizon = input.horizon
  }

  // Process status (required for create, optional for partial update)
  let status: string = ''
  if (!partial || input.status !== undefined) {
    if (!input.status || !VALID_STATUSES.includes(input.status as any)) {
      return { ok: false, error: "Status must be one of: active, paused, done" }
    }
    status = input.status
  }

  // Process targetDate (optional)
  let targetDate: Date | null = null
  if (input.targetDate !== undefined) {
    if (input.targetDate === null) {
      targetDate = null
    } else {
      const trimmedDate = input.targetDate.trim()
      if (trimmedDate === '') {
        targetDate = null
      } else {
        // Validate YYYY-MM-DD format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(trimmedDate)) {
          return { ok: false, error: "Target date must be in YYYY-MM-DD format" }
        }
        
        // Validate actual date
        const parsedDate = new Date(trimmedDate + 'T00:00:00.000Z')
        if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().split('T')[0] !== trimmedDate) {
          return { ok: false, error: "Target date must be in YYYY-MM-DD format" }
        }
        
        targetDate = parsedDate
      }
    }
  }

  // Process lifeAreaId (optional)
  let lifeAreaId: string | null = null
  if (input.lifeAreaId !== undefined) {
    if (input.lifeAreaId === null || input.lifeAreaId.trim() === '') {
      lifeAreaId = null
    } else {
      lifeAreaId = input.lifeAreaId.trim()
    }
  }

  result.data = {
    title: title!,
    description: partial && input.description === undefined ? undefined as any : description,
    horizon: horizon || undefined as any,
    status: status || undefined as any,
    targetDate: partial && input.targetDate === undefined ? undefined as any : targetDate,
    lifeAreaId: partial && input.lifeAreaId === undefined ? undefined as any : lifeAreaId
  }

  // Remove undefined values for partial updates
  if (partial) {
    const cleanedData: any = {}
    Object.entries(result.data).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanedData[key] = value
      }
    })
    result.data = cleanedData
  }

  return result
}

/**
 * Ensures a LifeArea exists and belongs to the specified user
 */
export async function ensureLifeAreaOwnership(
  userId: string, 
  lifeAreaId: string, 
  tx: PrismaTransaction | PrismaClient = prisma
): Promise<void> {
  const lifeArea = await tx.lifeArea.findFirst({
    where: {
      id: lifeAreaId,
      userId
    }
  })

  if (!lifeArea) {
    const error = new Error('Life area not found')
    ;(error as any).statusCode = 404
    throw error
  }
}

/**
 * Enforces the soft limit of 12 active goals per user
 */
export async function enforceActiveGoalSoftLimit(
  userId: string, 
  options: { excludingGoalId?: string } = {},
  tx: PrismaTransaction | PrismaClient = prisma
): Promise<void> {
  const { excludingGoalId } = options

  const activeCount = await tx.goal.count({
    where: {
      userId,
      status: 'active',
      ...(excludingGoalId && { id: { not: excludingGoalId } })
    }
  })

  if (activeCount >= 12) {
    const error = new Error('You have 12 active goals already. Complete or pause some goals before adding new ones to maintain focus.')
    ;(error as any).statusCode = 409
    throw error
  }
}
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export interface LifeAreaInput {
  name?: string
  color?: string | null
  vision?: string | null
  strategy?: string | null
  order?: number
}

export interface ValidationResult {
  ok: boolean
  data?: {
    name: string
    color: string | null
    vision: string | null
    strategy: string | null
    order?: number
  }
  error?: string
}

// Type for Prisma transaction client
type PrismaTransaction = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

/**
 * Validates and trims LifeArea input according to Domain Spec v1.3
 */
export function validateLifeAreaInput(input: LifeAreaInput, isUpdate = false): ValidationResult {
  const result: ValidationResult = { ok: true }

  // Helper to trim and validate string fields
  const trimField = (value: string | null | undefined): string | null => {
    if (value === undefined || value === null) return null
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  // Process name (required for create, optional for update)
  const name = trimField(input.name)
  if (!isUpdate || input.name !== undefined) {
    if (!name) {
      return { ok: false, error: "Name can't be empty" }
    }
    if (name.length > 50) {
      return { ok: false, error: "Life area name can't exceed 50 characters" }
    }
  }

  // Process color (optional)
  const color = trimField(input.color)
  if (color !== null) {
    const colorRegex = /^#[0-9A-Fa-f]{6}$/
    if (!colorRegex.test(color)) {
      return { ok: false, error: "Color must be exactly 6 hex digits after # (e.g., #FF6B35)" }
    }
  }

  // Process vision (optional)
  const vision = trimField(input.vision)
  if (input.vision !== undefined && input.vision !== null && vision === null) {
    return { ok: false, error: "Vision can't be empty when provided" }
  }
  if (vision && vision.length > 500) {
    return { ok: false, error: "Vision can't exceed 500 characters" }
  }

  // Process strategy (optional)
  const strategy = trimField(input.strategy)
  if (input.strategy !== undefined && input.strategy !== null && strategy === null) {
    return { ok: false, error: "Strategy can't be empty when provided" }
  }
  if (strategy && strategy.length > 500) {
    return { ok: false, error: "Strategy can't exceed 500 characters" }
  }

  result.data = {
    name: name!,
    color,
    vision,
    strategy,
    order: input.order
  }

  return result
}

/**
 * Resequences all LifeAreas for a user to maintain dense 1..N ordering
 */
export async function resequenceOrders(userId: string, tx: PrismaTransaction | PrismaClient = prisma): Promise<void> {
  const areas = await tx.lifeArea.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
    select: { id: true }
  })

  // Update each area with its new 1-based index
  for (let i = 0; i < areas.length; i++) {
    await tx.lifeArea.update({
      where: { id: areas[i].id },
      data: { order: i + 1 }
    })
  }
}

/**
 * Calculates the order for inserting a new LifeArea, handling position shifts
 */
export async function insertAtOrder(
  userId: string, 
  desiredOrder?: number, 
  tx: PrismaTransaction | PrismaClient = prisma
): Promise<{ order: number }> {
  const maxOrder = await tx.lifeArea.aggregate({
    where: { userId },
    _max: { order: true }
  })

  const currentMaxOrder = maxOrder._max.order || 0

  // If no order specified, append to end
  if (!desiredOrder) {
    return { order: currentMaxOrder + 1 }
  }

  // Clamp desired order to valid range (1 to N+1)
  const targetOrder = Math.max(1, Math.min(desiredOrder, currentMaxOrder + 1))

  // If inserting at the end, no shifting needed
  if (targetOrder > currentMaxOrder) {
    return { order: targetOrder }
  }

  // Shift existing areas at targetOrder and above
  await tx.lifeArea.updateMany({
    where: {
      userId,
      order: { gte: targetOrder }
    },
    data: {
      order: { increment: 1 }
    }
  })

  return { order: targetOrder }
}

/**
 * Counts LifeAreas for a user (for soft limit check)
 */
export async function countUserLifeAreas(userId: string, tx: PrismaTransaction | PrismaClient = prisma): Promise<number> {
  return await tx.lifeArea.count({
    where: { userId }
  })
}

/**
 * Checks if a LifeArea name is already taken by the user (case-insensitive)
 */
export async function checkNameExists(
  userId: string, 
  name: string, 
  excludeId?: string, 
  tx: PrismaTransaction | PrismaClient = prisma
): Promise<{ exists: boolean, existingName?: string }> {
  const existing = await tx.lifeArea.findFirst({
    where: {
      userId,
      nameNorm: name.toLowerCase(),
      ...(excludeId && { id: { not: excludeId } })
    },
    select: { name: true }
  })

  return {
    exists: !!existing,
    existingName: existing?.name
  }
}
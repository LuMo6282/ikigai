/**
 * Database Error to User Copy Mapper (Strict)
 * 
 * Converts database constraint errors into exact user-friendly messages
 * based on Domain Specification v1.3.
 * 
 * Uses stable constraint identifiers and strict detection rules.
 */

export interface ErrorContext {
  title?: string
  weekStart?: string  // ISO YYYY-MM-DD format
  lifeAreaName?: string
}

interface PrismaError {
  code?: string
  message?: string
  meta?: {
    target?: string[]
    constraint?: string
  }
}

interface PostgresError {
  code?: string
  constraint?: string
  message?: string
}

type DatabaseError = PrismaError | PostgresError

/**
 * Maps database errors to user-friendly copy using strict rules
 * @param err - Database error object (unknown type for safety)
 * @param ctx - Optional context for building specific error messages
 * @returns Exact user-friendly error message string
 */
export function mapDbErrorToUserCopy(err: unknown, ctx?: ErrorContext): string {
  if (!err || typeof err !== 'object') {
    return 'Something went wrong. Please try again.'
  }

  const error = err as any // Use any for flexible property access

  // Handle Prisma unique constraint violations (P2002)
  if (error.code === 'P2002' && Array.isArray(error.meta?.target)) {
    const targetColumns = error.meta.target.join(',')
    return mapUniqueConstraint(targetColumns, ctx)
  }

  // Handle PostgreSQL unique constraint violations (23505)
  if (error.code === '23505' && error.constraint) {
    return mapNamedConstraint(error.constraint, ctx)
  }

  // Handle PostgreSQL check constraint violations (23514)
  if (error.code === '23514' && error.constraint) {
    return mapCheckConstraint(error.constraint)
  }

  // Fall back to constraint name if available
  if (error.constraint) {
    const mapped = mapNamedConstraint(error.constraint, ctx)
    if (mapped !== 'Something went wrong. Please try again.') {
      return mapped
    }
  }

  // Generic fallback
  return 'Something went wrong. Please try again.'
}

/**
 * Checks if error is a unique constraint violation
 * @param err - Database error object
 * @returns True if unique constraint violation
 */
export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false
  }

  const error = err as any

  // Prisma unique violation
  if (error.code === 'P2002') {
    return true
  }

  // PostgreSQL unique violation
  if (error.code === '23505') {
    return true
  }

  return false
}

/**
 * Extracts constraint name from error
 * @param err - Database error object
 * @returns Constraint name if available
 */
export function getConstraintName(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') {
    return undefined
  }

  const error = err as any

  // Direct constraint property
  if (error.constraint) {
    return error.constraint
  }

  // Prisma meta constraint
  if (error.meta?.constraint) {
    return error.meta.constraint
  }

  return undefined
}

/**
 * Map unique constraints based on target columns
 */
function mapUniqueConstraint(targetColumns: string, ctx?: ErrorContext): string {
  switch (targetColumns) {
    case 'userId,nameNorm':
      const lifeAreaName = ctx?.lifeAreaName || 'that name'
      return `You already have a life area named '${lifeAreaName}'`

    case 'userId,weekStart,titleNorm':
      const title = ctx?.title || 'this task'
      const weekStart = ctx?.weekStart || 'this week'
      return `You already have a task called '${title}' for the week of ${weekStart}`

    case 'userId,weekStart':
      const focusWeekStart = ctx?.weekStart || 'this week'
      return `You already set a focus for the week of ${focusWeekStart}`

    case 'weeklyFocusThemeId,goalId':
      return "Can't link the same goal multiple times"

    default:
      return 'Something went wrong. Please try again.'
  }
}

/**
 * Map named constraints to user messages
 */
function mapNamedConstraint(constraintName: string, ctx?: ErrorContext): string {
  switch (constraintName) {
    case 'uniq_lifearea_user_namenorm':
      const lifeAreaName = ctx?.lifeAreaName || 'that name'
      return `You already have a life area named '${lifeAreaName}'`

    case 'uniq_weeklytask_user_week_title':
      const title = ctx?.title || 'this task'
      const weekStart = ctx?.weekStart || 'this week'
      return `You already have a task called '${title}' for the week of ${weekStart}`

    case 'uniq_focus_user_week':
      const focusWeekStart = ctx?.weekStart || 'this week'
      return `You already set a focus for the week of ${focusWeekStart}`

    case 'uniq_focus_goal_link':
      return "Can't link the same goal multiple times"

    default:
      return 'Something went wrong. Please try again.'
  }
}

/**
 * Map check constraints to user messages
 */
function mapCheckConstraint(constraintName: string): string {
  switch (constraintName) {
    case 'chk_signal_sleep_bounds':
      return "Sleep hours can't exceed 14"

    case 'chk_signal_sleep_quarter':
      return 'Sleep hours must be in 0.25-hour increments (7.25, 7.50, 7.75, etc.)'

    case 'chk_signal_wellbeing_range':
    case 'chk_signal_wellbeing_int':
      return 'Wellbeing must be a whole number between 1 and 10'

    default:
      return 'Something went wrong. Please try again.'
  }
}
/**
 * Client-side date utilities for week calculations
 */

/**
 * Get the start of the week (Monday) for a given date
 */
export function getWeekStart(date = new Date()): Date {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  return start
}

/**
 * Format date as YYYY-MM-DD string
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get date N days ago
 */
export function getDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

/**
 * Get current week start as ISO string
 */
export function getCurrentWeekStart(): string {
  return formatDateISO(getWeekStart())
}

/**
 * Get last 7 days date range for queries
 */
export function getLast7DaysRange(): { from: string; to: string } {
  const to = formatDateISO(new Date())
  const from = formatDateISO(getDaysAgo(6))
  return { from, to }
}
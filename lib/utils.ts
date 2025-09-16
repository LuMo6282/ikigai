/**
 * Normalize email address: lowercase and trim whitespace
 * @param email - The email string to normalize
 * @returns Normalized email string
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Validate hex color format: exactly 6 hex digits after #
 * @param str - The string to validate as hex color
 * @returns True if valid hex color format
 */
export function isHexColor(str: string): boolean {
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
  return hexColorRegex.test(str)
}

/**
 * Get the Monday 00:00:00 that starts the week containing the given date
 * @param date - The date to find the week start for
 * @param timezone - The timezone to use (default: America/Denver)
 * @returns Date object representing Monday 00:00:00 in the specified timezone
 */
export function weekStartFor(date: Date, timezone: string = 'America/Denver'): Date {
  // Create a date formatter for the specified timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  // Get the date in the target timezone (YYYY-MM-DD format)
  const dateStr = formatter.format(date)
  const [year, month, day] = dateStr.split('-').map(Number)
  
  // Create a new date in the target timezone
  // We need to be careful about timezone handling here
  const tzDate = new Date()
  tzDate.setFullYear(year, month - 1, day)
  tzDate.setHours(0, 0, 0, 0)
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = tzDate.getDay()
  
  // Calculate days to subtract to get to Monday
  // If Sunday (0), go back 6 days. If Monday (1), go back 0 days, etc.
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  
  // Create the Monday date
  const monday = new Date(tzDate)
  monday.setDate(tzDate.getDate() - daysToSubtract)
  monday.setHours(0, 0, 0, 0)
  
  return monday
}
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Check if a user has any LifeAreas configured
 * @param userId - The user ID to check
 * @returns Promise<boolean> - True if user has at least one LifeArea
 */
export async function hasAnyLifeAreas(userId: string): Promise<boolean> {
  const count = await prisma.lifeArea.count({
    where: { userId }
  })
  return count > 0
}

/**
 * HMAC verification for callback URLs (placeholder - implement according to Auth Spec v1.1)
 * @param callbackUrl - The callback URL to verify
 * @param signature - The HMAC signature
 * @returns boolean - True if signature is valid
 */
export function verifyCallbackUrlHmac(callbackUrl: string, signature?: string): boolean {
  // TODO: Implement HMAC verification according to Auth Spec v1.1
  // For now, return false if no signature provided
  return Boolean(signature)
}

/**
 * Check if callback URL is in the allowed whitelist
 * @param callbackUrl - The callback URL to check
 * @returns boolean - True if URL is whitelisted
 */
export function isCallbackUrlWhitelisted(callbackUrl: string): boolean {
  const allowedPaths = process.env.ALLOWED_CALLBACK_PATHS?.split(',') || [
    '/dashboard',
    '/onboarding',
    '/areas',
    '/goals',
    '/tasks',
    '/focus',
    '/signals'
  ]
  
  // Extract path from URL and check if it starts with any allowed path
  const url = new URL(callbackUrl, 'http://localhost')
  const path = url.pathname
  
  return allowedPaths.some(allowedPath => 
    path === allowedPath || path.startsWith(allowedPath + '/')
  )
}
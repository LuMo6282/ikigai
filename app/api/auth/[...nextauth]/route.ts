import NextAuth from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import { hasAnyLifeAreas, verifyCallbackUrlHmac, isCallbackUrlWhitelisted } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Handle the callback URL logic - fix URL construction issue
      try {
        const urlObj = new URL(url)
        const callbackUrl = urlObj.searchParams.get('callbackUrl')
        
        if (callbackUrl) {
          // Verify HMAC signature and whitelist
          const signature = urlObj.searchParams.get('sig') || undefined
          if (isCallbackUrlWhitelisted(callbackUrl) && verifyCallbackUrlHmac(callbackUrl, signature)) {
            return `${baseUrl}${callbackUrl}`
          }
          // If callback URL is invalid, fall through to default logic
        }
      } catch (error) {
        // If URL parsing fails, continue with default behavior
        console.warn('URL parsing error in redirect callback:', error)
      }
      
      // We'll let the signin page handle the LifeArea-based redirect logic
      return baseUrl + '/signin'
    },
    async jwt({ token, user, account }) {
      // Add hasLifeAreas to the JWT token after sign-in
      if (user?.id) {
        const hasLifeAreas = await hasAnyLifeAreas(user.id)
        token.hasLifeAreas = hasLifeAreas
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Pass hasLifeAreas to the session
      if (token.userId && session.user) {
        session.user.id = token.userId as string
        session.user.hasLifeAreas = token.hasLifeAreas as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/signin',
  },
  session: {
    strategy: 'jwt',
  },
})

export { handler as GET, handler as POST }
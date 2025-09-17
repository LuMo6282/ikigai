import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
      hasLifeAreas: boolean
    } & DefaultSession['user']
  }
  
  interface User extends DefaultUser {
    hasLifeAreas?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId?: string
    hasLifeAreas?: boolean
  }
}
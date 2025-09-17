import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // The request is authenticated at this point
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Define protected and public routes
        const protectedRoutes = [
          '/dashboard',
          '/onboarding',
          '/areas',
          '/goals', 
          '/tasks',
          '/focus',
          '/signals'
        ]
        
        const publicRoutes = [
          '/',
          '/signin',
          '/api'
        ]
        
        // Check if the current path is protected
        const isProtectedRoute = protectedRoutes.some(route => 
          pathname === route || pathname.startsWith(route + '/')
        )
        
        const isPublicRoute = publicRoutes.some(route =>
          pathname === route || pathname.startsWith(route + '/')
        )
        
        // If it's a public route, allow access
        if (isPublicRoute) {
          return true
        }
        
        // If it's a protected route, check authentication
        if (isProtectedRoute) {
          // If not authenticated, NextAuth will redirect to our custom signin page
          return !!token
        }
        
        // Default to allowing access for other routes
        return true
      }
    },
    pages: {
      signIn: '/signin',
    },
  }
)

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
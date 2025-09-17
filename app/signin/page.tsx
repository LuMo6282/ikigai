import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { hasAnyLifeAreas, isCallbackUrlWhitelisted, verifyCallbackUrlHmac } from '@/lib/auth-helpers'
import { authOptions } from '@/lib/auth'
import Image from 'next/image'
import Link from 'next/link'

export default async function SignIn({
  searchParams
}: {
  searchParams: { callbackUrl?: string; sig?: string }
}) {
  const session = await getServerSession(authOptions)
  
  // If user is already authenticated, redirect based on LifeArea count
  if (session?.user?.id) {
    const hasLifeAreas = await hasAnyLifeAreas(session.user.id)
    
    if (hasLifeAreas) {
      // User has LifeAreas, redirect to dashboard or valid callbackUrl
      const { callbackUrl, sig } = searchParams
      
      if (callbackUrl && isCallbackUrlWhitelisted(callbackUrl) && verifyCallbackUrlHmac(callbackUrl, sig)) {
        redirect(callbackUrl)
      }
      
      redirect('/dashboard')
    } else {
      // User has no LifeAreas, redirect to onboarding
      redirect('/onboarding')
    }
  }
  
  // User is not authenticated, show signin form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-3">
              <Image 
                src="/logo.svg" 
                alt="Ikigai Logo" 
                width={48} 
                height={48}
                className="w-12 h-12"
              />
              <h1 className="text-3xl font-bold text-gray-900">Ikigai</h1>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-gray-600">
            Discover and pursue your life purpose
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-8">
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Sign in to access your personal dashboard
              </p>
              <Link
                href="/api/auth/signin"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in with Email
              </Link>
            </div>
            
            <div className="text-center text-sm text-gray-500">
              New to Ikigai? Signing in will create your account automatically.
            </div>
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-400">
          <p>Life areas • Goals • Tasks • Focus • Signals</p>
        </div>
      </div>
    </div>
  )
}
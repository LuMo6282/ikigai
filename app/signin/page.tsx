import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { hasAnyLifeAreas, isCallbackUrlWhitelisted, verifyCallbackUrlHmac } from '@/lib/auth-helpers'

export default async function SignIn({
  searchParams
}: {
  searchParams: { callbackUrl?: string; sig?: string }
}) {
  const session = await getServerSession()
  
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Ikigai
          </h2>
        </div>
        <div>
          {/* Basic signin form - would normally use next-auth signin functionality */}
          <p className="text-center text-gray-600">
            Please sign in to continue
          </p>
        </div>
      </div>
    </div>
  )
}
import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ClientSessionProvider } from '@/lib/session-provider'
import { QueryProvider } from '@/lib/query-client'
import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Ikigai - Life Purpose Dashboard',
  description: 'Discover and pursue your life purpose through structured goal setting and habit tracking.',
}

async function Header() {
  const session = await getServerSession(authOptions)
  
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Image 
              src="/logo.svg" 
              alt="Ikigai Logo" 
              width={32} 
              height={32}
              className="w-8 h-8"
            />
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              Ikigai
            </Link>
          </div>
          
          {session && (
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">Dashboard</Link>
              <Link href="/areas" className="text-gray-700 hover:text-gray-900">Areas</Link>
              <Link href="/goals" className="text-gray-700 hover:text-gray-900">Goals</Link>
              <Link href="/tasks" className="text-gray-700 hover:text-gray-900">Tasks</Link>
              <Link href="/focus" className="text-gray-700 hover:text-gray-900">Focus</Link>
              <Link href="/signals" className="text-gray-700 hover:text-gray-900">Signals</Link>
            </nav>
          )}
          
          <div className="flex items-center space-x-4">
            {session ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700">
                  {session.user?.email}
                </span>
                <Link 
                  href="/api/auth/signout" 
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign out
                </Link>
              </div>
            ) : (
              <Link 
                href="/signin" 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <ClientSessionProvider>
          <QueryProvider>
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </QueryProvider>
        </ClientSessionProvider>
      </body>
    </html>
  )
}

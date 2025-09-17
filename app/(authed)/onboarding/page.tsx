'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/fetcher'

interface LifeArea {
  id: string
  name: string
  color?: string
}

export default function OnboardingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [vision, setVision] = useState('')
  const [strategy, setStrategy] = useState('')
  const [error, setError] = useState('')

  // Check if user already has life areas - redirect if so
  const { data: areas } = useQuery<LifeArea[]>({
    queryKey: ['areas'],
    queryFn: () => api.get('/api/areas'),
    enabled: !!session,
  })

  const createAreaMutation = useMutation({
    mutationFn: (data: { name: string; color?: string; vision?: string; strategy?: string }) =>
      api.post('/api/areas', data),
    onSuccess: () => {
      router.push('/dashboard')
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to create life area')
    },
  })

  // Redirect if user already has areas
  if (areas && areas.length > 0) {
    router.push('/dashboard')
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Life area name is required')
      return
    }

    createAreaMutation.mutate({
      name: name.trim(),
      color: color || undefined,
      vision: vision || undefined,
      strategy: strategy || undefined,
    })
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Ikigai
          </h1>
          <p className="text-gray-600">
            Let's start by creating your first life area
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Life Area Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Health & Fitness"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
              Color (optional)
            </label>
            <input
              id="color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="vision" className="block text-sm font-medium text-gray-700 mb-1">
              Vision (optional)
            </label>
            <textarea
              id="vision"
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              placeholder="What do you want to achieve in this area?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="strategy" className="block text-sm font-medium text-gray-700 mb-1">
              Strategy (optional)
            </label>
            <textarea
              id="strategy"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              placeholder="How will you achieve this vision?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={createAreaMutation.isPending}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {createAreaMutation.isPending ? 'Creating...' : 'Create Life Area'}
          </button>
        </form>
      </div>
    </div>
  )
}
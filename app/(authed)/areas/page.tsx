'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { Section } from '@/components/Section'

interface LifeArea {
  id: string
  name: string
  color?: string
  vision?: string
  strategy?: string
  order: number
}

export default function AreasPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [vision, setVision] = useState('')
  const [strategy, setStrategy] = useState('')
  const [error, setError] = useState('')

  const { data: areas, isLoading } = useQuery<LifeArea[]>({
    queryKey: ['areas'],
    queryFn: () => api.get('/api/areas'),
  })

  const createAreaMutation = useMutation({
    mutationFn: (data: { name: string; color?: string; vision?: string; strategy?: string }) =>
      api.post('/api/areas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
      setName('')
      setColor('#3B82F6')
      setVision('')
      setStrategy('')
      setError('')
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create life area')
    },
  })

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

  if (isLoading) {
    return <div className="text-center">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Life Areas</h1>
      
      <Section title="Create New Area">
        <div className="bg-white rounded-lg border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
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
                  Color
                </label>
                <input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-10 px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="vision" className="block text-sm font-medium text-gray-700 mb-1">
                Vision
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
                Strategy
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
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {createAreaMutation.isPending ? 'Creating...' : 'Create Area'}
            </button>
          </form>
        </div>
      </Section>

      <Section title="Your Life Areas">
        <div className="bg-white rounded-lg border">
          {areas && areas.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {areas.map((area) => (
                <div key={area.id} className="p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: area.color || '#6B7280' }}
                    />
                    <h3 className="font-medium text-gray-900">{area.name}</h3>
                    <span className="text-xs text-gray-500">#{area.order}</span>
                  </div>
                  {area.vision && (
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Vision:</strong> {area.vision}
                    </p>
                  )}
                  {area.strategy && (
                    <p className="text-sm text-gray-600">
                      <strong>Strategy:</strong> {area.strategy}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">No life areas created yet</p>
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
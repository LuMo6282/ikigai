'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { Section } from '@/components/Section'

interface Goal {
  id: string
  title: string
  horizon: string
  status: string
  targetDate?: string
  lifeArea?: {
    id: string
    name: string
    color?: string
  }
}

interface LifeArea {
  id: string
  name: string
  color?: string
}

export default function GoalsPage() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [horizon, setHorizon] = useState('WEEK')
  const [status, setStatus] = useState('NOT_STARTED')
  const [targetDate, setTargetDate] = useState('')
  const [lifeAreaId, setLifeAreaId] = useState('')
  const [error, setError] = useState('')

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => api.get('/api/goals'),
  })

  const { data: areas } = useQuery<LifeArea[]>({
    queryKey: ['areas'],
    queryFn: () => api.get('/api/areas'),
  })

  const createGoalMutation = useMutation({
    mutationFn: (data: { title: string; horizon: string; status: string; targetDate?: string; lifeAreaId?: string }) =>
      api.post('/api/goals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      setTitle('')
      setHorizon('WEEK')
      setStatus('NOT_STARTED')
      setTargetDate('')
      setLifeAreaId('')
      setError('')
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create goal')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Goal title is required')
      return
    }

    createGoalMutation.mutate({
      title: title.trim(),
      horizon,
      status,
      targetDate: targetDate || undefined,
      lifeAreaId: lifeAreaId || undefined,
    })
  }

  const horizonOptions = [
    { value: 'WEEK', label: 'Week' },
    { value: 'MONTH', label: 'Month' },
    { value: 'QUARTER', label: 'Quarter' },
    { value: 'YEAR', label: 'Year' },
    { value: 'LIFE', label: 'Life' },
  ]

  const statusOptions = [
    { value: 'NOT_STARTED', label: 'Not Started' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'PAUSED', label: 'Paused' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ]

  if (isLoading) {
    return <div className="text-center">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
      
      <Section title="Create New Goal">
        <div className="bg-white rounded-lg border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Run a 5K marathon"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="horizon" className="block text-sm font-medium text-gray-700 mb-1">
                  Horizon *
                </label>
                <select
                  id="horizon"
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {horizonOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date
                </label>
                <input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="lifeAreaId" className="block text-sm font-medium text-gray-700 mb-1">
                  Life Area
                </label>
                <select
                  id="lifeAreaId"
                  value={lifeAreaId}
                  onChange={(e) => setLifeAreaId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a life area</option>
                  {areas?.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={createGoalMutation.isPending}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {createGoalMutation.isPending ? 'Creating...' : 'Create Goal'}
            </button>
          </form>
        </div>
      </Section>

      <Section title="Recent Goals">
        <div className="bg-white rounded-lg border">
          {goals && goals.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {goals.slice(0, 10).map((goal) => (
                <div key={goal.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{goal.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      goal.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      goal.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      goal.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                      goal.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {goal.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{goal.horizon}</span>
                    {goal.targetDate && (
                      <span>Target: {goal.targetDate}</span>
                    )}
                    {goal.lifeArea && (
                      <span className="flex items-center space-x-1">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: goal.lifeArea.color || '#6B7280' }}
                        />
                        <span>{goal.lifeArea.name}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">No goals created yet</p>
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
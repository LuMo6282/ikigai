'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { Section } from '@/components/Section'
import { getCurrentWeekStart, formatDateISO } from '@/lib/date'

interface WeeklyTask {
  id: string
  title: string
  weekStart: string
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function TasksPage() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  })
  const [error, setError] = useState('')

  const weekStart = getCurrentWeekStart()

  const { data: tasks, isLoading } = useQuery<WeeklyTask[]>({
    queryKey: ['tasks', weekStart],
    queryFn: () => api.get('/api/tasks', { weekStart }),
  })

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', weekStart] })
      setTitle('')
      setSelectedDays({
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      })
      setError('')
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create task')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Task title is required')
      return
    }

    createTaskMutation.mutate({
      title: title.trim(),
      weekStart,
      ...selectedDays,
    })
  }

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }))
  }

  // Get the current week's Monday date for display
  const weekStartDate = new Date(weekStart)
  const weekStartFormatted = formatDateISO(weekStartDate)

  if (isLoading) {
    return <div className="text-center">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Weekly Tasks</h1>
        <p className="text-gray-600 mt-1">
          Week of {weekStartFormatted}
        </p>
      </div>
      
      <Section title="Create New Task">
        <div className="bg-white rounded-lg border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Task Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Go for a 30-minute walk"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days of the Week
              </label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`px-3 py-2 text-sm rounded-md border ${
                      selectedDays[day]
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {dayLabels[index]}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        </div>
      </Section>

      <Section title="This Week's Tasks">
        <div className="bg-white rounded-lg border">
          {tasks && tasks.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <div key={task.id} className="p-4">
                  <h3 className="font-medium text-gray-900 mb-3">{task.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, index) => (
                      <div
                        key={day}
                        className={`flex items-center justify-center w-8 h-8 text-xs rounded-full border ${
                          task[day]
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-400 border-gray-200'
                        }`}
                      >
                        {dayLabels[index]}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">No tasks for this week</p>
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
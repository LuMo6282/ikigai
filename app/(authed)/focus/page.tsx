'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { Section } from '@/components/Section'
import { getCurrentWeekStart, formatDateISO } from '@/lib/date'

interface WeeklyFocus {
  id: string
  title: string
  note?: string
  weekStart: string
}

export default function FocusPage() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const weekStart = getCurrentWeekStart()

  const { data: focus, isLoading } = useQuery<WeeklyFocus[]>({
    queryKey: ['focus', weekStart],
    queryFn: () => api.get('/api/focus', { weekStart }),
  })

  const currentFocus = focus?.[0]

  useEffect(() => {
    if (currentFocus && !isEditing) {
      setTitle(currentFocus.title)
      setNote(currentFocus.note || '')
    }
  }, [currentFocus, isEditing])

  const createFocusMutation = useMutation({
    mutationFn: (data: { title: string; note?: string; weekStart: string }) =>
      api.post('/api/focus', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus', weekStart] })
      queryClient.invalidateQueries({ queryKey: ['areas'] }) // Refresh dashboard
      setError('')
      setIsEditing(false)
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create focus')
    },
  })

  const updateFocusMutation = useMutation({
    mutationFn: (data: { title: string; note?: string }) =>
      api.patch(`/api/focus/${currentFocus!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus', weekStart] })
      queryClient.invalidateQueries({ queryKey: ['areas'] }) // Refresh dashboard
      setError('')
      setIsEditing(false)
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update focus')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Focus title is required')
      return
    }

    const data = {
      title: title.trim(),
      note: note.trim() || undefined,
    }

    if (currentFocus) {
      updateFocusMutation.mutate(data)
    } else {
      createFocusMutation.mutate({
        ...data,
        weekStart,
      })
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (currentFocus) {
      setTitle(currentFocus.title)
      setNote(currentFocus.note || '')
    } else {
      setTitle('')
      setNote('')
    }
    setIsEditing(false)
    setError('')
  }

  const weekStartDate = new Date(weekStart)
  const weekStartFormatted = formatDateISO(weekStartDate)

  if (isLoading) {
    return <div className="text-center">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Weekly Focus</h1>
        <p className="text-gray-600 mt-1">
          Week of {weekStartFormatted}
        </p>
      </div>
      
      <Section title={currentFocus ? 'Current Focus' : 'Set Weekly Focus'}>
        <div className="bg-white rounded-lg border p-6">
          {currentFocus && !isEditing ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{currentFocus.title}</h3>
                {currentFocus.note && (
                  <p className="text-gray-600 mt-2">{currentFocus.note}</p>
                )}
              </div>
              <button
                onClick={handleEdit}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Edit Focus
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Focus Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Complete project proposal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Additional details or context..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={createFocusMutation.isPending || updateFocusMutation.isPending}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {createFocusMutation.isPending || updateFocusMutation.isPending 
                    ? 'Saving...' 
                    : currentFocus ? 'Update Focus' : 'Set Focus'
                  }
                </button>
                
                {currentFocus && isEditing && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </Section>

      {currentFocus && (
        <Section title="Focus Tips">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Weekly Focus Tips:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
              <li>• Keep your focus specific and actionable</li>
              <li>• Review your progress daily</li>
              <li>• Align tasks with your weekly focus</li>
              <li>• Celebrate completion at week's end</li>
            </ul>
          </div>
        </Section>
      )}
    </div>
  )
}
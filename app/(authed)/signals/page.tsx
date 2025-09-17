'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { Section } from '@/components/Section'
import { getLast7DaysRange, formatDateISO } from '@/lib/date'

interface Signal {
  id: string
  type: 'SLEEP' | 'WELLBEING'
  date: string
  value: number
}

export default function SignalsPage() {
  const queryClient = useQueryClient()
  const [sleepDate, setSleepDate] = useState(formatDateISO(new Date()))
  const [sleepValue, setSleepValue] = useState('')
  const [wellbeingDate, setWellbeingDate] = useState(formatDateISO(new Date()))
  const [wellbeingValue, setWellbeingValue] = useState('')
  const [sleepError, setSleepError] = useState('')
  const [wellbeingError, setWellbeingError] = useState('')

  const { from, to } = getLast7DaysRange()

  const { data: signals, isLoading } = useQuery<Signal[]>({
    queryKey: ['signals', { from, to }],
    queryFn: () => api.get('/api/signals', { from, to }),
  })

  const addSignalMutation = useMutation({
    mutationFn: (data: { type: string; date: string; value: number }) =>
      api.post('/api/signals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signals'] })
    },
  })

  const handleSleepSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSleepError('')

    const value = parseFloat(sleepValue)
    if (isNaN(value) || value < 0 || value > 14) {
      setSleepError('Sleep must be between 0 and 14 hours')
      return
    }

    // Check 0.25 increment
    if (Math.round(value * 4) !== value * 4) {
      setSleepError('Sleep must be in 0.25 hour increments')
      return
    }

    addSignalMutation.mutate(
      { type: 'SLEEP', date: sleepDate, value },
      {
        onSuccess: () => {
          setSleepValue('')
          setSleepDate(formatDateISO(new Date()))
        },
        onError: (error: any) => {
          setSleepError(error.message || 'Failed to add sleep signal')
        },
      }
    )
  }

  const handleWellbeingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setWellbeingError('')

    const value = parseInt(wellbeingValue)
    if (isNaN(value) || value < 1 || value > 10) {
      setWellbeingError('Wellbeing must be between 1 and 10')
      return
    }

    addSignalMutation.mutate(
      { type: 'WELLBEING', date: wellbeingDate, value },
      {
        onSuccess: () => {
          setWellbeingValue('')
          setWellbeingDate(formatDateISO(new Date()))
        },
        onError: (error: any) => {
          setWellbeingError(error.message || 'Failed to add wellbeing signal')
        },
      }
    )
  }

  // Organize signals by date
  const signalsByDate = new Map<string, { sleep?: Signal; wellbeing?: Signal }>()
  signals?.forEach(signal => {
    const existing = signalsByDate.get(signal.date) || {}
    signalsByDate.set(signal.date, {
      ...existing,
      [signal.type.toLowerCase()]: signal,
    })
  })

  // Create array of last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return formatDateISO(date)
  }).reverse()

  if (isLoading) {
    return <div className="text-center">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Signals</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Add Sleep Signal">
          <div className="bg-white rounded-lg border p-4">
            <form onSubmit={handleSleepSubmit} className="space-y-3">
              <div>
                <label htmlFor="sleepDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  id="sleepDate"
                  type="date"
                  value={sleepDate}
                  onChange={(e) => setSleepDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="sleepValue" className="block text-sm font-medium text-gray-700 mb-1">
                  Hours (0-14, in 0.25 increments)
                </label>
                <input
                  id="sleepValue"
                  type="number"
                  step="0.25"
                  min="0"
                  max="14"
                  value={sleepValue}
                  onChange={(e) => setSleepValue(e.target.value)}
                  placeholder="7.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {sleepError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{sleepError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={addSignalMutation.isPending}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Add Sleep
              </button>
            </form>
          </div>
        </Section>

        <Section title="Add Wellbeing Signal">
          <div className="bg-white rounded-lg border p-4">
            <form onSubmit={handleWellbeingSubmit} className="space-y-3">
              <div>
                <label htmlFor="wellbeingDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  id="wellbeingDate"
                  type="date"
                  value={wellbeingDate}
                  onChange={(e) => setWellbeingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="wellbeingValue" className="block text-sm font-medium text-gray-700 mb-1">
                  Rating (1-10)
                </label>
                <select
                  id="wellbeingValue"
                  value={wellbeingValue}
                  onChange={(e) => setWellbeingValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select rating</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num.toString()}>
                      {num} {num === 1 ? '(Poor)' : num === 10 ? '(Excellent)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {wellbeingError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{wellbeingError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={addSignalMutation.isPending}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                Add Wellbeing
              </button>
            </form>
          </div>
        </Section>
      </div>

      <Section title="Last 7 Days">
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sleep (hrs)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wellbeing (1-10)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {last7Days.map(date => {
                  const daySignals = signalsByDate.get(date)
                  return (
                    <tr key={date}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {daySignals?.sleep ? daySignals.sleep.value : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {daySignals?.wellbeing ? daySignals.wellbeing.value : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </div>
  )
}
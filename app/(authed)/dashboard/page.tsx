'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { api } from '@/lib/fetcher'
import { Section } from '@/components/Section'
import { getCurrentWeekStart, getLast7DaysRange, formatDateISO } from '@/lib/date'
import Link from 'next/link'

interface LifeArea {
  id: string
  name: string
  color?: string
}

interface Goal {
  id: string
  title: string
  horizon: string
  status: string
}

interface WeeklyTask {
  id: string
  title: string
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

interface WeeklyFocus {
  id: string
  title: string
  note?: string
}

interface Signal {
  id: string
  type: string
  date: string
  value: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Check if user has life areas - if not, redirect to onboarding
  const { data: areas, isLoading: areasLoading } = useQuery<LifeArea[]>({
    queryKey: ['areas'],
    queryFn: () => api.get('/api/areas'),
    enabled: !!session,
  })

  const weekStart = getCurrentWeekStart()
  const { from: signalsFrom, to: signalsTo } = getLast7DaysRange()

  const { data: tasks } = useQuery<WeeklyTask[]>({
    queryKey: ['tasks', weekStart],
    queryFn: () => api.get('/api/tasks', { weekStart }),
    enabled: !!session,
  })

  const { data: focus } = useQuery<WeeklyFocus[]>({
    queryKey: ['focus', weekStart],
    queryFn: () => api.get('/api/focus', { weekStart }),
    enabled: !!session,
  })

  const { data: signals } = useQuery<Signal[]>({
    queryKey: ['signals', { from: signalsFrom, to: signalsTo }],
    queryFn: () => api.get('/api/signals', { from: signalsFrom, to: signalsTo }),
    enabled: !!session,
  })

  useEffect(() => {
    if (!areasLoading && areas && areas.length === 0) {
      router.push('/onboarding')
    }
  }, [areas, areasLoading, router])

  if (status === 'loading' || areasLoading) {
    return <div className="text-center">Loading...</div>
  }

  const currentFocus = focus?.[0]
  const sleepSignals = signals?.filter(s => s.type === 'SLEEP') || []
  const wellbeingSignals = signals?.filter(s => s.type === 'WELLBEING') || []

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      
      <div className="grid gap-8 md:grid-cols-2">
        <Section title="Weekly Focus">
          {currentFocus ? (
            <div className="p-4 bg-white rounded-lg border">
              <h3 className="font-medium text-gray-900">{currentFocus.title}</h3>
              {currentFocus.note && (
                <p className="text-sm text-gray-600 mt-1">{currentFocus.note}</p>
              )}
              <Link 
                href="/focus" 
                className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Edit focus
              </Link>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border border-dashed">
              <p className="text-gray-500">No focus set for this week</p>
              <Link 
                href="/focus" 
                className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Set weekly focus →
              </Link>
            </div>
          )}
        </Section>

        <Section title="Weekly Tasks">
          {tasks && tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.slice(0, 3).map(task => (
                <div key={task.id} className="p-3 bg-white rounded border text-sm">
                  <span className="font-medium">{task.title}</span>
                </div>
              ))}
              {tasks.length > 3 && (
                <p className="text-sm text-gray-500">+ {tasks.length - 3} more tasks</p>
              )}
              <Link 
                href="/tasks" 
                className="text-sm text-blue-600 hover:text-blue-800 inline-block"
              >
                View all tasks →
              </Link>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border border-dashed">
              <p className="text-gray-500">No tasks for this week</p>
              <Link 
                href="/tasks" 
                className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Add weekly tasks →
              </Link>
            </div>
          )}
        </Section>

        <Section title="Life Areas">
          {areas && areas.length > 0 ? (
            <div className="space-y-2">
              {areas.slice(0, 4).map(area => (
                <div key={area.id} className="flex items-center space-x-2 p-2 bg-white rounded border">
                  {area.color && (
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: area.color }}
                    />
                  )}
                  <span className="text-sm font-medium">{area.name}</span>
                </div>
              ))}
              {areas.length > 4 && (
                <p className="text-sm text-gray-500">+ {areas.length - 4} more areas</p>
              )}
              <Link 
                href="/areas" 
                className="text-sm text-blue-600 hover:text-blue-800 inline-block"
              >
                Manage areas →
              </Link>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border border-dashed">
              <p className="text-gray-500">No life areas defined</p>
              <Link 
                href="/areas" 
                className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Create areas →
              </Link>
            </div>
          )}
        </Section>

        <Section title="Recent Signals">
          {(sleepSignals.length > 0 || wellbeingSignals.length > 0) ? (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Sleep (hrs)</th>
                      <th className="pb-2">Wellbeing (1-10)</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-1">
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = formatDateISO(new Date(Date.now() - i * 24 * 60 * 60 * 1000))
                      const sleep = sleepSignals.find(s => s.date === date)
                      const wellbeing = wellbeingSignals.find(s => s.date === date)
                      return (
                        <tr key={date} className="border-t">
                          <td className="py-1">{date}</td>
                          <td className="py-1">{sleep ? sleep.value : '—'}</td>
                          <td className="py-1">{wellbeing ? wellbeing.value : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Link 
                href="/signals" 
                className="text-sm text-blue-600 hover:text-blue-800 inline-block"
              >
                View all signals →
              </Link>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border border-dashed">
              <p className="text-gray-500">No signals recorded</p>
              <Link 
                href="/signals" 
                className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Add signals →
              </Link>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
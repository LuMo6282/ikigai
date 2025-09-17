import { ReactNode } from 'react'

interface SectionProps {
  title: string
  children: ReactNode
  className?: string
}

export function Section({ title, children, className = '' }: SectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
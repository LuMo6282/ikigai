import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/health/route'

describe('Health API', () => {
  it('should return ok: true', async () => {
    const response = await GET()
    const data = await response.json()
    expect(data).toEqual({ ok: true })
  })
})
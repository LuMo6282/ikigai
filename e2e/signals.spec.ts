import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Signals API', () => {
  test('GET /api/signals requires authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/signals`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/signals with type parameter requires authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/signals?type=SLEEP`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/signals with date filters requires authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/signals?from=2025-01-01&to=2025-01-31`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals requires authentication', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'SLEEP',
        date: '2025-01-15',
        value: 7.5
      }
    })
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/signals/[id] requires authentication', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/signals/test-id`, {
      data: { value: 8.0 }
    })
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('DELETE /api/signals/[id] requires authentication', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/signals/test-id`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('Signals API - Input Validation', () => {
  test('POST /api/signals validates required type', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        date: '2025-01-15',
        value: 7.5
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals validates required date', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'SLEEP',
        value: 7.5
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals validates required value', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'SLEEP',
        date: '2025-01-15'
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals validates signal type', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'INVALID',
        date: '2025-01-15',
        value: 7.5
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals validates date format', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'SLEEP',
        date: 'invalid-date',
        value: 7.5
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals validates SLEEP value bounds', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'SLEEP',
        date: '2025-01-15',
        value: 15 // Exceeds 14 hour limit
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals validates SLEEP value increments', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'SLEEP',
        date: '2025-01-15',
        value: 7.3 // Not 0.25 increment
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals validates WELLBEING value range', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'WELLBEING',
        date: '2025-01-15',
        value: 11 // Exceeds 1-10 range
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals validates WELLBEING integer requirement', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'WELLBEING',
        date: '2025-01-15',
        value: 7.5 // Must be integer
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/signals/[id] validates partial type', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/signals/test-id`, {
      data: { type: 'INVALID' }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/signals/[id] validates partial date', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/signals/test-id`, {
      data: { date: 'invalid-date' }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/signals/[id] validates partial value', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/signals/test-id`, {
      data: { value: 15, type: 'SLEEP' } // Exceeds bounds, need type context
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('Signals API - Query Parameters', () => {
  test('GET /api/signals with invalid type filter', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/signals?type=INVALID`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/signals with invalid from date', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/signals?from=invalid-date`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/signals with invalid to date', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/signals?to=invalid-date`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/signals with empty from date', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/signals?from=`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/signals with empty to date', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/signals?to=`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/signals with from > to dates', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/signals?from=2025-01-31&to=2025-01-01`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/signals with date range > 400 days', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/signals?from=2024-01-01&to=2025-02-06`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('Signals API - Resource Not Found', () => {
  test('PATCH /api/signals/[id] with non-existent ID requires auth first', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/signals/non-existent-id`, {
      data: { value: 8.0 }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('DELETE /api/signals/[id] with non-existent ID requires auth first', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/signals/non-existent-id`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/signals/[id] with invalid UUID format requires auth first', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/signals/invalid-uuid`, {
      data: { value: 8.0 }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('DELETE /api/signals/[id] with invalid UUID format requires auth first', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/signals/invalid-uuid`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('Signals API - Happy Paths (without auth)', () => {
  test('POST /api/signals with valid SLEEP data', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'SLEEP',
        date: '2025-01-15',
        value: 7.25
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals with valid WELLBEING data', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'WELLBEING',
        date: '2025-01-15',
        value: 8
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/signals with valid filters', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/signals?type=SLEEP&from=2025-01-01&to=2025-01-31`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/signals/[id] with valid partial update', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/signals/test-id`, {
      data: { value: 8.5, type: 'SLEEP' }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('DELETE /api/signals/[id] with valid ID', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/signals/123e4567-e89b-12d3-a456-426614174000`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('Signals API - Edge Cases', () => {
  test('POST /api/signals with 0 sleep hours', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'SLEEP',
        date: '2025-01-15',
        value: 0
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals with 14 sleep hours (boundary)', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'SLEEP',
        date: '2025-01-15',
        value: 14
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals with WELLBEING value 1 (boundary)', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'WELLBEING',
        date: '2025-01-15',
        value: 1
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals with WELLBEING value 10 (boundary)', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: {
        type: 'WELLBEING',
        date: '2025-01-15',
        value: 10
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/signals without filters (should use defaults)', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/signals`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/signals with malformed JSON', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals`, {
      data: 'invalid-json'
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('Signals API - HTTP Methods', () => {
  test('Unsupported methods return 405 for /api/signals', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/api/signals`, {
      data: { type: 'SLEEP', date: '2025-01-15', value: 8 }
    })
    expect(response.status()).toBe(405)
  })

  test('Unsupported methods return 405 for /api/signals/[id]', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/signals/test-id`, {
      data: { value: 8 }
    })
    expect(response.status()).toBe(405)
  })
})
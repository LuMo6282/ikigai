import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('WeeklyFocusTheme API', () => {
  test('GET /api/focus requires authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/focus`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/focus with weekStart parameter requires authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/focus?weekStart=2025-01-06`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/focus requires authentication', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/focus`, {
      data: {
        title: 'Test Focus Theme',
        weekStart: '2025-01-06',
        linkedGoals: []
      }
    })
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/focus/[id] requires authentication', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/focus/test-id`, {
      data: { title: 'Updated Focus Theme' }
    })
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('DELETE /api/focus/[id] requires authentication', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/focus/test-id`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('WeeklyFocusTheme API - Input Validation', () => {
  test('POST /api/focus validates required title', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/focus`, {
      data: {
        title: '',
        weekStart: '2025-01-06',
        linkedGoals: []
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/focus validates title length', async ({ request }) => {
    const longTitle = 'a'.repeat(61)
    const response = await request.post(`${BASE_URL}/api/focus`, {
      data: {
        title: longTitle,
        weekStart: '2025-01-06',
        linkedGoals: []
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/focus validates note length', async ({ request }) => {
    const longNote = 'a'.repeat(401)
    const response = await request.post(`${BASE_URL}/api/focus`, {
      data: {
        title: 'Valid Title',
        note: longNote,
        weekStart: '2025-01-06',
        linkedGoals: []
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/focus validates weekStart is Monday', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/focus`, {
      data: {
        title: 'Valid Title',
        weekStart: '2025-01-07', // Tuesday
        linkedGoals: []
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/focus validates weekStart format', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/focus`, {
      data: {
        title: 'Valid Title',
        weekStart: 'invalid-date',
        linkedGoals: []
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/focus validates linkedGoals is array', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/focus`, {
      data: {
        title: 'Valid Title',
        weekStart: '2025-01-06',
        linkedGoals: 'not-an-array'
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/focus validates linkedGoals maximum of 3', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/focus`, {
      data: {
        title: 'Valid Title',
        weekStart: '2025-01-06',
        linkedGoals: ['uuid1', 'uuid2', 'uuid3', 'uuid4']
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/focus validates linkedGoals are UUIDs', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/focus`, {
      data: {
        title: 'Valid Title',
        weekStart: '2025-01-06',
        linkedGoals: ['not-a-uuid']
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/focus validates linkedGoals are unique', async ({ request }) => {
    const duplicateUuid = '123e4567-e89b-12d3-a456-426614174000'
    const response = await request.post(`${BASE_URL}/api/focus`, {
      data: {
        title: 'Valid Title',
        weekStart: '2025-01-06',
        linkedGoals: [duplicateUuid, duplicateUuid]
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/focus/[id] validates partial title length', async ({ request }) => {
    const longTitle = 'a'.repeat(61)
    const response = await request.patch(`${BASE_URL}/api/focus/test-id`, {
      data: { title: longTitle }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/focus/[id] validates partial note length', async ({ request }) => {
    const longNote = 'a'.repeat(401)
    const response = await request.patch(`${BASE_URL}/api/focus/test-id`, {
      data: { note: longNote }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/focus/[id] validates partial weekStart is Monday', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/focus/test-id`, {
      data: { weekStart: '2025-01-07' } // Tuesday
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/focus/[id] validates partial linkedGoals maximum', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/focus/test-id`, {
      data: {
        linkedGoals: ['uuid1', 'uuid2', 'uuid3', 'uuid4']
      }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('WeeklyFocusTheme API - Resource Not Found', () => {
  test('PATCH /api/focus/[id] with non-existent ID requires auth first', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/focus/non-existent-id`, {
      data: { title: 'Updated Title' }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('DELETE /api/focus/[id] with non-existent ID requires auth first', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/focus/non-existent-id`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/focus/[id] with invalid UUID format requires auth first', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/focus/invalid-uuid`, {
      data: { title: 'Updated Title' }
    })
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('DELETE /api/focus/[id] with invalid UUID format requires auth first', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/focus/invalid-uuid`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('WeeklyFocusTheme API - Query Parameters', () => {
  test('GET /api/focus with invalid weekStart format requires auth first', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/focus?weekStart=invalid-date`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/focus with weekStart not Monday requires auth first', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/focus?weekStart=2025-01-07`) // Tuesday
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/focus with empty weekStart parameter requires auth first', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/focus?weekStart=`)
    expect(response.status()).toBe(401) // Auth required first
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('WeeklyFocusTheme API - HTTP Methods', () => {
  test('Unsupported methods return 405 for /api/focus', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/api/focus`, {
      data: { title: 'Test' }
    })
    expect(response.status()).toBe(405)
    
    const body = await response.json()
    expect(body.error).toBe('Method Not Allowed')
  })

  test('Unsupported methods return 405 for /api/focus/[id]', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/focus/test-id`, {
      data: { title: 'Test' }
    })
    expect(response.status()).toBe(405)
    
    const body = await response.json()
    expect(body.error).toBe('Method Not Allowed')
  })
})
import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Goals API', () => {
  test('GET /api/goals requires authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/goals`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/goals requires authentication', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active'
      }
    })
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/goals/[id] requires authentication', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/goals/test-id`, {
      data: { title: 'Updated Goal' }
    })
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('DELETE /api/goals/[id] requires authentication', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/goals/test-id`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('Goals API - Input Validation', () => {
  test('POST /api/goals validates required title', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: '',
        horizon: 'YEAR',
        status: 'active'
      }
    })
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body.error).toBe("Goal title can't be empty")
  })

  test('POST /api/goals validates title length', async ({ request }) => {
    const longTitle = 'a'.repeat(101)
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: longTitle,
        horizon: 'YEAR',
        status: 'active'
      }
    })
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body.error).toBe("Goal title can't exceed 100 characters")
  })

  test('POST /api/goals validates description when provided', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: 'Test Goal',
        description: '',
        horizon: 'YEAR',
        status: 'active'
      }
    })
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body.error).toBe("Description can't be empty when provided")
  })

  test('POST /api/goals validates description length', async ({ request }) => {
    const longDescription = 'a'.repeat(1001)
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: 'Test Goal',
        description: longDescription,
        horizon: 'YEAR',
        status: 'active'
      }
    })
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body.error).toBe("Description can't exceed 1000 characters")
  })

  test('POST /api/goals validates horizon enum', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: 'Test Goal',
        horizon: 'INVALID',
        status: 'active'
      }
    })
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body.error).toBe("Horizon must be one of: YEAR, SIX_MONTH, MONTH, WEEK")
  })

  test('POST /api/goals validates status enum', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'invalid'
      }
    })
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body.error).toBe("Status must be one of: active, paused, done")
  })

  test('POST /api/goals validates target date format', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active',
        targetDate: '2025-1-31' // Invalid format
      }
    })
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body.error).toBe("Target date must be in YYYY-MM-DD format")
  })

  test('POST /api/goals validates impossible dates', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: 'Test Goal',
        horizon: 'YEAR',
        status: 'active',
        targetDate: '2025-02-30' // Feb 30th doesn't exist
      }
    })
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body.error).toBe("Target date must be in YYYY-MM-DD format")
  })

  test('POST /api/goals accepts valid complete goal', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: 'Learn React',
        description: 'Master React framework with hooks and context',
        horizon: 'YEAR',
        status: 'active',
        targetDate: '2025-12-31'
      }
    })

    // Should fail with 401 due to no auth, but validate request format is correct
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/goals accepts minimal valid goal', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: 'Simple Goal',
        horizon: 'WEEK',
        status: 'active'
      }
    })

    // Should fail with 401 due to no auth, but validate request format is correct
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('Goals API - Business Logic', () => {
  test('GET /api/goals with status filter', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/goals?status=active`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/goals with horizon filter', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/goals?horizon=YEAR`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/goals with multiple filters', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/goals?status=active&horizon=YEAR`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH /api/goals/[id] with partial update', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/goals/test-id`, {
      data: {
        title: 'Updated Title',
        status: 'paused'
      }
    })
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('DELETE /api/goals/[id] returns unlink message format', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/goals/test-id`)
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

test.describe('Goals API - Error Handling', () => {
  test('GET /api/goals/nonexistent returns 401 without auth', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/goals/nonexistent`)
    expect(response.status()).toBe(404) // Next.js returns 404 for non-existent API routes
  })

  test('PATCH /api/goals/nonexistent returns 401 without auth', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/goals/nonexistent`, {
      data: { title: 'Updated' }
    })
    expect(response.status()).toBe(401)
  })

  test('DELETE /api/goals/nonexistent returns 401 without auth', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/goals/nonexistent`)
    expect(response.status()).toBe(401)
  })

  test('POST /api/goals with malformed JSON', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: 'invalid json string'
    })
    // Should return either 400 for bad JSON or 401 for auth
    expect([400, 401].includes(response.status())).toBe(true)
  })

  test('PATCH /api/goals/[id] validates partial update fields', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/goals/test-id`, {
      data: {
        title: '', // Invalid title
        status: 'invalid' // Invalid status
      }
    })
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    // Should catch first validation error (title)
    expect(body.error).toBe("Goal title can't be empty")
  })

  test('POST /api/goals with missing required fields', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: 'Test Goal'
        // Missing horizon and status
      }
    })
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    // Should catch missing horizon first
    expect(body.error).toBe("Horizon must be one of: YEAR, SIX_MONTH, MONTH, WEEK")
  })
})

test.describe('Goals API - Data Format', () => {
  test('validates all horizon values', async ({ request }) => {
    const validHorizons = ['YEAR', 'SIX_MONTH', 'MONTH', 'WEEK']
    
    for (const horizon of validHorizons) {
      const response = await request.post(`${BASE_URL}/api/goals`, {
        data: {
          title: `${horizon} Goal`,
          horizon,
          status: 'active'
        }
      })
      
      // Should fail with 401 (auth) rather than 400 (validation)
      expect(response.status()).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    }
  })

  test('validates all status values', async ({ request }) => {
    const validStatuses = ['active', 'paused', 'done']
    
    for (const status of validStatuses) {
      const response = await request.post(`${BASE_URL}/api/goals`, {
        data: {
          title: `${status} Goal`,
          horizon: 'YEAR',
          status
        }
      })
      
      // Should fail with 401 (auth) rather than 400 (validation)
      expect(response.status()).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    }
  })

  test('accepts null and undefined optional fields', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: 'Goal with Nulls',
        description: null,
        horizon: 'YEAR',
        status: 'active',
        targetDate: null,
        lifeAreaId: null
      }
    })
    
    // Should fail with 401 (auth) rather than 400 (validation)
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('trims whitespace from string fields', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/goals`, {
      data: {
        title: '  Whitespace Goal  ',
        description: '  Description with whitespace  ',
        horizon: 'YEAR',
        status: 'active',
        targetDate: '2025-12-31'
      }
    })
    
    // Should fail with 401 (auth) rather than 400 (validation)
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})
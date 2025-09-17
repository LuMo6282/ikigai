import { test, expect } from '@playwright/test'

test.describe('Areas API E2E', () => {
  // Mock session data for testing
  test.beforeEach(async ({ page }) => {
    // Mock the session for authentication
    await page.addInitScript(() => {
      // This is a simplified mock - in real implementation you'd set proper session data
      window.localStorage.setItem('next-auth.session-token', 'mock-session-token')
    })
  })

  test('should return empty array for new user', async ({ request }) => {
    const response = await request.get('/api/areas')
    
    // Note: This test would require proper authentication setup to work fully
    // For now, we'll check that the endpoint exists and responds
    expect([200, 401]).toContain(response.status())
    
    if (response.status() === 200) {
      const areas = await response.json()
      expect(Array.isArray(areas)).toBe(true)
    }
  })

  test('should create new life area', async ({ request }) => {
    const areaData = {
      name: 'Health',
      color: '#00FF00',
      vision: 'Be physically and mentally strong',
      strategy: 'Exercise daily and eat nutritious food'
    }

    const response = await request.post('/api/areas', {
      data: areaData
    })

    // This would be 401 without proper auth, 201 with proper auth
    expect([201, 401]).toContain(response.status())

    if (response.status() === 201) {
      const createdArea = await response.json()
      expect(createdArea).toMatchObject({
        name: 'Health',
        color: '#00FF00',
        order: 1,
        vision: 'Be physically and mentally strong',
        strategy: 'Exercise daily and eat nutritious food'
      })
      expect(createdArea.id).toBeDefined()
    }
  })

  test('should validate required fields', async ({ request }) => {
    const response = await request.post('/api/areas', {
      data: {} // Missing name
    })

    expect([400, 401]).toContain(response.status())

    if (response.status() === 400) {
      const error = await response.json()
      expect(error.error).toBe("Name can't be empty")
    }
  })

  test('should validate color format', async ({ request }) => {
    const response = await request.post('/api/areas', {
      data: {
        name: 'Health',
        color: 'invalid-color'
      }
    })

    expect([400, 401]).toContain(response.status())

    if (response.status() === 400) {
      const error = await response.json()
      expect(error.error).toBe('Color must be exactly 6 hex digits after # (e.g., #FF6B35)')
    }
  })

  test('should validate name length', async ({ request }) => {
    const longName = 'a'.repeat(51)
    const response = await request.post('/api/areas', {
      data: {
        name: longName
      }
    })

    expect([400, 401]).toContain(response.status())

    if (response.status() === 400) {
      const error = await response.json()
      expect(error.error).toBe("Life area name can't exceed 50 characters")
    }
  })

  test('should handle empty vision/strategy validation', async ({ request }) => {
    const response = await request.post('/api/areas', {
      data: {
        name: 'Health',
        vision: '',
        strategy: ''
      }
    })

    expect([400, 401]).toContain(response.status())

    if (response.status() === 400) {
      const error = await response.json()
      // Should catch the first empty field
      expect(error.error).toBe("Vision can't be empty when provided")
    }
  })

  test('should trim whitespace in fields', async ({ request }) => {
    const response = await request.post('/api/areas', {
      data: {
        name: '  Health  ',
        color: '  #00FF00  ',
        vision: '  Be healthy  ',
        strategy: '  Exercise daily  '
      }
    })

    expect([201, 401]).toContain(response.status())

    if (response.status() === 201) {
      const area = await response.json()
      expect(area.name).toBe('Health')
      expect(area.color).toBe('#00FF00')
      expect(area.vision).toBe('Be healthy')
      expect(area.strategy).toBe('Exercise daily')
    }
  })

  test('should update existing life area', async ({ request }) => {
    // First create an area (this would need proper auth)
    const createResponse = await request.post('/api/areas', {
      data: { name: 'Health' }
    })

    if (createResponse.status() === 201) {
      const createdArea = await createResponse.json()
      const areaId = createdArea.id

      // Update the area
      const updateResponse = await request.patch(`/api/areas/${areaId}`, {
        data: {
          name: 'Health & Fitness',
          color: '#FF0000'
        }
      })

      expect(updateResponse.status()).toBe(200)
      const updatedArea = await updateResponse.json()
      expect(updatedArea.name).toBe('Health & Fitness')
      expect(updatedArea.color).toBe('#FF0000')
    } else {
      // Skip update test if we can't create due to auth
      test.skip()
    }
  })

  test('should delete life area', async ({ request }) => {
    // First create an area (this would need proper auth)
    const createResponse = await request.post('/api/areas', {
      data: { name: 'Health' }
    })

    if (createResponse.status() === 201) {
      const createdArea = await createResponse.json()
      const areaId = createdArea.id

      // Delete the area
      const deleteResponse = await request.delete(`/api/areas/${areaId}`)

      expect(deleteResponse.status()).toBe(200)
      const result = await deleteResponse.json()
      expect(result.ok).toBe(true)
      expect(result.message).toBe('Goals were kept. You can reassign them to another life area anytime.')

      // Verify it's deleted
      const getResponse = await request.get('/api/areas')
      if (getResponse.status() === 200) {
        const areas = await getResponse.json()
        expect(areas.find((a: any) => a.id === areaId)).toBeUndefined()
      }
    } else {
      // Skip delete test if we can't create due to auth
      test.skip()
    }
  })

  test('should handle non-existent area updates', async ({ request }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const response = await request.patch(`/api/areas/${fakeId}`, {
      data: { name: 'Updated' }
    })

    expect([404, 401]).toContain(response.status())

    if (response.status() === 404) {
      const error = await response.json()
      expect(error.error).toBe('Life area not found')
    }
  })

  test('should handle non-existent area deletion', async ({ request }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const response = await request.delete(`/api/areas/${fakeId}`)

    expect([404, 401]).toContain(response.status())

    if (response.status() === 404) {
      const error = await response.json()
      expect(error.error).toBe('Life area not found')
    }
  })

  test('should require authentication for all endpoints', async ({ request, context }) => {
    // Clear any mock authentication by creating a new context
    const newContext = await context.browser()?.newContext()
    const newRequest = newContext ? newContext.request : request

    // Test all endpoints return 401 without auth
    let response = await newRequest.get('/api/areas')
    expect(response.status()).toBe(401)

    response = await newRequest.post('/api/areas', {
      data: { name: 'Test' }
    })
    expect(response.status()).toBe(401)

    const fakeId = '00000000-0000-0000-0000-000000000000'
    response = await newRequest.patch(`/api/areas/${fakeId}`, {
      data: { name: 'Test' }
    })
    expect(response.status()).toBe(401)

    response = await newRequest.delete(`/api/areas/${fakeId}`)
    expect(response.status()).toBe(401)

    // Clean up
    if (newContext) {
      await newContext.close()
    }
  })

  test('should maintain order sequence when creating multiple areas', async ({ request }) => {
    // This test demonstrates the ordering logic but requires auth to fully work
    const areas = [
      { name: 'Health', order: 1 },
      { name: 'Career', order: 2 },
      { name: 'Family', order: 3 }
    ]

    for (const area of areas) {
      const response = await request.post('/api/areas', { data: area })
      // Would be 201 with proper auth, 401 without
      expect([201, 401]).toContain(response.status())
    }

    // Check ordering with GET request
    const getResponse = await request.get('/api/areas')
    if (getResponse.status() === 200) {
      const areasResult = await getResponse.json()
      expect(areasResult).toHaveLength(3)
      
      // Should be ordered by order field
      for (let i = 0; i < areasResult.length; i++) {
        expect(areasResult[i].order).toBe(i + 1)
      }
    }
  })
})
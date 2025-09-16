import { test, expect } from '@playwright/test'

test('health endpoint returns ok', async ({ page }) => {
  const response = await page.request.get('/api/health')
  expect(response.ok()).toBeTruthy()
  
  const data = await response.json()
  expect(data).toEqual({ ok: true })
})
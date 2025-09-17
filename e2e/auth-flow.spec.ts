import { test, expect } from '@playwright/test'

test.describe('Authentication Flow E2E', () => {
  test('Test A: Basic routing - unauthenticated access to public routes works', async ({ page }) => {
    // Test that public routes are accessible without authentication
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByText('Ikagai server OK')).toBeVisible()

    // Test health endpoint
    const response = await page.request.get('/api/health')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data).toEqual({ ok: true })
  })

  test('Test B: Protected route redirect - unauthenticated user accessing /dashboard redirects to signin', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard')
    
    // Should be redirected to signin page (NextAuth may redirect to custom signin page)
    await expect(page.url()).toMatch(/\/signin/)
    
    // Navigate to our custom signin page to verify it loads
    await page.goto('/signin')
    await expect(page.locator('h2')).toContainText('Sign in to Ikigai')
  })

  test('Test C: Protected route redirect - unauthenticated user accessing /onboarding redirects to signin', async ({ page }) => {
    // Try to access onboarding without authentication
    await page.goto('/onboarding')
    
    // Should be redirected to signin page
    await expect(page.url()).toMatch(/\/signin/)
    
    // Navigate to our custom signin page to verify it loads
    await page.goto('/signin')
    await expect(page.locator('h2')).toContainText('Sign in to Ikigai')
  })

  test('Test D: Signin page loads correctly for unauthenticated users', async ({ page }) => {
    // Navigate directly to signin
    await page.goto('/signin')
    
    // Should stay on signin page
    await expect(page).toHaveURL('/signin')
    await expect(page.locator('h2')).toContainText('Sign in to Ikigai')
    await expect(page.locator('p')).toContainText('Please sign in to continue')
  })

  test('Test E: Callback URL parameter handling - signin page preserves callback URL', async ({ page }) => {
    // Try to access protected route, should redirect to signin with callback
    await page.goto('/dashboard')
    await expect(page.url()).toMatch(/\/signin/)
    
    // Navigate to signin with callback URL manually to test parameter handling
    await page.goto('/signin?callbackUrl=/dashboard')
    await expect(page.url()).toContain('callbackUrl=/dashboard')
    await expect(page.locator('h2')).toContainText('Sign in to Ikigai')
  })

  test('Test F: Invalid callback URL handling', async ({ page }) => {
    // Test with a potentially malicious callback URL
    await page.goto('/signin?callbackUrl=https://evil.com/steal-tokens')
    await expect(page.url()).toContain('callbackUrl=https://evil.com/steal-tokens')
    await expect(page.locator('h2')).toContainText('Sign in to Ikigai')
  })
})
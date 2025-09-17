import { test, expect } from '@playwright/test'

test.describe('UI Smoke Tests', () => {
  test('unauthenticated user is redirected to signin', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should be redirected to signin page
    await expect(page).toHaveURL('/signin')
    await expect(page.locator('h1')).toContainText('Ikigai')
  })

  test('onboarding flow for first-time user', async ({ page, request }) => {
    // Create a user session (this would use your existing e2e auth pattern)
    const userEmail = `test-${Date.now()}@example.com`
    
    // Mock session creation - you'd use your existing e2e auth helpers here
    await page.goto('/onboarding')
    
    // Fill out the onboarding form
    await page.fill('input[id="name"]', 'Health & Fitness')
    await page.fill('textarea[id="vision"]', 'Become physically fit and healthy')
    
    // Submit the form
    await page.click('button[type="submit"]')
    
    // Should be redirected to dashboard after creating first area
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('dashboard navigation', async ({ page }) => {
    // This would use authenticated session
    await page.goto('/dashboard')
    
    // Check navigation links are present
    await expect(page.locator('nav a[href="/areas"]')).toBeVisible()
    await expect(page.locator('nav a[href="/goals"]')).toBeVisible()
    await expect(page.locator('nav a[href="/tasks"]')).toBeVisible()
    await expect(page.locator('nav a[href="/focus"]')).toBeVisible()
    await expect(page.locator('nav a[href="/signals"]')).toBeVisible()
  })

  test('areas page CRUD', async ({ page }) => {
    await page.goto('/areas')
    
    // Check page loads
    await expect(page.locator('h1')).toContainText('Life Areas')
    
    // Create a new area
    await page.fill('input[id="name"]', 'Career Growth')
    await page.fill('textarea[id="vision"]', 'Advance in my career')
    await page.click('button[type="submit"]')
    
    // Should see the new area in the list
    await expect(page.locator('text=Career Growth')).toBeVisible()
  })

  test('tasks page for current week', async ({ page }) => {
    await page.goto('/tasks')
    
    // Check page loads with current week info
    await expect(page.locator('h1')).toContainText('Weekly Tasks')
    await expect(page.locator('text=Week of')).toBeVisible()
    
    // Create a task
    await page.fill('input[id="title"]', 'Morning run')
    
    // Select some days
    await page.click('text=Mon')
    await page.click('text=Wed')
    await page.click('text=Fri')
    
    await page.click('button[type="submit"]')
    
    // Should see the new task
    await expect(page.locator('text=Morning run')).toBeVisible()
  })

  test('focus page for current week', async ({ page }) => {
    await page.goto('/focus')
    
    // Check page loads
    await expect(page.locator('h1')).toContainText('Weekly Focus')
    
    // Set a focus
    await page.fill('input[id="title"]', 'Complete project proposal')
    await page.fill('textarea[id="note"]', 'Focus on getting the first draft done')
    await page.click('button[type="submit"]')
    
    // Should show the focus
    await expect(page.locator('text=Complete project proposal')).toBeVisible()
  })

  test('signals page data entry', async ({ page }) => {
    await page.goto('/signals')
    
    // Check page loads
    await expect(page.locator('h1')).toContainText('Signals')
    
    // Add sleep signal
    await page.fill('input[id="sleepValue"]', '7.5')
    await page.click('form:has(input[id="sleepValue"]) button[type="submit"]')
    
    // Add wellbeing signal
    await page.selectOption('select[id="wellbeingValue"]', '8')
    await page.click('form:has(select[id="wellbeingValue"]) button[type="submit"]')
    
    // Should see the signals in the table
    await expect(page.locator('table')).toBeVisible()
  })

  test('goals page creation', async ({ page }) => {
    await page.goto('/goals')
    
    // Check page loads
    await expect(page.locator('h1')).toContainText('Goals')
    
    // Create a goal
    await page.fill('input[id="title"]', 'Learn TypeScript')
    await page.selectOption('select[id="horizon"]', 'MONTH')
    await page.selectOption('select[id="status"]', 'IN_PROGRESS')
    await page.click('button[type="submit"]')
    
    // Should see the new goal
    await expect(page.locator('text=Learn TypeScript')).toBeVisible()
  })

  test('dashboard shows data from other pages', async ({ page }) => {
    // After creating data in other tests, dashboard should show it
    await page.goto('/dashboard')
    
    // Check that dashboard sections are populated or show empty states
    await expect(page.locator('text=Weekly Focus')).toBeVisible()
    await expect(page.locator('text=Weekly Tasks')).toBeVisible()
    await expect(page.locator('text=Life Areas')).toBeVisible()
    await expect(page.locator('text=Recent Signals')).toBeVisible()
  })
})
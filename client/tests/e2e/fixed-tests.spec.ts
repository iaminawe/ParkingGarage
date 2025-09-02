import { test, expect } from '@playwright/test'

const ADMIN_USER = {
  email: 'admin@parkinggarage.com',
  password: 'admin123'
}

test.describe('Fixed E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should successfully login and navigate the application', async ({ page }) => {
    // Verify redirect to login
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()
    
    // Login with admin credentials (we know these work)
    await page.fill('input[type="email"]', ADMIN_USER.email)
    await page.fill('input[type="password"]', ADMIN_USER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Should be redirected to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Take screenshot for validation
    await page.screenshot({ path: 'test-results/fixed-dashboard.png', fullPage: true })
    
    // Verify we're logged in by checking for dashboard content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('Parking')
  })

  test('should handle authentication flow correctly', async ({ page }) => {
    // Test the complete auth flow without API mocking
    await page.goto('/login')
    
    // Fill valid credentials
    await page.fill('input[type="email"]', ADMIN_USER.email)
    await page.fill('input[type="password"]', ADMIN_USER.password)
    
    // Submit and wait for redirect
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Wait for navigation
    await page.waitForURL('/dashboard', { timeout: 10000 })
    
    // Verify we're on dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Check for some dashboard elements
    const pageContent = await page.content()
    expect(pageContent.length).toBeGreaterThan(1000) // Should have substantial content
  })

  test('should display signup page correctly', async ({ page }) => {
    await page.goto('/signup')
    
    // Verify signup form elements
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
    
    // Check all form inputs are present
    const nameInput = page.locator('input[type="text"]').first()
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]').first()
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1)
    
    await expect(nameInput).toBeVisible()
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(confirmPasswordInput).toBeVisible()
    
    // Check create account button
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
  })

  test('should test form validation without backend calls', async ({ page }) => {
    await page.goto('/login')
    
    // Try to submit empty form
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Wait a moment for any validation to appear
    await page.waitForTimeout(1000)
    
    // Check if still on login page (form didn't submit)
    await expect(page).toHaveURL('/login')
    
    // Fill only email and try again
    await page.fill('input[type="email"]', 'test@example.com')
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL('/login')
  })

  test('should test navigation between auth pages', async ({ page }) => {
    // Start at login
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()
    
    // Navigate to signup
    await page.getByRole('link', { name: 'Sign up' }).click()
    await expect(page).toHaveURL('/signup')
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
    
    // Navigate back to login (if link exists)
    const loginLink = page.locator('a[href="/login"], a:has-text("Sign in"), a:has-text("Login")')
    if (await loginLink.count() > 0) {
      await loginLink.first().click()
      await expect(page).toHaveURL('/login')
    }
  })

  test('should test responsive design functionality', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    
    // Elements should still be visible
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/mobile-responsive.png' })
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('should test error handling with mock responses', async ({ page }) => {
    // Mock login API to return error
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        })
      })
    })

    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Wait for potential error handling
    await page.waitForTimeout(2000)
    
    // Should still be on login page
    await expect(page).toHaveURL('/login')
  })

  test('should test successful mock authentication', async ({ page }) => {
    // Mock successful login
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'mock@example.com',
            role: 'admin'
          },
          token: 'mock-jwt-token'
        })
      })
    })

    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'mock@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Wait for redirect
    await page.waitForTimeout(3000)
    
    // Should be redirected away from login
    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/login')
    console.log('Redirected to:', currentUrl)
  })

  test('should measure basic performance', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/login')
    
    const loginLoadTime = Date.now() - startTime
    console.log('Login page load time:', loginLoadTime, 'ms')
    
    // Fill and submit form
    const formStartTime = Date.now()
    
    await page.fill('input[type="email"]', ADMIN_USER.email)
    await page.fill('input[type="password"]', ADMIN_USER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Wait for dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 })
    
    const authTime = Date.now() - formStartTime
    console.log('Authentication flow time:', authTime, 'ms')
    
    // Basic performance assertions
    expect(loginLoadTime).toBeLessThan(5000) // Login should load within 5 seconds
    expect(authTime).toBeLessThan(10000) // Auth flow should complete within 10 seconds
  })

  test('should verify application state after login', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', ADMIN_USER.email)
    await page.fill('input[type="password"]', ADMIN_USER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    await expect(page).toHaveURL('/dashboard')
    
    // Check for navigation elements that should be present after login
    const bodyContent = await page.textContent('body')
    
    // Should have substantial content
    expect(bodyContent?.length || 0).toBeGreaterThan(100)
    
    // Take a final screenshot
    await page.screenshot({ path: 'test-results/final-dashboard-state.png', fullPage: true })
    
    // Log what we can see
    const allLinks = await page.locator('a').count()
    const allButtons = await page.locator('button').count()
    const allInputs = await page.locator('input').count()
    
    console.log('After login - Links:', allLinks, 'Buttons:', allButtons, 'Inputs:', allInputs)
    
    // Basic assertions about the page state
    expect(allLinks).toBeGreaterThan(0)
    expect(allButtons).toBeGreaterThan(0)
  })
})
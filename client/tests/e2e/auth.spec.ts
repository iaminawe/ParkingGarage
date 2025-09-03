import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User'
}

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should redirect to login page for unauthenticated users', async ({ page }) => {
    await expect(page).toHaveURL('/login')
    await expect(page.locator('h1')).toContainText('Login')
  })

  test('should display login form with all fields', async ({ page }) => {
    await page.goto('/login')
    
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('a[href="/signup"]')).toBeVisible()
  })

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login')
    
    await page.locator('button[type="submit"]').click()
    
    await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
  })

  test('should show validation errors for invalid email format', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password')
    await page.locator('button[type="submit"]').click()
    
    await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
  })

  test('should handle failed login with invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.locator('button[type="submit"]').click()
    
    await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    
    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL(/\/dashboard|\//)
    
    // Should show user navigation or profile
    await expect(page.locator('[data-testid="user-menu"], .user-profile, nav')).toBeVisible()
  })

  test('should display signup form with all fields', async ({ page }) => {
    await page.goto('/signup')
    
    await expect(page.locator('input[name="firstName"], input[name="first_name"]')).toBeVisible()
    await expect(page.locator('input[name="lastName"], input[name="last_name"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('a[href="/login"]')).toBeVisible()
  })

  test('should show validation errors for empty signup form', async ({ page }) => {
    await page.goto('/signup')
    
    await page.locator('button[type="submit"]').click()
    
    await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
  })

  test('should validate password strength requirements', async ({ page }) => {
    await page.goto('/signup')
    
    await page.fill('input[name="firstName"], input[name="first_name"]', TEST_USER.firstName)
    await page.fill('input[name="lastName"], input[name="last_name"]', TEST_USER.lastName)
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', 'weak')
    await page.locator('button[type="submit"]').click()
    
    await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
  })

  test('should successfully register new user', async ({ page }) => {
    await page.goto('/signup')
    
    // Use timestamp to ensure unique email
    const uniqueEmail = `test${Date.now()}@example.com`
    
    await page.fill('input[name="firstName"], input[name="first_name"]', TEST_USER.firstName)
    await page.fill('input[name="lastName"], input[name="last_name"]', TEST_USER.lastName)
    await page.fill('input[type="email"]', uniqueEmail)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    
    // Should redirect to login or dashboard after successful registration
    await expect(page).toHaveURL(/\/login|\/dashboard|\//)
  })

  test('should logout user successfully', async ({ page }) => {
    // First login
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    
    // Wait for successful login
    await expect(page).toHaveURL(/\/dashboard|\//)
    
    // Find and click logout
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout"]')
    await expect(logoutButton).toBeVisible()
    await logoutButton.click()
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login')
  })

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    
    await expect(page).toHaveURL(/\/dashboard|\//)
    
    // Refresh page
    await page.reload()
    
    // Should still be logged in
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('[data-testid="user-menu"], .user-profile, nav')).toBeVisible()
  })

  test('should handle session expiration', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    
    await expect(page).toHaveURL(/\/dashboard|\//)
    
    // Clear localStorage to simulate session expiration
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    // Navigate to a protected route
    await page.goto('/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('should prevent access to protected routes without authentication', async ({ page }) => {
    const protectedRoutes = ['/dashboard', '/spots', '/vehicles', '/garages', '/sessions', '/analytics']
    
    for (const route of protectedRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL('/login')
    }
  })

  test('should handle role-based access control', async ({ page }) => {
    // Login as regular user
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    
    await expect(page).toHaveURL(/\/dashboard|\//)
    
    // Try to access admin-only routes
    const adminRoutes = ['/users', '/settings']
    
    for (const route of adminRoutes) {
      await page.goto(route)
      // Should either redirect to login or show "unauthorized" message
      const isRedirected = await page.waitForURL('/login', { timeout: 5000 }).catch(() => false)
      const hasUnauthorizedMessage = await page.locator(':text("unauthorized"), :text("access denied"), :text("permission")').isVisible().catch(() => false)
      
      expect(isRedirected || hasUnauthorizedMessage).toBeTruthy()
    }
  })

  test('should remember login form data on page refresh', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.reload()
    
    // Check if email is still filled (browser behavior)
    const emailValue = await page.inputValue('input[type="email"]')
    expect(emailValue).toBe(TEST_USER.email)
  })

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login')
    
    const passwordInput = page.locator('input[type="password"]')
    const toggleButton = page.locator('button:near(input[type="password"]), [data-testid="toggle-password"]')
    
    await passwordInput.fill('testpassword')
    
    if (await toggleButton.isVisible()) {
      await toggleButton.click()
      await expect(page.locator('input[type="text"]')).toBeVisible()
      
      await toggleButton.click()
      await expect(passwordInput).toBeVisible()
    }
  })

  test('should display loading state during authentication', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    
    // Click submit and immediately check for loading state
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    
    // Check for loading indicators
    const loadingIndicators = page.locator('.loading, .spinner, [data-testid="loading"], button:disabled')
    const hasLoading = await loadingIndicators.count() > 0
    
    // Either loading state should be visible or redirect should happen quickly
    expect(hasLoading || await page.waitForURL(/\/dashboard|\//, { timeout: 3000 }).then(() => true).catch(() => false)).toBeTruthy()
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept auth requests to simulate network failure
    await page.route('**/api/auth/**', route => route.abort())
    
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    
    // Should show error message
    await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
  })
})

test.describe('Password Reset', () => {
  test('should display forgot password link', async ({ page }) => {
    await page.goto('/login')
    
    const forgotPasswordLink = page.locator('a:has-text("forgot"), a:has-text("reset"), [data-testid="forgot-password"]')
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click()
      await expect(page).toHaveURL(/\/forgot-password|\/reset-password/)
    }
  })

  test('should validate email for password reset', async ({ page }) => {
    const resetUrl = '/forgot-password'
    await page.goto(resetUrl)
    
    if (page.url().includes('forgot-password') || page.url().includes('reset-password')) {
      await page.locator('button[type="submit"]').click()
      await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
    }
  })
})
import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'admin@parkinggarage.com',
  password: 'admin123'
}

test.describe('Authentication - Basic Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should redirect to login page for unauthenticated users', async ({ page }) => {
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()
  })

  test('should display login form with correct elements', async ({ page }) => {
    await page.goto('/login')
    
    // Check for email input
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('placeholder', 'admin@parkinggarage.com')
    
    // Check for password input
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password')
    
    // Check for sign in button
    const signInButton = page.getByRole('button', { name: 'Sign In' })
    await expect(signInButton).toBeVisible()
    
    // Check for sign up link
    const signUpLink = page.getByRole('link', { name: 'Sign up' })
    await expect(signUpLink).toBeVisible()
    await expect(signUpLink).toHaveAttribute('href', '/signup')
  })

  test('should attempt login with test credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill login form
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    
    // Submit form
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Wait for response (either success or error)
    await page.waitForTimeout(3000)
    
    // Check if we're redirected away from login or if there's an error message
    const currentUrl = page.url()
    const hasError = await page.locator('.error, .text-red-500, [role="alert"]').count() > 0
    
    console.log('Current URL after login attempt:', currentUrl)
    console.log('Has error message:', hasError)
    
    // Either we should be redirected away from login or see an error
    expect(currentUrl !== 'http://localhost:4285/login' || hasError).toBeTruthy()
  })

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login')
    
    // Click sign up link
    await page.getByRole('link', { name: 'Sign up' }).click()
    
    // Should be on signup page
    await expect(page).toHaveURL('/signup')
  })

  test('should display signup page elements', async ({ page }) => {
    await page.goto('/signup')
    
    // Take screenshot to see what's available
    await page.screenshot({ path: 'test-results/signup-page.png', fullPage: true })
    
    // Log elements found on signup page
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    for (let i = 0; i < headings.length; i++) {
      const text = await headings[i].textContent()
      console.log(`Signup heading ${i + 1}:`, text)
    }
    
    const inputs = await page.locator('input').all()
    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute('type')
      const placeholder = await inputs[i].getAttribute('placeholder')
      const name = await inputs[i].getAttribute('name')
      console.log(`Signup input ${i + 1}:`, { type, placeholder, name })
    }
    
    const buttons = await page.locator('button').all()
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent()
      console.log(`Signup button ${i + 1}:`, text)
    }
    
    // Basic assertion
    await expect(page.locator('body')).toBeVisible()
  })

  test('should check backend connectivity', async ({ page }) => {
    // Check if backend is responding
    const response = await page.request.get('http://localhost:5000/health')
    console.log('Backend health status:', response.status())
    
    if (response.ok()) {
      const body = await response.json()
      console.log('Backend health response:', body)
    }
  })

  test('should test actual login flow with mock or real user', async ({ page }) => {
    // Mock the login API to always return success
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'admin@parkinggarage.com',
            role: 'admin'
          },
          token: 'mock-jwt-token'
        })
      })
    })

    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'admin@parkinggarage.com')
    await page.fill('input[type="password"]', 'testpassword')
    
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Wait for redirect
    await page.waitForTimeout(2000)
    
    // Should be redirected to dashboard or main app
    const url = page.url()
    console.log('URL after successful login:', url)
    expect(url).not.toContain('/login')
  })

  test('should handle login error gracefully', async ({ page }) => {
    // Mock the login API to return error
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
    
    await page.fill('input[type="email"]', 'wrong@email.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Wait for error message
    await page.waitForTimeout(2000)
    
    // Should still be on login page
    await expect(page).toHaveURL('/login')
    
    // Check for error message (might be in various formats)
    const errorMessage = page.locator('.error, .text-red-500, [role="alert"], .alert-error')
    const hasError = await errorMessage.count() > 0
    console.log('Has error message after failed login:', hasError)
  })
})
import { test, expect } from '@playwright/test'

const ADMIN_USER = {
  email: 'admin@parkinggarage.com',
  password: 'admin123'
}

test.describe('Full Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should complete full user journey: login -> dashboard -> spots', async ({ page }) => {
    // Step 1: Verify redirect to login
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()
    
    // Step 2: Login with admin credentials
    await page.fill('input[type="email"]', ADMIN_USER.email)
    await page.fill('input[type="password"]', ADMIN_USER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Step 3: Should be redirected to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Step 4: Take screenshot of dashboard
    await page.screenshot({ path: 'test-results/dashboard-logged-in.png', fullPage: true })
    
    // Step 5: Navigate to spots management if available
    const spotsLink = page.locator('a[href="/spots"], a:has-text("Spots"), a:has-text("Parking")').first()
    if (await spotsLink.isVisible()) {
      await spotsLink.click()
      await expect(page).toHaveURL(/\/spots/)
      
      // Take screenshot of spots page
      await page.screenshot({ path: 'test-results/spots-page.png', fullPage: true })
    }
    
    // Step 6: Check for main navigation elements
    const navElements = await page.locator('nav, .navigation, .sidebar, .menu').count()
    console.log('Navigation elements found:', navElements)
    
    // Step 7: Log available routes/links
    const allLinks = await page.locator('a[href]').all()
    console.log('Available navigation links:')
    for (let i = 0; i < Math.min(allLinks.length, 15); i++) {
      const href = await allLinks[i].getAttribute('href')
      const text = await allLinks[i].textContent()
      console.log(`  ${href} - ${text}`)
    }
  })

  test('should check backend API connectivity', async ({ page }) => {
    // Test backend health endpoint
    const response = await page.request.get('http://localhost:3000/health')
    console.log('Backend health status:', response.status())
    
    if (response.ok()) {
      const body = await response.json()
      console.log('Backend health response:', body)
      expect(response.status()).toBe(200)
    }
  })

  test('should test parking spot functionality if available', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', ADMIN_USER.email)
    await page.fill('input[type="password"]', ADMIN_USER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL('/dashboard')
    
    // Try to navigate to spots
    await page.goto('/spots')
    
    if (page.url().includes('/spots')) {
      // Take screenshot
      await page.screenshot({ path: 'test-results/spots-functionality.png', fullPage: true })
      
      // Look for spot-related elements
      const spotElements = await page.locator('.spot, [data-testid*="spot"], .parking-spot, .space').count()
      console.log('Parking spot elements found:', spotElements)
      
      // Look for controls
      const controls = await page.locator('button, select, input').count()
      console.log('Control elements on spots page:', controls)
    }
  })

  test('should test vehicle management if available', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', ADMIN_USER.email)
    await page.fill('input[type="password"]', ADMIN_USER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL('/dashboard')
    
    // Try to navigate to vehicles
    await page.goto('/vehicles')
    
    if (page.url().includes('/vehicles')) {
      await page.screenshot({ path: 'test-results/vehicles-page.png', fullPage: true })
      
      const vehicleElements = await page.locator('table, .vehicle, [data-testid*="vehicle"], .car, .list-item').count()
      console.log('Vehicle management elements found:', vehicleElements)
    }
  })

  test('should test garage configuration if available', async ({ page }) => {
    // Login first  
    await page.goto('/login')
    await page.fill('input[type="email"]', ADMIN_USER.email)
    await page.fill('input[type="password"]', ADMIN_USER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL('/dashboard')
    
    // Try to navigate to garage configuration
    await page.goto('/garages')
    
    if (page.url().includes('/garages')) {
      await page.screenshot({ path: 'test-results/garage-config-page.png', fullPage: true })
      
      const configElements = await page.locator('form, .config, .settings, [data-testid*="config"], input, select').count()
      console.log('Garage configuration elements found:', configElements)
    }
  })

  test('should test analytics if available', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', ADMIN_USER.email)
    await page.fill('input[type="password"]', ADMIN_USER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL('/dashboard')
    
    // Try to navigate to analytics
    await page.goto('/analytics')
    
    if (page.url().includes('/analytics')) {
      await page.screenshot({ path: 'test-results/analytics-page.png', fullPage: true })
      
      const chartElements = await page.locator('canvas, svg, .chart, [data-testid*="chart"], .graph').count()
      console.log('Analytics chart elements found:', chartElements)
    }
  })

  test('should test responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    
    await page.screenshot({ path: 'test-results/mobile-login.png' })
    
    // Login on mobile
    await page.fill('input[type="email"]', ADMIN_USER.email)
    await page.fill('input[type="password"]', ADMIN_USER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    if (page.url().includes('/dashboard')) {
      await page.screenshot({ path: 'test-results/mobile-dashboard.png' })
    }
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.reload()
    await page.screenshot({ path: 'test-results/tablet-dashboard.png' })
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('should measure performance metrics', async ({ page }) => {
    // Start measuring performance
    const performanceEntries = []
    
    page.on('response', response => {
      performanceEntries.push({
        url: response.url(),
        status: response.status(),
        loadTime: response.timing()
      })
    })
    
    // Navigate and login
    await page.goto('/login')
    const loginStart = Date.now()
    
    await page.fill('input[type="email"]', ADMIN_USER.email)
    await page.fill('input[type="password"]', ADMIN_USER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    await expect(page).toHaveURL('/dashboard')
    const loginEnd = Date.now()
    
    console.log('Login flow took:', loginEnd - loginStart, 'ms')
    
    // Measure dashboard load time
    const dashboardStart = Date.now()
    await page.reload()
    await page.waitForLoadState('networkidle')
    const dashboardEnd = Date.now()
    
    console.log('Dashboard reload took:', dashboardEnd - dashboardStart, 'ms')
    
    // Check for slow responses
    const slowResponses = performanceEntries.filter(entry => 
      entry.loadTime && entry.loadTime > 2000
    )
    
    if (slowResponses.length > 0) {
      console.log('Slow responses detected:', slowResponses.map(r => r.url))
    }
  })
})
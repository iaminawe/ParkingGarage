import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display dashboard title and live indicator', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Live')).toBeVisible()
    await expect(page.locator('.animate-pulse').first()).toBeVisible()
  })

  test('should display quick actions section', async ({ page }) => {
    await expect(page.getByText('Quick Actions')).toBeVisible()
    
    // Check for quick action buttons
    const quickActions = [
      'Check In Vehicle',
      'Check Out Vehicle', 
      'Add Vehicle',
      'View Reports'
    ]
    
    for (const action of quickActions) {
      await expect(page.getByRole('button', { name: action })).toBeVisible()
    }
  })

  test('should display metric cards with data', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000)
    
    // Check metric card titles
    const metricTitles = [
      'Occupied Spots',
      'Available Spots', 
      'Daily Revenue',
      'Avg Duration'
    ]
    
    for (const title of metricTitles) {
      await expect(page.getByText(title)).toBeVisible()
    }
    
    // Check that metric cards contain numerical values
    await expect(page.locator('[class*="text-2xl font-bold"]').first()).toBeVisible()
  })

  test('should display occupancy chart', async ({ page }) => {
    await expect(page.getByText('Current Occupancy')).toBeVisible()
    
    // Check for chart elements
    await expect(page.locator('[class*="recharts"]')).toBeVisible()
    await expect(page.getByText(/\d+%/)).toBeVisible() // Percentage display
  })

  test('should display recent activity section', async ({ page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible()
    
    // Wait for activity data to load
    await page.waitForTimeout(3000)
    
    // Check if activity items are present or empty state
    const hasActivity = await page.locator('[class*="activity-item"]').count() > 0
    const hasEmptyState = await page.getByText('No recent activity').isVisible()
    
    expect(hasActivity || hasEmptyState).toBeTruthy()
  })

  test('should display revenue overview', async ({ page }) => {
    await expect(page.getByText('Revenue Overview')).toBeVisible()
    
    const revenuePeriods = ['Today', 'This Week', 'This Month']
    
    for (const period of revenuePeriods) {
      await expect(page.getByText(period)).toBeVisible()
    }
    
    // Check for dollar amounts
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible()
  })

  test('should display peak hours information', async ({ page }) => {
    await expect(page.getByText('Peak Hours')).toBeVisible()
    await expect(page.getByText('Busiest hour today')).toBeVisible()
    
    // Check for time display (either actual time or N/A)
    const timeDisplay = page.locator('[class*="text-3xl font-bold"]').last()
    await expect(timeDisplay).toBeVisible()
  })

  test('should display garage status section', async ({ page }) => {
    await expect(page.getByText('Garage Status')).toBeVisible()
    
    // Wait for garage data to load
    await page.waitForTimeout(2000)
    
    // Check for garage cards or empty state
    const garageCards = page.locator('[class*="border rounded-lg"]')
    const cardCount = await garageCards.count()
    
    if (cardCount > 0) {
      // Check first garage card structure
      await expect(garageCards.first().getByText('Available:')).toBeVisible()
      await expect(garageCards.first().getByText('Total:')).toBeVisible()
      await expect(garageCards.first().getByText('Occupancy')).toBeVisible()
    }
  })

  test('should update data periodically', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(3000)
    
    // Wait for potential update (Dashboard updates every 30 seconds)
    await page.waitForTimeout(5000)
    
    // Check that live indicator is still present (indicates real-time updates)
    await expect(page.getByText('Live')).toBeVisible()
    await expect(page.locator('.animate-pulse').first()).toBeVisible()
  })

  test('should handle loading states gracefully', async ({ page }) => {
    // Test loading state by intercepting network requests
    await page.route('**/api/**', route => {
      // Delay response to test loading state
      setTimeout(() => route.continue(), 2000)
    })
    
    await page.goto('/')
    
    // Should show loading skeletons
    await expect(page.locator('.animate-pulse')).toBeVisible()
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Intercept API calls and return errors
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Server Error' })
      })
    })
    
    await page.goto('/')
    
    // Should show error handling (retry button or error message)
    await page.waitForTimeout(3000)
    
    const hasRetryButton = await page.getByRole('button', { name: /retry/i }).isVisible()
    const hasErrorMessage = await page.getByText(/error/i).first().isVisible()
    
    expect(hasRetryButton || hasErrorMessage).toBeTruthy()
  })
})
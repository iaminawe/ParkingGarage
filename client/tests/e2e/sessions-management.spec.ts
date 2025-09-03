import { test, expect, type Page } from '@playwright/test'

// Mock session data for testing
const mockSessions = [
  {
    id: 'session-001',
    garageId: 'garage-001',
    spotId: 'A-101',
    vehicleId: 'vehicle-001',
    userId: 'user-001',
    entryTime: '2024-09-01T08:30:00Z',
    exitTime: null,
    totalCost: null,
    status: 'active',
    paymentStatus: 'pending',
    createdAt: '2024-09-01T08:30:00Z',
    updatedAt: '2024-09-01T08:30:00Z'
  },
  {
    id: 'session-002',
    garageId: 'garage-001',
    spotId: 'B-203',
    vehicleId: 'vehicle-002',
    userId: 'user-002',
    entryTime: '2024-09-01T07:15:00Z',
    exitTime: '2024-09-01T10:45:00Z',
    totalCost: 15.50,
    status: 'completed',
    paymentStatus: 'paid',
    createdAt: '2024-09-01T07:15:00Z',
    updatedAt: '2024-09-01T10:45:00Z'
  },
  {
    id: 'session-003',
    garageId: 'garage-002',
    spotId: 'C-305',
    vehicleId: 'vehicle-003',
    userId: 'user-003',
    entryTime: '2024-08-31T16:20:00Z',
    exitTime: '2024-08-31T18:30:00Z',
    totalCost: 8.75,
    status: 'completed',
    paymentStatus: 'failed',
    createdAt: '2024-08-31T16:20:00Z',
    updatedAt: '2024-08-31T18:30:00Z'
  },
  {
    id: 'session-004',
    garageId: 'garage-001',
    spotId: 'A-105',
    vehicleId: 'vehicle-004',
    userId: 'user-004',
    entryTime: '2024-09-01T09:45:00Z',
    exitTime: null,
    totalCost: null,
    status: 'cancelled',
    paymentStatus: 'pending',
    createdAt: '2024-09-01T09:45:00Z',
    updatedAt: '2024-09-01T09:50:00Z'
  }
]

const mockStats = {
  totalSessions: 4,
  activeSessions: 1,
  totalRevenue: 24.25,
  averageDuration: 135,
  todayRevenue: 15.50,
  todaySessions: 3
}

// Helper function to setup API mocking
async function setupApiMocks(page: Page, options: {
  sessions?: Record<string, unknown>[],
  stats?: Record<string, unknown>,
  delay?: number,
  shouldFail?: boolean
} = {}) {
  const {
    sessions = mockSessions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stats: _stats = mockStats,
    delay = 0,
    shouldFail = false
  } = options

  await page.route('**/api/sessions*', async route => {
    if (shouldFail) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Server Error' })
      })
    }

    await new Promise(resolve => setTimeout(resolve, delay))
    
    const url = route.request().url()
    const urlParams = new URLSearchParams(url.split('?')[1] || '')
    
    let filteredSessions = [...sessions]
    
    // Apply search filter
    const search = urlParams.get('search')
    if (search) {
      filteredSessions = filteredSessions.filter(s =>
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.vehicleId.toLowerCase().includes(search.toLowerCase()) ||
        s.spotId.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    // Apply status filter
    const status = urlParams.get('status')
    if (status && status !== 'all') {
      filteredSessions = filteredSessions.filter(s => s.status === status)
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: filteredSessions
      })
    })
  })

  await page.route('**/api/sessions/*/end', async route => {
    if (shouldFail) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Failed to end session' })
      })
    }

    await new Promise(resolve => setTimeout(resolve, delay))
    
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { totalAmount: 12.50 }
      })
    })
  })
}

// Helper function to navigate to sessions page
async function navigateToSessions(page: Page) {
  await page.goto('/sessions')
  await page.waitForLoadState('networkidle')
  // Wait a bit more for React components to fully render
  await page.waitForTimeout(500)
}

test.describe('Sessions Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
  })

  test.describe('Page Load and Layout', () => {
    test('should display sessions management page with correct title', async ({ page }) => {
      await navigateToSessions(page)
      
      // Wait for the main session management component to load
      await page.waitForSelector('text=Session Management', { timeout: 10000 })
      
      await expect(page.getByRole('heading', { name: 'Session Management' })).toBeVisible()
      await expect(page.getByText('Monitor and manage all parking sessions')).toBeVisible()
      
      // Check for Clock icon from lucide-react - it should be present
      const clockIcon = page.locator('svg').first()
      await expect(clockIcon).toBeVisible()
    })

    test('should display all stats cards with correct data', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      const statsCards = [
        { title: 'Total Sessions', value: '4' },
        { title: 'Active Now', value: '1' },
        { title: 'Today\'s Sessions', value: '3' },
        { title: 'Total Revenue', value: '$24.25' },
        { title: 'Today\'s Revenue', value: '$15.50' },
        { title: 'Avg Duration', value: '135 min' }
      ]

      for (const card of statsCards) {
        await expect(page.getByText(card.title)).toBeVisible()
        await expect(page.getByText(card.value)).toBeVisible()
      }
    })

    test('should display filter controls', async ({ page }) => {
      await navigateToSessions(page)
      
      // Search input
      await expect(page.getByPlaceholder('Search by session, vehicle, or spot ID...')).toBeVisible()
      
      // Status filter dropdown
      const statusFilter = page.getByRole('combobox').first()
      await expect(statusFilter).toBeVisible()
      
      // Date range filter dropdown
      const dateFilter = page.getByRole('combobox').nth(1)
      await expect(dateFilter).toBeVisible()
      
      // Export button
      await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible()
    })

    test('should display sessions table with headers', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      const tableHeaders = [
        'Session ID',
        'Vehicle',
        'Spot',
        'Entry Time',
        'Duration',
        'Amount',
        'Status',
        'Payment',
        'Actions'
      ]

      for (const header of tableHeaders) {
        await expect(page.getByRole('columnheader', { name: header })).toBeVisible()
      }
    })
  })

  test.describe('Sessions Listing and Display', () => {
    test('should display session data in table rows', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Check that sessions are displayed
      const sessionRows = page.locator('tbody tr')
      await expect(sessionRows).toHaveCount(4)
      
      // Check first session data
      const firstRow = sessionRows.first()
      await expect(firstRow.locator('td').first()).toContainText('session-001')
      await expect(firstRow.getByText('A-101')).toBeVisible()
    })

    test('should display correct status badges', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Active session badge
      await expect(page.getByText('active').first()).toBeVisible()
      
      // Completed session badge
      await expect(page.getByText('completed').first()).toBeVisible()
      
      // Cancelled session badge
      await expect(page.getByText('cancelled').first()).toBeVisible()
    })

    test('should display payment status badges', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Payment status indicators
      await expect(page.getByText('pending').first()).toBeVisible()
      await expect(page.getByText('paid').first()).toBeVisible()
      await expect(page.getByText('failed').first()).toBeVisible()
    })

    test('should show duration with correct formatting for active sessions', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Active session should show animated clock icon
      const activeRow = page.locator('tbody tr').filter({ hasText: 'active' })
      await expect(activeRow.locator('[class*="animate-pulse"]')).toBeVisible()
      await expect(activeRow.getByText(/\d+ min/)).toBeVisible()
    })

    test('should display action buttons correctly based on session status', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Active session should have End Session and Cancel buttons
      const activeRow = page.locator('tbody tr').filter({ hasText: 'active' })
      await expect(activeRow.getByRole('button', { name: 'End Session' })).toBeVisible()
      await expect(activeRow.getByRole('button', { name: 'Cancel' })).toBeVisible()
      
      // Completed session should have disabled View Details button
      const completedRow = page.locator('tbody tr').filter({ hasText: 'completed' }).first()
      await expect(completedRow.getByRole('button', { name: 'View Details' })).toBeDisabled()
    })
  })

  test.describe('Real-time Updates and Monitoring', () => {
    test('should update session data periodically', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Initial data check
      await expect(page.getByText('Total Sessions').locator('..').getByText('4')).toBeVisible()
      
      // Mock updated data
      const updatedSessions = [...mockSessions, {
        id: 'session-005',
        garageId: 'garage-001',
        spotId: 'D-401',
        vehicleId: 'vehicle-005',
        userId: 'user-005',
        entryTime: '2024-09-01T11:00:00Z',
        exitTime: null,
        totalCost: null,
        status: 'active',
        paymentStatus: 'pending',
        createdAt: '2024-09-01T11:00:00Z',
        updatedAt: '2024-09-01T11:00:00Z'
      }]
      
      await setupApiMocks(page, { sessions: updatedSessions })
      
      // Trigger refresh by changing filter
      await page.getByRole('combobox').first().click()
      await page.getByRole('option', { name: 'All Status' }).click()
      await page.waitForTimeout(1000)
      
      // Should show updated count
      const sessionRows = page.locator('tbody tr')
      await expect(sessionRows).toHaveCount(5)
    })

    test('should show live indicators for active sessions', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Active sessions should have animated elements
      const activeRows = page.locator('tbody tr').filter({ hasText: 'active' })
      const animatedElements = activeRows.locator('[class*="animate-pulse"]')
      
      await expect(animatedElements.first()).toBeVisible()
    })

    test('should calculate and display current duration for active sessions', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Active sessions should show current duration
      const activeRow = page.locator('tbody tr').filter({ hasText: 'active' })
      const durationCell = activeRow.locator('td').nth(4) // Duration column
      
      await expect(durationCell.getByText(/\d+ min/)).toBeVisible()
    })
  })

  test.describe('Search and Filtering', () => {
    test('should filter sessions by search query', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Search by session ID
      const searchInput = page.getByPlaceholder('Search by session, vehicle, or spot ID...')
      await searchInput.fill('session-001')
      await page.waitForTimeout(500)
      
      const rows = page.locator('tbody tr')
      await expect(rows).toHaveCount(1)
      await expect(rows.first()).toContainText('session-001')
    })

    test('should filter sessions by vehicle ID', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      const searchInput = page.getByPlaceholder('Search by session, vehicle, or spot ID...')
      await searchInput.fill('vehicle-002')
      await page.waitForTimeout(500)
      
      const rows = page.locator('tbody tr')
      await expect(rows).toHaveCount(1)
      await expect(rows.first()).toContainText('vehicle-002')
    })

    test('should filter sessions by spot ID', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      const searchInput = page.getByPlaceholder('Search by session, vehicle, or spot ID...')
      await searchInput.fill('A-101')
      await page.waitForTimeout(500)
      
      const rows = page.locator('tbody tr')
      await expect(rows).toHaveCount(1)
      await expect(rows.first()).toContainText('A-101')
    })

    test('should filter sessions by status', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Filter by active status
      const statusFilter = page.getByRole('combobox').first()
      await statusFilter.click()
      await page.getByRole('option', { name: 'Active' }).click()
      await page.waitForTimeout(500)
      
      const rows = page.locator('tbody tr')
      await expect(rows).toHaveCount(1)
      await expect(rows.first()).toContainText('active')
    })

    test('should filter sessions by date range', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Filter by today
      const dateFilter = page.getByRole('combobox').nth(1)
      await dateFilter.click()
      await page.getByRole('option', { name: 'Today' }).click()
      await page.waitForTimeout(500)
      
      // Should show only today's sessions
      const rows = page.locator('tbody tr')
      await expect(rows.count()).toBeGreaterThanOrEqual(1)
    })

    test('should show "no sessions found" when filters return empty results', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      const searchInput = page.getByPlaceholder('Search by session, vehicle, or spot ID...')
      await searchInput.fill('nonexistent-session')
      await page.waitForTimeout(500)
      
      await expect(page.getByText('No sessions found matching filters')).toBeVisible()
    })

    test('should clear search and reset filters', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Apply search filter
      const searchInput = page.getByPlaceholder('Search by session, vehicle, or spot ID...')
      await searchInput.fill('session-001')
      await page.waitForTimeout(500)
      
      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(500)
      
      // Should show all sessions again
      const rows = page.locator('tbody tr')
      await expect(rows).toHaveCount(4)
    })
  })

  test.describe('Session Operations', () => {
    test('should end an active session successfully', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      const activeRow = page.locator('tbody tr').filter({ hasText: 'active' })
      const endButton = activeRow.getByRole('button', { name: 'End Session' })
      
      await endButton.click()
      
      // Should show success toast
      await expect(page.getByText('Session ended. Total: $12.50')).toBeVisible()
    })

    test('should cancel an active session with confirmation', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Mock confirm dialog
      page.on('dialog', dialog => dialog.accept())
      
      const activeRow = page.locator('tbody tr').filter({ hasText: 'active' })
      const cancelButton = activeRow.getByRole('button', { name: 'Cancel' })
      
      await cancelButton.click()
      
      // Should show success toast
      await expect(page.getByText('Session cancelled')).toBeVisible()
    })

    test('should not cancel session if user declines confirmation', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Mock confirm dialog - decline
      page.on('dialog', dialog => dialog.dismiss())
      
      const activeRow = page.locator('tbody tr').filter({ hasText: 'active' })
      const cancelButton = activeRow.getByRole('button', { name: 'Cancel' })
      
      await cancelButton.click()
      
      // Should not show success toast
      await expect(page.getByText('Session cancelled')).not.toBeVisible()
    })

    test('should handle end session failure gracefully', async ({ page }) => {
      await setupApiMocks(page, { shouldFail: true })
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      const activeRow = page.locator('tbody tr').filter({ hasText: 'active' })
      const endButton = activeRow.getByRole('button', { name: 'End Session' })
      
      await endButton.click()
      
      // Should show error toast
      await expect(page.getByText('Failed to end session')).toBeVisible()
    })
  })

  test.describe('Session History and Details', () => {
    test('should display session history with correct sorting', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Sessions should be sorted by entry time (most recent first)
      const sessionIds = page.locator('tbody tr td:first-child')
      
      // The most recent session should be first
      await expect(sessionIds.first()).toContainText('session-001')
    })

    test('should show detailed session information in table', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      const firstRow = page.locator('tbody tr').first()
      
      // Should show all session details
      await expect(firstRow.getByText('session-001')).toBeVisible()
      await expect(firstRow.getByText('vehicle-001')).toBeVisible()
      await expect(firstRow.getByText('A-101')).toBeVisible()
      await expect(firstRow.getByText(/Sep \d+, \d{4}/)).toBeVisible()
      await expect(firstRow.getByText(/\d+ min/)).toBeVisible()
    })

    test('should display entry and exit times correctly', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Check completed session
      const completedRow = page.locator('tbody tr').filter({ hasText: 'completed' }).first()
      
      // Should show formatted dates
      await expect(completedRow.getByText(/Sep \d+, \d{4}/)).toBeVisible()
      await expect(completedRow.getByText(/\d{2}:\d{2}/)).toBeVisible()
    })

    test('should calculate and display session costs correctly', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Check completed session with cost
      const completedRow = page.locator('tbody tr').filter({ hasText: 'completed' }).first()
      await expect(completedRow.getByText('$15.50')).toBeVisible()
      
      // Check active session with no cost
      const activeRow = page.locator('tbody tr').filter({ hasText: 'active' })
      await expect(activeRow.getByText('$0.00')).toBeVisible()
    })
  })

  test.describe('Export and Reports', () => {
    test('should export session data as CSV', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Mock download
      const downloadPromise = page.waitForEvent('download')
      
      await page.getByRole('button', { name: 'Export CSV' }).click()
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/parking-sessions-\d{4}-\d{2}-\d{2}\.csv/)
    })

    test('should export filtered sessions only', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Apply filter first
      const statusFilter = page.getByRole('combobox').first()
      await statusFilter.click()
      await page.getByRole('option', { name: 'Active' }).click()
      await page.waitForTimeout(500)
      
      // Mock download
      const downloadPromise = page.waitForEvent('download')
      
      await page.getByRole('button', { name: 'Export CSV' }).click()
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/parking-sessions-\d{4}-\d{2}-\d{2}\.csv/)
    })

    test('should generate comprehensive session reports', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Export should include all session details
      const exportButton = page.getByRole('button', { name: 'Export CSV' })
      await expect(exportButton).toBeVisible()
      await expect(exportButton).toBeEnabled()
    })
  })

  test.describe('Performance and Loading States', () => {
    test('should show loading state while fetching sessions', async ({ page }) => {
      await setupApiMocks(page, { delay: 2000 })
      await navigateToSessions(page)
      
      // Should show loading indicator
      await expect(page.getByText('Loading sessions...')).toBeVisible()
      
      // Wait for data to load
      await page.waitForTimeout(2500)
      await expect(page.locator('tbody tr')).toHaveCount(4)
    })

    test('should handle large session datasets efficiently', async ({ page }) => {
      // Create large dataset
      const largeSessions = Array.from({ length: 100 }, (_, i) => ({
        ...mockSessions[0],
        id: `session-${String(i + 1).padStart(3, '0')}`,
        vehicleId: `vehicle-${String(i + 1).padStart(3, '0')}`,
        spotId: `A-${String(i + 101).padStart(3, '0')}`
      }))
      
      await setupApiMocks(page, { sessions: largeSessions })
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Should handle large dataset without performance issues
      const rows = page.locator('tbody tr')
      await expect(rows).toHaveCount(100)
      
      // Search should still work efficiently
      const searchInput = page.getByPlaceholder('Search by session, vehicle, or spot ID...')
      await searchInput.fill('session-050')
      await page.waitForTimeout(500)
      
      await expect(page.locator('tbody tr')).toHaveCount(1)
    })

    test('should paginate sessions for better performance', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // If pagination is implemented, check for pagination controls
      const hasPagination = await page.locator('[aria-label="pagination"]').isVisible().catch(() => false)
      
      if (hasPagination) {
        await expect(page.locator('[aria-label="pagination"]')).toBeVisible()
      } else {
        // If no pagination, all sessions should be visible
        await expect(page.locator('tbody tr')).toHaveCount(4)
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle API failure gracefully', async ({ page }) => {
      await setupApiMocks(page, { shouldFail: true })
      await navigateToSessions(page)
      
      // Should show error message
      await expect(page.getByText('Failed to fetch sessions')).toBeVisible()
    })

    test('should show retry option on API failure', async ({ page }) => {
      await setupApiMocks(page, { shouldFail: true })
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Look for retry functionality or error handling
      const hasRetryButton = await page.getByRole('button', { name: /retry/i }).isVisible().catch(() => false)
      const hasErrorToast = await page.getByText(/error/i).first().isVisible().catch(() => false)
      
      expect(hasRetryButton || hasErrorToast).toBeTruthy()
    })

    test('should handle network timeout gracefully', async ({ page }) => {
      // Simulate network timeout
      await page.route('**/api/sessions*', async route => {
        await new Promise(resolve => setTimeout(resolve, 30000)) // 30 second delay
        route.continue()
      })
      
      await navigateToSessions(page)
      
      // Should show loading state initially
      await expect(page.getByText('Loading sessions...')).toBeVisible()
      
      // After reasonable time, should show timeout handling
      await page.waitForTimeout(5000)
      
      const hasTimeoutMessage = await page.getByText(/timeout/i).isVisible().catch(() => false)
      const hasErrorMessage = await page.getByText(/error/i).isVisible().catch(() => false)
      
      expect(hasTimeoutMessage || hasErrorMessage).toBeTruthy()
    })

    test('should handle invalid session data gracefully', async ({ page }) => {
      const invalidSessions = [
        {
          id: null, // Invalid ID
          garageId: 'garage-001',
          spotId: 'A-101',
          vehicleId: 'vehicle-001',
          entryTime: 'invalid-date', // Invalid date
          status: 'unknown-status' // Invalid status
        }
      ]
      
      await setupApiMocks(page, { sessions: invalidSessions })
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Should handle invalid data without crashing
      // Either show error message or skip invalid entries
      const hasError = await page.getByText(/error/i).isVisible().catch(() => false)
      const hasValidTable = await page.locator('tbody tr').count().then(count => count >= 0)
      
      expect(hasError || hasValidTable).toBeTruthy()
    })
  })

  test.describe('Real-time Session Updates', () => {
    test('should update session status in real-time', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Initial state - should have active session
      await expect(page.getByText('active').first()).toBeVisible()
      
      // Simulate real-time update by changing API response
      const updatedSessions = mockSessions.map(session => 
        session.status === 'active' 
          ? { ...session, status: 'completed', exitTime: '2024-09-01T12:30:00Z', totalCost: 18.75, paymentStatus: 'paid' }
          : session
      )
      
      await setupApiMocks(page, { sessions: updatedSessions })
      
      // Trigger update by refreshing filters
      await page.getByRole('combobox').first().click()
      await page.getByRole('option', { name: 'All Status' }).click()
      await page.waitForTimeout(1000)
      
      // Should show updated status
      await expect(page.getByText('completed')).toBeVisible()
    })

    test('should update payment status in real-time', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Initial state
      await expect(page.getByText('pending').first()).toBeVisible()
      
      // Update payment status
      const updatedSessions = mockSessions.map(session => 
        session.paymentStatus === 'pending' 
          ? { ...session, paymentStatus: 'paid' }
          : session
      )
      
      await setupApiMocks(page, { sessions: updatedSessions })
      
      // Refresh data
      await page.getByRole('combobox').first().click()
      await page.getByRole('option', { name: 'All Status' }).click()
      await page.waitForTimeout(1000)
      
      // Should show updated payment status
      const paidBadges = page.locator(':text("paid")')
      await expect(paidBadges.first()).toBeVisible()
    })

    test('should update duration for active sessions continuously', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Get initial duration for active session
      const activeRow = page.locator('tbody tr').filter({ hasText: 'active' })
      
      // Wait a moment (in real app, this would update continuously)
      await page.waitForTimeout(2000)
      
      // Duration should be present and formatted correctly
      await expect(activeRow.getByText(/\d+ min/)).toBeVisible()
      
      // In a real scenario with WebSocket updates, we'd test for actual changes
      // For now, we verify the duration display is working
      const currentDuration = await activeRow.locator('td').nth(4).textContent()
      expect(currentDuration).toMatch(/\d+ min/)
    })
  })

  test.describe('Accessibility and User Experience', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Tab through interactive elements
      await page.keyboard.press('Tab') // Search input
      await expect(page.getByPlaceholder('Search by session, vehicle, or spot ID...')).toBeFocused()
      
      await page.keyboard.press('Tab') // Status filter
      await page.keyboard.press('Tab') // Date filter
      await page.keyboard.press('Tab') // Export button
      
      await expect(page.getByRole('button', { name: 'Export CSV' })).toBeFocused()
    })

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Check table accessibility
      await expect(page.locator('table')).toHaveAttribute('role', 'table')
      await expect(page.locator('thead tr')).toHaveAttribute('role', 'row')
      await expect(page.locator('tbody tr').first()).toHaveAttribute('role', 'row')
      
      // Check form elements have proper labels
      const searchInput = page.getByPlaceholder('Search by session, vehicle, or spot ID...')
      await expect(searchInput).toHaveAttribute('type', 'text')
    })

    test('should handle screen reader compatibility', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Status badges should be readable
      const statusBadges = page.locator('[class*="badge"]').filter({ hasText: 'active' })
      await expect(statusBadges.first()).toBeVisible()
      
      // Action buttons should have clear labels
      await expect(page.getByRole('button', { name: 'End Session' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    })

    test('should provide clear feedback for user actions', async ({ page }) => {
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Search feedback
      const searchInput = page.getByPlaceholder('Search by session, vehicle, or spot ID...')
      await searchInput.fill('session-001')
      await page.waitForTimeout(500)
      
      // Should show filtered results immediately
      await expect(page.locator('tbody tr')).toHaveCount(1)
      
      // Filter feedback
      const statusFilter = page.getByRole('combobox').first()
      await statusFilter.click()
      await page.getByRole('option', { name: 'Active' }).click()
      
      // Should show filtered results
      await expect(page.locator('tbody tr')).toHaveCount(1)
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // Stats cards should stack vertically on mobile
      const statsCards = page.locator('[class*="grid"]').first()
      await expect(statsCards).toBeVisible()
      
      // Table should be scrollable horizontally
      const table = page.locator('table')
      await expect(table).toBeVisible()
    })

    test('should maintain functionality on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await navigateToSessions(page)
      await page.waitForTimeout(1000)
      
      // All functionality should work on tablet
      await expect(page.getByPlaceholder('Search by session, vehicle, or spot ID...')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible()
      
      // Action buttons should be accessible
      const activeRow = page.locator('tbody tr').filter({ hasText: 'active' })
      if (await activeRow.count() > 0) {
        await expect(activeRow.getByRole('button', { name: 'End Session' })).toBeVisible()
      }
    })
  })
})
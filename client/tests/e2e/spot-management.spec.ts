import { test, expect } from '@playwright/test'

/**
 * Comprehensive E2E tests for Spot Management functionality
 * 
 * Tests cover:
 * 1. Spot listing in grid and list views
 * 2. Add/edit spot functionality with type selection
 * 3. Spot status management (available, occupied, maintenance, reserved)
 * 4. Maintenance scheduling and tracking
 * 5. Bulk operations on multiple spots
 * 6. Floor and bay filtering
 * 7. Spot utilization statistics
 * 8. Export functionality
 * 9. Grid layout visualization
 * 10. Error handling and validation
 */

// Test data constants
const TEST_GARAGE_ID = 'test-garage-1'
const TEST_SPOT_DATA = {
  spotNumber: 'TEST-001',
  floor: 1,
  bay: 'A',
  type: 'standard',
  status: 'available',
  dimensions: {
    length: 18,
    width: 9,
    height: 8
  }
}

const MAINTENANCE_DATA = {
  type: 'cleaning',
  description: 'Weekly cleaning and inspection',
  assignedTo: 'Cleaning Crew',
  estimatedDuration: 30
}

class SpotManagementPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/spots')
    await this.page.waitForLoadState('networkidle')
  }

  // Navigation helpers
  async selectGarage(garageName: string) {
    await this.page.selectOption('[data-testid="garage-select"]', { label: garageName })
    await this.page.waitForLoadState('networkidle')
  }

  async switchToListView() {
    await this.page.click('[data-testid="list-view-button"]')
    await this.page.waitForTimeout(500)
  }

  async switchToGridView() {
    await this.page.click('[data-testid="grid-view-button"]')
    await this.page.waitForTimeout(500)
  }

  // Search and filter helpers
  async searchSpot(query: string) {
    await this.page.fill('[data-testid="spot-search"]', query)
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(500)
  }

  async filterByStatus(status: string) {
    await this.page.selectOption('[data-testid="status-filter"]', status)
    await this.page.waitForTimeout(500)
  }

  async filterByType(type: string) {
    await this.page.selectOption('[data-testid="type-filter"]', type)
    await this.page.waitForTimeout(500)
  }

  async filterByFloor(floor: string) {
    await this.page.selectOption('[data-testid="floor-filter"]', floor)
    await this.page.waitForTimeout(500)
  }

  async filterByBay(bay: string) {
    await this.page.selectOption('[data-testid="bay-filter"]', bay)
    await this.page.waitForTimeout(500)
  }

  // Spot management helpers
  async addNewSpot(spotData: typeof TEST_SPOT_DATA) {
    await this.page.click('[data-testid="add-spot-button"]')
    
    // Basic info tab
    await this.page.fill('[data-testid="spot-number"]', spotData.spotNumber)
    await this.page.fill('[data-testid="floor"]', spotData.floor.toString())
    await this.page.selectOption('[data-testid="bay"]', spotData.bay)
    await this.page.selectOption('[data-testid="spot-type"]', spotData.type)
    await this.page.selectOption('[data-testid="spot-status"]', spotData.status)
    
    // Dimensions
    await this.page.fill('[data-testid="length"]', spotData.dimensions.length.toString())
    await this.page.fill('[data-testid="width"]', spotData.dimensions.width.toString())
    await this.page.fill('[data-testid="height"]', spotData.dimensions.height.toString())
    
    await this.page.click('[data-testid="save-spot-button"]')
    await this.page.waitForLoadState('networkidle')
  }

  async editSpot(spotNumber: string, updates: Partial<typeof TEST_SPOT_DATA>) {
    await this.searchSpot(spotNumber)
    await this.page.click(`[data-testid="edit-spot-${spotNumber}"]`)
    
    if (updates.spotNumber) {
      await this.page.fill('[data-testid="spot-number"]', updates.spotNumber)
    }
    if (updates.type) {
      await this.page.selectOption('[data-testid="spot-type"]', updates.type)
    }
    if (updates.status) {
      await this.page.selectOption('[data-testid="spot-status"]', updates.status)
    }
    
    await this.page.click('[data-testid="save-spot-button"]')
    await this.page.waitForLoadState('networkidle')
  }

  async changeSpotStatus(spotNumber: string, newStatus: string) {
    await this.searchSpot(spotNumber)
    await this.page.selectOption(`[data-testid="status-select-${spotNumber}"]`, newStatus)
    await this.page.waitForTimeout(1000)
  }

  // Bulk operations helpers
  async selectSpots(spotNumbers: string[]) {
    for (const spotNumber of spotNumbers) {
      await this.page.check(`[data-testid="select-spot-${spotNumber}"]`)
    }
  }

  async selectAllSpotsInBay(bay: string) {
    await this.page.check(`[data-testid="select-bay-${bay}"]`)
  }

  async performBulkStatusChange(status: string) {
    await this.page.click('[data-testid="bulk-actions-dropdown"]')
    await this.page.click(`[data-testid="bulk-status-${status}"]`)
    await this.page.click('[data-testid="confirm-bulk-action"]')
    await this.page.waitForLoadState('networkidle')
  }

  async performBulkMaintenance() {
    await this.page.click('[data-testid="bulk-actions-dropdown"]')
    await this.page.click('[data-testid="bulk-maintenance"]')
    
    // Fill maintenance form
    await this.page.selectOption('[data-testid="maintenance-type"]', MAINTENANCE_DATA.type)
    await this.page.fill('[data-testid="maintenance-description"]', MAINTENANCE_DATA.description)
    await this.page.selectOption('[data-testid="assigned-to"]', MAINTENANCE_DATA.assignedTo)
    await this.page.fill('[data-testid="estimated-duration"]', MAINTENANCE_DATA.estimatedDuration.toString())
    
    await this.page.click('[data-testid="schedule-maintenance-button"]')
    await this.page.waitForLoadState('networkidle')
  }

  // Maintenance helpers
  async openMaintenanceScheduler() {
    await this.page.click('[data-testid="maintenance-scheduler-button"]')
    await this.page.waitForLoadState('networkidle')
  }

  async scheduleMaintenance(spotIds: string[], maintenanceData: typeof MAINTENANCE_DATA) {
    await this.openMaintenanceScheduler()
    await this.page.click('[data-testid="schedule-maintenance"]')
    
    // Select spots
    for (const spotId of spotIds) {
      await this.page.check(`[data-testid="spot-checkbox-${spotId}"]`)
    }
    
    // Fill form
    await this.page.selectOption('[data-testid="maintenance-type"]', maintenanceData.type)
    await this.page.fill('[data-testid="maintenance-description"]', maintenanceData.description)
    await this.page.selectOption('[data-testid="assigned-to"]', maintenanceData.assignedTo)
    await this.page.fill('[data-testid="estimated-duration"]', maintenanceData.estimatedDuration.toString())
    
    await this.page.click('[data-testid="schedule-maintenance-button"]')
    await this.page.waitForLoadState('networkidle')
  }

  async viewMaintenanceCalendar() {
    await this.openMaintenanceScheduler()
    await this.page.click('[data-testid="calendar-tab"]')
    await this.page.waitForTimeout(500)
  }

  async viewMaintenanceHistory() {
    await this.openMaintenanceScheduler()
    await this.page.click('[data-testid="history-tab"]')
    await this.page.waitForTimeout(500)
  }

  // Grid layout helpers
  async navigateToFloor(floor: number) {
    // Click next/previous buttons to reach desired floor
    const currentFloor = await this.page.textContent('[data-testid="current-floor"]')
    const current = parseInt(currentFloor?.match(/\d+/)?.[0] || '1')
    
    if (floor > current) {
      for (let i = 0; i < floor - current; i++) {
        await this.page.click('[data-testid="next-floor"]')
        await this.page.waitForTimeout(300)
      }
    } else if (floor < current) {
      for (let i = 0; i < current - floor; i++) {
        await this.page.click('[data-testid="prev-floor"]')
        await this.page.waitForTimeout(300)
      }
    }
  }

  async toggleViewControls(control: 'occupied' | 'unavailable' | 'compact') {
    await this.page.click(`[data-testid="toggle-${control}"]`)
    await this.page.waitForTimeout(500)
  }

  // Export helpers
  async exportSpots(format: 'csv' | 'excel' | 'pdf' = 'csv') {
    await this.page.click('[data-testid="export-button"]')
    await this.page.selectOption('[data-testid="export-format"]', format)
    await this.page.click('[data-testid="confirm-export"]')
    
    // Wait for download to start
    const downloadPromise = this.page.waitForEvent('download')
    await downloadPromise
  }

  // Analytics helpers
  async viewSpotUtilization() {
    await this.page.click('[data-testid="utilization-tab"]')
    await this.page.waitForLoadState('networkidle')
  }

  async changeUtilizationView(view: 'utilization' | 'revenue' | 'efficiency' | 'sessions') {
    await this.page.click(`[data-testid="view-${view}"]`)
    await this.page.waitForTimeout(1000)
  }

  async changeChartType(type: 'bar' | 'scatter' | 'combined') {
    await this.page.click(`[data-testid="chart-${type}"]`)
    await this.page.waitForTimeout(1000)
  }

  // Validation helpers
  async expectSpotVisible(spotNumber: string) {
    await expect(this.page.locator(`[data-testid="spot-${spotNumber}"]`)).toBeVisible()
  }

  async expectSpotStatus(spotNumber: string, status: string) {
    await expect(this.page.locator(`[data-testid="spot-${spotNumber}-status"]`)).toContainText(status)
  }

  async expectTotalSpots(count: number) {
    await expect(this.page.locator('[data-testid="total-spots-count"]')).toContainText(count.toString())
  }

  async expectErrorMessage(message: string) {
    await expect(this.page.locator('[data-testid="error-message"]')).toContainText(message)
  }
}

test.describe('Spot Management E2E Tests', () => {
  let spotPage: SpotManagementPage

  test.beforeEach(async ({ page }) => {
    spotPage = new SpotManagementPage(page)
    
    // Setup: Mock API responses for consistent testing
    await page.route('/api/garages', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: TEST_GARAGE_ID, name: 'Test Garage', totalSpots: 100, availableSpots: 80 }
          ]
        })
      })
    })

    await page.route('/api/spots**', async (route) => {
      
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'spot-1',
                spotNumber: 'A-001',
                floor: 1,
                bay: 'A',
                type: 'standard',
                status: 'available',
                hourlyRate: 5.00,
                features: []
              },
              {
                id: 'spot-2',
                spotNumber: 'A-002',
                floor: 1,
                bay: 'A',
                type: 'compact',
                status: 'occupied',
                hourlyRate: 4.00,
                features: []
              },
              {
                id: 'spot-3',
                spotNumber: 'B-001',
                floor: 1,
                bay: 'B',
                type: 'handicapped',
                status: 'maintenance',
                hourlyRate: 5.00,
                features: ['handicap', 'wide']
              }
            ]
          })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {} })
        })
      }
    })

    await spotPage.goto()
  })

  test.describe('Spot Listing Views', () => {
    test('should display spots in grid view by default', async ({ page }) => {
      // Grid view should be active by default
      await expect(page.locator('[data-testid="grid-view-button"]')).toHaveClass(/active|selected/)
      
      // Should show spot tiles in grid layout
      await expect(page.locator('[data-testid="spots-grid"]')).toBeVisible()
      await spotPage.expectSpotVisible('A-001')
      await spotPage.expectSpotVisible('A-002')
    })

    test('should switch to list view and display tabular data', async ({ page }) => {
      await spotPage.switchToListView()
      
      // List view should be active
      await expect(page.locator('[data-testid="list-view-button"]')).toHaveClass(/active|selected/)
      
      // Should show data table
      await expect(page.locator('[data-testid="spots-table"]')).toBeVisible()
      await expect(page.locator('table thead')).toContainText('Spot')
      await expect(page.locator('table thead')).toContainText('Location')
      await expect(page.locator('table thead')).toContainText('Status')
    })

    test('should display correct spot statistics', async ({ page }) => {
      // Check stats cards
      await expect(page.locator('[data-testid="total-spots-count"]')).toContainText('3')
      await expect(page.locator('[data-testid="available-spots-count"]')).toContainText('1')
      await expect(page.locator('[data-testid="occupied-spots-count"]')).toContainText('1')
      await expect(page.locator('[data-testid="maintenance-spots-count"]')).toContainText('1')
    })
  })

  test.describe('Add/Edit Spot Functionality', () => {
    test('should open add spot form and validate required fields', async ({ page }) => {
      await page.click('[data-testid="add-spot-button"]')
      
      // Form should be visible
      await expect(page.locator('[data-testid="spot-form"]')).toBeVisible()
      await expect(page.locator('[data-testid="form-title"]')).toContainText('Add New Spot')
      
      // Try to save without required fields
      await page.click('[data-testid="save-spot-button"]')
      await spotPage.expectErrorMessage('Spot number is required')
    })

    test('should create new spot with all form tabs', async ({ page }) => {
      await page.click('[data-testid="add-spot-button"]')
      
      // Basic Info tab
      await page.fill('[data-testid="spot-number"]', TEST_SPOT_DATA.spotNumber)
      await page.fill('[data-testid="floor"]', TEST_SPOT_DATA.floor.toString())
      await page.selectOption('[data-testid="bay"]', TEST_SPOT_DATA.bay)
      await page.selectOption('[data-testid="spot-type"]', TEST_SPOT_DATA.type)
      
      // Features tab
      await page.click('[data-testid="features-tab"]')
      await page.check('[data-testid="feature-ev_charging"]')
      await page.check('[data-testid="feature-covered"]')
      
      // Pricing tab
      await page.click('[data-testid="pricing-tab"]')
      await page.fill('[data-testid="price-override"]', '6.50')
      
      // Maintenance tab
      await page.click('[data-testid="maintenance-tab"]')
      await page.fill('[data-testid="maintenance-notes"]', 'New spot, no issues')
      
      await page.click('[data-testid="save-spot-button"]')
      
      // Should return to main view and show success
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Spot created successfully')
      await spotPage.expectSpotVisible(TEST_SPOT_DATA.spotNumber)
    })

    test('should edit existing spot', async ({ page }) => {
      await spotPage.searchSpot('A-001')
      await page.click('[data-testid="edit-spot-A-001"]')
      
      // Change spot type
      await page.selectOption('[data-testid="spot-type"]', 'compact')
      
      // Add features
      await page.click('[data-testid="features-tab"]')
      await page.check('[data-testid="feature-wide"]')
      
      await page.click('[data-testid="save-spot-button"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Spot updated successfully')
    })

    test('should validate spot form fields', async ({ page }) => {
      await page.click('[data-testid="add-spot-button"]')
      
      // Invalid spot number
      await page.fill('[data-testid="spot-number"]', 'invalid spot!')
      await page.blur('[data-testid="spot-number"]')
      await expect(page.locator('[data-testid="spot-number-error"]')).toContainText('only contain letters, numbers, and hyphens')
      
      // Invalid dimensions
      await page.fill('[data-testid="length"]', '5')
      await page.blur('[data-testid="length"]')
      await expect(page.locator('[data-testid="length-error"]')).toContainText('Length must be between 10-30 feet')
    })
  })

  test.describe('Spot Status Management', () => {
    test('should change spot status from dropdown', async ({ page }) => {
      await spotPage.switchToListView()
      
      // Change A-001 from available to maintenance
      await page.selectOption('[data-testid="status-select-A-001"]', 'maintenance')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Spot status updated')
      await spotPage.expectSpotStatus('A-001', 'maintenance')
    })

    test('should click spot tiles in grid to change status', async ({ page }) => {
      // Click available spot should make it reserved
      await page.click('[data-testid="spot-tile-A-001"]')
      await spotPage.expectSpotStatus('A-001', 'reserved')
      
      // Click reserved spot should make it available
      await page.click('[data-testid="spot-tile-A-001"]')
      await spotPage.expectSpotStatus('A-001', 'available')
    })

    test('should update statistics when status changes', async ({ page }) => {
      // Initial state: 1 available, 1 occupied, 1 maintenance
      await spotPage.expectTotalSpots(3)
      
      // Change available to occupied
      await spotPage.changeSpotStatus('A-001', 'occupied')
      
      // Should now have 0 available, 2 occupied, 1 maintenance
      await expect(page.locator('[data-testid="available-spots-count"]')).toContainText('0')
      await expect(page.locator('[data-testid="occupied-spots-count"]')).toContainText('2')
    })

    test('should handle status change errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('/api/spots/*/status', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Cannot change status of occupied spot'
          })
        })
      })

      await spotPage.changeSpotStatus('A-002', 'maintenance')
      await spotPage.expectErrorMessage('Cannot change status of occupied spot')
    })
  })

  test.describe('Maintenance Scheduling', () => {
    test('should open maintenance scheduler', async ({ page }) => {
      await spotPage.openMaintenanceScheduler()
      
      await expect(page.locator('[data-testid="maintenance-scheduler"]')).toBeVisible()
      await expect(page.locator('[data-testid="scheduler-title"]')).toContainText('Maintenance Scheduler')
    })

    test('should schedule maintenance for multiple spots', async ({ page }) => {
      await spotPage.openMaintenanceScheduler()
      await page.click('[data-testid="schedule-maintenance"]')
      
      // Select spots
      await page.check('[data-testid="spot-checkbox-spot-1"]')
      await page.check('[data-testid="spot-checkbox-spot-2"]')
      
      // Fill maintenance form
      await page.selectOption('[data-testid="maintenance-type"]', 'cleaning')
      await page.fill('[data-testid="maintenance-description"]', 'Weekly deep clean')
      await page.selectOption('[data-testid="assigned-to"]', 'Cleaning Crew')
      await page.fill('[data-testid="estimated-duration"]', '45')
      
      // Set date
      await page.click('[data-testid="scheduled-date"]')
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`)
      
      await page.click('[data-testid="schedule-maintenance-button"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Maintenance scheduled successfully')
    })

    test('should display maintenance calendar view', async ({ page }) => {
      await spotPage.viewMaintenanceCalendar()
      
      await expect(page.locator('[data-testid="maintenance-calendar"]')).toBeVisible()
      // Should show scheduled maintenance items on calendar
    })

    test('should show maintenance history', async ({ page }) => {
      await spotPage.viewMaintenanceHistory()
      
      await expect(page.locator('[data-testid="maintenance-history"]')).toBeVisible()
      // Should show completed maintenance items
    })

    test('should filter maintenance by status and type', async ({ page }) => {
      await spotPage.openMaintenanceScheduler()
      
      // Filter by status
      await page.selectOption('[data-testid="maintenance-status-filter"]', 'scheduled')
      await page.waitForTimeout(500)
      
      // Filter by type
      await page.selectOption('[data-testid="maintenance-type-filter"]', 'cleaning')
      await page.waitForTimeout(500)
      
      // Should show filtered results
      await expect(page.locator('[data-testid="maintenance-table"] tbody tr')).toHaveCount(1)
    })
  })

  test.describe('Bulk Operations', () => {
    test('should select multiple spots for bulk operations', async ({ page }) => {
      // Select individual spots
      await page.check('[data-testid="select-spot-A-001"]')
      await page.check('[data-testid="select-spot-A-002"]')
      
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible()
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 spots selected')
    })

    test('should select all spots in a bay', async ({ page }) => {
      await spotPage.selectAllSpotsInBay('A')
      
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible()
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 spots selected')
    })

    test('should perform bulk status change', async ({ page }) => {
      await page.check('[data-testid="select-spot-A-001"]')
      await page.check('[data-testid="select-spot-A-002"]')
      
      await spotPage.performBulkStatusChange('maintenance')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Bulk operation completed')
      await spotPage.expectSpotStatus('A-001', 'maintenance')
      await spotPage.expectSpotStatus('A-002', 'maintenance')
    })

    test('should perform bulk maintenance scheduling', async ({ page }) => {
      await page.check('[data-testid="select-spot-A-001"]')
      await page.check('[data-testid="select-spot-B-001"]')
      
      await spotPage.performBulkMaintenance()
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Maintenance scheduled for selected spots')
    })

    test('should clear bulk selection', async ({ page }) => {
      await page.check('[data-testid="select-spot-A-001"]')
      await page.check('[data-testid="select-spot-A-002"]')
      
      await page.click('[data-testid="clear-selection"]')
      
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).not.toBeVisible()
    })
  })

  test.describe('Filtering and Search', () => {
    test('should search spots by number', async ({ page }) => {
      await spotPage.searchSpot('A-001')
      
      await spotPage.expectSpotVisible('A-001')
      await expect(page.locator('[data-testid="spot-A-002"]')).not.toBeVisible()
    })

    test('should filter spots by status', async ({ page }) => {
      await spotPage.filterByStatus('available')
      
      await spotPage.expectSpotVisible('A-001')
      await expect(page.locator('[data-testid="spot-A-002"]')).not.toBeVisible()
    })

    test('should filter spots by type', async ({ page }) => {
      await spotPage.filterByType('compact')
      
      await spotPage.expectSpotVisible('A-002')
      await expect(page.locator('[data-testid="spot-A-001"]')).not.toBeVisible()
    })

    test('should filter spots by floor', async () => {
      await spotPage.filterByFloor('1')
      
      // All test spots are on floor 1, so all should be visible
      await spotPage.expectSpotVisible('A-001')
      await spotPage.expectSpotVisible('A-002')
      await spotPage.expectSpotVisible('B-001')
    })

    test('should filter spots by bay', async ({ page }) => {
      await spotPage.filterByBay('A')
      
      await spotPage.expectSpotVisible('A-001')
      await spotPage.expectSpotVisible('A-002')
      await expect(page.locator('[data-testid="spot-B-001"]')).not.toBeVisible()
    })

    test('should combine multiple filters', async ({ page }) => {
      await spotPage.filterByBay('A')
      await spotPage.filterByStatus('available')
      
      await spotPage.expectSpotVisible('A-001')
      await expect(page.locator('[data-testid="spot-A-002"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="spot-B-001"]')).not.toBeVisible()
    })

    test('should clear filters', async ({ page }) => {
      await spotPage.filterByStatus('available')
      await page.click('[data-testid="clear-filters"]')
      
      // All spots should be visible again
      await spotPage.expectSpotVisible('A-001')
      await spotPage.expectSpotVisible('A-002')
      await spotPage.expectSpotVisible('B-001')
    })
  })

  test.describe('Grid Layout Visualization', () => {
    test('should display floor navigation controls', async ({ page }) => {
      await expect(page.locator('[data-testid="floor-navigation"]')).toBeVisible()
      await expect(page.locator('[data-testid="current-floor"]')).toContainText('Floor 1')
      await expect(page.locator('[data-testid="prev-floor"]')).toBeDisabled()
    })

    test('should show bay organization in grid', async ({ page }) => {
      await expect(page.locator('[data-testid="bay-A"]')).toBeVisible()
      await expect(page.locator('[data-testid="bay-B"]')).toBeVisible()
      
      // Bay A should contain 2 spots
      await expect(page.locator('[data-testid="bay-A"] [data-testid^="spot-"]')).toHaveCount(2)
      // Bay B should contain 1 spot
      await expect(page.locator('[data-testid="bay-B"] [data-testid^="spot-"]')).toHaveCount(1)
    })

    test('should toggle view controls', async ({ page }) => {
      // Hide occupied spots
      await spotPage.toggleViewControls('occupied')
      await expect(page.locator('[data-testid="spot-A-002"]')).not.toBeVisible()
      await spotPage.expectSpotVisible('A-001')
      
      // Hide unavailable spots (maintenance)
      await spotPage.toggleViewControls('unavailable')
      await expect(page.locator('[data-testid="spot-B-001"]')).not.toBeVisible()
      
      // Toggle compact view
      await spotPage.toggleViewControls('compact')
      await expect(page.locator('[data-testid="spots-grid"]')).toHaveClass(/compact/)
    })

    test('should show spot details on hover', async ({ page }) => {
      await page.hover('[data-testid="spot-tile-A-001"]')
      
      await expect(page.locator('[data-testid="spot-tooltip"]')).toBeVisible()
      await expect(page.locator('[data-testid="spot-tooltip"]')).toContainText('A-001')
      await expect(page.locator('[data-testid="spot-tooltip"]')).toContainText('Standard')
      await expect(page.locator('[data-testid="spot-tooltip"]')).toContainText('Available')
    })
  })

  test.describe('Spot Utilization Analytics', () => {
    test('should display utilization overview', async ({ page }) => {
      await spotPage.viewSpotUtilization()
      
      await expect(page.locator('[data-testid="utilization-stats"]')).toBeVisible()
      await expect(page.locator('[data-testid="avg-utilization"]')).toBeVisible()
      await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible()
      await expect(page.locator('[data-testid="high-efficiency"]')).toBeVisible()
      await expect(page.locator('[data-testid="underperforming"]')).toBeVisible()
    })

    test('should switch between utilization view modes', async ({ page }) => {
      await spotPage.viewSpotUtilization()
      
      // Test different view modes
      await spotPage.changeUtilizationView('revenue')
      await expect(page.locator('[data-testid="chart-title"]')).toContainText('Revenue Analysis')
      
      await spotPage.changeUtilizationView('sessions')
      await expect(page.locator('[data-testid="chart-title"]')).toContainText('Sessions Analysis')
      
      await spotPage.changeUtilizationView('efficiency')
      await expect(page.locator('[data-testid="chart-title"]')).toContainText('Efficiency Analysis')
    })

    test('should change chart types', async ({ page }) => {
      await spotPage.viewSpotUtilization()
      
      // Test different chart types
      await spotPage.changeChartType('scatter')
      await expect(page.locator('[data-testid="scatter-chart"]')).toBeVisible()
      
      await spotPage.changeChartType('combined')
      await expect(page.locator('[data-testid="combined-chart"]')).toBeVisible()
      
      await spotPage.changeChartType('bar')
      await expect(page.locator('[data-testid="bar-chart"]')).toBeVisible()
    })

    test('should show top performers and underperformers', async ({ page }) => {
      await spotPage.viewSpotUtilization()
      
      await expect(page.locator('[data-testid="top-performers"]')).toBeVisible()
      await expect(page.locator('[data-testid="needs-attention"]')).toBeVisible()
      
      // Should show recommendations
      await expect(page.locator('[data-testid="recommendations"]')).toBeVisible()
    })
  })

  test.describe('Export Functionality', () => {
    test('should export spots data as CSV', async ({ page }) => {
      const downloadPromise = page.waitForEvent('download')
      
      await page.click('[data-testid="export-button"]')
      await page.selectOption('[data-testid="export-format"]', 'csv')
      await page.click('[data-testid="confirm-export"]')
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/spots.*\.csv$/)
    })

    test('should export spots data as Excel', async ({ page }) => {
      const downloadPromise = page.waitForEvent('download')
      
      await page.click('[data-testid="export-button"]')
      await page.selectOption('[data-testid="export-format"]', 'excel')
      await page.click('[data-testid="confirm-export"]')
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/spots.*\.xlsx?$/)
    })

    test('should export filtered spots only', async ({ page }) => {
      await spotPage.filterByStatus('available')
      
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="export-button"]')
      await page.click('[data-testid="confirm-export"]')
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/spots-filtered.*\.csv$/)
    })
  })

  test.describe('Error Handling and Validation', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('/api/spots**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Internal server error'
          })
        })
      })

      await page.reload()
      await spotPage.expectErrorMessage('Failed to fetch parking spots')
    })

    test('should validate required fields in spot form', async ({ page }) => {
      await page.click('[data-testid="add-spot-button"]')
      
      // Try to save without filling required fields
      await page.click('[data-testid="save-spot-button"]')
      
      await expect(page.locator('[data-testid="spot-number-error"]')).toContainText('Spot number is required')
      await expect(page.locator('[data-testid="save-spot-button"]')).toBeDisabled()
    })

    test('should handle duplicate spot number error', async ({ page }) => {
      await page.route('/api/spots', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Spot number already exists'
            })
          })
        }
      })

      await page.click('[data-testid="add-spot-button"]')
      await page.fill('[data-testid="spot-number"]', 'A-001')
      await page.fill('[data-testid="floor"]', '1')
      await page.click('[data-testid="save-spot-button"]')
      
      await spotPage.expectErrorMessage('Spot number already exists')
    })

    test('should handle network connectivity issues', async ({ page }) => {
      // Simulate network failure
      await page.route('/api/**', async (route) => {
        await route.abort('internetdisconnected')
      })

      await page.reload()
      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    })

    test('should show loading states during operations', async ({ page }) => {
      // Mock slow API response
      await page.route('/api/spots/*/status', async (route) => {
        await page.waitForTimeout(2000)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      })

      await spotPage.changeSpotStatus('A-001', 'maintenance')
      
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Grid should stack on mobile
      await expect(page.locator('[data-testid="spots-grid"]')).toHaveClass(/mobile-stack/)
      
      // Filter controls should collapse
      await expect(page.locator('[data-testid="filter-toggle"]')).toBeVisible()
    })

    test('should work on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Should show fewer spots per row
      await expect(page.locator('[data-testid="spots-grid"]')).toHaveClass(/tablet/)
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab through spot tiles
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="spot-tile-A-001"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="spot-tile-A-002"]')).toBeFocused()
      
      // Enter key should activate spot
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-testid="spot-details-A-002"]')).toBeVisible()
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await expect(page.locator('[data-testid="spot-tile-A-001"]')).toHaveAttribute('aria-label', /Spot A-001/)
      await expect(page.locator('[data-testid="add-spot-button"]')).toHaveAttribute('aria-label', 'Add new parking spot')
    })

    test('should announce status changes to screen readers', async ({ page }) => {
      await spotPage.changeSpotStatus('A-001', 'maintenance')
      
      await expect(page.locator('[data-testid="sr-announcement"]')).toHaveText('Spot A-001 status changed to maintenance')
    })
  })
})
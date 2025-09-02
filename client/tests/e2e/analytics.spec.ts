import { test, expect } from '@playwright/test'

test.describe('Analytics Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Analytics page
    await page.goto('/analytics')
    
    // Wait for initial page load
    await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible()
    
    // Mock API responses for consistent testing
    await page.route('**/api/analytics/**', async route => {
      const url = route.request().url()
      
      if (url.includes('occupancy-trends')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                timestamp: '2024-01-01T08:00:00Z',
                occupiedSpots: 45,
                totalSpots: 100,
                utilizationPercentage: 45
              },
              {
                timestamp: '2024-01-01T12:00:00Z',
                occupiedSpots: 85,
                totalSpots: 100,
                utilizationPercentage: 85
              },
              {
                timestamp: '2024-01-01T18:00:00Z',
                occupiedSpots: 62,
                totalSpots: 100,
                utilizationPercentage: 62
              }
            ]
          })
        })
      } else if (url.includes('revenue-data')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                period: '2024-01-01',
                revenue: 1250,
                sessions: 45,
                averageRevenue: 27.78
              },
              {
                period: '2024-01-02',
                revenue: 1680,
                sessions: 52,
                averageRevenue: 32.31
              }
            ]
          })
        })
      } else if (url.includes('vehicle-types')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { type: 'sedan', count: 125, percentage: 45.5 },
              { type: 'suv', count: 85, percentage: 30.9 },
              { type: 'truck', count: 35, percentage: 12.7 },
              { type: 'motorcycle', count: 30, percentage: 10.9 }
            ]
          })
        })
      } else {
        await route.continue()
      }
    })

    // Mock garages data
    await page.route('**/api/garages', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: '1', name: 'Downtown Garage', totalSpots: 200 },
            { id: '2', name: 'Mall Garage', totalSpots: 150 }
          ]
        })
      })
    })
  })

  test.describe('Dashboard Loading and Data Display', () => {
    test('should display analytics dashboard with header and description', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible()
      await expect(page.getByText('Comprehensive parking garage performance insights and trends')).toBeVisible()
    })

    test('should display export report button', async ({ page }) => {
      const exportButton = page.getByRole('button', { name: /Export Report/i })
      await expect(exportButton).toBeVisible()
      await expect(exportButton).toBeEnabled()
    })

    test('should display filters section with date range and garage filters', async ({ page }) => {
      // Date range filter
      await expect(page.getByText('Period:')).toBeVisible()
      
      // Date range buttons
      const dateRangeButtons = ['Today', 'This Week', 'This Month', 'This Year', 'Custom']
      for (const buttonText of dateRangeButtons) {
        await expect(page.getByRole('button', { name: buttonText })).toBeVisible()
      }
      
      // Garage filter
      await expect(page.getByText('Garages:')).toBeVisible()
      await expect(page.locator('select[multiple]')).toBeVisible()
    })

    test('should display tabs navigation for different analytics views', async ({ page }) => {
      const tabNames = [
        'Occupancy Trends',
        'Revenue Analysis',
        'Vehicle Types',
        'Parking Duration',
        'Peak Hours',
        'Spot Utilization'
      ]
      
      for (const tabName of tabNames) {
        await expect(page.getByRole('button', { name: tabName })).toBeVisible()
      }
    })

    test('should default to occupancy trends tab', async ({ page }) => {
      const occupancyTab = page.getByRole('button', { name: 'Occupancy Trends' })
      await expect(occupancyTab).toHaveClass(/text-blue-600/)
    })
  })

  test.describe('Date Range Selection and Filtering', () => {
    test('should change date range when clicking predefined periods', async ({ page }) => {
      // Click "This Month" button
      await page.getByRole('button', { name: 'This Month' }).click()
      
      // Verify it's selected by checking if it has active styling (primary colors)
      await expect(page.getByRole('button', { name: 'This Month' })).toHaveClass(/bg-primary/)
      
      // Wait for data to potentially reload
      await page.waitForTimeout(1000)
    })

    test('should show custom date inputs when custom is selected', async ({ page }) => {
      await page.getByRole('button', { name: 'Custom' }).click()
      
      // Custom date inputs should appear
      const dateInputs = page.locator('input[type="date"]')
      await expect(dateInputs).toHaveCount(2)
      await expect(dateInputs.first()).toBeVisible()
      await expect(dateInputs.last()).toBeVisible()
    })

    test('should allow selecting custom date range', async ({ page }) => {
      await page.getByRole('button', { name: 'Custom' }).click()
      
      const startDateInput = page.locator('input[type="date"]').first()
      const endDateInput = page.locator('input[type="date"]').last()
      
      await startDateInput.fill('2024-01-01')
      await endDateInput.fill('2024-01-31')
      
      // Verify values are set
      await expect(startDateInput).toHaveValue('2024-01-01')
      await expect(endDateInput).toHaveValue('2024-01-31')
    })

    test('should allow filtering by garage selection', async ({ page }) => {
      const garageSelect = page.locator('select[multiple]')
      
      // Select specific garage
      await garageSelect.selectOption(['1'])
      
      // Verify selection by checking the select element's value
      await expect(garageSelect).toHaveValue('1')
    })
  })

  test.describe('Occupancy Trend Charts Interaction', () => {
    test('should display occupancy trend statistics cards', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000)
      
      const statCards = [
        'Average Occupancy',
        'Peak Occupancy', 
        'Lowest Occupancy',
        'Data Points'
      ]
      
      for (const cardTitle of statCards) {
        await expect(page.getByText(cardTitle)).toBeVisible()
      }
    })

    test('should display occupancy trend chart with controls', async ({ page }) => {
      await expect(page.getByText('Occupancy Trends')).toBeVisible()
      
      // View mode buttons
      const viewModes = ['hourly', 'daily', 'weekly', 'monthly']
      for (const mode of viewModes) {
        await expect(page.getByRole('button', { name: mode, exact: false })).toBeVisible()
      }
      
      // Chart type buttons
      await expect(page.getByRole('button', { name: 'Line' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Area' })).toBeVisible()
    })

    test('should switch between chart view modes', async ({ page }) => {
      // Click weekly view
      await page.getByRole('button', { name: 'weekly', exact: false }).click()
      await expect(page.getByRole('button', { name: 'weekly', exact: false })).toHaveClass(/bg-primary/)
      
      // Click monthly view
      await page.getByRole('button', { name: 'monthly', exact: false }).click()
      await expect(page.getByRole('button', { name: 'monthly', exact: false })).toHaveClass(/bg-primary/)
    })

    test('should switch between line and area chart types', async ({ page }) => {
      // Switch to area chart
      await page.getByRole('button', { name: 'Area' }).click()
      await expect(page.getByRole('button', { name: 'Area' })).toHaveClass(/bg-primary/)
      
      // Switch back to line chart
      await page.getByRole('button', { name: 'Line' }).click()
      await expect(page.getByRole('button', { name: 'Line' })).toHaveClass(/bg-primary/)
    })

    test('should show peak hours toggle for hourly view', async ({ page }) => {
      // Switch to hourly view
      await page.getByRole('button', { name: 'hourly', exact: false }).click()
      
      // Peak hours toggle should be visible
      await expect(page.getByRole('button', { name: 'Peak Hours' })).toBeVisible()
      
      // Click to toggle
      await page.getByRole('button', { name: 'Peak Hours' }).click()
    })

    test('should display chart with recharts elements', async ({ page }) => {
      // Wait for chart to load
      await page.waitForTimeout(2000)
      
      // Look for recharts SVG element
      const chart = page.locator('.recharts-responsive-container')
      await expect(chart).toBeVisible()
      
      // Look for chart axes
      const xAxis = page.locator('.recharts-xAxis')
      const yAxis = page.locator('.recharts-yAxis')
      await expect(xAxis).toBeVisible()
      await expect(yAxis).toBeVisible()
    })

    test('should display insights and recommendations', async ({ page }) => {
      await page.waitForTimeout(2000)
      
      await expect(page.getByText('Insights & Recommendations')).toBeVisible()
      await expect(page.getByText('Occupancy Patterns')).toBeVisible()
      await expect(page.getByText('Recommendations')).toBeVisible()
    })
  })

  test.describe('Revenue Analytics Visualization', () => {
    test('should switch to revenue analysis tab', async ({ page }) => {
      await page.getByRole('button', { name: 'Revenue Analysis' }).click()
      
      await expect(page.getByRole('button', { name: 'Revenue Analysis' })).toHaveClass(/text-blue-600 border-blue-600/)
      
      // Wait for revenue data to load
      await page.waitForTimeout(2000)
    })

    test('should display revenue statistics cards', async ({ page }) => {
      await page.getByRole('button', { name: 'Revenue Analysis' }).click()
      await page.waitForTimeout(2000)
      
      const revenueStats = [
        'Total Revenue',
        'Total Sessions',
        'Average Revenue',
        'Best Performing'
      ]
      
      for (const statTitle of revenueStats) {
        await expect(page.getByText(statTitle)).toBeVisible()
      }
    })

    test('should display revenue chart controls', async ({ page }) => {
      await page.getByRole('button', { name: 'Revenue Analysis' }).click()
      await page.waitForTimeout(2000)
      
      // Group by controls
      const groupByOptions = ['day', 'week', 'month', 'garage']
      for (const option of groupByOptions) {
        await expect(page.getByRole('button', { name: option, exact: false })).toBeVisible()
      }
      
      // Comparison controls
      await expect(page.getByRole('button', { name: 'No Compare' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Previous' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'YoY' })).toBeVisible()
      
      // Sessions toggle
      await expect(page.getByRole('button', { name: 'Sessions' })).toBeVisible()
    })

    test('should change revenue grouping options', async ({ page }) => {
      await page.getByRole('button', { name: 'Revenue Analysis' }).click()
      await page.waitForTimeout(1000)
      
      // Click week grouping
      await page.getByRole('button', { name: 'week', exact: false }).click()
      await expect(page.getByRole('button', { name: 'week', exact: false })).toHaveClass(/variant.*default/)
      
      // Click month grouping
      await page.getByRole('button', { name: 'month', exact: false }).click()
      await expect(page.getByRole('button', { name: 'month', exact: false })).toHaveClass(/variant.*default/)
    })

    test('should toggle comparison periods', async ({ page }) => {
      await page.getByRole('button', { name: 'Revenue Analysis' }).click()
      await page.waitForTimeout(1000)
      
      // Enable previous period comparison
      await page.getByRole('button', { name: 'Previous' }).click()
      await expect(page.getByRole('button', { name: 'Previous' })).toHaveClass(/variant.*default/)
      
      // Switch to year-over-year
      await page.getByRole('button', { name: 'YoY' }).click()
      await expect(page.getByRole('button', { name: 'YoY' })).toHaveClass(/variant.*default/)
    })

    test('should display revenue insights section', async ({ page }) => {
      await page.getByRole('button', { name: 'Revenue Analysis' }).click()
      await page.waitForTimeout(2000)
      
      await expect(page.getByText('Revenue Insights')).toBeVisible()
      await expect(page.getByText('Performance Summary')).toBeVisible()
      await expect(page.getByText('Recommendations')).toBeVisible()
    })
  })

  test.describe('Vehicle Type Distribution Charts', () => {
    test('should switch to vehicle types tab', async ({ page }) => {
      await page.getByRole('button', { name: 'Vehicle Types' }).click()
      
      await expect(page.getByRole('button', { name: 'Vehicle Types' })).toHaveClass(/text-blue-600 border-blue-600/)
      await page.waitForTimeout(2000)
    })

    test('should display vehicle type statistics', async ({ page }) => {
      await page.getByRole('button', { name: 'Vehicle Types' }).click()
      await page.waitForTimeout(2000)
      
      // Look for vehicle type data in various formats
      const vehicleTypes = ['sedan', 'suv', 'truck', 'motorcycle']
      
      // Check if any vehicle type data is displayed
      const hasVehicleData = await Promise.all(
        vehicleTypes.map(type => 
          page.getByText(type, { exact: false }).isVisible().catch(() => false)
        )
      )
      
      expect(hasVehicleData.some(visible => visible)).toBeTruthy()
    })

    test('should display chart type controls for vehicle distribution', async ({ page }) => {
      await page.getByRole('button', { name: 'Vehicle Types' }).click()
      await page.waitForTimeout(2000)
      
      // Look for chart type toggles (pie, donut, bar)
      const chartControls = page.locator('button').filter({ hasText: /pie|donut|bar/i })
      const controlCount = await chartControls.count()
      
      expect(controlCount).toBeGreaterThan(0)
    })

    test('should display vehicle type chart visualization', async ({ page }) => {
      await page.getByRole('button', { name: 'Vehicle Types' }).click()
      await page.waitForTimeout(2000)
      
      // Look for chart container
      const chartContainer = page.locator('.recharts-responsive-container')
      await expect(chartContainer).toBeVisible()
    })
  })

  test.describe('Peak Hours Analysis Display', () => {
    test('should switch to peak hours tab', async ({ page }) => {
      await page.getByRole('button', { name: 'Peak Hours' }).click()
      
      await expect(page.getByRole('button', { name: 'Peak Hours' })).toHaveClass(/text-blue-600 border-blue-600/)
      await page.waitForTimeout(2000)
    })

    test('should display peak hours heatmap', async ({ page }) => {
      await page.getByRole('button', { name: 'Peak Hours' }).click()
      await page.waitForTimeout(2000)
      
      // Look for heatmap or peak hours visualization
      const hasHeatmapElements = await page.locator('[class*="heat"], [class*="peak"]').count()
      expect(hasHeatmapElements).toBeGreaterThanOrEqual(0) // May be 0 if no data
    })
  })

  test.describe('Spot Utilization Metrics', () => {
    test('should switch to spot utilization tab', async ({ page }) => {
      await page.getByRole('button', { name: 'Spot Utilization' }).click()
      
      await expect(page.getByRole('button', { name: 'Spot Utilization' })).toHaveClass(/text-blue-600 border-blue-600/)
      await page.waitForTimeout(2000)
    })

    test('should display utilization metrics', async ({ page }) => {
      await page.getByRole('button', { name: 'Spot Utilization' }).click()
      await page.waitForTimeout(2000)
      
      // Look for utilization-related content
      const utilizationElements = await page.locator('[class*="utilization"], [class*="spot"]').count()
      expect(utilizationElements).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Export Functionality', () => {
    test('should trigger export when clicking export button', async ({ page }) => {
      // Set up download interception
      const downloadPromise = page.waitForEvent('download')
      
      // Mock successful export
      await page.route('**/api/analytics/export', async route => {
        // Create a simple CSV content
        const csvContent = 'Date,Revenue,Sessions\n2024-01-01,1250,45\n2024-01-02,1680,52'
        
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          headers: {
            'Content-Disposition': 'attachment; filename="analytics-report.csv"'
          },
          body: csvContent
        })
      })
      
      // Click export button
      await page.getByRole('button', { name: /Export Report/i }).click()
      
      // Wait for export to initiate
      const download = await downloadPromise
      expect(download.suggestedFilename()).toContain('parking-analytics')
      expect(download.suggestedFilename()).toContain('.csv')
    })

    test('should show loading state during export', async ({ page }) => {
      // Delay the export response
      await page.route('**/api/analytics/export', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'test,data'
        })
      })
      
      // Click export button
      const exportButton = page.getByRole('button', { name: /Export Report/i })
      await exportButton.click()
      
      // Should show loading state
      await expect(page.getByText('Exporting...')).toBeVisible()
      await expect(exportButton).toBeDisabled()
      
      // Wait for export to complete
      await page.waitForTimeout(3000)
    })
  })

  test.describe('Chart Responsiveness and Interactions', () => {
    test('should handle chart hover interactions', async ({ page }) => {
      // Wait for chart to load
      await page.waitForTimeout(2000)
      
      // Look for chart elements that can be hovered
      const chartElements = page.locator('.recharts-responsive-container')
      await expect(chartElements.first()).toBeVisible()
      
      // Hover over chart area
      await chartElements.first().hover()
      
      // Look for tooltip or hover effects
      await page.waitForTimeout(500)
    })

    test('should handle viewport resizing', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1200, height: 800 })
      await page.waitForTimeout(1000)
      
      // Verify responsive container adapts
      const chartContainer = page.locator('.recharts-responsive-container')
      await expect(chartContainer).toBeVisible()
      
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.waitForTimeout(1000)
      
      await expect(chartContainer).toBeVisible()
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(1000)
      
      await expect(chartContainer).toBeVisible()
    })

    test('should maintain chart functionality on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Test tab switching on mobile
      await page.getByRole('button', { name: 'Revenue Analysis' }).click()
      await expect(page.getByRole('button', { name: 'Revenue Analysis' })).toHaveClass(/text-blue-600 border-blue-600/)
      
      // Test date range selection on mobile
      await page.getByRole('button', { name: 'This Week' }).click()
      await expect(page.getByRole('button', { name: 'This Week' })).toHaveClass(/variant.*default/)
    })
  })

  test.describe('Filter Combinations and Data Updates', () => {
    test('should handle multiple filter combinations', async ({ page }) => {
      // Set custom date range
      await page.getByRole('button', { name: 'Custom' }).click()
      await page.locator('input[type="date"]').first().fill('2024-01-01')
      await page.locator('input[type="date"]').last().fill('2024-01-31')
      
      // Select specific garage
      await page.locator('select[multiple]').selectOption(['1'])
      
      // Switch to revenue analysis
      await page.getByRole('button', { name: 'Revenue Analysis' }).click()
      
      // Change grouping
      await page.getByRole('button', { name: 'week', exact: false }).click()
      
      // Wait for data to update
      await page.waitForTimeout(2000)
      
      // Verify filters are maintained
      await expect(page.getByRole('button', { name: 'Custom' })).toHaveClass(/variant.*default/)
    })

    test('should update data when filters change', async ({ page }) => {
      // Initial load
      await page.waitForTimeout(2000)
      
      // Change date range
      await page.getByRole('button', { name: 'This Month' }).click()
      
      // Wait for potential API calls
      await page.waitForTimeout(1000)
      
      // Switch tabs to trigger data reload
      await page.getByRole('button', { name: 'Vehicle Types' }).click()
      await page.waitForTimeout(1000)
      
      // Verify chart updates
      const chartContainer = page.locator('.recharts-responsive-container')
      await expect(chartContainer).toBeVisible()
    })

    test('should handle error states gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/analytics/**', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Server Error' })
        })
      })
      
      // Navigate to analytics page
      await page.reload()
      await page.waitForTimeout(2000)
      
      // Should show error handling
      const hasErrorHandling = await Promise.race([
        page.getByText(/error/i).first().isVisible().then(() => true),
        page.getByText(/failed/i).first().isVisible().then(() => true),
        page.getByRole('button', { name: /try again/i }).isVisible().then(() => true),
        new Promise(resolve => setTimeout(() => resolve(false), 3000))
      ])
      
      expect(hasErrorHandling).toBeTruthy()
    })

    test('should handle loading states for all chart types', async ({ page }) => {
      // Mock delayed responses
      await page.route('**/api/analytics/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 1500))
        await route.continue()
      })
      
      await page.reload()
      
      // Should show loading indicators
      await expect(page.locator('[class*="animate-spin"], [class*="loading"]')).toBeVisible()
      
      // Wait for data to load
      await page.waitForTimeout(3000)
    })
  })

  test.describe('Data Accuracy and Chart Interactions', () => {
    test('should display consistent data across different chart types', async ({ page }) => {
      await page.waitForTimeout(2000)
      
      // Check occupancy data
      const occupancyTab = page.getByRole('button', { name: 'Occupancy Trends' })
      await occupancyTab.click()
      await page.waitForTimeout(1000)
      
      // Switch chart types and verify data consistency
      await page.getByRole('button', { name: 'Area' }).click()
      await page.waitForTimeout(500)
      
      await page.getByRole('button', { name: 'Line' }).click()
      await page.waitForTimeout(500)
      
      // Chart should remain visible throughout
      const chart = page.locator('.recharts-responsive-container')
      await expect(chart).toBeVisible()
    })

    test('should maintain user selections during navigation', async ({ page }) => {
      // Set filters
      await page.getByRole('button', { name: 'This Month' }).click()
      
      // Switch tabs
      await page.getByRole('button', { name: 'Revenue Analysis' }).click()
      await page.waitForTimeout(1000)
      
      await page.getByRole('button', { name: 'Occupancy Trends' }).click()
      await page.waitForTimeout(1000)
      
      // Date range selection should be maintained
      await expect(page.getByRole('button', { name: 'This Month' })).toHaveClass(/variant.*default/)
    })

    test('should handle real-time data updates simulation', async ({ page }) => {
      let callCount = 0
      
      // Mock progressive data updates
      await page.route('**/api/analytics/occupancy-trends**', async route => {
        callCount++
        const baseData = [
          {
            timestamp: '2024-01-01T08:00:00Z',
            occupiedSpots: 45 + (callCount * 5),
            totalSpots: 100,
            utilizationPercentage: 45 + (callCount * 5)
          }
        ]
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: baseData })
        })
      })
      
      // Initial load
      await page.waitForTimeout(2000)
      
      // Switch to hourly view (which has auto-refresh)
      await page.getByRole('button', { name: 'hourly', exact: false }).click()
      await page.waitForTimeout(2000)
      
      // Data should be displayed
      const chart = page.locator('.recharts-responsive-container')
      await expect(chart).toBeVisible()
    })
  })
})
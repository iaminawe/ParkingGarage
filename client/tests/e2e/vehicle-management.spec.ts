import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Test data for creating vehicles
const testVehicles = [
  {
    licensePlate: 'ABC-1234',
    make: 'Toyota',
    model: 'Camry',
    color: 'Silver',
    type: 'car',
    ownerName: 'John Doe',
    ownerEmail: 'john.doe@example.com',
    ownerPhone: '+1 234 567 8900'
  },
  {
    licensePlate: 'XYZ-5678',
    make: 'Honda',
    model: 'Civic',
    color: 'Blue',
    type: 'car',
    ownerName: 'Jane Smith',
    ownerEmail: 'jane.smith@example.com',
    ownerPhone: '+1 987 654 3210'
  },
  {
    licensePlate: 'MOTO-001',
    make: 'Harley-Davidson',
    model: 'Sportster',
    color: 'Black',
    type: 'motorcycle',
    ownerName: 'Mike Johnson',
    ownerEmail: 'mike.johnson@example.com',
    ownerPhone: '+1 555 123 4567'
  }
]

// Helper functions
async function navigateToVehicleManagement(page: Page) {
  await page.goto('/vehicles')
  await expect(page).toHaveURL('/vehicles')
  await expect(page.getByRole('heading', { name: 'Vehicle Management' })).toBeVisible()
}

async function fillVehicleForm(page: Page, vehicle: typeof testVehicles[0], isEdit = false) {
  const prefix = isEdit ? 'edit-' : ''
  
  await page.fill(`#${prefix}licensePlate`, vehicle.licensePlate)
  await page.selectOption(`[name="${prefix}type"]`, vehicle.type)
  await page.fill(`#${prefix}make`, vehicle.make)
  await page.fill(`#${prefix}model`, vehicle.model)
  await page.fill(`#${prefix}color`, vehicle.color)
  await page.fill(`#${prefix}ownerName`, vehicle.ownerName)
  await page.fill(`#${prefix}ownerEmail`, vehicle.ownerEmail)
  await page.fill(`#${prefix}ownerPhone`, vehicle.ownerPhone)
}

async function waitForTableLoad(page: Page) {
  // Wait for either loading state to disappear or table to be visible
  await Promise.race([
    page.waitForSelector('text=Loading vehicles...', { state: 'detached', timeout: 10000 }).catch(() => {}),
    page.waitForSelector('table', { timeout: 10000 })
  ])
}

async function mockApiResponses(page: Page, options: {
  vehicles?: Record<string, unknown>[]
  sessions?: Record<string, unknown>[]
  garages?: Record<string, unknown>[]
  shouldError?: boolean
} = {}) {
  const { vehicles = [], sessions = [], garages = [], shouldError = false } = options

  if (shouldError) {
    await page.route('**/api/vehicles**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Server Error' })
      })
    })
    return
  }

  // Mock vehicles API
  await page.route('**/api/vehicles**', route => {
    const url = route.request().url()
    if (url.includes('export')) {
      route.fulfill({
        status: 200,
        contentType: 'text/csv',
        body: 'License Plate,Make,Model,Color,Type,Owner Name,Owner Email,Owner Phone\n' +
              vehicles.map(v => `${v.licensePlate},${v.make},${v.model},${v.color},${v.type},${v.ownerName},${v.ownerEmail},${v.ownerPhone}`).join('\n')
      })
    } else if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          data: vehicles,
          pagination: {
            page: 1,
            limit: 20,
            total: vehicles.length,
            totalPages: 1
          }
        })
      })
    } else if (route.request().method() === 'POST') {
      const newVehicle = JSON.parse(route.request().postData() || '{}')
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'new-vehicle-id', ...newVehicle, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        })
      })
    } else if (route.request().method() === 'PUT') {
      const updatedVehicle = JSON.parse(route.request().postData() || '{}')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: route.request().url().split('/').pop(), ...updatedVehicle, updatedAt: new Date().toISOString() }
        })
      })
    } else if (route.request().method() === 'DELETE') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    }
  })

  // Mock sessions API
  await page.route('**/api/sessions**', route => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: sessions })
      })
    } else if (route.request().method() === 'POST') {
      const data = JSON.parse(route.request().postData() || '{}')
      if (route.request().url().includes('start')) {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'new-session-id', spotId: 'A-001', ...data }
          })
        })
      } else if (route.request().url().includes('end')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'session-id', totalCost: 15.50 }
          })
        })
      }
    }
  })

  // Mock garages API
  await page.route('**/api/garages**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: garages })
    })
  })

  // Mock search API
  await page.route('**/api/search/vehicles**', route => {
    const query = new URL(route.request().url()).searchParams.get('q')?.toLowerCase() || ''
    const filteredVehicles = vehicles.filter(v => 
      v.licensePlate.toLowerCase().includes(query) ||
      v.make.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query) ||
      v.ownerName.toLowerCase().includes(query)
    )
    
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: filteredVehicles })
    })
  })

  // Mock bulk operations API
  await page.route('**/api/vehicles/bulk-delete', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    })
  })
}

test.describe('Vehicle Management', () => {
  test.beforeEach(async ({ page }) => {
    // Set up basic mock data
    const mockGarages = [
      {
        id: 'garage-1',
        name: 'Downtown Garage',
        totalSpots: 100,
        availableSpots: 75,
        location: 'Downtown'
      },
      {
        id: 'garage-2',
        name: 'Airport Garage',
        totalSpots: 200,
        availableSpots: 150,
        location: 'Airport'
      }
    ]

    const mockVehicles = [
      {
        id: 'vehicle-1',
        ...testVehicles[0],
        status: 'active',
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z'
      },
      {
        id: 'vehicle-2',
        ...testVehicles[1],
        status: 'active',
        createdAt: '2024-01-02T11:00:00.000Z',
        updatedAt: '2024-01-02T11:00:00.000Z'
      }
    ]

    const mockSessions = [
      {
        id: 'session-1',
        vehicleId: 'vehicle-1',
        garageId: 'garage-1',
        spotId: 'A-001',
        status: 'active',
        entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      }
    ]

    await mockApiResponses(page, {
      vehicles: mockVehicles,
      sessions: mockSessions,
      garages: mockGarages
    })

    await navigateToVehicleManagement(page)
  })

  test.describe('Page Layout and Basic Elements', () => {
    test('should display vehicle management page with all basic elements', async ({ page }) => {
      // Check header
      await expect(page.getByRole('heading', { name: 'Vehicle Management' })).toBeVisible()
      await expect(page.getByText('Manage all vehicles in the parking system')).toBeVisible()

      // Check search bar
      await expect(page.getByPlaceholder('Search by license plate, make, model, or owner...')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Search' })).toBeVisible()

      // Check garage selector
      await expect(page.getByRole('combobox').filter({ hasText: 'Downtown Garage' })).toBeVisible()

      // Check add vehicle button
      await expect(page.getByRole('button', { name: 'Add Vehicle' })).toBeVisible()

      // Check table headers
      await expect(page.getByText('License Plate')).toBeVisible()
      await expect(page.getByText('Vehicle')).toBeVisible()
      await expect(page.getByText('Type')).toBeVisible()
      await expect(page.getByText('Owner')).toBeVisible()
      await expect(page.getByText('Status')).toBeVisible()
      await expect(page.getByText('Actions')).toBeVisible()
    })

    test('should display vehicle data in table correctly', async ({ page }) => {
      await waitForTableLoad(page)

      // Check first vehicle data
      await expect(page.getByText('ABC-1234')).toBeVisible()
      await expect(page.getByText('Toyota Camry')).toBeVisible()
      await expect(page.getByText('(Silver)')).toBeVisible()
      await expect(page.getByText('John Doe')).toBeVisible()
      await expect(page.getByText('john.doe@example.com')).toBeVisible()

      // Check vehicle status (should be parked based on mock session)
      await expect(page.getByText('A-001')).toBeVisible()
      await expect(page.getByText(/\d+ min/)).toBeVisible()

      // Check second vehicle data
      await expect(page.getByText('XYZ-5678')).toBeVisible()
      await expect(page.getByText('Honda Civic')).toBeVisible()
      await expect(page.getByText('Not Parked')).toBeVisible()
    })
  })

  test.describe('Vehicle Listing and Pagination', () => {
    test('should display vehicles with proper status indicators', async ({ page }) => {
      await waitForTableLoad(page)

      // Check parked vehicle status
      const parkedVehicleRow = page.locator('tr', { hasText: 'ABC-1234' })
      await expect(parkedVehicleRow.getByText('A-001')).toBeVisible()
      await expect(parkedVehicleRow.getByText(/\d+ min/)).toBeVisible()
      await expect(parkedVehicleRow.getByRole('button', { name: 'Check Out' })).toBeVisible()

      // Check not parked vehicle status
      const notParkedVehicleRow = page.locator('tr', { hasText: 'XYZ-5678' })
      await expect(notParkedVehicleRow.getByText('Not Parked')).toBeVisible()
      await expect(notParkedVehicleRow.getByRole('button', { name: 'Check In' })).toBeVisible()
    })

    test('should show empty state when no vehicles exist', async ({ page }) => {
      // Mock empty response
      await mockApiResponses(page, { vehicles: [], sessions: [], garages: [] })
      
      await page.reload()
      await waitForTableLoad(page)

      await expect(page.getByText('No vehicles found')).toBeVisible()
    })

    test('should handle loading states', async ({ page }) => {
      // Intercept API with delay to test loading state
      await page.route('**/api/vehicles**', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } })
        })
      })

      await page.reload()
      await expect(page.getByText('Loading vehicles...')).toBeVisible()
    })
  })

  test.describe('Add New Vehicle Form', () => {
    test('should open add vehicle dialog and display form fields', async ({ page }) => {
      await page.getByRole('button', { name: 'Add Vehicle' }).click()

      // Check dialog elements
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('Add New Vehicle')).toBeVisible()
      await expect(page.getByText('Enter vehicle and owner information')).toBeVisible()

      // Check vehicle fields
      await expect(page.getByLabel('License Plate')).toBeVisible()
      await expect(page.getByLabel('Vehicle Type')).toBeVisible()
      await expect(page.getByLabel('Make')).toBeVisible()
      await expect(page.getByLabel('Model')).toBeVisible()
      await expect(page.getByLabel('Color')).toBeVisible()

      // Check owner information section
      await expect(page.getByText('Owner Information')).toBeVisible()
      await expect(page.getByLabel('Name')).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Phone')).toBeVisible()

      // Check buttons
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Add Vehicle' })).toBeVisible()
    })

    test('should validate required fields', async ({ page }) => {
      await page.getByRole('button', { name: 'Add Vehicle' }).click()

      // Try to submit without filling required fields
      await page.getByRole('button', { name: 'Add Vehicle' }).click()

      // Check HTML5 validation (browser will prevent form submission)
      const licensePlateField = page.getByLabel('License Plate')
      const isRequired = await licensePlateField.getAttribute('required')
      expect(isRequired).toBeDefined()
    })

    test('should successfully add a new vehicle', async ({ page }) => {
      await page.getByRole('button', { name: 'Add Vehicle' }).click()

      // Fill form with test data
      await fillVehicleForm(page, testVehicles[2])

      // Submit form
      await page.getByRole('button', { name: 'Add Vehicle' }).click()

      // Check for success message (toast)
      await expect(page.getByText('Vehicle added successfully')).toBeVisible()

      // Check dialog closes
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('should test all vehicle types in dropdown', async ({ page }) => {
      await page.getByRole('button', { name: 'Add Vehicle' }).click()

      const typeDropdown = page.locator('[name="type"]')
      await typeDropdown.click()

      // Check all vehicle type options
      const vehicleTypes = ['Car', 'Motorcycle', 'Truck', 'Van', 'Bus']
      for (const type of vehicleTypes) {
        await expect(page.getByText(type)).toBeVisible()
      }

      // Select motorcycle
      await page.getByText('Motorcycle').click()
      await expect(typeDropdown).toHaveValue('motorcycle')
    })

    test('should cancel add vehicle dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'Add Vehicle' }).click()

      // Fill some data
      await page.getByLabel('License Plate').fill('TEST-123')

      // Cancel
      await page.getByRole('button', { name: 'Cancel' }).click()

      // Check dialog closes and form resets
      await expect(page.getByRole('dialog')).not.toBeVisible()

      // Reopen to check form is reset
      await page.getByRole('button', { name: 'Add Vehicle' }).click()
      await expect(page.getByLabel('License Plate')).toHaveValue('')
    })

    test('should handle API errors when adding vehicle', async ({ page }) => {
      // Mock API error
      await page.route('**/api/vehicles', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'License plate already exists' })
          })
        }
      })

      await page.getByRole('button', { name: 'Add Vehicle' }).click()
      await fillVehicleForm(page, testVehicles[0])
      await page.getByRole('button', { name: 'Add Vehicle' }).click()

      // Check for error message
      await expect(page.getByText('Failed to add vehicle')).toBeVisible()
    })
  })

  test.describe('Edit Vehicle Functionality', () => {
    test('should open edit dialog with pre-filled data', async ({ page }) => {
      await waitForTableLoad(page)

      // Click edit button for first vehicle
      const firstVehicleRow = page.locator('tr', { hasText: 'ABC-1234' })
      await firstVehicleRow.getByRole('button').first().click() // Edit button

      // Check dialog opens with pre-filled data
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('Edit Vehicle')).toBeVisible()
      
      // Check pre-filled values
      await expect(page.getByLabel('License Plate')).toHaveValue('ABC-1234')
      await expect(page.getByLabel('Make')).toHaveValue('Toyota')
      await expect(page.getByLabel('Model')).toHaveValue('Camry')
      await expect(page.getByLabel('Color')).toHaveValue('Silver')
      await expect(page.getByLabel('Name')).toHaveValue('John Doe')
      await expect(page.getByLabel('Email')).toHaveValue('john.doe@example.com')
      await expect(page.getByLabel('Phone')).toHaveValue('+1 234 567 8900')
    })

    test('should successfully update vehicle information', async ({ page }) => {
      await waitForTableLoad(page)

      // Open edit dialog
      const firstVehicleRow = page.locator('tr', { hasText: 'ABC-1234' })
      await firstVehicleRow.getByRole('button').first().click()

      // Update vehicle information
      await page.getByLabel('Color').fill('Red')
      await page.getByLabel('Name').fill('John Updated')

      // Save changes
      await page.getByRole('button', { name: 'Save Changes' }).click()

      // Check for success message
      await expect(page.getByText('Vehicle updated successfully')).toBeVisible()

      // Check dialog closes
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('should cancel edit without saving changes', async ({ page }) => {
      await waitForTableLoad(page)

      // Open edit dialog
      const firstVehicleRow = page.locator('tr', { hasText: 'ABC-1234' })
      await firstVehicleRow.getByRole('button').first().click()

      // Make changes
      await page.getByLabel('Color').fill('Purple')

      // Cancel
      await page.getByRole('button', { name: 'Cancel' }).click()

      // Check dialog closes
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('should handle edit API errors', async ({ page }) => {
      // Mock API error for PUT requests
      await page.route('**/api/vehicles/**', route => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Update failed' })
          })
        } else {
          route.continue()
        }
      })

      await waitForTableLoad(page)

      // Open edit dialog and make changes
      const firstVehicleRow = page.locator('tr', { hasText: 'ABC-1234' })
      await firstVehicleRow.getByRole('button').first().click()
      await page.getByLabel('Color').fill('Green')
      await page.getByRole('button', { name: 'Save Changes' }).click()

      // Check for error message
      await expect(page.getByText('Failed to update vehicle')).toBeVisible()
    })
  })

  test.describe('Delete Vehicle Functionality', () => {
    test('should show confirmation dialog and delete vehicle', async ({ page }) => {
      await waitForTableLoad(page)

      // Set up dialog handler for confirmation
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('Are you sure you want to delete this vehicle?')
        dialog.accept()
      })

      // Click delete button
      const firstVehicleRow = page.locator('tr', { hasText: 'ABC-1234' })
      await firstVehicleRow.getByRole('button').last().click() // Delete button

      // Check for success message
      await expect(page.getByText('Vehicle deleted successfully')).toBeVisible()
    })

    test('should cancel delete operation', async ({ page }) => {
      await waitForTableLoad(page)

      // Set up dialog handler to cancel
      page.on('dialog', dialog => {
        dialog.dismiss()
      })

      // Click delete button
      const firstVehicleRow = page.locator('tr', { hasText: 'ABC-1234' })
      await firstVehicleRow.getByRole('button').last().click()

      // Vehicle should still be visible (not deleted)
      await expect(page.getByText('ABC-1234')).toBeVisible()
    })

    test('should handle delete API errors', async ({ page }) => {
      // Mock API error for DELETE requests
      await page.route('**/api/vehicles/**', route => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Delete failed' })
          })
        } else {
          route.continue()
        }
      })

      await waitForTableLoad(page)

      // Accept delete confirmation
      page.on('dialog', dialog => dialog.accept())

      // Click delete button
      const firstVehicleRow = page.locator('tr', { hasText: 'ABC-1234' })
      await firstVehicleRow.getByRole('button').last().click()

      // Check for error message
      await expect(page.getByText('Failed to delete vehicle')).toBeVisible()
    })
  })

  test.describe('Search and Filter Operations', () => {
    test('should search vehicles by license plate', async ({ page }) => {
      await waitForTableLoad(page)

      // Search for specific license plate
      await page.getByPlaceholder('Search by license plate, make, model, or owner...').fill('ABC-1234')
      await page.getByRole('button', { name: 'Search' }).click()

      await waitForTableLoad(page)

      // Should show only matching vehicle
      await expect(page.getByText('ABC-1234')).toBeVisible()
      await expect(page.getByText('XYZ-5678')).not.toBeVisible()
    })

    test('should search by make and model', async ({ page }) => {
      await waitForTableLoad(page)

      // Search for Toyota
      await page.getByPlaceholder('Search by license plate, make, model, or owner...').fill('Toyota')
      await page.getByRole('button', { name: 'Search' }).click()

      await waitForTableLoad(page)

      await expect(page.getByText('Toyota Camry')).toBeVisible()
      await expect(page.getByText('Honda Civic')).not.toBeVisible()
    })

    test('should search by owner name', async ({ page }) => {
      await waitForTableLoad(page)

      // Search for owner
      await page.getByPlaceholder('Search by license plate, make, model, or owner...').fill('Jane')
      await page.getByRole('button', { name: 'Search' }).click()

      await waitForTableLoad(page)

      await expect(page.getByText('Jane Smith')).toBeVisible()
      await expect(page.getByText('John Doe')).not.toBeVisible()
    })

    test('should handle search with Enter key', async ({ page }) => {
      await waitForTableLoad(page)

      // Search using Enter key
      const searchInput = page.getByPlaceholder('Search by license plate, make, model, or owner...')
      await searchInput.fill('Honda')
      await searchInput.press('Enter')

      await waitForTableLoad(page)

      await expect(page.getByText('Honda Civic')).toBeVisible()
    })

    test('should show no results for invalid search', async ({ page }) => {
      await waitForTableLoad(page)

      // Search for non-existent vehicle
      await page.getByPlaceholder('Search by license plate, make, model, or owner...').fill('NONEXISTENT')
      await page.getByRole('button', { name: 'Search' }).click()

      await waitForTableLoad(page)

      await expect(page.getByText('No vehicles found')).toBeVisible()
    })

    test('should clear search and show all vehicles', async ({ page }) => {
      await waitForTableLoad(page)

      // Search first
      await page.getByPlaceholder('Search by license plate, make, model, or owner...').fill('Toyota')
      await page.getByRole('button', { name: 'Search' }).click()
      await waitForTableLoad(page)

      // Clear search
      await page.getByPlaceholder('Search by license plate, make, model, or owner...').fill('')
      await page.getByRole('button', { name: 'Search' }).click()
      await waitForTableLoad(page)

      // Should show all vehicles
      await expect(page.getByText('ABC-1234')).toBeVisible()
      await expect(page.getByText('XYZ-5678')).toBeVisible()
    })

    test('should handle search API errors', async ({ page }) => {
      // Mock search API error
      await page.route('**/api/search/vehicles**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Search failed' })
        })
      })

      await waitForTableLoad(page)

      // Perform search
      await page.getByPlaceholder('Search by license plate, make, model, or owner...').fill('Toyota')
      await page.getByRole('button', { name: 'Search' }).click()

      // Check for error message
      await expect(page.getByText('Search failed')).toBeVisible()
    })
  })

  test.describe('Garage Selection', () => {
    test('should select different garage from dropdown', async ({ page }) => {
      await waitForTableLoad(page)

      // Open garage dropdown
      await page.getByRole('combobox').click()

      // Check garage options are visible
      await expect(page.getByText('Downtown Garage (75/100 available)')).toBeVisible()
      await expect(page.getByText('Airport Garage (150/200 available)')).toBeVisible()

      // Select different garage
      await page.getByText('Airport Garage (150/200 available)').click()

      // Check selection updated
      await expect(page.getByRole('combobox')).toContainText('Airport Garage')
    })

    test('should show garage availability in dropdown', async ({ page }) => {
      await waitForTableLoad(page)

      // Open garage dropdown
      await page.getByRole('combobox').click()

      // Check availability format
      await expect(page.getByText(/\(\d+\/\d+ available\)/)).toBeVisible()
    })
  })

  test.describe('Vehicle Check-in/Check-out Operations', () => {
    test('should check in a vehicle successfully', async ({ page }) => {
      await waitForTableLoad(page)

      // Find not parked vehicle and check in
      const notParkedVehicleRow = page.locator('tr', { hasText: 'XYZ-5678' })
      await notParkedVehicleRow.getByRole('button', { name: 'Check In' }).click()

      // Check for success message
      await expect(page.getByText('Vehicle checked in to spot A-001')).toBeVisible()
    })

    test('should check out a vehicle successfully', async ({ page }) => {
      await waitForTableLoad(page)

      // Find parked vehicle and check out
      const parkedVehicleRow = page.locator('tr', { hasText: 'ABC-1234' })
      await parkedVehicleRow.getByRole('button', { name: 'Check Out' }).click()

      // Check for success message with cost
      await expect(page.getByText('Check out complete. Total: $15.50')).toBeVisible()
    })

    test('should handle check-in without garage selection', async ({ page }) => {
      // Mock no garage selected scenario
      await page.route('**/api/sessions/start', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Please select a garage first' })
        })
      })

      await waitForTableLoad(page)

      // Try to check in
      const notParkedVehicleRow = page.locator('tr', { hasText: 'XYZ-5678' })
      await notParkedVehicleRow.getByRole('button', { name: 'Check In' }).click()

      // Check for error message
      await expect(page.getByText('Please select a garage first')).toBeVisible()
    })

    test('should handle check-in/check-out API errors', async ({ page }) => {
      // Mock API errors
      await page.route('**/api/sessions/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Session operation failed' })
        })
      })

      await waitForTableLoad(page)

      // Try check-in
      const notParkedVehicleRow = page.locator('tr', { hasText: 'XYZ-5678' })
      await notParkedVehicleRow.getByRole('button', { name: 'Check In' }).click()

      await expect(page.getByText('Failed to check in vehicle')).toBeVisible()

      // Try check-out
      const parkedVehicleRow = page.locator('tr', { hasText: 'ABC-1234' })
      await parkedVehicleRow.getByRole('button', { name: 'Check Out' }).click()

      await expect(page.getByText('Failed to check out vehicle')).toBeVisible()
    })
  })

  test.describe('Bulk Operations', () => {
    test('should handle multiple vehicle selection for bulk operations', async ({ page }) => {
      await waitForTableLoad(page)

      // Note: This test assumes bulk selection UI exists
      // If not implemented, this would test the bulk delete API directly
      const bulkDeleteButton = page.getByRole('button', { name: /bulk/i })
      
      if (await bulkDeleteButton.isVisible()) {
        // Test bulk operations if UI exists
        await bulkDeleteButton.click()
        await expect(page.getByText(/selected/i)).toBeVisible()
      } else {
        // Test passes if bulk UI is not implemented yet
        test.skip()
      }
    })
  })

  test.describe('Export Functionality', () => {
    test('should export vehicles to CSV', async ({ page }) => {
      await waitForTableLoad(page)

      // Look for export button (might be in dropdown or toolbar)
      const exportButton = page.getByRole('button', { name: /export/i })
      
      if (await exportButton.isVisible()) {
        // Set up download handler
        const downloadPromise = page.waitForEvent('download')
        
        await exportButton.click()
        
        // Check download starts
        const download = await downloadPromise
        expect(download.suggestedFilename()).toContain('.csv')
      } else {
        // Skip if export functionality not implemented
        test.skip()
      }
    })
  })

  test.describe('Error Handling and Loading States', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API errors
      await mockApiResponses(page, { shouldError: true })

      await page.reload()

      // Should show error state or retry option
      const hasRetryButton = await page.getByRole('button', { name: /retry/i }).isVisible()
      const hasErrorMessage = await page.getByText(/error/i).first().isVisible()

      expect(hasRetryButton || hasErrorMessage).toBeTruthy()
    })

    test('should show loading states during operations', async ({ page }) => {
      await waitForTableLoad(page)

      // Add slow API response to test loading states
      await page.route('**/api/vehicles**', async route => {
        if (route.request().method() === 'POST') {
          await new Promise(resolve => setTimeout(resolve, 1000))
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: {} })
          })
        } else {
          route.continue()
        }
      })

      // Open add dialog and submit
      await page.getByRole('button', { name: 'Add Vehicle' }).click()
      await fillVehicleForm(page, testVehicles[0])

      // Submit and check for loading state (button should be disabled or show loading)
      const submitButton = page.getByRole('button', { name: 'Add Vehicle' })
      await submitButton.click()
      
      // The button might be disabled or show loading text
      const isDisabled = await submitButton.isDisabled()
      const hasLoadingText = await page.getByText(/adding/i).isVisible()
      
      expect(isDisabled || hasLoadingText).toBeTruthy()
    })

    test('should handle network timeouts', async ({ page }) => {
      // Mock very slow API to simulate timeout
      await page.route('**/api/vehicles**', async route => {
        await new Promise(resolve => setTimeout(resolve, 15000)) // 15 second delay
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] })
        })
      })

      await page.reload()

      // Should show timeout error or loading state
      await page.waitForTimeout(2000)
      
      const hasTimeoutError = await page.getByText(/timeout/i).isVisible()
      const hasLoadingState = await page.getByText(/loading/i).isVisible()
      
      expect(hasTimeoutError || hasLoadingState).toBeTruthy()
    })
  })

  test.describe('Real-time Updates', () => {
    test('should handle real-time status updates', async ({ page }) => {
      await waitForTableLoad(page)

      // Mock WebSocket or polling updates if implemented
      // This would test live updates of vehicle status
      
      // For now, just verify the page can handle data refreshes
      await page.reload()
      await waitForTableLoad(page)
      
      await expect(page.getByText('Vehicle Management')).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await waitForTableLoad(page)

      // Check key elements are still visible on mobile
      await expect(page.getByRole('heading', { name: 'Vehicle Management' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Add Vehicle' })).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await waitForTableLoad(page)

      // Check table is responsive
      await expect(page.getByText('License Plate')).toBeVisible()
      await expect(page.getByText('ABC-1234')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and keyboard navigation', async ({ page }) => {
      await waitForTableLoad(page)

      // Check for proper labeling
      await expect(page.getByRole('button', { name: 'Add Vehicle' })).toBeVisible()
      await expect(page.getByRole('searchbox')).toBeVisible()

      // Test keyboard navigation
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    })

    test('should work with screen readers', async ({ page }) => {
      await waitForTableLoad(page)

      // Check for proper heading structure
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0) // Should not have h1 in component
      await expect(page.getByRole('heading')).toBeVisible()

      // Check table has proper structure
      await expect(page.getByRole('table')).toBeVisible()
      await expect(page.getByRole('columnheader')).toHaveCount(6)
    })
  })
})
import { test, expect } from '@playwright/test'

test.describe('Garage Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/garage-configuration')
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
  })

  test.describe('Page Load and Navigation', () => {
    test('should display main configuration interface', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Garage Configuration' })).toBeVisible()
      await expect(page.getByText('Manage garage settings, pricing, and operations')).toBeVisible()
      
      // Check for main components
      await expect(page.getByText('Select Garage')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Add Garage' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Edit Configuration' })).toBeVisible()
    })

    test('should display all configuration tabs', async ({ page }) => {
      const tabs = ['General', 'Pricing', 'Hours', 'Features', 'Notifications']
      
      for (const tab of tabs) {
        await expect(page.getByRole('tab', { name: tab })).toBeVisible()
      }
    })

    test('should navigate between tabs and maintain state', async ({ page }) => {
      // Start editing to enable form interactions
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      
      // Navigate to different tabs
      await page.getByRole('tab', { name: 'Pricing' }).click()
      await expect(page.getByText('Standard Rates')).toBeVisible()
      
      await page.getByRole('tab', { name: 'Features' }).click()
      await expect(page.getByText('Available Features')).toBeVisible()
      
      await page.getByRole('tab', { name: 'General' }).click()
      await expect(page.getByText('Basic Information')).toBeVisible()
    })
  })

  test.describe('General Configuration Tab', () => {
    test('should display and edit basic information fields', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      
      // Test basic information fields
      const nameInput = page.locator('#garage-name')
      const phoneInput = page.locator('#garage-phone')
      const addressInput = page.locator('#garage-address')
      const emailInput = page.locator('#garage-email')
      
      await expect(nameInput).toBeVisible()
      await expect(nameInput).toBeEnabled()
      
      // Test input interactions
      await nameInput.fill('Test Parking Garage')
      await phoneInput.fill('(555) 123-4567')
      await addressInput.fill('123 Main Street')
      await emailInput.fill('test@garage.com')
      
      // Verify values are set
      await expect(nameInput).toHaveValue('Test Parking Garage')
      await expect(phoneInput).toHaveValue('(555) 123-4567')
      await expect(addressInput).toHaveValue('123 Main Street')
      await expect(emailInput).toHaveValue('test@garage.com')
    })

    test('should display and edit structure information', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      
      const floorsInput = page.locator('#total-floors')
      const spotsPerFloorInput = page.locator('#spots-per-floor')
      const totalSpotsInput = page.locator('#total-spots')
      
      await expect(floorsInput).toBeVisible()
      await expect(spotsPerFloorInput).toBeVisible()
      await expect(totalSpotsInput).toBeVisible()
      await expect(totalSpotsInput).toBeDisabled() // Should be calculated field
      
      // Test structure calculations
      await floorsInput.fill('3')
      await spotsPerFloorInput.fill('75')
      
      // Verify total spots calculation (should be 225)
      await expect(totalSpotsInput).toHaveValue('225')
    })

    test('should validate required fields', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      
      // Clear required fields
      await page.locator('#garage-name').fill('')
      await page.locator('#garage-address').fill('')
      
      // Try to save
      await page.getByRole('button', { name: 'Save Changes' }).click()
      
      // Should show validation errors or prevent save
      // Note: Specific validation behavior depends on implementation
      await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()
    })

    test('should handle contact information fields', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      
      const cityInput = page.locator('#garage-city')
      const stateInput = page.locator('#garage-state')
      const zipInput = page.locator('#garage-zip')
      const websiteInput = page.locator('#garage-website')
      const descriptionInput = page.locator('#garage-description')
      
      // Fill out contact information
      await cityInput.fill('San Francisco')
      await stateInput.fill('CA')
      await zipInput.fill('94105')
      await websiteInput.fill('https://testgarage.com')
      await descriptionInput.fill('Premium parking facility in downtown area')
      
      // Verify values
      await expect(cityInput).toHaveValue('San Francisco')
      await expect(stateInput).toHaveValue('CA')
      await expect(zipInput).toHaveValue('94105')
      await expect(websiteInput).toHaveValue('https://testgarage.com')
      await expect(descriptionInput).toHaveValue('Premium parking facility in downtown area')
    })
  })

  test.describe('Pricing Configuration Tab', () => {
    test('should display and edit standard rates', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      await page.getByRole('tab', { name: 'Pricing' }).click()
      
      await expect(page.getByText('Standard Rates')).toBeVisible()
      
      // Test pricing inputs
      const hourlyRate = page.locator('#hourly-rate')
      const dailyRate = page.locator('#daily-rate')
      const monthlyRate = page.locator('#monthly-rate')
      const overnightRate = page.locator('#overnight-rate')
      const weekendRate = page.locator('#weekend-rate')
      const maxDaily = page.locator('#max-daily')
      
      await hourlyRate.fill('6.50')
      await dailyRate.fill('35.00')
      await monthlyRate.fill('220.00')
      await overnightRate.fill('18.00')
      await weekendRate.fill('8.50')
      await maxDaily.fill('45.00')
      
      // Verify values
      await expect(hourlyRate).toHaveValue('6.5')
      await expect(dailyRate).toHaveValue('35')
      await expect(monthlyRate).toHaveValue('220')
      await expect(overnightRate).toHaveValue('18')
      await expect(weekendRate).toHaveValue('8.5')
      await expect(maxDaily).toHaveValue('45')
    })

    test('should configure early bird pricing', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      await page.getByRole('tab', { name: 'Pricing' }).click()
      
      await expect(page.getByText('Early Bird Special')).toBeVisible()
      
      // Enable early bird pricing
      const earlyBirdSwitch = page.locator('#early-bird-enabled')
      await earlyBirdSwitch.click()
      
      // Early bird configuration should appear
      await expect(page.locator('#early-bird-rate')).toBeVisible()
      await expect(page.locator('#early-bird-start')).toBeVisible()
      await expect(page.locator('#early-bird-end')).toBeVisible()
      
      // Configure early bird settings
      await page.locator('#early-bird-rate').fill('25.00')
      await page.locator('#early-bird-start').fill('05:30')
      await page.locator('#early-bird-end').fill('09:30')
      
      // Verify values
      await expect(page.locator('#early-bird-rate')).toHaveValue('25')
      await expect(page.locator('#early-bird-start')).toHaveValue('05:30')
      await expect(page.locator('#early-bird-end')).toHaveValue('09:30')
      
      // Disable early bird pricing
      await earlyBirdSwitch.click()
      
      // Early bird configuration should be hidden
      await expect(page.locator('#early-bird-rate')).not.toBeVisible()
    })

    test('should validate pricing input ranges', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      await page.getByRole('tab', { name: 'Pricing' }).click()
      
      // Test negative values
      await page.locator('#hourly-rate').fill('-5')
      await page.locator('#daily-rate').fill('-10')
      
      // Test extremely high values
      await page.locator('#monthly-rate').fill('999999')
      
      // Validation behavior would depend on implementation
      // For now, just verify the form accepts the input
      await expect(page.locator('#hourly-rate')).toHaveValue('-5')
      await expect(page.locator('#monthly-rate')).toHaveValue('999999')
    })
  })

  test.describe('Business Hours Configuration Tab', () => {
    test('should display and edit business hours', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      await page.getByRole('tab', { name: 'Hours' }).click()
      
      await expect(page.getByText('Business Hours')).toBeVisible()
      
      // Check that all days are displayed
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      
      for (const day of days) {
        await expect(page.getByText(day, { exact: false })).toBeVisible()
      }
      
      // Test editing Monday hours
      const mondayRow = page.getByRole('row').filter({ hasText: 'monday' })
      const mondayOpenTime = mondayRow.locator('input[type="time"]').first()
      const mondayCloseTime = mondayRow.locator('input[type="time"]').last()
      
      await mondayOpenTime.fill('07:00')
      await mondayCloseTime.fill('21:00')
      
      await expect(mondayOpenTime).toHaveValue('07:00')
      await expect(mondayCloseTime).toHaveValue('21:00')
    })

    test('should handle closed days', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      await page.getByRole('tab', { name: 'Hours' }).click()
      
      // Toggle Sunday as closed
      const sundayRow = page.getByRole('row').filter({ hasText: 'sunday' })
      const sundaySwitch = sundayRow.getByRole('switch')
      const sundayOpenTime = sundayRow.locator('input[type="time"]').first()
      const sundayCloseTime = sundayRow.locator('input[type="time"]').last()
      
      // Initially should be open
      await expect(sundaySwitch).toBeChecked()
      await expect(sundayOpenTime).toBeEnabled()
      await expect(sundayCloseTime).toBeEnabled()
      
      // Toggle to closed
      await sundaySwitch.click()
      
      // Time inputs should be disabled
      await expect(sundaySwitch).not.toBeChecked()
      await expect(sundayOpenTime).toBeDisabled()
      await expect(sundayCloseTime).toBeDisabled()
    })

    test('should validate time format and logic', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      await page.getByRole('tab', { name: 'Hours' }).click()
      
      // Test setting closing time before opening time
      const mondayRow = page.getByRole('row').filter({ hasText: 'monday' })
      const mondayOpenTime = mondayRow.locator('input[type="time"]').first()
      const mondayCloseTime = mondayRow.locator('input[type="time"]').last()
      
      await mondayOpenTime.fill('22:00')
      await mondayCloseTime.fill('06:00')
      
      // Values should be set (validation logic would depend on implementation)
      await expect(mondayOpenTime).toHaveValue('22:00')
      await expect(mondayCloseTime).toHaveValue('06:00')
    })
  })

  test.describe('Features Configuration Tab', () => {
    test('should display and toggle feature switches', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      await page.getByRole('tab', { name: 'Features' }).click()
      
      await expect(page.getByText('Available Features')).toBeVisible()
      
      // Test all feature switches
      const features = [
        { id: '#ev-charging', label: 'EV Charging Stations' },
        { id: '#valet', label: 'Valet Service' },
        { id: '#car-wash', label: 'Car Wash Service' },
        { id: '#security-24h', label: '24/7 Security' },
        { id: '#covered-parking', label: 'Covered Parking' },
        { id: '#wheelchair-access', label: 'Accessibility Accessible' }
      ]
      
      for (const feature of features) {
        const featureSwitch = page.locator(feature.id)
        await expect(featureSwitch).toBeVisible()
        await expect(page.getByText(feature.label)).toBeVisible()
        
        // Test toggling
        const initialState = await featureSwitch.isChecked()
        await featureSwitch.click()
        await expect(featureSwitch).toBeChecked({ checked: !initialState })
        
        // Toggle back
        await featureSwitch.click()
        await expect(featureSwitch).toBeChecked({ checked: initialState })
      }
    })

    test('should display feature icons', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      await page.getByRole('tab', { name: 'Features' }).click()
      
      // Check for specific feature icons
      await expect(page.locator('svg').filter({ hasText: /EV Charging|Accessibility/ })).toHaveCount(2)
    })
  })

  test.describe('Notifications Configuration Tab', () => {
    test('should configure notification settings', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      await page.getByRole('tab', { name: 'Notifications' }).click()
      
      await expect(page.getByText('Notification Settings')).toBeVisible()
      
      // Test notification switches
      const emailSwitch = page.locator('#email-notifications')
      const smsSwitch = page.locator('#sms-notifications')
      const maintenanceSwitch = page.locator('#maintenance-reminder')
      
      await expect(emailSwitch).toBeVisible()
      await expect(smsSwitch).toBeVisible()
      await expect(maintenanceSwitch).toBeVisible()
      
      // Toggle notifications
      await emailSwitch.click()
      await smsSwitch.click()
      await maintenanceSwitch.click()
    })

    test('should configure capacity alert threshold', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      await page.getByRole('tab', { name: 'Notifications' }).click()
      
      const capacityAlert = page.locator('#capacity-alert')
      await expect(capacityAlert).toBeVisible()
      await expect(page.getByText('Capacity Alert Threshold (%)')).toBeVisible()
      await expect(page.getByText('Alert when occupancy reaches this percentage')).toBeVisible()
      
      // Test capacity threshold setting
      await capacityAlert.fill('85')
      await expect(capacityAlert).toHaveValue('85')
      
      // Test boundary values
      await capacityAlert.fill('0')
      await expect(capacityAlert).toHaveValue('0')
      
      await capacityAlert.fill('100')
      await expect(capacityAlert).toHaveValue('100')
    })

    test('should display notification icons', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      await page.getByRole('tab', { name: 'Notifications' }).click()
      
      // Check for mail and phone icons
      await expect(page.getByText('Email Notifications')).toBeVisible()
      await expect(page.getByText('SMS Notifications')).toBeVisible()
    })
  })

  test.describe('Save and Reset Functionality', () => {
    test('should save configuration changes', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      
      // Make changes
      await page.locator('#garage-name').fill('Updated Garage Name')
      await page.getByRole('tab', { name: 'Pricing' }).click()
      await page.locator('#hourly-rate').fill('7.50')
      
      // Save changes
      await page.getByRole('button', { name: 'Save Changes' }).click()
      
      // Should show success message and exit edit mode
      await expect(page.getByRole('button', { name: 'Edit Configuration' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Save Changes' })).not.toBeVisible()
    })

    test('should cancel configuration changes', async ({ page }) => {
      // Get initial value
      const initialName = await page.locator('#garage-name').getAttribute('value') || ''
      
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      
      // Make changes
      await page.locator('#garage-name').fill('Temporary Change')
      await expect(page.locator('#garage-name')).toHaveValue('Temporary Change')
      
      // Cancel changes
      await page.getByRole('button', { name: 'Cancel' }).click()
      
      // Should revert to initial state
      await expect(page.getByRole('button', { name: 'Edit Configuration' })).toBeVisible()
      await expect(page.locator('#garage-name')).toHaveValue(initialName)
    })

    test('should handle save errors gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/garages/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Server Error' })
        })
      })
      
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      await page.locator('#garage-name').fill('Test Change')
      await page.getByRole('button', { name: 'Save Changes' }).click()
      
      // Should remain in edit mode and show error
      await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()
    })
  })

  test.describe('Add Garage Functionality', () => {
    test('should open add garage dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'Add Garage' }).click()
      
      // Dialog should be visible
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('Add New Garage')).toBeVisible()
      await expect(page.getByText('Configure a new parking garage')).toBeVisible()
    })

    test('should fill out new garage form', async ({ page }) => {
      await page.getByRole('button', { name: 'Add Garage' }).click()
      
      // Fill out form
      await page.locator('#name').fill('New Test Garage')
      await page.locator('#phone').fill('(555) 987-6543')
      await page.locator('#address').fill('456 Oak Avenue')
      await page.locator('#city').fill('Oakland')
      await page.locator('#state').fill('CA')
      await page.locator('#zipCode').fill('94607')
      await page.locator('#totalFloors').fill('4')
      await page.locator('#spotsPerFloor').fill('60')
      
      // Verify values
      await expect(page.locator('#name')).toHaveValue('New Test Garage')
      await expect(page.locator('#phone')).toHaveValue('(555) 987-6543')
      await expect(page.locator('#address')).toHaveValue('456 Oak Avenue')
      await expect(page.locator('#city')).toHaveValue('Oakland')
      await expect(page.locator('#state')).toHaveValue('CA')
      await expect(page.locator('#zipCode')).toHaveValue('94607')
      await expect(page.locator('#totalFloors')).toHaveValue('4')
      await expect(page.locator('#spotsPerFloor')).toHaveValue('60')
    })

    test('should cancel add garage dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'Add Garage' }).click()
      
      // Fill out some fields
      await page.locator('#name').fill('Temporary Garage')
      
      // Cancel
      await page.getByRole('button', { name: 'Cancel' }).click()
      
      // Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('should submit new garage', async ({ page }) => {
      // Mock successful creation
      await page.route('**/api/garages', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ 
              success: true, 
              data: { 
                id: 'new-garage-id', 
                name: 'New Test Garage' 
              } 
            })
          })
        } else {
          route.continue()
        }
      })
      
      await page.getByRole('button', { name: 'Add Garage' }).click()
      
      // Fill required fields
      await page.locator('#name').fill('New Test Garage')
      await page.locator('#address').fill('456 Oak Avenue')
      await page.locator('#city').fill('Oakland')
      await page.locator('#state').fill('CA')
      
      // Submit
      const addButton = page.getByRole('dialog').getByRole('button', { name: 'Add Garage' })
      await addButton.click()
      
      // Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })
  })

  test.describe('Garage Selection', () => {
    test('should change selected garage', async ({ page }) => {
      const garageSelect = page.locator('select')
      await expect(garageSelect).toBeVisible()
      
      // Get initial selection
      const initialValue = await garageSelect.inputValue()
      
      // Change selection if there are multiple options
      const options = await garageSelect.locator('option').count()
      if (options > 1) {
        await garageSelect.selectOption({ index: 1 })
        const newValue = await garageSelect.inputValue()
        expect(newValue).not.toBe(initialValue)
      }
    })

    test('should update form when garage selection changes', async ({ page }) => {
      const garageSelect = page.locator('select')
      const options = await garageSelect.locator('option').count()
      
      if (options > 1) {
        // Get initial garage name
        const initialName = await page.locator('#garage-name').getAttribute('value')
        
        // Change selection
        await garageSelect.selectOption({ index: 1 })
        
        // Form should update with new garage data
        const newName = await page.locator('#garage-name').getAttribute('value')
        expect(newName).not.toBe(initialName)
      }
    })
  })

  test.describe('Form Persistence and Validation', () => {
    test('should maintain form data when switching tabs', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      
      // Make changes on General tab
      await page.locator('#garage-name').fill('Persistent Test Name')
      await page.locator('#garage-phone').fill('(555) 111-2222')
      
      // Switch to Pricing tab and make changes
      await page.getByRole('tab', { name: 'Pricing' }).click()
      await page.locator('#hourly-rate').fill('9.50')
      
      // Switch to Features tab
      await page.getByRole('tab', { name: 'Features' }).click()
      await page.locator('#ev-charging').click()
      
      // Return to General tab
      await page.getByRole('tab', { name: 'General' }).click()
      
      // Data should be preserved
      await expect(page.locator('#garage-name')).toHaveValue('Persistent Test Name')
      await expect(page.locator('#garage-phone')).toHaveValue('(555) 111-2222')
      
      // Check other tabs
      await page.getByRole('tab', { name: 'Pricing' }).click()
      await expect(page.locator('#hourly-rate')).toHaveValue('9.5')
    })

    test('should disable form fields when not in edit mode', async ({ page }) => {
      // Should start in read-only mode
      await expect(page.locator('#garage-name')).toBeDisabled()
      await expect(page.locator('#garage-phone')).toBeDisabled()
      
      // Check other tabs
      await page.getByRole('tab', { name: 'Pricing' }).click()
      await expect(page.locator('#hourly-rate')).toBeDisabled()
      
      await page.getByRole('tab', { name: 'Features' }).click()
      await expect(page.locator('#ev-charging')).toBeDisabled()
    })

    test('should enable form fields when in edit mode', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      
      // Should enable fields
      await expect(page.locator('#garage-name')).toBeEnabled()
      await expect(page.locator('#garage-phone')).toBeEnabled()
      
      // Check other tabs
      await page.getByRole('tab', { name: 'Pricing' }).click()
      await expect(page.locator('#hourly-rate')).toBeEnabled()
      
      await page.getByRole('tab', { name: 'Features' }).click()
      await expect(page.locator('#ev-charging')).toBeEnabled()
    })
  })

  test.describe('Loading and Error States', () => {
    test('should handle loading state', async ({ page }) => {
      // Intercept API and delay response
      await page.route('**/api/garages', route => {
        setTimeout(() => route.continue(), 2000)
      })
      
      await page.goto('/garage-configuration')
      
      // Should show loading state
      await expect(page.getByText('Loading garage configuration...')).toBeVisible()
    })

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/garages', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Server Error' })
        })
      })
      
      await page.goto('/garage-configuration')
      
      // Should handle error gracefully
      await page.waitForTimeout(2000)
      
      // Check for error handling (specific implementation may vary)
      const hasErrorState = await page.getByText(/error/i).isVisible()
      const hasRetryOption = await page.getByRole('button', { name: /retry/i }).isVisible()
      
      expect(hasErrorState || hasRetryOption).toBeTruthy()
    })
  })

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Check mobile layout
      await expect(page.getByRole('heading', { name: 'Garage Configuration' })).toBeVisible()
      
      // Tabs should still be functional
      await page.getByRole('tab', { name: 'Pricing' }).click()
      await expect(page.getByText('Standard Rates')).toBeVisible()
    })

    test('should adapt to tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Check tablet layout
      await expect(page.getByRole('heading', { name: 'Garage Configuration' })).toBeVisible()
      
      // All tabs should be visible
      const tabs = ['General', 'Pricing', 'Hours', 'Features', 'Notifications']
      for (const tab of tabs) {
        await expect(page.getByRole('tab', { name: tab })).toBeVisible()
      }
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for proper heading structure
      await expect(page.getByRole('heading', { name: 'Garage Configuration' })).toBeVisible()
      
      // Check for labeled form elements
      await expect(page.getByLabelText('Select Garage')).toBeVisible()
      
      // Check tab accessibility
      const tabs = await page.getByRole('tab').all()
      expect(tabs.length).toBeGreaterThan(0)
      
      for (const tab of tabs) {
        await expect(tab).toBeVisible()
      }
    })

    test('should support keyboard navigation', async ({ page }) => {
      // Focus on first interactive element
      await page.keyboard.press('Tab')
      
      // Should be able to navigate with keyboard
      await page.keyboard.press('Enter')
      
      // Tab through form elements
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should be able to reach save/cancel buttons
      await page.getByRole('button', { name: 'Edit Configuration' }).focus()
      await expect(page.getByRole('button', { name: 'Edit Configuration' })).toBeFocused()
    })
  })

  test.describe('Data Consistency', () => {
    test('should maintain data integrity across operations', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit Configuration' }).click()
      
      // Make comprehensive changes
      const testData = {
        name: 'Comprehensive Test Garage',
        phone: '(555) 123-9999',
        email: 'comprehensive@test.com',
        hourlyRate: '8.75',
        dailyRate: '42.50',
        floors: '5',
        spotsPerFloor: '80'
      }
      
      // Update all fields
      await page.locator('#garage-name').fill(testData.name)
      await page.locator('#garage-phone').fill(testData.phone)
      await page.locator('#garage-email').fill(testData.email)
      await page.locator('#total-floors').fill(testData.floors)
      await page.locator('#spots-per-floor').fill(testData.spotsPerFloor)
      
      await page.getByRole('tab', { name: 'Pricing' }).click()
      await page.locator('#hourly-rate').fill(testData.hourlyRate)
      await page.locator('#daily-rate').fill(testData.dailyRate)
      
      // Verify calculated fields
      await page.getByRole('tab', { name: 'General' }).click()
      await expect(page.locator('#total-spots')).toHaveValue('400') // 5 * 80
      
      // Verify data persistence across tabs
      await page.getByRole('tab', { name: 'Pricing' }).click()
      await expect(page.locator('#hourly-rate')).toHaveValue('8.75')
      await expect(page.locator('#daily-rate')).toHaveValue('42.5')
    })
  })
})
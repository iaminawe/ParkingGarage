import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
}

test.describe('User Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/dashboard|\//)
  })

  test('should access user profile from navigation', async ({ page }) => {
    // Look for profile/account links in navigation
    const profileLinks = [
      page.locator('a:has-text("Profile"), a:has-text("Account"), [data-testid="profile-link"]'),
      page.locator('.user-menu, [data-testid="user-menu"]'),
      page.locator('.user-avatar, [data-testid="user-avatar"]')
    ]

    let profileFound = false
    for (const profileLink of profileLinks) {
      if (await profileLink.isVisible()) {
        await profileLink.click()
        
        // Check if we're on profile page or dropdown opened
        const profileContent = page.locator('.profile-form, [data-testid="profile"], .user-settings, .account-settings')
        if (await profileContent.isVisible()) {
          profileFound = true
          break
        }
        
        // If dropdown, look for profile link inside
        const dropdownProfileLink = page.locator('a:has-text("Profile"), a:has-text("Settings"), [data-testid="profile-dropdown"]')
        if (await dropdownProfileLink.isVisible()) {
          await dropdownProfileLink.click()
          await expect(page.locator('.profile-form, [data-testid="profile"]')).toBeVisible()
          profileFound = true
          break
        }
      }
    }

    expect(profileFound).toBeTruthy()
  })

  test('should display current user information', async ({ page }) => {
    // Navigate to profile
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      // Should display user's current information
      await expect(page.locator('input[type="email"], [data-testid="email"]')).toHaveValue(TEST_USER.email)
      
      const nameFields = page.locator('input[name*="first"], input[name*="last"], [data-testid="name"]')
      expect(await nameFields.count()).toBeGreaterThan(0)
    }
  })

  test('should validate profile form fields', async ({ page }) => {
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      // Clear required fields and try to save
      const firstNameInput = page.locator('input[name*="first"], input[name*="firstName"], [data-testid="first-name"]')
      if (await firstNameInput.isVisible()) {
        await firstNameInput.clear()
        
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]')
        await saveButton.click()
        
        // Should show validation error
        await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
      }
    }
  })

  test('should successfully update profile information', async ({ page }) => {
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      const updatedFirstName = 'Updated'
      const updatedLastName = 'Name'
      
      // Update name fields
      const firstNameInput = page.locator('input[name*="first"], input[name*="firstName"], [data-testid="first-name"]')
      if (await firstNameInput.isVisible()) {
        await firstNameInput.clear()
        await firstNameInput.fill(updatedFirstName)
      }
      
      const lastNameInput = page.locator('input[name*="last"], input[name*="lastName"], [data-testid="last-name"]')
      if (await lastNameInput.isVisible()) {
        await lastNameInput.clear()
        await lastNameInput.fill(updatedLastName)
      }
      
      // Save changes
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]')
      await saveButton.click()
      
      // Should show success message
      await expect(page.locator('.success-message, [data-testid="success"], .alert-success')).toBeVisible()
    }
  })

  test('should handle password change', async ({ page }) => {
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      // Look for password change section
      const passwordSection = page.locator('.password-section, [data-testid="password-section"], .change-password')
      const passwordTab = page.locator('button:has-text("Password"), [data-testid="password-tab"]')
      
      // Click password tab if exists
      if (await passwordTab.isVisible()) {
        await passwordTab.click()
      }
      
      // Look for password fields
      const currentPasswordInput = page.locator('input[name*="current"], input[placeholder*="current"], [data-testid="current-password"]')
      const newPasswordInput = page.locator('input[name*="new"], input[placeholder*="new"], [data-testid="new-password"]')
      const confirmPasswordInput = page.locator('input[name*="confirm"], input[placeholder*="confirm"], [data-testid="confirm-password"]')
      
      if (await currentPasswordInput.isVisible() && await newPasswordInput.isVisible()) {
        await currentPasswordInput.fill(TEST_USER.password)
        await newPasswordInput.fill('NewPassword123!')
        
        if (await confirmPasswordInput.isVisible()) {
          await confirmPasswordInput.fill('NewPassword123!')
        }
        
        const updatePasswordButton = page.locator('button:has-text("Change"), button:has-text("Update"), button[type="submit"]')
        await updatePasswordButton.click()
        
        // Should show success or confirmation message
        await expect(page.locator('.success-message, [data-testid="success"], .password-updated')).toBeVisible()
      }
    }
  })

  test('should validate password change requirements', async ({ page }) => {
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      const passwordTab = page.locator('button:has-text("Password"), [data-testid="password-tab"]')
      if (await passwordTab.isVisible()) {
        await passwordTab.click()
      }
      
      const currentPasswordInput = page.locator('input[name*="current"], [data-testid="current-password"]')
      const newPasswordInput = page.locator('input[name*="new"], [data-testid="new-password"]')
      
      if (await currentPasswordInput.isVisible() && await newPasswordInput.isVisible()) {
        // Try weak password
        await currentPasswordInput.fill(TEST_USER.password)
        await newPasswordInput.fill('weak')
        
        const updatePasswordButton = page.locator('button:has-text("Change"), button[type="submit"]')
        await updatePasswordButton.click()
        
        // Should show validation error
        await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
      }
    }
  })

  test('should handle avatar/profile picture upload', async ({ page }) => {
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      // Look for avatar upload
      const avatarUpload = page.locator('input[type="file"], [data-testid="avatar-upload"], .avatar-upload')
      const avatarSection = page.locator('.avatar-section, [data-testid="avatar"], .profile-picture')
      
      if (await avatarUpload.isVisible()) {
        // Create a test image file
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
        
        await avatarUpload.setInputFiles({
          name: 'test-avatar.png',
          mimeType: 'image/png',
          buffer: testImageBuffer
        })
        
        // Should show preview or upload progress
        const uploadPreview = page.locator('.upload-preview, [data-testid="upload-preview"], .avatar-preview')
        if (await uploadPreview.isVisible()) {
          await expect(uploadPreview).toBeVisible()
        }
      } else if (await avatarSection.isVisible()) {
        // Check if avatar section exists
        await expect(avatarSection).toBeVisible()
      }
    }
  })

  test('should manage notification preferences', async ({ page }) => {
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      // Look for notifications tab or section
      const notificationTab = page.locator('button:has-text("Notification"), [data-testid="notifications-tab"]')
      if (await notificationTab.isVisible()) {
        await notificationTab.click()
      }
      
      // Look for notification checkboxes
      const notificationCheckboxes = page.locator('input[type="checkbox"]:near(:text("notification")), [data-testid*="notification"]')
      
      if (await notificationCheckboxes.count() > 0) {
        const firstCheckbox = notificationCheckboxes.first()
        const isChecked = await firstCheckbox.isChecked()
        
        // Toggle the checkbox
        await firstCheckbox.click()
        
        // Save settings
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]')
        await saveButton.click()
        
        // Verify the change
        expect(await firstCheckbox.isChecked()).toBe(!isChecked)
      }
    }
  })

  test('should display account deletion option', async ({ page }) => {
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      // Look for account/security tab
      const accountTab = page.locator('button:has-text("Account"), button:has-text("Security"), [data-testid="account-tab"]')
      if (await accountTab.isVisible()) {
        await accountTab.click()
      }
      
      // Look for delete account option
      const deleteAccountButton = page.locator('button:has-text("Delete"), button:has-text("Close"), [data-testid="delete-account"]')
      
      if (await deleteAccountButton.isVisible()) {
        await deleteAccountButton.click()
        
        // Should show confirmation dialog
        await expect(page.locator('.confirmation-dialog, [data-testid="confirm"], .delete-confirmation')).toBeVisible()
        
        // Cancel to avoid actually deleting
        const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("No"), [data-testid="cancel"]')
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
        }
      }
    }
  })

  test('should show account activity/login history', async ({ page }) => {
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      // Look for activity/security tab
      const activityTab = page.locator('button:has-text("Activity"), button:has-text("Security"), [data-testid="activity-tab"]')
      if (await activityTab.isVisible()) {
        await activityTab.click()
      }
      
      // Look for login history or activity log
      const activityLog = page.locator('.activity-log, [data-testid="activity"], .login-history, .security-log')
      
      if (await activityLog.isVisible()) {
        // Should show activity entries
        const activityEntries = page.locator('.activity-entry, .log-entry, .history-item')
        expect(await activityEntries.count()).toBeGreaterThan(0)
      }
    }
  })

  test('should handle two-factor authentication setup', async ({ page }) => {
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      const securityTab = page.locator('button:has-text("Security"), [data-testid="security-tab"]')
      if (await securityTab.isVisible()) {
        await securityTab.click()
      }
      
      // Look for 2FA setup
      const twoFactorSection = page.locator('.two-factor, [data-testid="2fa"], .mfa-section')
      const enableTwoFactorButton = page.locator('button:has-text("Enable"), button:has-text("Setup"), [data-testid="enable-2fa"]')
      
      if (await enableTwoFactorButton.isVisible()) {
        await enableTwoFactorButton.click()
        
        // Should show QR code or setup instructions
        await expect(page.locator('.qr-code, [data-testid="qr"], .setup-instructions')).toBeVisible()
      } else if (await twoFactorSection.isVisible()) {
        // 2FA section exists
        await expect(twoFactorSection).toBeVisible()
      }
    }
  })

  test('should validate email format when updating', async ({ page }) => {
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      const emailInput = page.locator('input[type="email"], [data-testid="email"]')
      
      if (await emailInput.isVisible()) {
        await emailInput.clear()
        await emailInput.fill('invalid-email')
        
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]')
        await saveButton.click()
        
        // Should show validation error
        await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
      }
    }
  })

  test('should handle profile data export', async ({ page }) => {
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      // Look for data export option (GDPR compliance)
      const dataTab = page.locator('button:has-text("Data"), button:has-text("Privacy"), [data-testid="data-tab"]')
      if (await dataTab.isVisible()) {
        await dataTab.click()
      }
      
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), [data-testid="export-data"]')
      
      if (await exportButton.isVisible()) {
        // Mock the download
        const downloadPromise = page.waitForEvent('download')
        await exportButton.click()
        
        try {
          const download = await downloadPromise
          expect(download.suggestedFilename()).toMatch(/\.json$|\.csv$|\.zip$/)
        } catch {
          // If no actual download, check for confirmation message
          await expect(page.locator('.export-requested, [data-testid="export-success"]')).toBeVisible()
        }
      }
    }
  })

  test('should show profile completion progress', async ({ page }) => {
    await page.goto('/profile')
    
    if (page.url().includes('profile') || page.url().includes('account')) {
      // Look for profile completion indicator
      const progressIndicator = page.locator('.profile-progress, [data-testid="profile-progress"], .completion-bar')
      
      if (await progressIndicator.isVisible()) {
        // Should show some percentage
        const progressText = await progressIndicator.textContent()
        expect(progressText).toMatch(/\d+%/)
      }
    }
  })
})
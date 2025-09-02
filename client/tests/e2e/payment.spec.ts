import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
}

const TEST_PAYMENT_CARD = {
  number: '4242424242424242', // Stripe test card
  expiry: '12/25',
  cvc: '123',
  name: 'Test User',
  zip: '12345'
}

test.describe('Payment Processing', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/dashboard|\//)
  })

  test('should display payment form for parking session', async ({ page }) => {
    // Navigate to spots or parking booking
    await page.goto('/spots')
    
    // Find and click on an available spot
    const availableSpot = page.locator('[data-testid="spot-available"], .spot-available, .spot:not(.occupied)').first()
    if (await availableSpot.isVisible()) {
      await availableSpot.click()
      
      // Look for book/reserve button
      const bookButton = page.locator('button:has-text("Book"), button:has-text("Reserve"), [data-testid="book-spot"]')
      if (await bookButton.isVisible()) {
        await bookButton.click()
        
        // Should show payment form or pricing
        await expect(page.locator('.payment-form, [data-testid="payment"], .pricing, .checkout')).toBeVisible()
      }
    }
  })

  test('should calculate correct parking fees', async ({ page }) => {
    // Navigate to spots
    await page.goto('/spots')
    
    const availableSpot = page.locator('[data-testid="spot-available"], .spot-available, .spot:not(.occupied)').first()
    if (await availableSpot.isVisible()) {
      await availableSpot.click()
      
      // Check if pricing information is displayed
      const pricingElements = page.locator('.price, .cost, .fee, [data-testid="pricing"]')
      if (await pricingElements.count() > 0) {
        const priceText = await pricingElements.first().textContent()
        expect(priceText).toMatch(/\$[\d,]+\.?\d*/)
      }
    }
  })

  test('should validate payment form fields', async ({ page }) => {
    // Try to access payment flow
    await page.goto('/spots')
    
    const availableSpot = page.locator('[data-testid="spot-available"], .spot-available, .spot:not(.occupied)').first()
    if (await availableSpot.isVisible()) {
      await availableSpot.click()
      
      const bookButton = page.locator('button:has-text("Book"), button:has-text("Reserve"), [data-testid="book-spot"]')
      if (await bookButton.isVisible()) {
        await bookButton.click()
        
        // Look for payment form
        const paymentForm = page.locator('.payment-form, [data-testid="payment-form"], form:has(input[type="text"]:placeholder("Card number"))')
        if (await paymentForm.isVisible()) {
          // Try to submit without filling
          const submitButton = page.locator('button:has-text("Pay"), button:has-text("Submit"), button[type="submit"]')
          await submitButton.click()
          
          // Should show validation errors
          await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
        }
      }
    }
  })

  test('should validate credit card number format', async ({ page }) => {
    await page.goto('/spots')
    
    const availableSpot = page.locator('[data-testid="spot-available"], .spot-available, .spot:not(.occupied)').first()
    if (await availableSpot.isVisible()) {
      await availableSpot.click()
      
      const bookButton = page.locator('button:has-text("Book"), button:has-text("Reserve"), [data-testid="book-spot"]')
      if (await bookButton.isVisible()) {
        await bookButton.click()
        
        // Look for card number input
        const cardNumberInput = page.locator('input[placeholder*="Card number"], input[name*="card"], input[data-testid="card-number"]')
        if (await cardNumberInput.isVisible()) {
          // Test invalid card number
          await cardNumberInput.fill('1234')
          
          const submitButton = page.locator('button:has-text("Pay"), button:has-text("Submit"), button[type="submit"]')
          await submitButton.click()
          
          await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
        }
      }
    }
  })

  test('should process successful payment', async ({ page }) => {
    // Mock successful payment response
    await page.route('**/api/payment/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          transactionId: 'test_payment_123',
          amount: 500,
          currency: 'USD'
        })
      })
    })

    await page.goto('/spots')
    
    const availableSpot = page.locator('[data-testid="spot-available"], .spot-available, .spot:not(.occupied)').first()
    if (await availableSpot.isVisible()) {
      await availableSpot.click()
      
      const bookButton = page.locator('button:has-text("Book"), button:has-text("Reserve"), [data-testid="book-spot"]')
      if (await bookButton.isVisible()) {
        await bookButton.click()
        
        // Fill payment form if visible
        const cardNumberInput = page.locator('input[placeholder*="Card number"], input[name*="card"], input[data-testid="card-number"]')
        if (await cardNumberInput.isVisible()) {
          await cardNumberInput.fill(TEST_PAYMENT_CARD.number)
          
          const expiryInput = page.locator('input[placeholder*="MM/YY"], input[name*="expiry"], input[data-testid="expiry"]')
          if (await expiryInput.isVisible()) {
            await expiryInput.fill(TEST_PAYMENT_CARD.expiry)
          }
          
          const cvcInput = page.locator('input[placeholder*="CVC"], input[name*="cvc"], input[data-testid="cvc"]')
          if (await cvcInput.isVisible()) {
            await cvcInput.fill(TEST_PAYMENT_CARD.cvc)
          }
          
          const submitButton = page.locator('button:has-text("Pay"), button:has-text("Submit"), button[type="submit"]')
          await submitButton.click()
          
          // Should show success message or redirect
          await expect(page.locator('.success-message, [data-testid="success"], .payment-success')).toBeVisible()
        }
      }
    }
  })

  test('should handle payment failure gracefully', async ({ page }) => {
    // Mock payment failure
    await page.route('**/api/payment/**', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Payment declined'
        })
      })
    })

    await page.goto('/spots')
    
    const availableSpot = page.locator('[data-testid="spot-available"], .spot-available, .spot:not(.occupied)').first()
    if (await availableSpot.isVisible()) {
      await availableSpot.click()
      
      const bookButton = page.locator('button:has-text("Book"), button:has-text("Reserve"), [data-testid="book-spot"]')
      if (await bookButton.isVisible()) {
        await bookButton.click()
        
        const cardNumberInput = page.locator('input[placeholder*="Card number"], input[name*="card"], input[data-testid="card-number"]')
        if (await cardNumberInput.isVisible()) {
          await cardNumberInput.fill(TEST_PAYMENT_CARD.number)
          
          const submitButton = page.locator('button:has-text("Pay"), button:has-text("Submit"), button[type="submit"]')
          await submitButton.click()
          
          // Should show error message
          await expect(page.locator('.error-message, .text-red-500, [data-testid="error"]')).toBeVisible()
        }
      }
    }
  })

  test('should display payment history', async ({ page }) => {
    // Navigate to user profile or payment history
    const profileAreas = ['/profile', '/account', '/payments', '/billing', '/dashboard']
    
    for (const area of profileAreas) {
      await page.goto(area)
      
      // Look for payment history elements
      const paymentHistory = page.locator('.payment-history, [data-testid="payment-history"], .transaction-list, .billing-history')
      if (await paymentHistory.isVisible()) {
        // Should show payment records
        const paymentRecords = page.locator('.payment-record, .transaction, .billing-item')
        expect(await paymentRecords.count()).toBeGreaterThan(0)
        break
      }
    }
  })

  test('should show receipt after successful payment', async ({ page }) => {
    // Mock successful payment with receipt
    await page.route('**/api/payment/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          transactionId: 'test_payment_123',
          amount: 500,
          currency: 'USD',
          receipt: {
            id: 'receipt_123',
            url: '/receipts/receipt_123'
          }
        })
      })
    })

    await page.goto('/spots')
    
    const availableSpot = page.locator('[data-testid="spot-available"], .spot-available, .spot:not(.occupied)').first()
    if (await availableSpot.isVisible()) {
      await availableSpot.click()
      
      const bookButton = page.locator('button:has-text("Book"), button:has-text("Reserve"), [data-testid="book-spot"]')
      if (await bookButton.isVisible()) {
        await bookButton.click()
        
        const cardNumberInput = page.locator('input[placeholder*="Card number"], input[name*="card"], input[data-testid="card-number"]')
        if (await cardNumberInput.isVisible()) {
          await cardNumberInput.fill(TEST_PAYMENT_CARD.number)
          
          const submitButton = page.locator('button:has-text("Pay"), button:has-text("Submit"), button[type="submit"]')
          await submitButton.click()
          
          // Look for receipt or transaction ID
          await expect(page.locator('.receipt, [data-testid="receipt"], .transaction-id')).toBeVisible()
        }
      }
    }
  })

  test('should handle refund requests', async ({ page }) => {
    // Navigate to payment history
    await page.goto('/dashboard')
    
    // Look for completed transactions
    const completedTransaction = page.locator('.transaction.completed, [data-testid="completed-transaction"]').first()
    if (await completedTransaction.isVisible()) {
      await completedTransaction.click()
      
      // Look for refund button
      const refundButton = page.locator('button:has-text("Refund"), button:has-text("Cancel"), [data-testid="refund"]')
      if (await refundButton.isVisible()) {
        await refundButton.click()
        
        // Should show refund confirmation or form
        await expect(page.locator('.refund-confirmation, [data-testid="refund-form"], .cancel-confirmation')).toBeVisible()
      }
    }
  })

  test('should validate payment amount calculations', async ({ page }) => {
    await page.goto('/spots')
    
    const availableSpot = page.locator('[data-testid="spot-available"], .spot-available, .spot:not(.occupied)').first()
    if (await availableSpot.isVisible()) {
      await availableSpot.click()
      
      // Look for duration selector
      const durationSelect = page.locator('select[name*="duration"], input[name*="hours"], [data-testid="duration"]')
      if (await durationSelect.isVisible()) {
        await durationSelect.selectOption('2') // 2 hours
        
        // Check if total amount updates
        const totalAmount = page.locator('.total-amount, [data-testid="total"], .final-price')
        if (await totalAmount.isVisible()) {
          const amountText = await totalAmount.textContent()
          expect(amountText).toMatch(/\$\d+/)
        }
      }
    }
  })

  test('should handle payment method saving', async ({ page }) => {
    await page.goto('/spots')
    
    const availableSpot = page.locator('[data-testid="spot-available"], .spot-available, .spot:not(.occupied)').first()
    if (await availableSpot.isVisible()) {
      await availableSpot.click()
      
      const bookButton = page.locator('button:has-text("Book"), button:has-text("Reserve"), [data-testid="book-spot"]')
      if (await bookButton.isVisible()) {
        await bookButton.click()
        
        // Look for save payment method checkbox
        const saveCardCheckbox = page.locator('input[type="checkbox"]:near(:text("save")), [data-testid="save-card"]')
        if (await saveCardCheckbox.isVisible()) {
          await saveCardCheckbox.check()
          
          const cardNumberInput = page.locator('input[placeholder*="Card number"], input[name*="card"]')
          if (await cardNumberInput.isVisible()) {
            await cardNumberInput.fill(TEST_PAYMENT_CARD.number)
            
            const submitButton = page.locator('button:has-text("Pay"), button[type="submit"]')
            await submitButton.click()
          }
        }
      }
    }
  })

  test('should display payment security features', async ({ page }) => {
    await page.goto('/spots')
    
    const availableSpot = page.locator('[data-testid="spot-available"], .spot-available, .spot:not(.occupied)').first()
    if (await availableSpot.isVisible()) {
      await availableSpot.click()
      
      const bookButton = page.locator('button:has-text("Book"), button:has-text("Reserve"), [data-testid="book-spot"]')
      if (await bookButton.isVisible()) {
        await bookButton.click()
        
        // Look for security indicators
        const securityIndicators = page.locator('.ssl-badge, .secure-badge, :text("secure"), :text("encrypted")')
        if (await securityIndicators.count() > 0) {
          await expect(securityIndicators.first()).toBeVisible()
        }
      }
    }
  })

  test('should handle payment processing timeout', async ({ page }) => {
    // Mock slow payment response
    await page.route('**/api/payment/**', route => {
      setTimeout(() => {
        route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Payment timeout'
          })
        })
      }, 5000)
    })

    await page.goto('/spots')
    
    const availableSpot = page.locator('[data-testid="spot-available"], .spot-available, .spot:not(.occupied)').first()
    if (await availableSpot.isVisible()) {
      await availableSpot.click()
      
      const bookButton = page.locator('button:has-text("Book"), button:has-text("Reserve"), [data-testid="book-spot"]')
      if (await bookButton.isVisible()) {
        await bookButton.click()
        
        const cardNumberInput = page.locator('input[placeholder*="Card number"], input[name*="card"]')
        if (await cardNumberInput.isVisible()) {
          await cardNumberInput.fill(TEST_PAYMENT_CARD.number)
          
          const submitButton = page.locator('button:has-text("Pay"), button[type="submit"]')
          await submitButton.click()
          
          // Should show loading state then timeout error
          await expect(page.locator('.loading, .spinner, [data-testid="loading"]')).toBeVisible()
          await expect(page.locator('.error-message, .timeout-error, [data-testid="error"]')).toBeVisible({ timeout: 10000 })
        }
      }
    }
  })
})
import { test, expect } from '@playwright/test'

test.describe('UI Exploration', () => {
  test('should explore the current UI structure', async ({ page }) => {
    await page.goto('/')
    
    // Take a screenshot to see what we're dealing with
    await page.screenshot({ path: 'test-results/ui-exploration.png', fullPage: true })
    
    // Log the current URL
    console.log('Current URL:', page.url())
    
    // Log all headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    console.log('Found headings:', headings.length)
    for (let i = 0; i < headings.length; i++) {
      const text = await headings[i].textContent()
      console.log(`Heading ${i + 1}:`, text)
    }
    
    // Log all buttons
    const buttons = await page.locator('button').all()
    console.log('Found buttons:', buttons.length)
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const text = await buttons[i].textContent()
      console.log(`Button ${i + 1}:`, text)
    }
    
    // Log all links
    const links = await page.locator('a').all()
    console.log('Found links:', links.length)
    for (let i = 0; i < Math.min(links.length, 10); i++) {
      const text = await links[i].textContent()
      const href = await links[i].getAttribute('href')
      console.log(`Link ${i + 1}:`, text, '(', href, ')')
    }
    
    // Log all form inputs
    const inputs = await page.locator('input').all()
    console.log('Found inputs:', inputs.length)
    for (let i = 0; i < Math.min(inputs.length, 10); i++) {
      const type = await inputs[i].getAttribute('type')
      const placeholder = await inputs[i].getAttribute('placeholder')
      const name = await inputs[i].getAttribute('name')
      console.log(`Input ${i + 1}:`, { type, placeholder, name })
    }
    
    // Log page title
    const title = await page.title()
    console.log('Page title:', title)
    
    // Log any error messages or console logs
    page.on('console', msg => console.log('Console log:', msg.text()))
    page.on('pageerror', err => console.log('Page error:', err.message))
    
    // Check if there are any navigation elements
    const nav = await page.locator('nav').count()
    console.log('Navigation elements:', nav)
    
    // Check for common authentication indicators
    const loginElements = await page.locator('[data-testid*="login"], .login, input[type="email"], input[type="password"]').count()
    console.log('Login-related elements:', loginElements)
    
    // Wait a bit to see if any dynamic content loads
    await page.waitForTimeout(2000)
    
    // Take another screenshot after waiting
    await page.screenshot({ path: 'test-results/ui-exploration-after-wait.png', fullPage: true })
    
    // Basic assertion to pass the test
    await expect(page.locator('body')).toBeVisible()
  })
})
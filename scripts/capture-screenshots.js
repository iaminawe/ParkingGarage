#!/usr/bin/env node
/**
 * Automated screenshot capture for Enhanced API Interface
 * Uses Playwright to capture high-quality screenshots showing the interface with populated data
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const API_BASE = 'http://localhost:3000/api';
const DOCS_URL = 'http://127.0.0.1:9000/api-test.html';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

// Screenshot configurations
const SCREENSHOTS = [
  {
    name: 'dark-mode-overview',
    description: 'Dark mode interface overview',
    setup: async (page) => {
      await page.goto(DOCS_URL);
      await page.waitForLoadState('networkidle');
      // Ensure dark mode is enabled
      await page.evaluate(() => {
        localStorage.setItem('sl-theme', 'dark');
        window.dispatchEvent(new Event('storage'));
      });
      await page.waitForTimeout(1000);
    },
    viewport: { width: 1920, height: 1080 }
  },
  {
    name: 'light-mode-overview',
    description: 'Light mode interface overview', 
    setup: async (page) => {
      await page.goto(DOCS_URL);
      await page.waitForLoadState('networkidle');
      // Switch to light mode
      await page.evaluate(() => {
        localStorage.setItem('sl-theme', 'light');
        window.dispatchEvent(new Event('storage'));
      });
      await page.waitForTimeout(1000);
    },
    viewport: { width: 1920, height: 1080 }
  },
  {
    name: 'api-testing-example',
    description: 'API testing interface with populated response',
    setup: async (page) => {
      await page.goto(DOCS_URL);
      await page.waitForLoadState('networkidle');
      
      // Navigate to Check-in endpoint and show example
      try {
        // Look for the Check-in section and expand it
        const checkinSection = await page.locator('text=Check-in').first();
        if (await checkinSection.isVisible()) {
          await checkinSection.click();
          await page.waitForTimeout(500);
        }
        
        // Look for POST /api/checkin endpoint
        const checkinEndpoint = await page.locator(':has-text("/api/checkin")').first();
        if (await checkinEndpoint.isVisible()) {
          await checkinEndpoint.click();
          await page.waitForTimeout(500);
        }
        
        // Look for "Try it out" button
        const tryItButton = await page.locator('text=Try it').first();
        if (await tryItButton.isVisible()) {
          await tryItButton.click();
          await page.waitForTimeout(500);
        }
      } catch (error) {
        console.log('Could not fully navigate to API testing section:', error.message);
      }
    },
    viewport: { width: 1920, height: 1080 }
  },
  {
    name: 'stats-dashboard',
    description: 'Statistics dashboard with real data',
    setup: async (page) => {
      await page.goto(DOCS_URL);
      await page.waitForLoadState('networkidle');
      
      // Navigate to statistics endpoint
      try {
        const statsSection = await page.locator('text=Statistics').or(page.locator('text=stats')).first();
        if (await statsSection.isVisible()) {
          await statsSection.click();
          await page.waitForTimeout(500);
        }
        
        // Execute a stats call to show real data
        const tryItButton = await page.locator('text=Try it').first();
        if (await tryItButton.isVisible()) {
          await tryItButton.click();
          await page.waitForTimeout(500);
          
          const executeButton = await page.locator('text=Execute').or(page.locator('text=Send')).first();
          if (await executeButton.isVisible()) {
            await executeButton.click();
            await page.waitForTimeout(2000); // Wait for response
          }
        }
      } catch (error) {
        console.log('Could not fully navigate to stats section:', error.message);
      }
    },
    viewport: { width: 1920, height: 1080 }
  },
  {
    name: 'mobile-responsive',
    description: 'Mobile responsive design',
    setup: async (page) => {
      await page.goto(DOCS_URL);
      await page.waitForLoadState('networkidle');
    },
    viewport: { width: 375, height: 667 } // iPhone SE dimensions
  },
  {
    name: 'error-handling',
    description: 'Error handling demonstration',
    setup: async (page) => {
      await page.goto(DOCS_URL);
      await page.waitForLoadState('networkidle');
      
      // Try to trigger an error by making an invalid request
      try {
        await page.evaluate(async () => {
          // Trigger a toast notification to show error handling
          if (window.showToast) {
            window.showToast('API Error: Invalid vehicle type "invalid_type". Valid types are: compact, standard, oversized', 'error');
          }
        });
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log('Could not trigger error demo:', error.message);
      }
    },
    viewport: { width: 1920, height: 1080 }
  },
  {
    name: 'environment-switching',
    description: 'Environment switching interface',
    setup: async (page) => {
      await page.goto(DOCS_URL);
      await page.waitForLoadState('networkidle');
      
      // Try to show environment selector
      try {
        const envSelector = await page.locator('[data-testid="environment-selector"]').or(page.locator('select')).first();
        if (await envSelector.isVisible()) {
          await envSelector.click();
          await page.waitForTimeout(500);
        }
      } catch (error) {
        console.log('Could not show environment selector:', error.message);
      }
    },
    viewport: { width: 1920, height: 1080 }
  }
];

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

async function populateTestData() {
  console.log('🚗 Populating test data...');
  
  const testVehicles = [
    { licensePlate: 'ABC123', vehicleType: 'standard' },
    { licensePlate: 'XYZ789', vehicleType: 'compact' },
    { licensePlate: 'DEF456', vehicleType: 'oversized' },
    { licensePlate: 'GHI789', vehicleType: 'standard' },
    { licensePlate: 'JKL012', vehicleType: 'compact' }
  ];
  
  for (const vehicle of testVehicles) {
    try {
      const response = await fetch(`${API_BASE}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicle)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Checked in ${vehicle.licensePlate} to ${result.spotId}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not check in ${vehicle.licensePlate}:`, error.message);
    }
  }
  
  console.log('✅ Test data populated');
}

async function checkServersRunning() {
  console.log('🔍 Checking servers...');
  
  try {
    // Check API server
    const apiResponse = await fetch(`${API_BASE}/garage/status`);
    if (!apiResponse.ok) {
      throw new Error('API server not responding');
    }
    console.log('✅ API server running');
    
    // Check docs server
    const docsResponse = await fetch(DOCS_URL);
    if (!docsResponse.ok) {
      throw new Error('Docs server not responding');
    }
    console.log('✅ Docs server running');
    
  } catch (error) {
    console.error('❌ Server check failed:', error.message);
    console.log('\n🔧 To fix this:');
    console.log('1. Start API server: npm start');
    console.log('2. Start docs server: cd docs && python3 -m http.server 9000');
    process.exit(1);
  }
}

async function captureScreenshots() {
  console.log('📸 Starting screenshot capture...');
  
  await ensureDirectoryExists(SCREENSHOTS_DIR);
  
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  try {
    for (const screenshot of SCREENSHOTS) {
      console.log(`📷 Capturing: ${screenshot.description}`);
      
      const context = await browser.newContext({
        viewport: screenshot.viewport,
        deviceScaleFactor: 1
      });
      
      const page = await context.newPage();
      
      try {
        // Setup the page
        await screenshot.setup(page);
        
        // Take the screenshot
        const screenshotPath = path.join(SCREENSHOTS_DIR, `${screenshot.name}.png`);
        await page.screenshot({ 
          path: screenshotPath, 
          fullPage: false,
          type: 'png'
        });
        
        console.log(`✅ Saved: ${screenshot.name}.png`);
        
      } catch (error) {
        console.error(`❌ Failed to capture ${screenshot.name}:`, error.message);
      }
      
      await context.close();
      
      // Brief pause between screenshots
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } finally {
    await browser.close();
  }
  
  console.log('🎉 Screenshot capture complete!');
}

async function main() {
  console.log('🎯 Enhanced API Interface Screenshot Capture');
  console.log('==========================================\n');
  
  try {
    await checkServersRunning();
    await populateTestData();
    await captureScreenshots();
    
    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log('\n🔗 Update your README.md to reference these new screenshots.');
    
  } catch (error) {
    console.error('\n❌ Screenshot capture failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { captureScreenshots, populateTestData, checkServersRunning };
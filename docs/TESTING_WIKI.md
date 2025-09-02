# Testing Wiki - Parking Garage Management System

## 🧪 E2E Testing with Playwright

### Quick Start
```bash
# Run all E2E tests
npm run test:e2e

# Run tests with visual output (headless)
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### Test Suites Overview

| Test Suite | Purpose | Success Rate | Key Features |
|------------|---------|--------------|--------------|
| `fixed-tests.spec.ts` | Core functionality validation | 90% | Real auth, responsive design, performance |
| `auth-simple.spec.ts` | Basic authentication flows | 75% | Login/signup/navigation |
| `full-flow.spec.ts` | Complete user journeys | 75% | Module access, backend connectivity |
| `auth.spec.ts` | Comprehensive auth testing | - | Session management, role access |
| `payment.spec.ts` | Payment processing | - | Credit card flows, validation |
| `user-profile.spec.ts` | Profile management | - | Settings, 2FA, account deletion |

### Working Credentials
```typescript
const ADMIN_USER = {
  email: 'admin@parkinggarage.com',
  password: 'admin123'
}
```

### Configuration
- **Frontend URL**: http://localhost:4285
- **Backend URL**: http://localhost:3000
- **Test Directory**: `./tests/e2e/`
- **Browsers**: Chromium, Firefox, Safari
- **Viewports**: Desktop (1280x720), Tablet (768x1024), Mobile (375x667)

### Key Test Patterns

#### Authentication Testing
```typescript
// Real user login
await page.fill('input[type="email"]', ADMIN_USER.email)
await page.fill('input[type="password"]', ADMIN_USER.password)
await page.getByRole('button', { name: 'Sign In' }).click()
await expect(page).toHaveURL('/dashboard')
```

#### API Mocking
```typescript
// Mock login response
await page.route('**/api/auth/login', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, user: {...} })
  })
})
```

#### Responsive Testing
```typescript
// Test mobile viewport
await page.setViewportSize({ width: 375, height: 667 })
await page.screenshot({ path: 'test-results/mobile-view.png' })
```

### Performance Metrics
- **Login Page Load**: 327ms average
- **Authentication Flow**: 1.4 seconds complete
- **Dashboard Navigation**: Instant routing
- **Module Access**: < 1 second load times

### Test Results Analysis

#### ✅ Working Features
- JWT-based authentication system
- Route protection and redirects
- Responsive design (mobile/tablet/desktop)
- Module navigation (spots, vehicles, garages, analytics)
- Form validation and error handling
- Performance benchmarks

#### ⚠️ Known Issues
- Backend health endpoint connectivity (intermittent)
- API timing measurements (method not supported)
- Error message display consistency

### Best Practices

#### Test Structure
- Use `test.beforeEach` for common setup
- Take screenshots on failures for debugging
- Log console output for error analysis
- Test both success and error scenarios

#### Error Handling
- Always wait for elements with timeouts
- Use `waitForURL` for navigation verification  
- Check for both success redirects and error messages
- Mock external API calls for reliability

#### Performance Testing
- Measure critical user flows
- Set reasonable performance thresholds
- Test across different viewport sizes
- Monitor network requests and timing

### Troubleshooting

#### Common Issues
1. **Port Configuration**: Ensure frontend runs on 4285, backend on 3000
2. **Backend Connectivity**: Start backend server before running tests
3. **Element Selectors**: Use UI exploration to find correct selectors
4. **Timing Issues**: Add appropriate waits for dynamic content

#### Debugging Commands
```bash
# Run single test file
npx playwright test tests/e2e/fixed-tests.spec.ts

# Run with debug mode
npx playwright test --debug

# Generate and view report
npx playwright test --reporter=html
npx playwright show-report
```

### CI/CD Integration
- Tests run in headless mode by default
- Screenshots and videos captured on failures
- Test reports generated in HTML format
- Artifacts stored in `test-results/` directory

### Future Enhancements
- Cross-browser testing automation
- Visual regression testing
- Load testing with multiple concurrent users
- Integration with deployment pipelines
- Automated test data management

---

*Last updated: 2025-09-02 | Test Framework: Playwright v1.55.0*
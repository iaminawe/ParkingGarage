# Testing Strategy

## Overview

Our testing strategy ensures code quality, reliability, and maintainability through comprehensive automated testing at multiple levels. We follow Test-Driven Development (TDD) principles and aim for >90% code coverage.

## Testing Pyramid

```
         /\
        /E2E\        5% - End-to-End Tests
       /______\
      /        \
     /Integration\   25% - Integration Tests  
    /______________\
   /                \
  /   Unit Tests     \  70% - Unit Tests
 /____________________\
```

## Test Levels

### 1. Unit Tests (70%)

**Purpose**: Test individual functions and components in isolation.

**Tools**:
- Jest (JavaScript)
- Mocha + Chai (Alternative)
- Sinon (Mocking)
- Istanbul (Coverage)

**What to Test**:
- Business logic
- Utility functions
- Data transformations
- Validators
- Error handling

**Example Unit Test**:
```javascript
// src/utils/pricing.test.js
describe('PricingCalculator', () => {
  describe('calculateParkingFee', () => {
    it('should calculate hourly rate correctly', () => {
      const result = calculateParkingFee({
        startTime: '2025-08-31T10:00:00Z',
        endTime: '2025-08-31T12:30:00Z',
        hourlyRate: 5.00
      });
      
      expect(result).toEqual({
        duration: 2.5,
        amount: 12.50,
        breakdown: {
          hours: 2.5,
          rate: 5.00
        }
      });
    });
    
    it('should apply daily rate when appropriate', () => {
      const result = calculateParkingFee({
        startTime: '2025-08-31T08:00:00Z',
        endTime: '2025-08-31T18:00:00Z',
        hourlyRate: 5.00,
        dailyRate: 30.00
      });
      
      expect(result.amount).toBe(30.00);
      expect(result.rateType).toBe('daily');
    });
    
    it('should throw error for invalid dates', () => {
      expect(() => {
        calculateParkingFee({
          startTime: '2025-08-31T18:00:00Z',
          endTime: '2025-08-31T10:00:00Z',
          hourlyRate: 5.00
        });
      }).toThrow('End time must be after start time');
    });
  });
});
```

### 2. Integration Tests (25%)

**Purpose**: Test interactions between components and external systems.

**Tools**:
- Supertest (API testing)
- Test containers (Database testing)
- Nock (HTTP mocking)

**What to Test**:
- API endpoints
- Database operations
- Service interactions
- Message queue operations
- Cache operations

**Example Integration Test**:
```javascript
// tests/integration/reservation.test.js
describe('Reservation API', () => {
  let app;
  let database;
  
  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createApp({ database });
  });
  
  afterAll(async () => {
    await database.close();
  });
  
  describe('POST /api/v1/reservations', () => {
    it('should create a reservation successfully', async () => {
      // Arrange
      const authToken = await getAuthToken();
      const spotId = await createTestSpot();
      
      // Act
      const response = await request(app)
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          spotId,
          startTime: '2025-09-01T10:00:00Z',
          endTime: '2025-09-01T14:00:00Z',
          vehicleInfo: {
            licensePlate: 'TEST123',
            make: 'Toyota',
            model: 'Camry'
          }
        });
      
      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reservationId).toBeDefined();
      expect(response.body.data.confirmationCode).toBeDefined();
      
      // Verify database
      const reservation = await database.query(
        'SELECT * FROM reservations WHERE id = $1',
        [response.body.data.reservationId]
      );
      expect(reservation.rows).toHaveLength(1);
    });
    
    it('should prevent double booking', async () => {
      // Create first reservation
      await createReservation({
        spotId: 'spot_001',
        startTime: '2025-09-01T10:00:00Z',
        endTime: '2025-09-01T14:00:00Z'
      });
      
      // Attempt overlapping reservation
      const response = await request(app)
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          spotId: 'spot_001',
          startTime: '2025-09-01T12:00:00Z',
          endTime: '2025-09-01T16:00:00Z'
        });
      
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('RESERVATION_CONFLICT');
    });
  });
});
```

### 3. End-to-End Tests (5%)

**Purpose**: Test complete user workflows through the entire system.

**Tools**:
- Cypress (Web UI)
- Playwright (Alternative)
- Detox (Mobile)
- Newman (API workflows)

**What to Test**:
- Critical user journeys
- Payment flows
- Authentication flows
- Reservation workflows
- Admin operations

**Example E2E Test**:
```javascript
// cypress/e2e/parking-session.cy.js
describe('Complete Parking Session', () => {
  it('should complete a full parking session', () => {
    // User arrives at parking garage
    cy.visit('/');
    cy.get('[data-testid="check-availability"]').click();
    
    // View available spots
    cy.get('[data-testid="spot-list"]').should('be.visible');
    cy.get('[data-testid="available-spots"]').should('have.length.gt', 0);
    
    // Select a spot
    cy.get('[data-testid="spot-A101"]').click();
    cy.get('[data-testid="reserve-spot"]').click();
    
    // Login
    cy.get('[data-testid="email"]').type('test@example.com');
    cy.get('[data-testid="password"]').type('TestPassword123!');
    cy.get('[data-testid="login-button"]').click();
    
    // Confirm reservation
    cy.get('[data-testid="vehicle-plate"]').type('ABC123');
    cy.get('[data-testid="confirm-reservation"]').click();
    
    // Verify confirmation
    cy.get('[data-testid="confirmation-code"]').should('be.visible');
    cy.get('[data-testid="qr-code"]').should('be.visible');
    
    // Simulate entry
    cy.get('[data-testid="simulate-entry"]').click();
    cy.get('[data-testid="session-active"]').should('contain', 'Active');
    
    // Simulate exit and payment
    cy.wait(5000); // Simulate parking duration
    cy.get('[data-testid="simulate-exit"]').click();
    cy.get('[data-testid="payment-amount"]').should('be.visible');
    cy.get('[data-testid="pay-now"]').click();
    
    // Verify completion
    cy.get('[data-testid="payment-success"]').should('be.visible');
    cy.get('[data-testid="receipt"]').should('be.visible');
  });
});
```

## Test Categories

### Functional Testing
- Feature verification
- Business logic validation
- User workflow testing
- API contract testing

### Non-Functional Testing

#### Performance Testing
```javascript
// tests/performance/load.test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
};

export default function () {
  let response = http.get('https://api.parkinggarage.com/v1/spots');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

#### Security Testing
- SQL injection prevention
- XSS protection
- Authentication bypass attempts
- Authorization verification
- Rate limiting validation

#### Accessibility Testing
- WCAG 2.1 compliance
- Screen reader compatibility
- Keyboard navigation
- Color contrast validation

## Test Data Management

### Test Data Strategy
```javascript
// tests/fixtures/testData.js
export const testUsers = {
  regular: {
    email: 'regular@test.com',
    password: 'Test123!',
    role: 'user'
  },
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!',
    role: 'admin'
  },
  premium: {
    email: 'premium@test.com',
    password: 'Premium123!',
    role: 'premium'
  }
};

export const testSpots = {
  available: {
    id: 'spot_test_001',
    level: 1,
    zone: 'A',
    number: 'A-101',
    status: 'available'
  },
  occupied: {
    id: 'spot_test_002',
    level: 1,
    zone: 'B',
    number: 'B-201',
    status: 'occupied'
  }
};
```

### Database Seeding
```javascript
// tests/seeds/testSeed.js
export async function seedTestDatabase(db) {
  await db.transaction(async (trx) => {
    // Clear existing data
    await trx('parking_sessions').del();
    await trx('reservations').del();
    await trx('spots').del();
    await trx('users').del();
    
    // Insert test data
    await trx('users').insert(testUsers);
    await trx('spots').insert(testSpots);
    await trx('reservations').insert(testReservations);
  });
}
```

## Continuous Integration

### CI Pipeline Configuration
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:6
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost/test
          REDIS_URL: redis://localhost:6379
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
      
      - name: Run E2E tests
        if: github.event_name == 'pull_request'
        run: npm run test:e2e
```

## Test Commands

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration --runInBand",
    "test:e2e": "cypress run",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:performance": "k6 run tests/performance/load.test.js",
    "test:security": "npm audit && snyk test",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

## Coverage Requirements

### Minimum Coverage Targets
- Overall: 90%
- Statements: 90%
- Branches: 85%
- Functions: 90%
- Lines: 90%

### Coverage Configuration
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/index.js',
    '!src/migrations/**',
    '!src/seeds/**',
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};
```

## Testing Best Practices

### Do's
✅ Write tests before code (TDD)
✅ Keep tests simple and focused
✅ Use descriptive test names
✅ Test edge cases and error scenarios
✅ Mock external dependencies
✅ Use test fixtures for consistency
✅ Run tests in isolation
✅ Clean up after tests

### Don'ts
❌ Test implementation details
❌ Write brittle tests
❌ Ignore failing tests
❌ Test third-party libraries
❌ Use production data
❌ Share state between tests
❌ Skip error scenarios
❌ Hard-code test values

## Debugging Failed Tests

### Local Debugging
```bash
# Run specific test file
npm test -- src/services/parking.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should calculate fee"

# Run with verbose output
npm test -- --verbose

# Debug with Node inspector
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

### CI Debugging
- Check CI logs for error details
- Review test artifacts
- Reproduce locally with same environment
- Check for timing/race conditions
- Verify test data setup

## Test Reporting

### Reports Generated
1. **Coverage Report**: HTML report in `/coverage`
2. **JUnit XML**: For CI integration
3. **Console Output**: Immediate feedback
4. **Allure Report**: Comprehensive test analytics

### Monitoring Test Health
- Track test execution time trends
- Monitor flaky test patterns
- Review coverage trends
- Analyze failure patterns

---

*For development setup, see [Development Guide](Development-Guide.md)*
*For CI/CD details, see [Deployment Guide](Deployment-Guide.md)*
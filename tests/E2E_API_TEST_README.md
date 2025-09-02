# Comprehensive API End-to-End Test Suite

This directory contains comprehensive end-to-end tests for all 21+ API endpoints in the Parking Garage Management System. The test suite provides thorough validation of functionality, security, performance, and integration scenarios.

## 📋 Test Coverage

### Authentication API Tests (5+ endpoints)
- `POST /api/auth/signup` - User registration with validation
- `POST /api/auth/login` - User authentication
- `POST /api/auth/refresh` - Token refresh flows
- `POST /api/auth/logout` - Logout and token blacklisting
- `POST /api/auth/password-reset` - Password reset flows
- Additional auth endpoints (profile, change-password, verify, etc.)

### Users API Tests (6+ endpoints)
- `GET /api/users` - List users with pagination/filters (admin only)
- `GET /api/users/:id` - Get user by ID with permissions
- `PUT /api/users/:id` - Update user profile with validation
- `DELETE /api/users/:id` - Soft user deletion
- `POST /api/users/change-password` - Password changes
- `POST /api/users/reset-password` - Password resets
- Additional endpoints for role management, activation, stats

### Vehicles API Tests (6 endpoints)
- `GET /api/vehicles` - List vehicles with filters
- `POST /api/vehicles` - Create vehicle with validation
- `GET /api/vehicles/:id` - Get vehicle by ID
- `PUT /api/vehicles/:id` - Update vehicle details
- `DELETE /api/vehicles/:id` - Delete vehicle (soft delete)
- `POST /api/vehicles/search` - Search vehicles functionality

### Reservations API Tests (6 endpoints)
- `GET /api/reservations` - List reservations with filters
- `POST /api/reservations` - Create reservations with business logic
- `GET /api/reservations/:id` - Get reservation details
- `PUT /api/reservations/:id` - Update reservations
- `DELETE /api/reservations/:id` - Cancel reservations
- `GET /api/reservations/availability` - Check spot availability

### Payments API Tests (5 endpoints)
- `GET /api/payments` - List payments with filtering
- `POST /api/payments` - Process payments
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/:id/refund` - Process refunds
- `GET /api/payments/summary` - Payment reports and analytics

### Transactions API Tests (4 endpoints)
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transactions
- `GET /api/transactions/:id` - Get transaction details
- `PUT /api/transactions/:id/status` - Update transaction status

## 🚀 Getting Started

### Prerequisites

```bash
# Install dependencies
npm install

# Set up test environment variables
cp .env.test.example .env.test
```

### Environment Variables

Create a `.env.test` file with the following variables:

```bash
NODE_ENV=test
DATABASE_URL="file:./test.db"
TEST_DATABASE_URL="file:./test.db"
JWT_SECRET="test-secret-key-for-testing-only"
JWT_REFRESH_SECRET="test-refresh-secret-key"

# Optional: Enable specific test features
E2E_TEST_CONFIG='{"enablePerformanceTesting": true, "enableSecurityTesting": true}'
```

## 🧪 Running Tests

### Run All API Tests
```bash
# Run complete E2E API test suite
npm run test:integration

# Or specifically run API tests
npm test tests/integration/api/
```

### Run Individual Test Suites
```bash
# Authentication tests only
npm test tests/integration/api/auth.e2e.test.ts

# Users API tests
npm test tests/integration/api/users.e2e.test.ts

# Vehicles API tests  
npm test tests/integration/api/vehicles.e2e.test.ts

# Reservations API tests
npm test tests/integration/api/reservations.e2e.test.ts

# Payments API tests
npm test tests/integration/api/payments.e2e.test.ts

# Transactions API tests
npm test tests/integration/api/transactions.e2e.test.ts
```

### Run Master Test Suite
```bash
# Run comprehensive test suite with reporting
npm test tests/e2e-api-suite.test.ts

# With specific configuration
E2E_TEST_CONFIG='{"enableLoadTesting": true}' npm test tests/e2e-api-suite.test.ts
```

### Run with Coverage
```bash
npm run test:coverage
```

## 📊 Test Reports

Test reports are automatically generated in the `tests/reports/` directory:

- `e2e-api-test-report-[timestamp].json` - Detailed test results
- `latest-test-summary.json` - Summary of latest test run

## 🔧 Test Configuration

### Master Suite Configuration

The master test suite (`e2e-api-suite.test.ts`) supports various configuration options:

```typescript
interface TestSuiteConfig {
  enablePerformanceTesting: boolean;  // Enable performance tests
  enableSecurityTesting: boolean;     // Enable security validation
  enableLoadTesting: boolean;         // Enable load/stress tests
  generateReports: boolean;           // Generate detailed reports
  testTimeout: number;                // Timeout per test (ms)
  maxConcurrentTests: number;         // Concurrent test limit
  retryFailedTests: boolean;          // Retry failed tests
  retryCount: number;                 // Number of retries
}
```

Configure via environment variable:
```bash
export E2E_TEST_CONFIG='{"enableLoadTesting": true, "testTimeout": 60000}'
```

## 🏗️ Test Structure

### Test Organization
```
tests/
├── integration/api/           # Individual API endpoint tests
│   ├── auth.e2e.test.ts      # Authentication API tests
│   ├── users.e2e.test.ts     # Users API tests
│   ├── vehicles.e2e.test.ts  # Vehicles API tests
│   ├── reservations.e2e.test.ts
│   ├── payments.e2e.test.ts
│   └── transactions.e2e.test.ts
├── helpers/                   # Test utilities and helpers
│   ├── api-test-helpers.ts    # API testing utilities
│   ├── auth-helpers.ts        # Authentication helpers
│   └── app-helpers.ts         # Application setup helpers
├── setup/                     # Test setup and configuration
│   └── test-db-setup.ts      # Database setup/teardown
├── e2e-api-suite.test.ts     # Master test suite runner
└── reports/                   # Generated test reports
```

### Key Test Features

#### Comprehensive Validation
- **Response Structure**: Validates API response format and structure
- **Status Codes**: Ensures correct HTTP status codes
- **Headers**: Validates security and response headers
- **Data Integrity**: Verifies data consistency and relationships

#### Authentication & Authorization
- **JWT Token Validation**: Tests token generation, refresh, and expiration
- **Role-Based Access**: Validates admin, manager, and customer permissions  
- **Rate Limiting**: Tests API rate limiting enforcement
- **Security Headers**: Validates security header implementation

#### Business Logic Testing
- **Edge Cases**: Tests boundary conditions and invalid inputs
- **Concurrency**: Tests concurrent operations and race conditions
- **Integration**: Tests cross-module workflows and data consistency
- **Error Handling**: Validates error responses and recovery

#### Performance Testing
- **Response Times**: Measures and validates API response times
- **Load Testing**: Tests API under concurrent user load
- **Memory Usage**: Monitors memory consumption during tests
- **Throughput**: Measures request processing capacity

## 📝 Writing New Tests

### Test Template
```typescript
describe('New API Endpoint Tests', () => {
  let app: Application;
  let testDb: TestDatabase;
  let context: APITestContext;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    app = await createTestApp(testDb.getService());
    context = await createAPITestContext(app, testDb.getService());
  });

  afterAll(async () => {
    await teardownTestDatabase(testDb);
  });

  beforeEach(async () => {
    await testDb.reset();
  });

  describe('Endpoint Name', () => {
    it('should handle valid requests', async () => {
      const response = await createAuthenticatedRequest(
        app, 'post', '/api/endpoint', context.customerToken
      )
        .send(validData)
        .expect(201);

      const validation = validateAPIResponse(response, 201);
      expect(validation.hasSuccessField).toBe(true);
      expect(validation.hasDataField).toBe(true);
    });

    it('should validate input', async () => {
      const validationCases = [
        { name: 'missing field', input: {}, expectedStatus: 400 }
      ];

      const results = await testInputValidation(
        app, 'post', '/api/endpoint', validationCases, context.customerToken
      );

      results.forEach(result => {
        expect(result.passed).toBe(true);
      });
    });
  });
});
```

### Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Data Reset**: Always reset test data between tests using `testDb.reset()`
3. **Error Testing**: Test both success and failure scenarios
4. **Authentication**: Test with different user roles (admin, manager, customer)
5. **Input Validation**: Use `testInputValidation` helper for comprehensive input testing
6. **Response Validation**: Always validate response structure using `validateAPIResponse`

## 🐛 Debugging Tests

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm test

# Run with Jest verbose output
npm test -- --verbose

# Run specific test with debugging
npm test tests/integration/api/auth.e2e.test.ts -- --verbose
```

### Common Issues

1. **Database Connection Issues**
   - Ensure TEST_DATABASE_URL is set correctly
   - Check database permissions and accessibility

2. **Authentication Failures**
   - Verify JWT_SECRET is set in test environment
   - Check token generation in test helpers

3. **Timeout Issues**
   - Increase test timeout for slow operations
   - Check database setup/teardown performance

4. **Rate Limiting**
   - Tests include rate limit testing
   - May need to adjust limits for test environment

## 🔒 Security Testing

The test suite includes comprehensive security validation:

- **Authentication Bypass**: Tests for authentication vulnerabilities
- **Authorization Flaws**: Validates role-based access controls
- **Input Sanitization**: Tests for injection vulnerabilities
- **Rate Limiting**: Validates DoS protection
- **Data Exposure**: Checks for sensitive data leakage

## 📈 Performance Benchmarks

Expected performance benchmarks:

- **Authentication**: < 200ms response time
- **CRUD Operations**: < 500ms response time
- **Search/Filter**: < 1000ms response time
- **Reports/Analytics**: < 2000ms response time
- **Concurrent Users**: Support 50+ concurrent operations

## 🚨 CI/CD Integration

### GitHub Actions
```yaml
name: API E2E Tests
on: [push, pull_request]
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:integration
      - uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: tests/reports/
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [API Testing Best Practices](https://restfulapi.net/api-testing/)
- [Node.js Testing Guide](https://nodejs.org/en/docs/guides/testing/)

---

## 🎯 Success Criteria

A successful test run should achieve:
- ✅ 100% endpoint coverage (21+ endpoints)
- ✅ >95% test success rate
- ✅ <2s average response time
- ✅ All security validations passing
- ✅ Zero critical vulnerabilities
- ✅ Comprehensive error handling coverage

**Happy Testing! 🧪**
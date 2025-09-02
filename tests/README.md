# Test Suite Documentation

## Overview

This comprehensive test suite is designed for the Parking Garage API with SQLite/Prisma integration. The tests ensure database operations, API endpoints, business logic, and performance requirements are all validated.

## Test Structure

```
tests/
├── helpers/          # Test setup and utilities
├── factories/        # Test data generation
├── unit/            # Unit tests for repositories and services
├── integration/     # API integration tests
├── database/        # Database-specific tests
├── performance/     # Performance and load tests
└── data/           # Test database files
```

## Test Types

### Unit Tests
- **Repository Tests**: Test data access layer with Prisma ORM
- **Service Tests**: Test business logic in isolation
- **Model Tests**: Test data models and validations

### Integration Tests
- **API Tests**: Test REST endpoints with database persistence
- **End-to-End Tests**: Complete workflows from API to database

### Database Tests
- **Schema Tests**: Verify database structure and constraints
- **Migration Tests**: Ensure schema changes work correctly
- **Transaction Tests**: Test ACID properties and rollbacks

### Performance Tests
- **Query Performance**: Measure database query execution time
- **Bulk Operations**: Test large dataset handling
- **Concurrent Operations**: Test multi-user scenarios

## Test Configuration

### Jest Configuration
The test suite uses Jest with TypeScript support and multiple test environments:

- **Unit Tests**: Fast, isolated tests with mocked dependencies
- **Integration Tests**: Tests with test database
- **Database Tests**: Direct database operations testing
- **Performance Tests**: Extended timeout for performance measurement

### Database Setup
- **Test Database**: Separate SQLite database (`tests/data/test.db`)
- **Isolation**: Each test suite resets database state
- **Fixtures**: Consistent test data through factories

## Running Tests

### All Tests
```bash
npm test
```

### Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Database-specific tests
npm run test:database

# Performance tests
npm run test:performance
```

### Test Options
```bash
# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Verbose output
npm test -- --verbose
```

## Test Factories

### Usage
```javascript
const { VehicleFactory, SpotFactory, SessionFactory } = require('../factories');

// Create single entities
const vehicle = await VehicleFactory.createVehicle({
  licensePlate: 'TEST001',
  make: 'Toyota'
});

// Create related entities
const scenario = await createParkingScenario({
  spotCount: 10,
  vehicleCount: 5,
  activeSessionCount: 2
});
```

### Available Factories
- **GarageFactory**: Create parking garages
- **SpotFactory**: Create parking spots
- **VehicleFactory**: Create vehicles
- **SessionFactory**: Create parking sessions
- **PaymentFactory**: Create payment records

## Database Test Utilities

### Setup and Teardown
```javascript
// Global setup (once before all tests)
global.testDb.getPrisma()  // Get Prisma client
global.testDb.reset()      // Reset database
global.testDb.seed()       // Seed with basic data
```

### Test Isolation
- Each test starts with clean database state
- Transactions can be used for faster cleanup
- Foreign key constraints are maintained

## Performance Benchmarks

### Thresholds
- Single operations: < 100ms
- Bulk operations: < 5 seconds
- Complex queries: < 1 second
- Concurrent operations: < 2 seconds

### Monitoring
Performance tests track:
- Query execution time
- Memory usage
- Database connection pool usage
- Transaction rollback time

## Best Practices

### Test Structure
1. **Arrange**: Set up test data using factories
2. **Act**: Execute the operation being tested  
3. **Assert**: Verify expected outcomes

### Test Data
- Use factories for consistent test data
- Create minimal data needed for each test
- Clean up data between tests automatically

### Error Testing
- Test both success and failure scenarios
- Verify error messages are user-friendly
- Test edge cases and boundary conditions

### Database Testing
- Test constraints and validations
- Verify foreign key relationships
- Test transaction rollback scenarios
- Validate data integrity across operations

## Troubleshooting

### Common Issues

#### Test Database Connection
If tests fail with database connection errors:
```bash
npm run test:setup
```

#### Slow Test Execution
- Check for missing database indexes
- Verify test database is using SQLite in-memory mode where appropriate
- Monitor for test data cleanup issues

#### Flaky Tests
- Ensure proper test isolation
- Check for timing issues in concurrent tests
- Verify test data is deterministic

#### Memory Issues
- Check for database connection leaks
- Monitor for large test data sets
- Ensure proper cleanup in test teardown

### Debug Mode
```bash
# Run with debug output
DEBUG_TESTS=true npm test

# Run specific test file
npm test -- tests/unit/repositories/vehicleRepository.test.js
```

## Coverage Requirements

### Minimum Coverage
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

### Critical Areas
- Repository methods: 95%
- API endpoints: 90%
- Business logic: 90%
- Error handling: 85%

## Continuous Integration

### Test Pipeline
1. Setup test database
2. Run unit tests (fast)
3. Run integration tests
4. Run database tests
5. Run performance tests (if not pull request)
6. Generate coverage report

### Environment Variables
- `NODE_ENV=test`: Test environment
- `DATABASE_URL`: Test database connection
- `DEBUG_TESTS`: Enable debug output

## Contributing

### Adding New Tests
1. Create test file in appropriate directory
2. Use existing factories for test data
3. Follow naming conventions
4. Include both positive and negative test cases
5. Update documentation if needed

### Test Naming
```javascript
describe('EntityName', () => {
  describe('methodName', () => {
    test('should perform expected behavior with valid input', () => {
      // Test implementation
    });
    
    test('should handle invalid input gracefully', () => {
      // Error case testing
    });
  });
});
```

### Factory Guidelines
- Keep factories simple and focused
- Support property overrides
- Handle database relationships properly
- Provide both data creation and entity creation methods

---

For more information, see individual test files and the project's main documentation.
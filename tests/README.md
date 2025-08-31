# Parking Garage API - Test Suite

## Overview
Comprehensive test suite for the Parking Garage Management Web API, covering all MVP functionalities identified in the project brief.

## Test Coverage

### Core Features Tested
1. **Garage Layout Management**
   - Garage structure retrieval
   - Floor and bay configuration

2. **Parking Spot Management**
   - List all spots with status
   - Filter by availability, floor, bay
   - Get next available spot
   - Update spot status

3. **Car Check-In**
   - Successful vehicle check-in
   - Spot assignment
   - Duplicate prevention
   - Full garage handling
   - License plate validation

4. **Car Check-Out**
   - Successful vehicle check-out
   - Spot release
   - Duration calculation
   - Non-existent vehicle handling

5. **Car Search (Stretch Goal)**
   - Find vehicle by license plate
   - Case-insensitive search
   - Real-time duration tracking

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Integration tests only
npm run test:integration

# Unit tests only
npm run test:unit

# Watch mode for development
npm run test:watch

# With coverage report
npm run test:coverage
```

### Run Individual Test Files
```bash
# Main integration tests
npx jest tests/integration/parking-garage.test.js

# Performance tests
npx jest tests/integration/performance.test.js
```

## Test Structure

```
tests/
├── integration/
│   ├── parking-garage.test.js  # Main integration tests
│   └── performance.test.js     # Load and performance tests
├── helpers/
│   ├── setup.js                # Test environment setup
│   ├── testUtils.js            # Test utilities and builders
│   └── mockApp.js              # Mock Express application
└── README.md                    # This file
```

## Test Categories

### 1. Happy Path Tests
- Standard check-in/check-out flow
- Normal spot queries
- Basic search operations
- Expected state transitions

### 2. Edge Case Tests
- Empty garage
- Full garage (100% capacity)
- Single spot available
- Special characters in license plates
- Rapid concurrent operations

### 3. Error Handling Tests
- Invalid license plates
- Duplicate check-ins
- Non-existent vehicles
- Malformed requests
- Invalid spot IDs

### 4. Performance Tests
- Normal load (100 vehicles/hour)
- Peak load (500 vehicles/hour)
- Stress testing
- Query performance
- Memory management

### 5. Data Integrity Tests
- Spot count consistency
- No orphaned parking sessions
- Spot-vehicle relationship integrity
- State consistency under stress

## Test Data

### Default Garage Structure
- **Floors**: 3
- **Bays**: 2 per floor (except floor 3 has only bay A)
- **Spots per bay**: 25
- **Total spots**: 125

### Test Vehicles
- Standard format: `TEST-###`
- Special test cases: Unicode, spaces, hyphens
- Load test format: `LOAD-###`, `PEAK-###`, `STRESS-###`

## Assertions and Expectations

### Response Times
- Normal operations: < 100ms
- Under load: < 500ms average
- Query operations: < 100ms

### Throughput
- Minimum: 1 operation/second
- Target: 10+ operations/second

### Data Consistency
- Total spots = Available + Occupied
- No duplicate spot assignments
- No orphaned sessions

## Mock API Implementation

The test suite includes a complete mock implementation of the Parking Garage API that:
- Maintains in-memory state
- Simulates all API endpoints
- Provides test utilities for setup/teardown
- Supports occupancy simulation

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## Coverage Requirements

- **Unit Tests**: 80% code coverage
- **Integration Tests**: 100% endpoint coverage
- **Critical Paths**: 100% coverage for check-in/check-out
- **Error Scenarios**: All documented error codes tested

## Debugging Tests

### Enable Debug Output
```bash
DEBUG_TESTS=true npm test
```

### Run Specific Test
```bash
npx jest -t "should successfully check in a vehicle"
```

### Generate Coverage Report
```bash
npm run test:coverage
open coverage/index.html
```

## Test Utilities

### TestDataBuilder
Creates test data objects:
- `createGarage()`
- `createSpot()`
- `createVehicle()`
- `createBulkSpots()`

### GarageStateManager
Manages test state:
- `reset()`
- `checkInVehicle()`
- `checkOutVehicle()`
- `setOccupancy()`

### MockGarageAPI
Simulates API behavior:
- All endpoint implementations
- State management
- Error simulation

## Contributing

When adding new tests:
1. Follow existing test structure
2. Use descriptive test names
3. Include both positive and negative cases
4. Add performance considerations for new endpoints
5. Update this README with new test categories

## Notes

- Tests use Jest and Supertest
- Mock implementation for testing without actual API
- Supports concurrent testing
- Includes performance benchmarks
- Comprehensive error scenario coverage
# User Stories and Integration Testing Strategy for Parking Garage Management API

## Executive Summary
This document provides comprehensive user stories and integration testing strategies for all MVP API functionalities identified in the brief. Each user story follows the standard format and includes detailed acceptance criteria and corresponding integration test scenarios.

## Core MVP Functionalities Identified from Brief

### 1. Garage Layout Management
- Manage floors and bays
- Define and manage parking spots with unique identifiers

### 2. Parking Spot Management  
- List all parking spots with availability status
- Retrieve only available spots
- Mark spots as occupied or available

### 3. Car Tracking
- Check a car in (assign to available spot)
- Check a car out (free up spot)
- Track check-in and check-out timestamps

### 4. Car Search (Stretch Goal - MVP Priority)
- Look up a car by license plate

---

## User Stories

### Epic 1: Garage Layout Management

#### User Story 1.1: Configure Garage Structure
**As a** garage owner  
**I want to** configure my garage's floors and bays  
**So that** I can accurately represent my garage's physical layout in the system

**Acceptance Criteria:**
- Can create floors with unique identifiers
- Can create bays within each floor
- Can define the relationship between floors and bays
- System validates that floor/bay combinations are unique
- Can retrieve the complete garage structure

**Integration Test Scenarios:**
```javascript
// Test: Create garage structure
POST /api/floors
Body: { "floorNumber": 1, "name": "Ground Floor" }
Expected: 201 Created, returns floor with ID

POST /api/floors/1/bays
Body: { "bayCode": "A", "capacity": 50 }
Expected: 201 Created, returns bay with floor association

GET /api/garage/structure
Expected: 200 OK, returns complete hierarchical structure
```

#### User Story 1.2: Define Parking Spots
**As a** garage owner  
**I want to** define individual parking spots within bays  
**So that** I can track occupancy at the spot level

**Acceptance Criteria:**
- Can create parking spots with unique IDs
- Each spot is associated with a floor and bay
- Spots have a number/identifier for easy reference
- Initial status is set to "available"
- System prevents duplicate spot IDs

**Integration Test Scenarios:**
```javascript
// Test: Create and manage parking spots
POST /api/spots
Body: { 
  "spotId": "F1-A-001",
  "floor": 1,
  "bay": "A",
  "spotNumber": 1
}
Expected: 201 Created, returns spot with status "available"

POST /api/spots/bulk
Body: { 
  "floor": 1,
  "bay": "A",
  "startNumber": 1,
  "endNumber": 50
}
Expected: 201 Created, returns array of created spots
```

---

### Epic 2: Parking Spot Management

#### User Story 2.1: View All Parking Spots
**As a** parking attendant  
**I want to** see all parking spots and their current status  
**So that** I can monitor garage capacity and occupancy

**Acceptance Criteria:**
- Can retrieve list of all parking spots
- Each spot shows: ID, floor, bay, number, status
- For occupied spots, shows occupying vehicle info
- Can sort by floor/bay/status
- Response includes summary statistics

**Integration Test Scenarios:**
```javascript
// Test: Retrieve all spots with various states
GET /api/spots
Expected: 200 OK
Response: {
  "spots": [
    {
      "spotId": "F1-A-001",
      "floor": 1,
      "bay": "A",
      "spotNumber": 1,
      "status": "occupied",
      "occupiedBy": "ABC-123",
      "since": "2025-08-31T10:00:00Z"
    },
    {
      "spotId": "F1-A-002",
      "floor": 1,
      "bay": "A",
      "spotNumber": 2,
      "status": "available"
    }
  ],
  "summary": {
    "total": 100,
    "available": 45,
    "occupied": 55
  }
}
```

#### User Story 2.2: Find Available Spots
**As a** parking attendant  
**I want to** quickly see only available parking spots  
**So that** I can direct incoming vehicles efficiently

**Acceptance Criteria:**
- Can filter spots by availability status
- Can filter by floor or bay
- Returns only unoccupied spots
- Shows count of available spots
- Can get nearest available spot

**Integration Test Scenarios:**
```javascript
// Test: Query available spots with filters
GET /api/spots?status=available
Expected: 200 OK, returns only available spots

GET /api/spots?status=available&floor=1
Expected: 200 OK, returns available spots on floor 1

GET /api/spots?status=available&bay=A
Expected: 200 OK, returns available spots in bay A

GET /api/spots/next-available
Expected: 200 OK, returns single best available spot
```

#### User Story 2.3: Update Spot Status
**As a** garage administrator  
**I want to** manually update a spot's availability status  
**So that** I can handle special situations (maintenance, reservations)

**Acceptance Criteria:**
- Can mark a spot as occupied/available/maintenance
- System validates spot exists
- Cannot mark occupied spot as occupied again
- Logs status change with timestamp
- Returns updated spot information

**Integration Test Scenarios:**
```javascript
// Test: Manual spot status updates
PATCH /api/spots/F1-A-001/status
Body: { "status": "maintenance", "reason": "cleaning" }
Expected: 200 OK, spot marked as unavailable

PATCH /api/spots/F1-A-001/status
Body: { "status": "available" }
Expected: 200 OK, spot now available

// Test: Invalid status transitions
PATCH /api/spots/F1-A-002/status
Body: { "status": "occupied" } // When already occupied
Expected: 409 Conflict, "Spot already occupied"
```

---

### Epic 3: Car Tracking

#### User Story 3.1: Check In Vehicle
**As a** parking attendant  
**I want to** check in arriving vehicles  
**So that** I can assign them to spots and track their entry time

**Acceptance Criteria:**
- Can check in with license plate number
- System automatically assigns best available spot
- Records check-in timestamp
- Updates spot status to occupied
- Returns assigned spot and ticket information
- Rejects if no spots available
- Prevents duplicate check-ins for same license

**Integration Test Scenarios:**
```javascript
// Test: Successful check-in flow
POST /api/checkin
Body: { "licensePlate": "ABC-123" }
Expected: 201 Created
Response: {
  "ticketId": "TKT-20250831-001",
  "licensePlate": "ABC-123",
  "spot": "F1-A-001",
  "checkInTime": "2025-08-31T10:00:00Z",
  "floor": 1,
  "bay": "A"
}

// Test: Check-in when garage is full
POST /api/checkin
Body: { "licensePlate": "XYZ-789" }
Expected: 503 Service Unavailable
Response: { "error": "No available spots" }

// Test: Duplicate check-in attempt
POST /api/checkin
Body: { "licensePlate": "ABC-123" }
Expected: 409 Conflict
Response: { "error": "Vehicle already checked in", "spot": "F1-A-001" }
```

#### User Story 3.2: Check Out Vehicle
**As a** parking attendant  
**I want to** check out departing vehicles  
**So that** I can free up spots and calculate parking duration

**Acceptance Criteria:**
- Can check out by license plate
- Records check-out timestamp
- Calculates total parking duration
- Frees up the occupied spot
- Returns parking session summary
- Handles vehicle not found gracefully

**Integration Test Scenarios:**
```javascript
// Test: Successful check-out flow
POST /api/checkout
Body: { "licensePlate": "ABC-123" }
Expected: 200 OK
Response: {
  "licensePlate": "ABC-123",
  "spot": "F1-A-001",
  "checkInTime": "2025-08-31T10:00:00Z",
  "checkOutTime": "2025-08-31T14:30:00Z",
  "duration": "4 hours 30 minutes",
  "durationMinutes": 270
}

// Test: Check-out non-existent vehicle
POST /api/checkout
Body: { "licensePlate": "NOT-HERE" }
Expected: 404 Not Found
Response: { "error": "Vehicle not found in garage" }

// Test: Verify spot is freed after checkout
GET /api/spots/F1-A-001
Expected: 200 OK
Response: { 
  "spotId": "F1-A-001",
  "status": "available"
}
```

#### User Story 3.3: Track Parking Duration
**As a** garage owner  
**I want to** track how long each vehicle has been parked  
**So that** I can prepare for future billing implementation

**Acceptance Criteria:**
- System records precise check-in timestamp
- System records precise check-out timestamp
- Can calculate duration in minutes/hours
- Maintains parking history for session
- Timestamps use ISO 8601 format with timezone

**Integration Test Scenarios:**
```javascript
// Test: Duration tracking accuracy
// Step 1: Check in
POST /api/checkin
Body: { "licensePlate": "TIME-TEST" }
Note: Record checkInTime from response

// Step 2: Query current parking status
GET /api/cars/TIME-TEST
Expected: 200 OK
Response: {
  "licensePlate": "TIME-TEST",
  "spot": "F1-B-010",
  "checkInTime": "2025-08-31T10:00:00Z",
  "currentDuration": "2 hours 15 minutes" // Updates in real-time
}

// Step 3: Check out after known duration
POST /api/checkout
Body: { "licensePlate": "TIME-TEST" }
Verify: Duration calculation matches actual time elapsed
```

---

### Epic 4: Vehicle Search (Stretch Goal - MVP)

#### User Story 4.1: Search Vehicle by License Plate
**As a** parking attendant  
**I want to** look up a car by its license plate  
**So that** I can quickly find where it's parked or verify it's in the garage

**Acceptance Criteria:**
- Can search by exact license plate
- Returns spot location if found
- Returns check-in time and duration
- Returns not found if not in garage
- Search is case-insensitive
- Handles partial matches (optional)

**Integration Test Scenarios:**
```javascript
// Test: Successful vehicle lookup
GET /api/cars/ABC-123
Expected: 200 OK
Response: {
  "found": true,
  "licensePlate": "ABC-123",
  "spot": "F1-A-001",
  "floor": 1,
  "bay": "A",
  "checkInTime": "2025-08-31T10:00:00Z",
  "currentDuration": "3 hours 45 minutes"
}

// Test: Vehicle not in garage
GET /api/cars/NOT-HERE
Expected: 404 Not Found
Response: {
  "found": false,
  "message": "Vehicle not currently in garage"
}

// Test: Case-insensitive search
GET /api/cars/abc-123
Expected: 200 OK (finds ABC-123)

// Test: Search with special characters
GET /api/cars/ABC%20123 (URL encoded space)
Expected: 200 OK
```

---

## Integration Testing Strategy

### Test Environment Setup

#### 1. Test Data Management
```javascript
// Before each test suite
beforeEach(() => {
  // Reset to known state
  POST /api/test/reset
  
  // Load standard test data
  POST /api/test/seed
  Body: {
    floors: 3,
    baysPerFloor: 2,
    spotsPerBay: 25,
    initialOccupancy: 0.3 // 30% occupied
  }
});

// After each test suite
afterEach(() => {
  // Clean up test data
  POST /api/test/cleanup
});
```

#### 2. Test Categories

##### A. Happy Path Tests
- Standard check-in/check-out flow
- Normal spot queries
- Basic search operations
- Expected state transitions

##### B. Edge Case Tests
```javascript
// Boundary conditions
- Garage at 100% capacity
- Garage completely empty
- Single spot available
- Rapid concurrent check-ins
- Maximum license plate length
- Special characters in license plates
- Time zone handling
- Day boundary crossings (11:59 PM check-in)
```

##### C. Error Handling Tests
```javascript
// Invalid operations
- Check in already parked vehicle
- Check out non-existent vehicle
- Invalid spot IDs
- Malformed requests
- Missing required fields
- Invalid status transitions
```

##### D. State Consistency Tests
```javascript
// Verify data integrity
- Spot count matches sum of available + occupied
- No orphaned parking sessions
- No double-booked spots
- Timestamps are sequential
- Status changes are logged
```

### Integration Test Implementation

#### Test Framework Setup (Jest/Supertest)
```javascript
const request = require('supertest');
const app = require('../src/app');

describe('Parking Garage API Integration Tests', () => {
  
  describe('End-to-End Vehicle Flow', () => {
    test('Complete parking session lifecycle', async () => {
      // 1. Verify spot is available
      const spotsResponse = await request(app)
        .get('/api/spots?status=available')
        .expect(200);
      
      const initialAvailable = spotsResponse.body.summary.available;
      
      // 2. Check in vehicle
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send({ licensePlate: 'TEST-123' })
        .expect(201);
      
      const assignedSpot = checkinResponse.body.spot;
      
      // 3. Verify spot is now occupied
      const spotResponse = await request(app)
        .get(`/api/spots/${assignedSpot}`)
        .expect(200);
      
      expect(spotResponse.body.status).toBe('occupied');
      expect(spotResponse.body.occupiedBy).toBe('TEST-123');
      
      // 4. Search for vehicle
      const searchResponse = await request(app)
        .get('/api/cars/TEST-123')
        .expect(200);
      
      expect(searchResponse.body.spot).toBe(assignedSpot);
      
      // 5. Check out vehicle
      const checkoutResponse = await request(app)
        .post('/api/checkout')
        .send({ licensePlate: 'TEST-123' })
        .expect(200);
      
      expect(checkoutResponse.body.duration).toBeDefined();
      
      // 6. Verify spot is available again
      const finalSpotResponse = await request(app)
        .get(`/api/spots/${assignedSpot}`)
        .expect(200);
      
      expect(finalSpotResponse.body.status).toBe('available');
      
      // 7. Verify available count is restored
      const finalSpotsResponse = await request(app)
        .get('/api/spots?status=available')
        .expect(200);
      
      expect(finalSpotsResponse.body.summary.available).toBe(initialAvailable);
    });
  });
  
  describe('Concurrent Operations', () => {
    test('Handle simultaneous check-ins', async () => {
      // Get available spots count
      const initialResponse = await request(app)
        .get('/api/spots?status=available')
        .expect(200);
      
      const availableCount = initialResponse.body.summary.available;
      
      // Attempt concurrent check-ins
      const checkInPromises = [];
      for (let i = 0; i < 5; i++) {
        checkInPromises.push(
          request(app)
            .post('/api/checkin')
            .send({ licensePlate: `CONCURRENT-${i}` })
        );
      }
      
      const results = await Promise.all(checkInPromises);
      
      // All should succeed if spots available
      const successCount = results.filter(r => r.status === 201).length;
      expect(successCount).toBeLessThanOrEqual(availableCount);
      
      // Verify no duplicate spot assignments
      const assignedSpots = results
        .filter(r => r.status === 201)
        .map(r => r.body.spot);
      
      const uniqueSpots = new Set(assignedSpots);
      expect(uniqueSpots.size).toBe(assignedSpots.length);
    });
  });
  
  describe('Data Validation', () => {
    test('Reject invalid license plates', async () => {
      const invalidPlates = [
        '', // Empty
        ' ', // Whitespace only
        'A', // Too short
        'A'.repeat(20), // Too long
        null, // Null
        undefined, // Undefined
        123, // Number instead of string
      ];
      
      for (const plate of invalidPlates) {
        const response = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: plate });
        
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      }
    });
    
    test('Validate spot ID format', async () => {
      const response = await request(app)
        .patch('/api/spots/INVALID-FORMAT/status')
        .send({ status: 'available' })
        .expect(400);
      
      expect(response.body.error).toContain('Invalid spot ID');
    });
  });
});
```

### Performance Testing Approach

#### Load Testing Scenarios
```javascript
// Using k6 or Artillery
export default function() {
  // Scenario 1: Normal load (100 vehicles/hour)
  const normalLoad = {
    stages: [
      { duration: '2m', target: 10 }, // Ramp up
      { duration: '5m', target: 10 }, // Stay at 10 users
      { duration: '2m', target: 0 },  // Ramp down
    ],
  };
  
  // Scenario 2: Peak load (500 vehicles/hour)
  const peakLoad = {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '10m', target: 50 },
      { duration: '2m', target: 0 },
    ],
  };
  
  // Scenario 3: Stress test (find breaking point)
  const stressTest = {
    stages: [
      { duration: '5m', target: 100 },
      { duration: '5m', target: 200 },
      { duration: '5m', target: 300 },
      { duration: '5m', target: 0 },
    ],
  };
}

// Performance Metrics to Monitor:
// - Response time (p95, p99)
// - Throughput (requests/second)
// - Error rate
// - Memory usage
// - CPU utilization
```

### Test Coverage Requirements

#### Minimum Coverage Targets
- **Unit Tests**: 80% code coverage
- **Integration Tests**: 100% endpoint coverage
- **Critical Path Tests**: 100% coverage for check-in/check-out flows
- **Error Scenarios**: All documented error codes tested
- **Edge Cases**: All identified boundary conditions tested

#### Critical Test Scenarios Checklist
- [ ] Check in when garage empty
- [ ] Check in when garage full
- [ ] Check in when one spot remains
- [ ] Check out after 24+ hours
- [ ] Check out immediately after check in
- [ ] Multiple check-ins for same license
- [ ] Search for non-existent vehicle
- [ ] Update occupied spot status
- [ ] Concurrent check-ins to last spot
- [ ] System recovery after crash (data persistence)

### Continuous Integration Pipeline

```yaml
# .github/workflows/test.yml
name: API Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run load tests
      run: npm run test:load
    
    - name: Generate coverage report
      run: npm run coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v2
```

## Test Data Specifications

### Standard Test Dataset
```javascript
const testData = {
  // Garage structure
  garage: {
    floors: [
      { id: 1, name: "Ground Floor", bays: ["A", "B"] },
      { id: 2, name: "Level 2", bays: ["A", "B"] },
      { id: 3, name: "Level 3", bays: ["A"] }
    ],
    spotsPerBay: 25,
    totalSpots: 125
  },
  
  // Test vehicles
  vehicles: [
    { plate: "TEST-001", type: "standard" },
    { plate: "TEST-002", type: "standard" },
    { plate: "LARGE-001", type: "oversized" },
    { plate: "SMALL-001", type: "compact" },
    { plate: "特殊-字符", type: "standard" }, // Unicode test
    { plate: "ABC 123", type: "standard" }, // Space test
    { plate: "ABC-123", type: "standard" }, // Hyphen test
  ],
  
  // Test scenarios
  scenarios: {
    empty: { occupancy: 0 },
    normal: { occupancy: 0.6 }, // 60% full
    busy: { occupancy: 0.9 },   // 90% full
    full: { occupancy: 1.0 }    // 100% full
  }
};
```

## Monitoring and Observability

### Key Metrics to Track
1. **API Performance**
   - Request latency (p50, p95, p99)
   - Request rate
   - Error rate by endpoint
   - Database query time (when implemented)

2. **Business Metrics**
   - Occupancy rate over time
   - Average parking duration
   - Peak usage hours
   - Spot turnover rate

3. **System Health**
   - Memory usage
   - CPU utilization
   - Active connections
   - Cache hit rate (when implemented)

### Logging Requirements
```javascript
// Structured logging for each operation
{
  "timestamp": "2025-08-31T10:00:00Z",
  "level": "info",
  "operation": "check-in",
  "licensePlate": "ABC-123",
  "assignedSpot": "F1-A-001",
  "availableSpots": 44,
  "responseTime": 23,
  "success": true
}
```

## Conclusion

This comprehensive testing strategy ensures that all MVP functionalities identified in the brief are covered with appropriate user stories and integration tests. The approach provides:

1. **Complete coverage** of all core features from the brief
2. **Clear acceptance criteria** for each user story
3. **Detailed integration test scenarios** with expected responses
4. **Edge case handling** and error scenarios
5. **Performance testing** guidelines
6. **Continuous integration** setup

The testing strategy is designed to be implemented incrementally, starting with core happy path scenarios and expanding to edge cases and performance testing as the system matures.
---
name: ParkingGarageAPI
status: backlog
created: 2025-08-31T20:35:22Z
progress: 0%
prd: .claude/prds/ParkingGarageAPI.md
github: https://github.com/iaminawe/ParkingGarage/issues/1
---

# Epic: ParkingGarageAPI

## Overview
Build a streamlined Node.js/Express REST API for parking garage management using in-memory storage. The implementation focuses on core functionality with a simple, maintainable architecture that can be extended later. We'll leverage Express middleware patterns and JavaScript Maps for efficient data operations.

## Architecture Decisions

### Simplification Strategy
- **Single module approach**: Combine related functionality to reduce complexity
- **Flat file structure**: Avoid over-engineering with excessive folders
- **Minimal dependencies**: Use only Express and essential middleware
- **Built-in Node.js features**: Leverage native capabilities over external libraries

### Technology Choices
- **Framework**: Express.js (minimal, well-documented, standard)
- **Storage**: JavaScript Map objects for O(1) lookups
- **Validation**: Express middleware with simple validators
- **Testing**: Jest with supertest for API testing
- **Documentation**: JSDoc comments + Swagger/OpenAPI spec

### Design Patterns
- **Repository Pattern**: Abstract data access for future DB migration
- **Middleware Chain**: Input validation, error handling, logging
- **Factory Pattern**: Spot creation with type-specific logic
- **Service Layer**: Business logic separated from routes

## Technical Approach

### Core Components

#### 1. Data Models (In-Memory)
```javascript
// Simple Map-based storage
const spots = new Map();        // spotId -> spot object
const vehicles = new Map();     // licensePlate -> parking record
const garage = {                // Garage configuration
  floors: [],
  rates: {},
  spotTypes: {}
};
```

#### 2. API Structure
```
/api/v1/
  /garage      - GET garage configuration
  /spots       - GET (list/filter), POST (create)
  /spots/:id   - GET, PATCH (update status)
  /checkin     - POST (vehicle entry)
  /checkout    - POST (vehicle exit)
  /vehicles    - GET (search by plate)
```

#### 3. Middleware Stack
- Rate limiting (simple in-memory counter)
- Request validation (basic schema validation)
- Error handling (centralized error middleware)
- Response formatting (consistent JSON structure)

### Simplified Implementation Strategy

#### Phase 1: Foundation (Tasks 1-3)
- Express server setup with basic middleware
- In-memory data structures
- Core CRUD operations

#### Phase 2: Business Logic (Tasks 4-6)
- Check-in/check-out workflows
- Spot assignment algorithm
- Duration and fee calculation

#### Phase 3: Polish (Tasks 7-8)
- Error handling and validation
- API documentation
- Basic testing suite

## Implementation Strategy

### Development Approach
1. **Incremental delivery**: Each task produces working functionality
2. **Test-driven**: Write tests alongside implementation
3. **Documentation-first**: Define API contracts upfront
4. **Iterative refinement**: Start simple, enhance gradually

### Risk Mitigation
- **Data loss**: Add periodic JSON export capability
- **Concurrency**: Use atomic operations for critical sections
- **Performance**: Pre-index data structures
- **Maintainability**: Clear code organization and comments

### Testing Approach
- Unit tests for business logic
- Integration tests for API endpoints
- Load testing for concurrent operations
- Manual testing with Postman/curl

## Task Breakdown Preview

High-level task categories (8 total tasks):

- [ ] **Task 1: Project Setup** - Initialize Node.js project with Express, create basic server structure
- [ ] **Task 2: Data Models** - Implement in-memory storage with Map objects and garage configuration
- [ ] **Task 3: Garage Management** - Create endpoints for garage structure (floors, bays, spots)
- [ ] **Task 4: Spot Operations** - Implement spot listing, filtering, and status updates
- [ ] **Task 5: Vehicle Check-in** - Build check-in flow with spot assignment
- [ ] **Task 6: Vehicle Check-out** - Implement check-out with duration and fee calculation
- [ ] **Task 7: Search & Query** - Add vehicle search and availability queries
- [ ] **Task 8: Testing & Documentation** - Create test suite and API documentation

## Dependencies

### External Dependencies (Minimal)
- Express.js (^4.18.0) - Web framework
- Jest (^29.0.0) - Testing framework
- Supertest (^6.3.0) - API testing
- Optional: Swagger-UI-Express - API documentation

### Internal Dependencies
- No database required (in-memory only)
- No authentication system needed
- No external API integrations
- No frontend dependencies

### Prerequisite Work
- Node.js v18+ installed
- Git repository initialized
- Basic project structure created

## Success Criteria (Technical)

### Performance Benchmarks
- API response time < 50ms for all operations
- Support 100+ concurrent connections
- Handle 10,000 spots in memory efficiently
- Zero data corruption under concurrent access

### Quality Gates
- 80% test coverage minimum
- All endpoints documented
- No critical security vulnerabilities
- Clean linting (ESLint)

### Acceptance Criteria
- All 8 core endpoints functional
- Proper error handling with meaningful messages
- Consistent JSON response format
- Graceful handling of edge cases

## Estimated Effort

### Overall Timeline
- **Total Duration**: 2 weeks
- **Development**: 8-10 days
- **Testing & Documentation**: 2-3 days
- **Buffer**: 1-2 days

### Resource Requirements
- 1 full-stack developer
- Minimal infrastructure (development environment only)
- Basic tooling (Node.js, npm, Git)

### Critical Path Items
1. Data model design (blocks all features)
2. Check-in/check-out logic (core functionality)
3. API documentation (needed for integration)

### Effort Distribution
- Setup & Configuration: 10%
- Core Features: 60%
- Testing: 20%
- Documentation: 10%

## Tasks Created
- [ ] #2 - Project Setup and Foundation (parallel: false)
- [ ] #3 - Data Models and Storage Layer (parallel: false)
- [ ] #4 - Garage Management API (parallel: true)
- [ ] #5 - Spot Operations API (parallel: true)
- [ ] #6 - Vehicle Check-in System (parallel: false)
- [ ] #7 - Vehicle Check-out and Billing (parallel: false)
- [ ] #8 - Search and Query Features (parallel: true)
- [ ] #9 - Testing Suite and API Documentation (parallel: false)

Total tasks: 8
Parallel tasks: 3
Sequential tasks: 5
Estimated total effort: 28-33 hours

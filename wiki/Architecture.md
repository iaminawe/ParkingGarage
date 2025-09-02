# System Architecture

## Overview

The Parking Garage Management System follows a **monolithic architecture** with a modular design, built using Node.js/TypeScript, Express.js, and SQLite with Prisma ORM. The system emphasizes performance optimization, caching, and comprehensive testing for reliability and maintainability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                             │
├──────────────┬───────────────┬──────────────┬──────────────┤
│  Mobile App  │   Web Portal  │  Admin Panel │  Third-party │
└──────┬───────┴───────┬───────┴──────┬───────┴──────┬───────┘
       │               │              │              │
       └───────────────┴──────────────┴──────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Express Server  │
                    │  (Node.js + TS)   │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│   Controllers  │  │   Middleware    │  │     Routes      │
│ (API Handlers) │  │ (Performance/   │  │   (REST API)    │
│                │  │  Validation)    │  │                 │
└───────┬────────┘  └────────┬────────┘  └────────┬────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │     Services      │
                    │  (Business Logic) │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│  Repositories  │  │  Cache Service  │  │ Query Optimizer │
│ (Data Access)  │  │    (Redis)      │  │  (Performance)  │
└───────┬────────┘  └────────┬────────┘  └────────┬────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   SQLite + Prisma │
                    │  (Primary Database) │
                    └───────────────────┘
```

## Core Components

### 1. Application Layer

**Technology**: Node.js + TypeScript + Express.js
**Structure**:
```
src/
├── app.ts                  # Express app configuration
├── server.ts              # Server entry point
├── controllers/           # Request handlers
├── routes/               # API route definitions
├── middleware/           # Custom middleware
├── services/             # Business logic
├── repositories/         # Data access layer
├── models/              # Data models
├── types/               # TypeScript definitions
├── utils/               # Utility functions
└── config/              # Configuration
```

### 2. API Layer (REST Endpoints)

#### Core Endpoints
- **Vehicle Management**
  - `GET/POST /api/vehicles` - Vehicle registration and lookup
  - `PUT /api/vehicles/:id` - Update vehicle information
  - `DELETE /api/vehicles/:id` - Remove vehicle

- **Parking Sessions**
  - `GET/POST /api/sessions` - Session management
  - `PUT /api/sessions/:id` - Update session status
  - `DELETE /api/sessions/:id` - End/cancel session

- **Spot Management**
  - `GET /api/spots` - List available spots
  - `GET /api/spots/:id` - Get spot details
  - `PUT /api/spots/:id/status` - Update spot status

- **Garage Operations**
  - `GET /api/garage` - Garage information and statistics
  - `GET /api/garage/stats` - Real-time garage statistics

### 3. Service Layer (Business Logic)

#### Core Services
- **SessionsService**: Parking session management, duration calculation
- **VehicleService**: Vehicle registration, lookup, and management
- **SpotService**: Spot availability, assignment, status management
- **GarageService**: Garage statistics, capacity management
- **CacheService**: Redis-based caching for performance
- **QueryOptimizer**: Database query optimization and performance tuning

### 4. Data Layer

#### SQLite Database with Prisma ORM
**Primary Database**: SQLite (file-based, high performance)
**ORM**: Prisma Client with TypeScript support

**Core Models**:
```typescript
// Vehicle Model
Vehicle {
  id: string
  licensePlate: string (unique)
  vehicleType: VehicleType
  rateType: RateType
  spotId?: string
  owner information
  payment details
  timestamps
}

// ParkingSpot Model
ParkingSpot {
  id: string
  spotNumber: string (unique)
  level: number
  section?: string
  spotType: SpotType
  status: SpotStatus
  dimensions
  timestamps
}

// ParkingSession Model
ParkingSession {
  id: string
  vehicleId: string
  spotId: string
  startTime: DateTime
  endTime?: DateTime
  duration?: number
  payment details
  status: SessionStatus
}

// Garage Model
Garage {
  id: string
  name: string
  address information
  capacity details
  operating hours
  rates
}
```

#### Performance Optimizations
- **Indexed Fields**: All frequently queried fields have database indexes
- **Composite Indexes**: Multi-column indexes for complex queries
- **Connection Pooling**: Efficient database connection management
- **Query Caching**: Redis-based query result caching

### 5. Caching Layer

**Technology**: Redis (optional, with fallback to in-memory)
**CacheService Features**:
- TTL-based expiration
- Key pattern management
- Automatic cache invalidation
- Performance metrics tracking
- Graceful degradation when Redis unavailable

**Cached Data**:
- Spot availability status
- Garage statistics
- Recent vehicle lookups
- Session calculations
- API response caching

### 6. Performance Layer

#### Performance Middleware
- Request/response time tracking
- Database query performance monitoring
- Memory usage tracking
- Error rate monitoring
- Automated performance alerts

#### Query Optimizer
- Automatic query plan analysis
- Index usage optimization
- Slow query detection
- Performance recommendations
- Real-time optimization

### 7. Validation & Security

#### Input Validation
- TypeScript type checking
- Joi schema validation
- SQL injection prevention
- XSS protection
- Rate limiting

#### Error Handling
- Centralized error handling middleware
- Structured error responses
- Logging integration
- Performance impact tracking

## Database Schema Design

### Relationships
```
Vehicle (1) ──────── (M) ParkingSession
   │                        │
   │                        │
   └── (M) ────────── (1) ParkingSpot

Garage (1) ────── Configuration ────── (M) ParkingSpot
```

### Performance Indexes
```sql
-- Single column indexes
vehicles(licensePlate, spotId, vehicleType, checkInTime, isPaid)
parking_spots(spotNumber, status, spotType, level)
parking_sessions(vehicleId, spotId, startTime, status, isPaid)

-- Composite indexes for complex queries
vehicles(spotId, isPaid)
vehicles(vehicleType, checkInTime)
parking_spots(status, spotType)
parking_sessions(startTime, endTime)
```

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+
- **Language**: TypeScript + JavaScript (mixed)
- **Framework**: Express.js
- **Database**: SQLite 3
- **ORM**: Prisma Client
- **Caching**: Redis (optional)
- **Testing**: Jest
- **Validation**: Joi + TypeScript

### Performance & Monitoring
- **Cache**: Redis with fallback to memory
- **Logging**: Custom logger with multiple levels
- **Metrics**: Performance metrics collection
- **Health Checks**: Database connectivity monitoring

## Scalability Considerations

### Current Architecture Benefits
- **Simplicity**: Single deployable unit
- **Performance**: In-process communication, no network overhead
- **Consistency**: ACID transactions across all operations
- **Development Speed**: Simplified testing and debugging

### Performance Optimizations
- **Database**: Comprehensive indexing strategy
- **Caching**: Multi-layer caching (Redis + in-memory)
- **Queries**: Optimized Prisma queries with includes/selects
- **Connection Pooling**: Efficient database connections

### Future Scaling Options
- **Horizontal**: Load balancer + multiple app instances
- **Database**: Read replicas or sharding when needed
- **Microservices**: Can extract services when domain complexity grows
- **Caching**: CDN for static assets, distributed caching

## Development Practices

### Code Organization
```typescript
// Layered architecture with clear separation
Controllers → Services → Repositories → Database

// TypeScript interfaces for type safety
interface Vehicle {
  id: string;
  licensePlate: string;
  vehicleType: VehicleType;
  // ... rest of properties
}

// Comprehensive error handling
try {
  const result = await service.operation();
  return res.json(result);
} catch (error) {
  next(error); // Handled by error middleware
}
```

### Testing Strategy
- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **Database Tests**: Repository and Prisma operations
- **Performance Tests**: Load and stress testing
- **Coverage**: Comprehensive test coverage tracking

### API Design
- **RESTful**: Standard HTTP methods and status codes
- **Consistent**: Uniform response formats
- **Validated**: Input validation on all endpoints
- **Documented**: TypeScript interfaces serve as documentation

## Deployment Architecture

### Single Application Deployment
```yaml
Application Structure:
- Single Node.js process
- SQLite database file
- Optional Redis container
- Static asset serving
- PM2 process management

Environment:
- Development: Local SQLite + optional Redis
- Staging: SQLite + Redis
- Production: SQLite + Redis + monitoring
```

### Infrastructure Requirements
- **Server**: Node.js runtime environment
- **Database**: SQLite file storage
- **Cache**: Redis instance (optional)
- **Process Manager**: PM2 or similar
- **Reverse Proxy**: Nginx (for production)

## Monitoring & Maintenance

### Health Monitoring
- **Database**: Connection health, query performance
- **Cache**: Redis connectivity and performance
- **Application**: Memory usage, CPU utilization
- **API**: Response times, error rates

### Backup Strategy
- **SQLite**: File-based backup with versioning
- **Configuration**: Version-controlled settings
- **Logs**: Centralized log aggregation
- **Monitoring**: Performance metrics retention

---

*For implementation details, see [Development Guide](Development-Guide.md)*
*For deployment procedures, see [Deployment Guide](Deployment-Guide.md)*
*For performance optimization, see [Performance Guide](Performance-Guide.md)*
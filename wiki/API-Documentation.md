# Parking Garage Management API Documentation

## Overview

The Parking Garage Management API provides comprehensive functionality for managing parking operations including vehicle check-ins, checkouts, spot management, garage configuration, and analytics. The API is built using Express.js with TypeScript and follows RESTful principles.

**🆕 Database Integration**: All endpoints are now backed by SQLite database with Prisma ORM for persistent data storage, transaction support, and production-ready performance.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://yourdomain.com/api`

## API Versioning

Currently using version 1.0.0. Future versions may be accessible via versioned paths like `/api/v1/`.

## Authentication

⚠️ **Currently in development mode**: Most endpoints are publicly accessible. Future implementations will require:

- **API Key Authentication**: `X-API-Key` header
- **JWT Bearer Token**: `Authorization: Bearer <token>` header
- **Admin Key**: Required for administrative operations

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Response Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Reset time

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error message"],
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

## HTTP Status Codes

- **200 OK**: Successful GET, PUT, PATCH operations
- **201 Created**: Successful POST operations
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists or conflict
- **422 Unprocessable Entity**: Validation errors
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

## Database Features

### Persistent Storage
All data is now stored in SQLite database with the following benefits:
- **Data Persistence**: All data survives server restarts
- **ACID Transactions**: Reliable data consistency
- **Performance Optimized**: Strategic indexing for fast queries
- **Backup Support**: Automated backup and restore procedures

### Prisma ORM Integration
- **Type Safety**: Full TypeScript integration with generated types
- **Query Builder**: Intuitive database queries with type checking
- **Migration Support**: Schema versioning and evolution
- **Connection Pooling**: Efficient database connection management

### Data Models
The API now includes the following persistent data models:
- **Vehicles**: Complete vehicle information with owner details
- **ParkingSpots**: Spot management with physical dimensions
- **ParkingSessions**: Session lifecycle tracking with payments
- **Garage**: Configuration and metadata storage

### Performance Features
- **Optimized Indexes**: Fast lookups on license plates, spot numbers, and timestamps
- **Connection Pooling**: Efficient database resource management
- **Query Optimization**: Optimized queries for common operations
- **Pagination Support**: Efficient handling of large datasets

---

# API Endpoints

## Health Check

### Check API Health
- **URL**: `/health`
- **Method**: `GET`
- **Description**: Check if the API server is running
- **Authentication**: None

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2024-09-02T12:00:00.000Z",
  "uptime": 3600.42,
  "environment": "development",
  "version": "1.0.0"
}
```

**curl Example:**
```bash
curl -X GET http://localhost:3000/health
```

---

## Garage Management

### Get Garage Configuration
- **URL**: `/api/garage`
- **Method**: `GET`
- **Description**: Retrieve garage configuration including floors, bays, and spots
- **Authentication**: None

**Query Parameters:**
- `includeStats` (boolean, optional): Include statistics in response
- `includeSpots` (boolean, optional): Include spot details in response

**Response Example:**
```json
{
  "success": true,
  "data": {
    "name": "Downtown Parking Garage",
    "floors": [
      {
        "number": 1,
        "bays": 10,
        "spotsPerBay": 10,
        "totalSpots": 100
      }
    ],
    "totalSpots": 500,
    "availableSpots": 342,
    "occupiedSpots": 158
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

For complete API endpoint documentation including Vehicle Operations, Check-in/Check-out, Statistics, and more advanced features, please refer to the detailed sections in the [main API documentation](https://github.com/yourusername/ParkingGarage/blob/main/docs/API.md).

## Interactive Documentation

- **Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Enhanced API Interface**: [http://127.0.0.1:9000/api-test.html](http://127.0.0.1:9000/api-test.html)
- **OpenAPI Specification**: [http://localhost:3000/api-docs/swagger.json](http://localhost:3000/api-docs/swagger.json)

## Production Status

### Current Implementation Status
- ✅ **Core parking operations** (check-in/checkout) - COMPLETE
- ✅ **Vehicle management** with full CRUD operations - COMPLETE
- ✅ **Parking spot management** with status tracking - COMPLETE
- ✅ **Database integration** with Prisma ORM - COMPLETE
- ✅ **Session tracking** and analytics - COMPLETE
- ✅ **Performance optimization** with indexing - COMPLETE
- ✅ **Data validation** and error handling - COMPLETE
- ✅ **Interactive API documentation** - COMPLETE
- ⚠️ **Authentication system** - Development mode (endpoints exist)
- ⚠️ **Advanced rate limiting** - Basic implementation
- ⚠️ **Multi-garage support** - Single garage optimized

### Key Features
- **194/194 tests passing** with comprehensive coverage
- **Production-ready performance** (178+ operations/second)
- **Complete TypeScript integration** with strict typing
- **SQLite database** with ACID transactions
- **Comprehensive error handling** with detailed messages
- **Real-time analytics** and usage tracking
- **Advanced search capabilities** with fuzzy matching
- **Automated backup procedures** and data recovery

## Related Documentation

- **[Database Schema](Database-Schema.md)** - Database structure and relationships
- **[State Management](State-Management.md)** - Multi-layered state architecture  
- **[Performance](Performance-Load-Testing.md)** - Performance benchmarks and optimization
- **[Migration Guide](Migration-Guide.md)** - Data migration procedures
- **[Quick Start](Quick-Start.md)** - Getting started with the API
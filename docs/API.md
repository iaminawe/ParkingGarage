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

**curl Example:**
```bash
curl -X GET "http://localhost:3000/api/garage?includeStats=true"
```

### Initialize Garage
- **URL**: `/api/garage/initialize`
- **Method**: `POST`
- **Description**: Initialize a new parking garage with floors and spots
- **Authentication**: None (Admin in production)

**Request Body:**
```json
{
  "name": "Downtown Parking Garage",
  "floors": [
    {
      "number": 1,
      "bays": 10,
      "spotsPerBay": 10
    }
  ]
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "name": "Downtown Parking Garage",
    "floors": [...],
    "totalSpots": 500,
    "message": "Garage initialized successfully"
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

**curl Example:**
```bash
curl -X POST http://localhost:3000/api/garage/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Garage",
    "floors": [{"number": 1, "bays": 5, "spotsPerBay": 10}]
  }'
```

### Get Parking Rates
- **URL**: `/api/garage/rates`
- **Method**: `GET`
- **Description**: Retrieve current parking rates for all vehicle types

**Response Example:**
```json
{
  "success": true,
  "data": {
    "standard": 5.0,
    "compact": 4.0,
    "oversized": 8.0,
    "ev_charging": 6.0
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

**curl Example:**
```bash
curl -X GET http://localhost:3000/api/garage/rates
```

### Update Parking Rates
- **URL**: `/api/garage/rates`
- **Method**: `PUT`
- **Description**: Update parking rates for different vehicle types
- **Authentication**: Admin required in production

**Request Body:**
```json
{
  "standard": 5.5,
  "compact": 4.5,
  "oversized": 9.0
}
```

**curl Example:**
```bash
curl -X PUT http://localhost:3000/api/garage/rates \
  -H "Content-Type: application/json" \
  -d '{"standard": 5.5, "compact": 4.5}'
```

### Get Garage Statistics
- **URL**: `/api/garage/statistics`
- **Method**: `GET`
- **Description**: Retrieve detailed statistics about garage usage

**Response Example:**
```json
{
  "success": true,
  "data": {
    "totalSpots": 500,
    "occupancyRate": 0.68,
    "availableByType": {
      "compact": 45,
      "standard": 120,
      "oversized": 15
    },
    "occupiedByType": {
      "compact": 55,
      "standard": 180,
      "oversized": 25
    },
    "revenueToday": 1250.50,
    "checkinsToday": 85
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

### Reset Garage (Development Only)
- **URL**: `/api/garage/reset`
- **Method**: `DELETE`
- **Description**: Reset entire garage to initial state
- **Authentication**: Development mode only

**curl Example:**
```bash
curl -X DELETE http://localhost:3000/api/garage/reset
```

---

## Parking Spots Management

### List Parking Spots
- **URL**: `/api/spots`
- **Method**: `GET`
- **Description**: Retrieve list of parking spots with filtering and pagination

**Query Parameters:**
- `status` (string, optional): Filter by spot status (`available`, `occupied`)
- `type` (string, optional): Filter by spot type (`compact`, `standard`, `oversized`)
- `floor` (integer, optional): Filter by floor number
- `bay` (integer, optional): Filter by bay number
- `limit` (integer, optional): Maximum number of spots to return (1-100, default: 20)
- `offset` (integer, optional): Number of spots to skip (default: 0)
- `sort` (string, optional): Sort field (`id`, `floor`, `bay`, `type`, `status`, `updatedAt`)
- `order` (string, optional): Sort order (`asc`, `desc`)
- `include` (string, optional): Additional data to include (comma-separated)

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": "F1-B2-S003",
      "floor": 1,
      "bay": 2,
      "number": 3,
      "type": "standard",
      "status": "occupied",
      "features": [],
      "occupancy": {
        "vehicleId": "ABC123",
        "licensePlate": "ABC123",
        "checkinTime": "2024-09-02T10:30:00.000Z",
        "duration": "1h 30m"
      },
      "updatedAt": "2024-09-02T10:30:00.000Z"
    }
  ],
  "metadata": {
    "total": 500,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

**curl Example:**
```bash
curl -X GET "http://localhost:3000/api/spots?status=available&type=standard&limit=10"
```

### Get Available Spots
- **URL**: `/api/spots/available`
- **Method**: `GET`
- **Description**: Retrieve only available parking spots

**Query Parameters:**
- `type` (string, optional): Filter by spot type

**curl Example:**
```bash
curl -X GET "http://localhost:3000/api/spots/available?type=compact"
```

### Get Occupied Spots
- **URL**: `/api/spots/occupied`
- **Method**: `GET`
- **Description**: Retrieve only occupied parking spots

**curl Example:**
```bash
curl -X GET http://localhost:3000/api/spots/occupied
```

### Get Spot by ID
- **URL**: `/api/spots/{spotId}`
- **Method**: `GET`
- **Description**: Retrieve details of a specific parking spot

**Path Parameters:**
- `spotId` (string): Spot ID in format `F{floor}-B{bay}-S{spot}` (e.g., `F1-B2-S003`)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "id": "F1-B2-S003",
    "floor": 1,
    "bay": 2,
    "number": 3,
    "type": "standard",
    "status": "available",
    "features": ["ev_charging"],
    "updatedAt": "2024-09-02T11:45:00.000Z"
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

**curl Example:**
```bash
curl -X GET http://localhost:3000/api/spots/F1-B2-S003
```

### Update Spot
- **URL**: `/api/spots/{spotId}`
- **Method**: `PATCH`
- **Description**: Update spot status, type, or features
- **Authentication**: Admin required in production

**Request Body:**
```json
{
  "status": "available",
  "type": "standard",
  "features": ["ev_charging", "handicap"]
}
```

**curl Example:**
```bash
curl -X PATCH http://localhost:3000/api/spots/F1-B2-S003 \
  -H "Content-Type: application/json" \
  -d '{"status": "available", "features": ["ev_charging"]}'
```

### Get Spot Statistics
- **URL**: `/api/spots/statistics`
- **Method**: `GET`
- **Description**: Retrieve statistics about parking spot usage

**Response Example:**
```json
{
  "success": true,
  "data": {
    "total": 500,
    "byStatus": {
      "available": 342,
      "occupied": 158
    },
    "byType": {
      "compact": 100,
      "standard": 300,
      "oversized": 100
    },
    "byFloor": [
      {
        "floor": 1,
        "available": 68,
        "occupied": 32
      }
    ]
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

---

## Vehicle Check-in

### Check in Vehicle
- **URL**: `/api/checkin`
- **Method**: `POST`
- **Description**: Check in a vehicle and assign a parking spot

**Request Body:**
```json
{
  "licensePlate": "ABC123",
  "vehicleType": "standard",
  "rateType": "hourly"
}
```

**Field Validation:**
- `licensePlate`: Required, 2-10 characters
- `vehicleType`: Required, one of `compact`, `standard`, `oversized`
- `rateType`: Optional, one of `hourly`, `daily`, `monthly` (default: `hourly`)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "ticketId": "TKT-1693652400000",
    "spotId": "F2-B5-S012",
    "licensePlate": "ABC123",
    "vehicleType": "standard",
    "checkinTime": "2024-09-02T12:00:00.000Z",
    "rate": 5.0,
    "location": {
      "floor": 2,
      "bay": 5,
      "spot": 12
    }
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

**Error Responses:**
- **400 Bad Request**: Invalid vehicle data
- **404 Not Found**: No available spots for vehicle type
- **409 Conflict**: Vehicle already checked in

**curl Example:**
```bash
curl -X POST http://localhost:3000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "ABC123",
    "vehicleType": "standard"
  }'
```

### Simulate Check-in
- **URL**: `/api/checkin/simulate`
- **Method**: `POST`
- **Description**: Simulate a check-in without actually reserving a spot

**Request Body:**
```json
{
  "licensePlate": "ABC123",
  "vehicleType": "standard"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "availableSpots": 45,
    "estimatedSpotId": "F2-B5-S012",
    "rate": 5.0,
    "message": "Spot assignment available"
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

### Get Availability
- **URL**: `/api/checkin/availability`
- **Method**: `GET`
- **Description**: Get availability information for all vehicle types

**Response Example:**
```json
{
  "success": true,
  "data": {
    "totalAvailable": 342,
    "byType": {
      "compact": 45,
      "standard": 267,
      "oversized": 30
    }
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

### Get Availability by Vehicle Type
- **URL**: `/api/checkin/availability/{vehicleType}`
- **Method**: `GET`
- **Description**: Get availability for specific vehicle type

**Path Parameters:**
- `vehicleType` (string): Type of vehicle (`compact`, `standard`, `oversized`)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "vehicleType": "standard",
    "available": 267,
    "total": 300,
    "locations": [
      {
        "spotId": "F1-B1-S001",
        "floor": 1,
        "bay": 1
      }
    ]
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

### Get Check-in Statistics
- **URL**: `/api/checkin/stats`
- **Method**: `GET`
- **Description**: Retrieve statistics about check-in operations

**Response Example:**
```json
{
  "success": true,
  "data": {
    "todayCheckins": 85,
    "activeCheckins": 158,
    "averageDuration": 2.5,
    "peakHour": "14:00",
    "revenueToday": 1250.50
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

---

## Vehicle Checkout

### Check out Vehicle
- **URL**: `/api/checkout`
- **Method**: `POST`
- **Description**: Check out a vehicle from the garage

**Request Body:**
```json
{
  "licensePlate": "ABC123",
  "applyGracePeriod": false,
  "removeRecord": true,
  "checkOutTime": "2024-09-02T14:30:00.000Z"
}
```

**Field Validation:**
- `licensePlate`: Required, string
- `applyGracePeriod`: Optional, boolean (default: true)
- `removeRecord`: Optional, boolean (default: false)
- `checkOutTime`: Optional, ISO date string (default: current time)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "licensePlate": "ABC123",
    "spotId": "F2-B5-S012",
    "timing": {
      "checkinTime": "2024-09-02T12:00:00.000Z",
      "checkoutTime": "2024-09-02T14:30:00.000Z",
      "duration": "2h 30m",
      "durationMinutes": 150
    },
    "billing": {
      "rate": 5.0,
      "totalCost": 12.50,
      "gracePeriodApplied": false,
      "breakdown": {
        "baseTime": 150,
        "gracePeriod": 0,
        "billableTime": 150
      }
    }
  },
  "timestamp": "2024-09-02T14:30:00.000Z"
}
```

**curl Example:**
```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"licensePlate": "ABC123"}'
```

### Simulate Checkout
- **URL**: `/api/checkout/simulate`
- **Method**: `POST`
- **Description**: Simulate checkout without actually performing it

**Request Body:**
```json
{
  "licensePlate": "ABC123",
  "applyGracePeriod": false,
  "checkOutTime": "2024-09-02T14:30:00.000Z"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "simulation": {
      "estimatedCost": 12.50,
      "duration": "2h 30m",
      "rate": 5.0,
      "gracePeriodSavings": 0
    }
  },
  "timestamp": "2024-09-02T14:30:00.000Z"
}
```

### Get Current Cost Estimate
- **URL**: `/api/checkout/estimate/{licensePlate}`
- **Method**: `GET`
- **Description**: Get current parking cost estimate for a vehicle

**Path Parameters:**
- `licensePlate` (string): Vehicle license plate

**Response Example:**
```json
{
  "success": true,
  "data": {
    "licensePlate": "ABC123",
    "estimate": {
      "currentDuration": "2h 15m",
      "estimatedCost": 11.25,
      "rate": 5.0,
      "projectedCost": {
        "nextHour": 16.25,
        "endOfDay": 45.00
      }
    }
  },
  "timestamp": "2024-09-02T14:15:00.000Z"
}
```

### Get Vehicles Ready for Checkout
- **URL**: `/api/checkout/ready`
- **Method**: `GET`
- **Description**: Get vehicles that are ready for checkout

**Query Parameters:**
- `minMinutes` (number, optional): Minimum parking time in minutes
- `vehicleType` (string, optional): Filter by vehicle type
- `rateType` (string, optional): Filter by rate type
- `status` (string, optional): Filter by status

**Response Example:**
```json
{
  "success": true,
  "data": {
    "count": 5,
    "vehicles": [
      {
        "licensePlate": "ABC123",
        "spotId": "F2-B5-S012",
        "checkinTime": "2024-09-02T10:00:00.000Z",
        "duration": "4h 30m",
        "estimatedCost": 22.50
      }
    ]
  },
  "timestamp": "2024-09-02T14:30:00.000Z"
}
```

### Force Checkout (Admin)
- **URL**: `/api/checkout/force`
- **Method**: `POST`
- **Description**: Force checkout for administrative purposes
- **Authentication**: Admin key required

**Request Body:**
```json
{
  "licensePlate": "ABC123",
  "reason": "Emergency maintenance",
  "adminKey": "admin-secret-key"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "forced": true,
    "reason": "Emergency maintenance",
    "licensePlate": "ABC123",
    "timestamp": "2024-09-02T14:30:00.000Z"
  }
}
```

### Get Checkout Statistics
- **URL**: `/api/checkout/stats`
- **Method**: `GET`
- **Description**: Get checkout statistics and revenue metrics

**Response Example:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "todayCheckouts": 72,
      "totalRevenue": 1847.50,
      "averageSession": "2h 45m",
      "peakCheckoutHour": "17:00"
    }
  },
  "timestamp": "2024-09-02T14:30:00.000Z"
}
```

---

## Vehicle Management

### Get All Vehicles
- **URL**: `/api/vehicles`
- **Method**: `GET`
- **Description**: Get all vehicles with pagination and filtering

**Query Parameters:**
- `page` (number, optional): Page number for pagination
- `limit` (number, optional): Items per page
- `search` (string, optional): Search term for license plate

**Response Example:**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "id": "ABC123",
        "licensePlate": "ABC123",
        "vehicleType": "standard",
        "checkinTime": "2024-09-02T12:00:00.000Z",
        "spotId": "F2-B5-S012",
        "status": "checked_in"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 158,
      "pages": 8
    }
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

**curl Example:**
```bash
curl -X GET "http://localhost:3000/api/vehicles?page=1&limit=20&search=ABC"
```

### Create Vehicle
- **URL**: `/api/vehicles`
- **Method**: `POST`
- **Description**: Create a new vehicle record

**Request Body:**
```json
{
  "licensePlate": "XYZ789",
  "vehicleType": "compact",
  "rateType": "hourly"
}
```

### Get Vehicle by ID
- **URL**: `/api/vehicles/{id}`
- **Method**: `GET`
- **Description**: Get a specific vehicle by ID (license plate)

**Path Parameters:**
- `id` (string): Vehicle ID (license plate)

**curl Example:**
```bash
curl -X GET http://localhost:3000/api/vehicles/ABC123
```

### Update Vehicle
- **URL**: `/api/vehicles/{id}`
- **Method**: `PUT`
- **Description**: Update a vehicle
- **Authentication**: Admin required in production

### Delete Vehicle
- **URL**: `/api/vehicles/{id}`
- **Method**: `DELETE`
- **Description**: Delete a vehicle
- **Authentication**: Admin required in production

### Bulk Delete Vehicles
- **URL**: `/api/vehicles/bulk-delete`
- **Method**: `POST`
- **Description**: Bulk delete vehicles
- **Authentication**: Admin required in production

**Request Body:**
```json
{
  "vehicleIds": ["ABC123", "XYZ789", "DEF456"]
}
```

### Get Vehicle Metrics
- **URL**: `/api/vehicles/metrics`
- **Method**: `GET`
- **Description**: Get vehicle metrics and statistics

**Response Example:**
```json
{
  "success": true,
  "data": {
    "totalVehicles": 158,
    "byType": {
      "compact": 42,
      "standard": 95,
      "oversized": 21
    },
    "averageSessionTime": "2h 45m",
    "totalRevenue": 5642.75
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

### Search Vehicles
- **URL**: `/api/vehicles/search`
- **Method**: `GET`
- **Description**: Search vehicles by license plate (legacy search functionality)

**Query Parameters:**
- `search` (string): Search term for license plate
- `mode` (string, optional): Search mode (`exact`, `partial`, `fuzzy`, `all`)

**curl Example:**
```bash
curl -X GET "http://localhost:3000/api/vehicles/search?search=ABC&mode=partial"
```

---

## Statistics and Analytics

### Get Comprehensive Garage Statistics
- **URL**: `/api/stats`
- **Method**: `GET`
- **Description**: Get comprehensive garage statistics

**Response Example:**
```json
{
  "success": true,
  "data": {
    "garage": {
      "totalSpots": 500,
      "occupiedSpots": 158,
      "availableSpots": 342,
      "occupancyRate": 0.316
    },
    "revenue": {
      "today": 1847.50,
      "thisWeek": 12954.75,
      "thisMonth": 48765.25
    },
    "vehicles": {
      "checkedIn": 158,
      "checkedOut": 72
    }
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

### Get Occupancy Summary
- **URL**: `/api/stats/occupancy`
- **Method**: `GET`
- **Description**: Get real-time occupancy summary

**Response Example:**
```json
{
  "success": true,
  "data": {
    "currentOccupancy": 158,
    "capacity": 500,
    "occupancyRate": 0.316,
    "byFloor": [
      {
        "floor": 1,
        "occupied": 32,
        "capacity": 100,
        "rate": 0.32
      }
    ],
    "byType": {
      "compact": {
        "occupied": 42,
        "capacity": 100,
        "rate": 0.42
      },
      "standard": {
        "occupied": 95,
        "capacity": 300,
        "rate": 0.32
      },
      "oversized": {
        "occupied": 21,
        "capacity": 100,
        "rate": 0.21
      }
    }
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

### Get Dashboard Statistics
- **URL**: `/api/stats/dashboard`
- **Method**: `GET`
- **Description**: Get dashboard summary with key metrics

### Get Occupancy Trends
- **URL**: `/api/stats/trends`
- **Method**: `GET`
- **Description**: Get occupancy trends over time

**Query Parameters:**
- `hours` (number, optional): Hours to analyze (1-168, max 1 week, default: 24)

**curl Example:**
```bash
curl -X GET "http://localhost:3000/api/stats/trends?hours=48"
```

### Get Revenue Analytics
- **URL**: `/api/stats/revenue`
- **Method**: `GET`
- **Description**: Get revenue analytics

**Query Parameters:**
- `days` (number, optional): Days to analyze (1-365, max 1 year, default: 7)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 12954.75,
    "dailyAverage": 1850.68,
    "byVehicleType": {
      "compact": 3247.25,
      "standard": 7854.50,
      "oversized": 1853.00
    },
    "trends": {
      "direction": "increasing",
      "changePercent": 12.5
    }
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

### Get Usage Patterns
- **URL**: `/api/stats/usage`
- **Method**: `GET`
- **Description**: Get usage patterns and peak times

**Response Example:**
```json
{
  "success": true,
  "data": {
    "peakHours": {
      "checkin": ["09:00", "12:00", "14:00"],
      "checkout": ["17:00", "18:00", "19:00"]
    },
    "averageSessionDuration": "2h 45m",
    "turnoverRate": 3.2,
    "busyDays": ["Monday", "Tuesday", "Wednesday"]
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

### Get Comparative Statistics
- **URL**: `/api/stats/compare`
- **Method**: `GET`
- **Description**: Get comparative statistics (current vs previous period)

**Query Parameters:**
- `period` (string, optional): Period to compare (`day`, `week`, `month`, default: `day`)

### Export Statistics Data
- **URL**: `/api/stats/export`
- **Method**: `GET`
- **Description**: Export statistics data

**Query Parameters:**
- `type` (string, optional): Data type to export (`garage`, `revenue`, `usage`, default: `garage`)
- `format` (string, optional): Export format (`json`, default: `json`)

### Get Floor-Specific Statistics
- **URL**: `/api/stats/floor/{id}`
- **Method**: `GET`
- **Description**: Get floor-specific statistics

**Path Parameters:**
- `id` (number): Floor number

**Response Example:**
```json
{
  "success": true,
  "data": {
    "floor": 1,
    "totalSpots": 100,
    "occupiedSpots": 32,
    "availableSpots": 68,
    "occupancyRate": 0.32,
    "revenue": {
      "today": 284.50,
      "average": 247.85
    }
  },
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

**curl Example:**
```bash
curl -X GET http://localhost:3000/api/stats/floor/1
```

---

## Error Handling

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `GARAGE_NOT_INITIALIZED` | 404 | Garage has not been initialized |
| `VEHICLE_NOT_FOUND` | 404 | Vehicle not found in system |
| `SPOT_NOT_FOUND` | 404 | Parking spot not found |
| `NO_AVAILABLE_SPOTS` | 404 | No available spots for vehicle type |
| `VEHICLE_ALREADY_CHECKED_IN` | 409 | Vehicle is already checked in |
| `INVALID_SPOT_ID` | 400 | Spot ID format is invalid |
| `INVALID_LICENSE_PLATE` | 400 | License plate format is invalid |
| `INVALID_VEHICLE_TYPE` | 400 | Vehicle type is not supported |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

### Example Error Response
```json
{
  "success": false,
  "message": "Vehicle not found",
  "errors": [
    "No vehicle found with license plate 'XYZ999'"
  ],
  "code": "VEHICLE_NOT_FOUND",
  "timestamp": "2024-09-02T12:00:00.000Z"
}
```

---

## Data Models

### Vehicle Types
- `compact`: Small vehicles (e.g., sedans, coupes)
- `standard`: Regular-sized vehicles (e.g., SUVs, trucks)
- `oversized`: Large vehicles (e.g., RVs, trailers)

### Spot Features
- `ev_charging`: Electric vehicle charging station
- `handicap`: Handicap accessible spot

### Rate Types
- `hourly`: Standard hourly rate
- `daily`: Daily rate (24-hour period)
- `monthly`: Monthly subscription rate

---

## Interactive Documentation

- **Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Enhanced API Interface**: [http://127.0.0.1:9000/api-test.html](http://127.0.0.1:9000/api-test.html)
- **OpenAPI Specification**: [http://localhost:3000/api-docs/swagger.json](http://localhost:3000/api-docs/swagger.json)

---

## Support and Contact

For API support or questions:
- **Documentation Issues**: Create an issue in the repository
- **API Bugs**: Report via GitHub Issues
- **Feature Requests**: Submit via GitHub Discussions

---

**Last Updated**: September 2, 2024  
**API Version**: 1.0.0
# API Documentation

## Overview

The Parking Garage Management API provides RESTful endpoints for managing a single parking garage. This is a basic parking management system focused on core operations like vehicle check-in/checkout, spot management, and basic analytics.

## Base URL

```
Development: http://localhost:3000/api
```

## Authentication

⚠️ **Note**: Authentication endpoints exist but are not fully implemented. Most endpoints currently operate without authentication.

## Available Endpoints

### Core API Information
- `GET /` - API information and available endpoints

### Garage Management
- `GET /api/garage` - Get garage information and status
- `PUT /api/garage` - Update garage configuration

### Parking Spots
- `GET /api/spots` - List all parking spots
- `POST /api/spots` - Create new parking spot
- `GET /api/spots/:id` - Get specific spot details
- `PUT /api/spots/:id` - Update spot information
- `DELETE /api/spots/:id` - Remove parking spot

### Vehicle Operations
- `GET /api/vehicles` - List all vehicles
- `POST /api/vehicles` - Register new vehicle
- `GET /api/vehicles/:id` - Get vehicle details
- `PUT /api/vehicles/:id` - Update vehicle information
- `DELETE /api/vehicles/:id` - Remove vehicle

### Check-in/Check-out
- `POST /api/checkin` - Check vehicle into parking spot
- `POST /api/checkout` - Check vehicle out of parking spot

### Sessions & Analytics
- `GET /api/sessions` - List parking sessions
- `GET /api/stats` - Get parking statistics and analytics

### Placeholder Routes (Not Implemented)
The following routes are referenced in the codebase but not implemented:
- `/api/auth/*` - Authentication endpoints (placeholder)
- `/api/users/*` - User management (commented out)
- `/api/reservations/*` - Reservation system (commented out) 
- `/api/payments/*` - Payment processing (commented out)

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { },
  "timestamp": "2025-09-02T20:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Human readable error message"
  },
  "timestamp": "2025-09-02T20:30:00Z"
}
```

## Development Status

This API is currently in development with the following status:
- ✅ Core parking operations (check-in/checkout)
- ✅ Spot and vehicle management
- ✅ Basic analytics and session tracking
- ⚠️ Authentication system (partially implemented)
- ❌ User management
- ❌ Reservation system
- ❌ Payment processing
- ❌ Rate limiting
- ❌ Advanced analytics

## Future Roadmap

Planned features for future versions:
- Complete authentication implementation
- User registration and management
- Reservation system with booking
- Payment processing integration
- Advanced analytics and reporting
- Multi-facility support
- Mobile app integration
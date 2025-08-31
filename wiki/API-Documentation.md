# API Documentation

## Overview

The Parking Garage Management API provides RESTful endpoints for managing parking facilities, spots, reservations, payments, and analytics. All endpoints follow REST conventions and return JSON responses.

## Base URL

```
Production: https://api.parkinggarage.com/v1
Staging: https://staging-api.parkinggarage.com/v1
Development: http://localhost:3000/v1
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- **Default**: 1000 requests per hour per API key
- **Premium**: 10000 requests per hour
- **Enterprise**: Unlimited (contact sales)

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { },
  "timestamp": "2025-08-31T10:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { }
  },
  "timestamp": "2025-08-31T10:30:00Z"
}
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "usr_123456",
    "email": "user@example.com",
    "token": "jwt_token_here"
  }
}
```

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### POST /auth/refresh
Refresh an expired JWT token.

#### POST /auth/logout
Invalidate the current JWT token.

### Parking Spots

#### GET /spots
Get all parking spots with filtering options.

**Query Parameters:**
- `level` (integer): Filter by garage level
- `zone` (string): Filter by zone (A, B, C, etc.)
- `type` (string): regular, handicap, ev, premium
- `status` (string): available, occupied, reserved, maintenance
- `limit` (integer): Results per page (default: 50)
- `offset` (integer): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "spots": [
      {
        "spotId": "spot_001",
        "level": 1,
        "zone": "A",
        "number": "A-101",
        "type": "regular",
        "status": "available",
        "coordinates": {
          "x": 10,
          "y": 20
        },
        "features": ["covered", "near_elevator"],
        "hourlyRate": 5.00,
        "dailyRate": 40.00
      }
    ],
    "total": 500,
    "available": 123,
    "occupied": 350,
    "reserved": 27
  }
}
```

#### GET /spots/{spotId}
Get detailed information about a specific spot.

#### PUT /spots/{spotId}/status
Update spot status (admin only).

**Request Body:**
```json
{
  "status": "maintenance",
  "reason": "Repainting",
  "estimatedAvailable": "2025-09-01T08:00:00Z"
}
```

### Reservations

#### POST /reservations
Create a new parking reservation.

**Request Body:**
```json
{
  "spotId": "spot_001",
  "startTime": "2025-09-01T10:00:00Z",
  "endTime": "2025-09-01T14:00:00Z",
  "vehicleInfo": {
    "licensePlate": "ABC123",
    "make": "Toyota",
    "model": "Camry",
    "color": "Silver"
  },
  "paymentMethodId": "pm_123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reservationId": "res_789012",
    "confirmationCode": "PARK2025",
    "spotDetails": { },
    "totalCost": 20.00,
    "qrCode": "data:image/png;base64,..."
  }
}
```

#### GET /reservations
Get user's reservations.

**Query Parameters:**
- `status`: active, completed, cancelled
- `from`: Start date (ISO 8601)
- `to`: End date (ISO 8601)

#### GET /reservations/{reservationId}
Get specific reservation details.

#### PUT /reservations/{reservationId}
Modify an existing reservation.

#### DELETE /reservations/{reservationId}
Cancel a reservation.

### Parking Sessions

#### POST /sessions/check-in
Start a parking session (vehicle enters).

**Request Body:**
```json
{
  "method": "license_plate",
  "identifier": "ABC123",
  "spotId": "spot_001",
  "entryPoint": "main_entrance"
}
```

#### POST /sessions/check-out
End a parking session (vehicle exits).

**Request Body:**
```json
{
  "sessionId": "ses_345678",
  "exitPoint": "main_exit",
  "paymentMethodId": "pm_123456"
}
```

#### GET /sessions/active
Get all active parking sessions.

#### GET /sessions/{sessionId}
Get specific session details.

### Payments

#### POST /payments/methods
Add a payment method.

**Request Body:**
```json
{
  "type": "credit_card",
  "token": "stripe_token_123",
  "isDefault": true
}
```

#### GET /payments/methods
List user's payment methods.

#### DELETE /payments/methods/{methodId}
Remove a payment method.

#### POST /payments/process
Process a payment.

**Request Body:**
```json
{
  "amount": 25.00,
  "currency": "USD",
  "paymentMethodId": "pm_123456",
  "description": "Parking session ses_345678"
}
```

#### GET /payments/history
Get payment history.

### Analytics

#### GET /analytics/occupancy
Get occupancy statistics.

**Query Parameters:**
- `period`: hour, day, week, month, year
- `from`: Start date
- `to`: End date
- `groupBy`: level, zone, type

**Response:**
```json
{
  "success": true,
  "data": {
    "averageOccupancy": 0.75,
    "peakOccupancy": 0.95,
    "peakHours": ["09:00", "14:00", "18:00"],
    "trends": [
      {
        "timestamp": "2025-08-31T00:00:00Z",
        "occupancy": 0.65,
        "revenue": 1250.00
      }
    ]
  }
}
```

#### GET /analytics/revenue
Get revenue analytics.

#### GET /analytics/usage
Get usage patterns and statistics.

#### GET /analytics/predictions
Get AI-powered predictions for occupancy and demand.

### Admin Endpoints

#### GET /admin/facilities
Manage parking facilities.

#### POST /admin/facilities
Add a new parking facility.

#### PUT /admin/facilities/{facilityId}
Update facility information.

#### GET /admin/users
User management (admin only).

#### GET /admin/reports
Generate custom reports.

### Webhooks

#### POST /webhooks
Register a webhook endpoint.

**Request Body:**
```json
{
  "url": "https://yourapp.com/webhook",
  "events": ["session.started", "session.ended", "payment.completed"],
  "secret": "webhook_secret_key"
}
```

**Webhook Events:**
- `session.started`: Parking session begins
- `session.ended`: Parking session ends
- `payment.completed`: Payment processed
- `reservation.created`: New reservation
- `reservation.cancelled`: Reservation cancelled
- `spot.status_changed`: Spot status update

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_INVALID` | Invalid authentication credentials |
| `AUTH_EXPIRED` | JWT token expired |
| `SPOT_NOT_FOUND` | Parking spot not found |
| `SPOT_UNAVAILABLE` | Spot not available for reservation |
| `RESERVATION_CONFLICT` | Time slot already booked |
| `PAYMENT_FAILED` | Payment processing failed |
| `INVALID_INPUT` | Request validation failed |
| `RATE_LIMIT` | Rate limit exceeded |
| `SERVER_ERROR` | Internal server error |

## SDKs and Libraries

Official SDKs available for:
- JavaScript/TypeScript
- Python
- Java
- Go
- Ruby
- PHP

## Postman Collection

Download our [Postman Collection](https://api.parkinggarage.com/postman) for easy API testing.

## OpenAPI Specification

Access our [OpenAPI 3.0 Specification](https://api.parkinggarage.com/openapi.json) for code generation.

## Support

For API support, contact:
- Email: api-support@parkinggarage.com
- Developer Portal: https://developers.parkinggarage.com
- Status Page: https://status.parkinggarage.com

---

*For implementation examples, see [Development Guide](Development-Guide.md)*
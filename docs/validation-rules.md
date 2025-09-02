# API Validation Rules and Error Handling

This document provides detailed validation rules and error handling patterns for the Parking Garage Management API.

## Table of Contents
- [Validation Rules](#validation-rules)
- [Error Response Format](#error-response-format)
- [HTTP Status Codes](#http-status-codes)
- [Field-Specific Validation](#field-specific-validation)
- [Business Logic Validation](#business-logic-validation)
- [Error Examples](#error-examples)

## Validation Rules

### Request Validation Pipeline

1. **Schema Validation** - Request body structure and types
2. **Field Validation** - Individual field constraints
3. **Cross-Field Validation** - Dependencies between fields
4. **Business Logic Validation** - Domain-specific rules
5. **Security Validation** - Input sanitization and safety checks

### Common Validation Rules

#### License Plate Validation
```yaml
licensePlate:
  - Required: true
  - Type: string
  - MinLength: 1
  - MaxLength: 15
  - Pattern: ^[A-Z0-9\-\s]+$
  - Transform: UPPERCASE
  - Sanitize: Remove extra whitespace
  - Examples:
    - Valid: "ABC123", "ABC-123", "ABC 123"
    - Invalid: "abc123" (lowercase), "ABC@123" (special chars), "" (empty)
```

#### Vehicle Type Validation
```yaml
vehicleType:
  - Type: enum
  - Values: [compact, standard, oversized]
  - Default: standard
  - Case: lowercase
  - Examples:
    - Valid: "compact", "standard", "oversized"
    - Invalid: "COMPACT" (uppercase), "small" (not in enum), null (if required)
```

#### Rate Type Validation
```yaml
rateType:
  - Type: enum
  - Values: [hourly, daily, monthly]
  - Default: hourly
  - Case: lowercase
  - Examples:
    - Valid: "hourly", "daily", "monthly"
    - Invalid: "DAILY" (uppercase), "weekly" (not in enum)
```

#### Date/Time Validation
```yaml
dateTime:
  - Type: string
  - Format: ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
  - Timezone: UTC required
  - Range: Between 1900-01-01 and 2100-12-31
  - Examples:
    - Valid: "2024-01-15T10:30:00Z"
    - Invalid: "2024-01-15 10:30:00" (wrong format), "2024-01-15T10:30:00" (missing timezone)
```

#### Monetary Values
```yaml
amount:
  - Type: number
  - Format: float
  - Minimum: 0
  - Maximum: 10000
  - DecimalPlaces: 2
  - Examples:
    - Valid: 25.50, 0, 100.00
    - Invalid: -5.00 (negative), 25.505 (too many decimals), 10001 (too large)
```

#### Pagination Parameters
```yaml
page:
  - Type: integer
  - Minimum: 1
  - Maximum: 1000
  - Default: 1

limit:
  - Type: integer
  - Minimum: 1
  - Maximum: 100
  - Default: 20

offset:
  - Type: integer
  - Minimum: 0
  - Maximum: 100000
  - Default: 0
```

## Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {},
  "errors": ["Specific error message 1", "Specific error message 2"],
  "timestamp": "2024-01-15T11:00:00Z",
  "path": "/api/sessions",
  "requestId": "req_abc123def456"
}
```

### Error Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | boolean | ✅ | Always `false` for error responses |
| `code` | string | ✅ | Machine-readable error code |
| `message` | string | ✅ | Human-readable error message |
| `details` | object | ❌ | Additional error context |
| `errors` | array | ❌ | List of specific error messages |
| `timestamp` | string | ✅ | ISO 8601 timestamp |
| `path` | string | ❌ | API endpoint path |
| `requestId` | string | ❌ | Unique request identifier |

### Validation Error Format

For validation errors, additional field information is provided:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "validationErrors": {
    "licensePlate": [
      "License plate is required",
      "Invalid license plate format"
    ],
    "vehicleType": [
      "Must be one of: compact, standard, oversized"
    ]
  },
  "timestamp": "2024-01-15T11:00:00Z",
  "path": "/api/sessions",
  "requestId": "req_abc123def456"
}
```

## HTTP Status Codes

### Success Codes (2xx)
- **200 OK** - Successful GET, PUT requests
- **201 Created** - Successful POST requests (resource created)
- **204 No Content** - Successful DELETE requests

### Client Error Codes (4xx)
- **400 Bad Request** - Invalid request parameters or malformed request
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource conflict (duplicate, business rule violation)
- **422 Unprocessable Entity** - Validation errors
- **429 Too Many Requests** - Rate limit exceeded

### Server Error Codes (5xx)
- **500 Internal Server Error** - Unexpected server error
- **503 Service Unavailable** - Service temporarily unavailable

## Field-Specific Validation

### Session Fields

#### CreateSessionRequest
```yaml
licensePlate:
  - Required: true
  - Pattern: ^[A-Z0-9\-\s]+$
  - MinLength: 1
  - MaxLength: 15
  - Transform: UPPERCASE, TRIM

vehicleType:
  - Enum: [compact, standard, oversized]
  - Default: standard

vehicleMake:
  - MaxLength: 50
  - Sanitize: Remove HTML, trim

vehicleModel:
  - MaxLength: 50
  - Sanitize: Remove HTML, trim

vehicleColor:
  - MaxLength: 30
  - Sanitize: Remove HTML, trim

spotId:
  - Pattern: ^\d+-[A-Z]+-\d{3}$
  - Example: "1-A-015"

rateType:
  - Enum: [hourly, daily, monthly]
  - Default: hourly

expectedDuration:
  - Type: integer
  - Minimum: 1
  - Maximum: 43200 (30 days in minutes)

notes:
  - MaxLength: 500
  - Sanitize: Remove HTML, trim
```

#### UpdateSessionRequest
```yaml
expectedEndTime:
  - Format: ISO 8601
  - FutureDate: Must be in the future
  - MaxAdvance: 30 days from now

isPaid:
  - Type: boolean

paymentMethod:
  - Enum: [cash, card, mobile, other]
  - RequiredIf: isPaid is true

amountPaid:
  - Type: number
  - Minimum: 0
  - Maximum: 10000
  - DecimalPlaces: 2
  - RequiredIf: isPaid is true
```

### Vehicle Fields

#### CreateVehicleRequest
```yaml
licensePlate:
  - Required: true
  - Unique: Must not exist in system
  - Pattern: ^[A-Z0-9\-\s]+$
  - Transform: UPPERCASE, TRIM

year:
  - Type: integer
  - Minimum: 1900
  - Maximum: Current year + 1

ownerPhone:
  - Pattern: ^\+?[\d\s\-\(\)]+$
  - MinLength: 10
  - MaxLength: 20

ownerEmail:
  - Format: email
  - MaxLength: 255
  - Lowercase: true
```

## Business Logic Validation

### Session Business Rules

1. **Vehicle Uniqueness**
   - A vehicle can only have one active session at a time
   - Error: `VEHICLE_ALREADY_PARKED`

2. **Spot Availability**
   - Requested spot must be available
   - Error: `SPOT_UNAVAILABLE`

3. **Session State Transitions**
   - Active → Completed (via end)
   - Active → Cancelled (via cancel)
   - Completed/Cancelled → No changes allowed
   - Error: `INVALID_STATE_TRANSITION`

4. **Payment Validation**
   - Amount paid must be ≥ total cost
   - Error: `INSUFFICIENT_PAYMENT`

5. **Time Constraints**
   - Check-out time must be after check-in time
   - Expected end time must be in future
   - Error: `INVALID_TIME_RANGE`

### Vehicle Business Rules

1. **License Plate Uniqueness**
   - Each license plate can only be registered once
   - Error: `VEHICLE_ALREADY_EXISTS`

2. **Active Session Check**
   - Cannot delete vehicle with active session
   - Error: `VEHICLE_HAS_ACTIVE_SESSION`

3. **Owner Information**
   - If email provided, phone is recommended
   - Error: `INCOMPLETE_OWNER_INFO` (warning)

## Error Examples

### Validation Error Example
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "validationErrors": {
    "licensePlate": [
      "License plate is required",
      "License plate must be 1-15 characters",
      "License plate contains invalid characters"
    ],
    "vehicleType": [
      "Vehicle type must be one of: compact, standard, oversized"
    ],
    "expectedDuration": [
      "Expected duration must be between 1 and 43200 minutes"
    ]
  },
  "timestamp": "2024-01-15T11:00:00Z",
  "path": "/api/sessions",
  "requestId": "req_abc123def456"
}
```

### Business Logic Error Example
```json
{
  "success": false,
  "code": "VEHICLE_ALREADY_PARKED",
  "message": "Vehicle ABC123 already has an active parking session",
  "details": {
    "licensePlate": "ABC123",
    "existingSessionId": "sess_existing123",
    "spotId": "1-B-025"
  },
  "timestamp": "2024-01-15T11:00:00Z",
  "path": "/api/sessions",
  "requestId": "req_abc123def456"
}
```

### Not Found Error Example
```json
{
  "success": false,
  "code": "SESSION_NOT_FOUND",
  "message": "Session with ID sess_abc123 not found",
  "details": {
    "sessionId": "sess_abc123"
  },
  "timestamp": "2024-01-15T11:00:00Z",
  "path": "/api/sessions/sess_abc123",
  "requestId": "req_abc123def456"
}
```

### Rate Limit Error Example
```json
{
  "success": false,
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests from this IP, please try again later",
  "details": {
    "limit": 100,
    "windowMs": 900000,
    "retryAfter": 600
  },
  "timestamp": "2024-01-15T11:00:00Z",
  "requestId": "req_abc123def456",
  "headers": {
    "X-RateLimit-Limit": 100,
    "X-RateLimit-Remaining": 0,
    "X-RateLimit-Reset": 1705317600,
    "X-RateLimit-RetryAfter": 600
  }
}
```

## Error Code Reference

### Session Error Codes
- `SESSION_NOT_FOUND` - Session ID does not exist
- `SESSION_ALREADY_ENDED` - Cannot modify ended session
- `SESSION_ALREADY_CANCELLED` - Cannot modify cancelled session
- `VEHICLE_ALREADY_PARKED` - Vehicle has active session
- `SPOT_UNAVAILABLE` - Requested spot is occupied
- `INVALID_STATE_TRANSITION` - Illegal session state change
- `INSUFFICIENT_PAYMENT` - Payment amount too low
- `PAYMENT_ALREADY_PROCESSED` - Session already paid

### Vehicle Error Codes
- `VEHICLE_NOT_FOUND` - Vehicle license plate not found
- `VEHICLE_ALREADY_EXISTS` - License plate already registered
- `VEHICLE_HAS_ACTIVE_SESSION` - Cannot delete with active session
- `INVALID_LICENSE_PLATE` - License plate format invalid

### General Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `BAD_REQUEST` - Invalid request parameters
- `INTERNAL_SERVER_ERROR` - Unexpected server error
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVICE_UNAVAILABLE` - Service temporarily down

## Best Practices

### Client Error Handling
1. Always check the `success` field first
2. Use `code` for programmatic error handling
3. Display `message` to users
4. Parse `validationErrors` for field-specific feedback
5. Implement retry logic for 5xx errors
6. Respect rate limiting with exponential backoff

### Error Logging
1. Log all errors with `requestId` for tracing
2. Include relevant context in `details`
3. Monitor error rates and patterns
4. Alert on critical error codes

### Error Recovery
1. Provide clear error messages to users
2. Suggest corrective actions when possible
3. Implement graceful degradation
4. Cache responses where appropriate to reduce API calls
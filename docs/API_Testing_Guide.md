# Parking Garage Management API - cURL Testing Guide

This document provides comprehensive cURL commands for testing all critical path
API endpoints in the Parking Garage Management System.

## Environment Setup

First, set up your environment variables for easier testing:

```bash
# Base configuration
export BASE_URL="http://localhost:8742/api"
export CONTENT_TYPE="Content-Type: application/json"

# Authentication (will be set after login)
export AUTH_TOKEN=""
export AUTH_HEADER="Authorization: Bearer $AUTH_TOKEN"
```

## Authentication Setup

### 1. User Registration

```bash
curl -X POST "$BASE_URL/auth/signup" \
  -H "$CONTENT_TYPE" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 2. User Login

```bash
# Login and capture token
RESPONSE=$(curl -X POST "$BASE_URL/auth/login" \
  -H "$CONTENT_TYPE" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }')

# Extract token (requires jq)
export AUTH_TOKEN=$(echo $RESPONSE | jq -r '.data.accessToken')
export AUTH_HEADER="Authorization: Bearer $AUTH_TOKEN"
```

## 1. Garage Layout Management

### Initialize Garage Layout

```bash
# Create a 3-floor garage with multiple bays
curl -X POST "$BASE_URL/garage/initialize" \
  -H "$CONTENT_TYPE" \
  -d '{
    "name": "Downtown Parking Garage",
    "floors": [
      {
        "number": 1,
        "bays": 4,
        "spotsPerBay": 25
      },
      {
        "number": 2,
        "bays": 4,
        "spotsPerBay": 25
      },
      {
        "number": 3,
        "bays": 4,
        "spotsPerBay": 25
      }
    ]
  }'
```

### Get Garage Configuration

```bash
# Basic garage info
curl -X GET "$BASE_URL/garage/"

# With detailed statistics and spots
curl -X GET "$BASE_URL/garage/?includeStats=true&includeSpots=true"
```

### Update Garage Pricing Rates

```bash
curl -X PUT "$BASE_URL/garage/rates" \
  -H "$CONTENT_TYPE" \
  -d '{
    "standard": 5.00,
    "compact": 4.00,
    "oversized": 7.50,
    "ev_charging": 6.00
  }'
```

### Get Garage Statistics

```bash
curl -X GET "$BASE_URL/garage/statistics"
```

### Get Garage Capacity Information

```bash
curl -X GET "$BASE_URL/garage/capacity"
```

### Update Garage Configuration

```bash
curl -X PUT "$BASE_URL/garage/config" \
  -H "$CONTENT_TYPE" \
  -d '{
    "name": "Updated Downtown Parking Garage"
  }'
```

## 2. Parking Spot Management

### List All Parking Spots

```bash
# All spots
curl -X GET "$BASE_URL/spots/"

# With pagination
curl -X GET "$BASE_URL/spots/?limit=50&offset=0"

# With sorting
curl -X GET "$BASE_URL/spots/?sort=spotNumber&order=asc"

# Filter by status
curl -X GET "$BASE_URL/spots/?status=available"
curl -X GET "$BASE_URL/spots/?status=occupied"

# Filter by type
curl -X GET "$BASE_URL/spots/?type=standard"
curl -X GET "$BASE_URL/spots/?type=compact"
curl -X GET "$BASE_URL/spots/?type=oversized"
curl -X GET "$BASE_URL/spots/?type=ev_charging"

# Filter by floor and bay
curl -X GET "$BASE_URL/spots/?floor=1&bay=A"
```

### Get Only Available Spots

```bash
# All available spots
curl -X GET "$BASE_URL/spots/available"

# Available spots by type
curl -X GET "$BASE_URL/spots/available?type=standard"

# Available spots on specific floor
curl -X GET "$BASE_URL/spots/available?floor=2"
```

### Get Only Occupied Spots

```bash
# All occupied spots
curl -X GET "$BASE_URL/spots/occupied"

# Occupied spots with details
curl -X GET "$BASE_URL/spots/occupied?include=vehicle,session"
```

### Get Specific Spot Details

```bash
# Replace {spot-id} with actual spot ID
curl -X GET "$BASE_URL/spots/{spot-id}"

# Example with actual ID
curl -X GET "$BASE_URL/spots/1-A-001"
```

### Update Spot Status/Type

```bash
# Mark spot as occupied
curl -X PATCH "$BASE_URL/spots/1-A-001" \
  -H "$CONTENT_TYPE" \
  -d '{
    "status": "occupied"
  }'

# Mark spot as available
curl -X PATCH "$BASE_URL/spots/1-A-001" \
  -H "$CONTENT_TYPE" \
  -d '{
    "status": "available"
  }'

# Update spot type
curl -X PATCH "$BASE_URL/spots/1-A-001" \
  -H "$CONTENT_TYPE" \
  -d '{
    "type": "ev_charging",
    "features": ["ev_charger", "covered"]
  }'
```

### Get Spot Statistics

```bash
curl -X GET "$BASE_URL/spots/statistics"
```

### Advanced Spot Search

```bash
# Search spots
curl -X GET "$BASE_URL/spots/search?query=A-001"

# Complex search with filters
curl -X GET "$BASE_URL/spots/search?query=floor:1&type=standard&status=available"
```

## 3. Car Tracking (Check-in/Check-out)

### Vehicle Check-in

#### Standard Check-in

```bash
curl -X POST "$BASE_URL/checkin/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "ABC123",
    "vehicleType": "standard",
    "rateType": "hourly"
  }'
```

#### Check-in Different Vehicle Types

```bash
# Compact vehicle
curl -X POST "$BASE_URL/checkin/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "COMP456",
    "vehicleType": "compact",
    "rateType": "daily"
  }'

# Oversized vehicle
curl -X POST "$BASE_URL/checkin/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "TRUCK789",
    "vehicleType": "oversized",
    "rateType": "monthly"
  }'

# Electric vehicle
curl -X POST "$BASE_URL/checkin/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "TESLA001",
    "vehicleType": "standard",
    "rateType": "hourly"
  }'
```

#### Simulate Check-in (Testing)

```bash
curl -X POST "$BASE_URL/checkin/simulate" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "TEST123",
    "vehicleType": "standard"
  }'
```

### Vehicle Check-out

#### Standard Check-out

```bash
curl -X POST "$BASE_URL/checkout/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "ABC123"
  }'
```

#### Check-out with Grace Period

```bash
curl -X POST "$BASE_URL/checkout/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "ABC123",
    "applyGracePeriod": true
  }'
```

#### Check-out and Remove Record

```bash
curl -X POST "$BASE_URL/checkout/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "ABC123",
    "removeRecord": true
  }'
```

#### Check-out with Specific Time

```bash
curl -X POST "$BASE_URL/checkout/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "ABC123",
    "checkOutTime": "2024-01-15T10:30:00Z"
  }'
```

#### Simulate Check-out (Testing)

```bash
curl -X POST "$BASE_URL/checkout/simulate" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "TEST123",
    "applyGracePeriod": false
  }'
```

### Tracking and Monitoring

#### Get Check-in Statistics

```bash
curl -X GET "$BASE_URL/checkin/stats"
```

#### Get Check-out Statistics

```bash
curl -X GET "$BASE_URL/checkout/stats"
```

#### Get Check-in Availability

```bash
# General availability
curl -X GET "$BASE_URL/checkin/availability"

# Availability by vehicle type
curl -X GET "$BASE_URL/checkin/availability/standard"
curl -X GET "$BASE_URL/checkin/availability/compact"
curl -X GET "$BASE_URL/checkin/availability/oversized"
```

#### Get Vehicles Ready for Check-out

```bash
# All vehicles ready for checkout
curl -X GET "$BASE_URL/checkout/ready"

# Vehicles parked for at least 60 minutes
curl -X GET "$BASE_URL/checkout/ready?minMinutes=60"

# Filter by vehicle type
curl -X GET "$BASE_URL/checkout/ready?vehicleType=standard"
```

#### Get Cost Estimate Before Check-out

```bash
curl -X GET "$BASE_URL/checkout/estimate/ABC123"
```

#### Force Check-out (Admin)

```bash
curl -X POST "$BASE_URL/checkout/force" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "ABC123",
    "reason": "Emergency maintenance",
    "adminKey": "your-admin-key"
  }'
```

## 4. Vehicle Management

### List All Vehicles

```bash
# All vehicles
curl -X GET "$BASE_URL/vehicles/"

# With pagination
curl -X GET "$BASE_URL/vehicles/?page=1&limit=20"

# Search vehicles
curl -X GET "$BASE_URL/vehicles/?search=ABC"

# Filter by type and status
curl -X GET "$BASE_URL/vehicles/?vehicleType=standard&status=parked"

# Sort by check-in time
curl -X GET "$BASE_URL/vehicles/?sortBy=createdAt&sortOrder=desc"
```

### Create New Vehicle Record

```bash
curl -X POST "$BASE_URL/vehicles/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "NEW123",
    "vehicleType": "standard",
    "rateType": "hourly",
    "make": "Toyota",
    "model": "Camry",
    "color": "Blue",
    "year": 2022,
    "ownerName": "John Doe",
    "ownerEmail": "john@example.com",
    "ownerPhone": "+1-555-0123",
    "notes": "Regular customer"
  }'
```

### Get Specific Vehicle

```bash
# Replace {vehicle-id} with actual vehicle ID
curl -X GET "$BASE_URL/vehicles/{vehicle-id}"
```

### Update Vehicle Information

```bash
curl -X PUT "$BASE_URL/vehicles/{vehicle-id}" \
  -H "$CONTENT_TYPE" \
  -d '{
    "make": "Honda",
    "model": "Accord",
    "color": "Red",
    "ownerPhone": "+1-555-9999"
  }'
```

### Delete Vehicle Record

```bash
curl -X DELETE "$BASE_URL/vehicles/{vehicle-id}"
```

### Bulk Delete Vehicles

```bash
curl -X POST "$BASE_URL/vehicles/bulk-delete" \
  -H "$CONTENT_TYPE" \
  -d '{
    "vehicleIds": ["vehicle-id-1", "vehicle-id-2", "vehicle-id-3"]
  }'
```

### Search Vehicles

```bash
# Basic search
curl -X GET "$BASE_URL/vehicles/search?search=toyota"

# Advanced search with parameters
curl -X GET "$BASE_URL/vehicles/search?search=ABC&mode=fuzzy&threshold=0.6&maxResults=10"
```

### Get Vehicle Metrics

```bash
curl -X GET "$BASE_URL/vehicles/metrics"
```

## 5. Session Management

### List Parking Sessions

```bash
# All sessions
curl -X GET "$BASE_URL/sessions/"

# Filter by status
curl -X GET "$BASE_URL/sessions/?status=active"
curl -X GET "$BASE_URL/sessions/?status=completed"

# Filter by date range
curl -X GET "$BASE_URL/sessions/?dateRange=today"
curl -X GET "$BASE_URL/sessions/?dateRange=week"
curl -X GET "$BASE_URL/sessions/?dateRange=month"

# Search sessions
curl -X GET "$BASE_URL/sessions/?search=ABC123"

# Pagination and sorting
curl -X GET "$BASE_URL/sessions/?limit=50&offset=0&sort=startTime&order=desc"
```

### Get Session Details

```bash
curl -X GET "$BASE_URL/sessions/{session-id}"
```

### End Active Session

```bash
curl -X POST "$BASE_URL/sessions/{session-id}/end" \
  -H "$CONTENT_TYPE" \
  -d '{
    "reason": "Normal checkout"
  }'
```

### Cancel Session

```bash
curl -X POST "$BASE_URL/sessions/{session-id}/cancel" \
  -H "$CONTENT_TYPE" \
  -d '{
    "reason": "Customer request"
  }'
```

### Extend Session

```bash
curl -X POST "$BASE_URL/sessions/{session-id}/extend" \
  -H "$CONTENT_TYPE" \
  -d '{
    "additionalHours": 2
  }'
```

### Get Session Statistics

```bash
# Overall stats
curl -X GET "$BASE_URL/sessions/stats"

# Stats for specific period
curl -X GET "$BASE_URL/sessions/stats?period=week"
curl -X GET "$BASE_URL/sessions/stats?period=month"
```

### Get Session Analytics

```bash
# Detailed analytics
curl -X GET "$BASE_URL/sessions/analytics"

# Specific analytics type
curl -X GET "$BASE_URL/sessions/analytics?type=duration&period=month"
curl -X GET "$BASE_URL/sessions/analytics?type=revenue&period=week"
```

### Export Sessions as CSV

```bash
# Export all sessions
curl -X GET "$BASE_URL/sessions/export/csv" -o sessions.csv

# Export with filters
curl -X GET "$BASE_URL/sessions/export/csv?status=completed&dateRange=month" -o monthly_sessions.csv
```

## 6. System Statistics and Analytics

### Comprehensive Statistics

```bash
curl -X GET "$BASE_URL/stats/"
```

### Real-time Occupancy

```bash
curl -X GET "$BASE_URL/stats/occupancy"
```

### Dashboard Metrics

```bash
curl -X GET "$BASE_URL/stats/dashboard"
```

### Occupancy Trends

```bash
# Last 24 hours (default)
curl -X GET "$BASE_URL/stats/trends"

# Last 72 hours
curl -X GET "$BASE_URL/stats/trends?hours=72"

# Last week
curl -X GET "$BASE_URL/stats/trends?hours=168"
```

### Revenue Analytics

```bash
# Last 30 days (default)
curl -X GET "$BASE_URL/stats/revenue"

# Last 90 days
curl -X GET "$BASE_URL/stats/revenue?days=90"

# Last year
curl -X GET "$BASE_URL/stats/revenue?days=365"
```

### Usage Patterns

```bash
curl -X GET "$BASE_URL/stats/usage"
```

### Comparative Statistics

```bash
# Daily comparison
curl -X GET "$BASE_URL/stats/compare?period=day"

# Weekly comparison
curl -X GET "$BASE_URL/stats/compare?period=week"

# Monthly comparison
curl -X GET "$BASE_URL/stats/compare?period=month"
```

### Export Statistics

```bash
# Export as JSON
curl -X GET "$BASE_URL/stats/export?type=occupancy&format=json" -o occupancy_stats.json

# Export as CSV
curl -X GET "$BASE_URL/stats/export?type=revenue&format=csv" -o revenue_stats.csv
```

### Floor-specific Statistics

```bash
# Replace {floor-id} with actual floor ID
curl -X GET "$BASE_URL/stats/floor/{floor-id}"
```

## 7. Health Checks

### System Health

```bash
curl -X GET "$BASE_URL/health" -w "\n%{http_code}\n"
```

### Service-specific Health Checks

```bash
# Check-in service health
curl -X GET "$BASE_URL/checkin/health"

# Check-out service health
curl -X GET "$BASE_URL/checkout/health"

# Statistics service health
curl -X GET "$BASE_URL/stats/health"
```

## Testing Scenarios

### Complete Parking Flow Test

```bash
#!/bin/bash
# Complete parking flow test script

echo "=== Testing Complete Parking Flow ==="

echo "1. Check availability"
curl -s -X GET "$BASE_URL/checkin/availability" | jq '.data.availableSpots'

echo -e "\n2. Check in vehicle"
CHECKIN_RESPONSE=$(curl -s -X POST "$BASE_URL/checkin/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "FLOW123",
    "vehicleType": "standard",
    "rateType": "hourly"
  }')
echo $CHECKIN_RESPONSE | jq '.'

# Extract spot assignment
SPOT_ID=$(echo $CHECKIN_RESPONSE | jq -r '.data.spot.id')
echo "Assigned spot: $SPOT_ID"

echo -e "\n3. Verify spot is occupied"
curl -s -X GET "$BASE_URL/spots/$SPOT_ID" | jq '.data.status'

echo -e "\n4. Wait and check out (simulate time passing)"
sleep 2
curl -s -X POST "$BASE_URL/checkout/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "FLOW123"
  }' | jq '.'

echo -e "\n5. Verify spot is available again"
curl -s -X GET "$BASE_URL/spots/$SPOT_ID" | jq '.data.status'
```

### Load Testing Commands

```bash
# Concurrent check-ins (use with caution)
for i in {1..10}; do
  curl -X POST "$BASE_URL/checkin/" \
    -H "$CONTENT_TYPE" \
    -d "{\"licensePlate\":\"LOAD$i\",\"vehicleType\":\"standard\"}" &
done
wait

# Check results
curl -X GET "$BASE_URL/spots/statistics" | jq '.data.occupied'
```

## Error Testing

### Test Invalid Requests

```bash
# Invalid license plate
curl -X POST "$BASE_URL/checkin/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "",
    "vehicleType": "standard"
  }'

# Invalid vehicle type
curl -X POST "$BASE_URL/checkin/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "ERROR123",
    "vehicleType": "invalid_type"
  }'

# Duplicate check-in
curl -X POST "$BASE_URL/checkin/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "DUPLICATE",
    "vehicleType": "standard"
  }'

# Try again with same license plate
curl -X POST "$BASE_URL/checkin/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "DUPLICATE",
    "vehicleType": "standard"
  }'

# Check out non-existent vehicle
curl -X POST "$BASE_URL/checkout/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "NONEXISTENT"
  }'
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Error responses include additional fields:

```json
{
  "success": false,
  "data": null,
  "message": "Error description",
  "errors": ["Detailed error messages"],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Notes

1. Replace placeholder values (`{spot-id}`, `{vehicle-id}`, etc.) with actual
   IDs from your system
2. Set up environment variables at the beginning of your testing session
3. Use the provided test scripts for complete flow testing
4. Monitor system resources during load testing
5. Always test error scenarios to ensure proper error handling
6. Use JSON formatting tools like `jq` for readable responses
7. Consider implementing rate limiting testing to verify API protection

This guide covers all critical path endpoints for comprehensive API testing of
the Parking Garage Management System.

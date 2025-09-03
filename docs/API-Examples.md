# Parking Garage API - curl Examples

This document provides comprehensive curl examples for all major API endpoints in the Parking Garage Management System.

## Base Configuration

```bash
BASE_URL="http://localhost:8742/api"
CONTENT_TYPE="Content-Type: application/json"
```

## 1. Garage Layout Management

### Initialize Garage
Create the garage structure with floors, bays, and parking spots.

```bash
curl -X POST "$BASE_URL/garage/initialize" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Parking Garage",
    "floors": [
      {"number": 1, "bays": 3, "spotsPerBay": 20},
      {"number": 2, "bays": 4, "spotsPerBay": 25}
    ]
  }'
```

### Get Garage Configuration
```bash
# Basic configuration
curl -X GET "$BASE_URL/garage"

# With statistics and spot details
curl -X GET "$BASE_URL/garage?includeStats=true&includeSpots=true"
```

### Update Parking Rates
```bash
curl -X PUT "$BASE_URL/garage/rates" \
  -H "Content-Type: application/json" \
  -d '{
    "standard": 5.00,
    "compact": 4.00,
    "oversized": 7.00,
    "ev_charging": 6.00
  }'
```

## 2. Parking Spot Management

### List All Available Spots
```bash
curl -X GET "$BASE_URL/spots/available"
```

### Filter Spots by Criteria
```bash
# By vehicle type and floor
curl -X GET "$BASE_URL/spots/available?vehicleType=standard&floor=2"

# With pagination and sorting
curl -X GET "$BASE_URL/spots?limit=20&offset=0&sort=floor&order=asc"

# Filter by status and type
curl -X GET "$BASE_URL/spots?status=available&type=compact&floor=1"
```

### Get Specific Spot Details
```bash
curl -X GET "$BASE_URL/spots/F1-B1-S001"
```

### Update Spot Status/Features
```bash
curl -X PATCH "$BASE_URL/spots/F1-B1-S001" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "available",
    "features": ["ev_charging", "handicap"]
  }'
```

### Advanced Spot Search
```bash
curl -X GET "$BASE_URL/spots/search?query=floor:2%20compact%20available"
```

## 3. Vehicle Check-in Operations

### Check Availability
```bash
# General availability
curl -X GET "$BASE_URL/checkin/availability"

# For specific vehicle type
curl -X GET "$BASE_URL/checkin/availability/standard"
```

### Simulate Check-in
```bash
curl -X POST "$BASE_URL/checkin/simulate" \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "ABC123",
    "vehicleType": "standard",
    "rateType": "hourly"
  }'
```

### Actual Check-in
```bash
curl -X POST "$BASE_URL/checkin" \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "ABC123",
    "vehicleType": "standard",
    "rateType": "hourly"
  }'
```

## 4. Vehicle Check-out Operations

### Get Current Cost Estimate
```bash
curl -X GET "$BASE_URL/checkout/estimate/ABC123"
```

### Simulate Check-out
```bash
curl -X POST "$BASE_URL/checkout/simulate" \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "ABC123",
    "applyGracePeriod": false
  }'
```

### Actual Check-out
```bash
curl -X POST "$BASE_URL/checkout" \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "ABC123",
    "paymentMethod": "credit_card"
  }'
```

### Get Vehicles Ready for Checkout
```bash
curl -X GET "$BASE_URL/checkout/ready?minMinutes=60&vehicleType=standard"
```

## 5. Vehicle Management

### Create Vehicle Record
```bash
curl -X POST "$BASE_URL/vehicles" \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "XYZ789",
    "vehicleType": "standard",
    "make": "Toyota",
    "model": "Camry",
    "color": "Blue",
    "year": 2020,
    "ownerName": "John Doe",
    "ownerEmail": "john.doe@example.com",
    "ownerPhone": "555-0123"
  }'
```

### Get Vehicle Details
```bash
curl -X GET "$BASE_URL/vehicles/XYZ789"
```

### List Vehicles with Filtering
```bash
# All vehicles with pagination
curl -X GET "$BASE_URL/vehicles?page=1&limit=20"

# Filter by status and type
curl -X GET "$BASE_URL/vehicles?status=parked&vehicleType=standard"

# Search by license plate
curl -X GET "$BASE_URL/vehicles?search=ABC"
```

### Update Vehicle Information
```bash
curl -X PUT "$BASE_URL/vehicles/XYZ789" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Honda",
    "model": "Civic",
    "ownerPhone": "555-9999"
  }'
```

### Delete Vehicle
```bash
curl -X DELETE "$BASE_URL/vehicles/XYZ789"
```

## 6. Statistics and Monitoring

### System Health Check
```bash
curl -X GET "$BASE_URL/health"
```

### Occupancy Statistics
```bash
curl -X GET "$BASE_URL/stats/occupancy"
```

### Spot Statistics
```bash
curl -X GET "$BASE_URL/spots/statistics"
```

### Vehicle Metrics
```bash
curl -X GET "$BASE_URL/vehicles/metrics"
```

### Check-in Statistics
```bash
curl -X GET "$BASE_URL/checkin/stats"
```

### Checkout Statistics
```bash
curl -X GET "$BASE_URL/checkout/stats"
```

## 7. Common Workflows

### Complete Parking Session
```bash
# 1. Check availability
curl -X GET "$BASE_URL/checkin/availability/standard"

# 2. Check in vehicle
curl -X POST "$BASE_URL/checkin" \
  -H "Content-Type: application/json" \
  -d '{"licensePlate": "DEMO001", "vehicleType": "standard", "rateType": "hourly"}'

# 3. Get current estimate (after some time)
curl -X GET "$BASE_URL/checkout/estimate/DEMO001"

# 4. Check out vehicle
curl -X POST "$BASE_URL/checkout" \
  -H "Content-Type: application/json" \
  -d '{"licensePlate": "DEMO001", "paymentMethod": "credit_card"}'
```

### Multi-Vehicle Management
```bash
# Check in multiple vehicles
for plate in "MULTI001" "MULTI002" "MULTI003"; do
  curl -X POST "$BASE_URL/checkin" \
    -H "Content-Type: application/json" \
    -d "{\"licensePlate\": \"$plate\", \"vehicleType\": \"standard\", \"rateType\": \"hourly\"}"
  sleep 1
done

# Check current occupancy
curl -X GET "$BASE_URL/stats/occupancy"

# List all parked vehicles
curl -X GET "$BASE_URL/vehicles?status=parked"
```

## 8. Error Handling Examples

### Duplicate Check-in Attempt
```bash
# This should return a 400 error
curl -X POST "$BASE_URL/checkin" \
  -H "Content-Type: application/json" \
  -d '{"licensePlate": "ALREADY_PARKED", "vehicleType": "standard"}'
```

### Invalid License Plate
```bash
# Empty license plate - should return 400 error
curl -X POST "$BASE_URL/checkin" \
  -H "Content-Type: application/json" \
  -d '{"licensePlate": "", "vehicleType": "standard"}'
```

### Non-existent Vehicle Checkout
```bash
# Should return 404 error
curl -X POST "$BASE_URL/checkout" \
  -H "Content-Type: application/json" \
  -d '{"licensePlate": "NONEXISTENT", "paymentMethod": "cash"}'
```

## 9. Advanced Features

### Force Checkout (Admin)
```bash
curl -X POST "$BASE_URL/checkout/force" \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "PROBLEM001",
    "reason": "Vehicle abandoned",
    "adminKey": "admin123"
  }'
```

### Bulk Vehicle Operations
```bash
curl -X POST "$BASE_URL/vehicles/bulk-delete" \
  -H "Content-Type: application/json" \
  -d '{"vehicleIds": ["OLD001", "OLD002", "OLD003"]}'
```

### Advanced Vehicle Search
```bash
curl -X GET "$BASE_URL/vehicles/search?search=Toyota&mode=partial&threshold=0.6"
```

## Response Format

All successful responses follow this general format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Tips for Usage

1. **Use jq for JSON formatting**: Pipe responses through `| jq '.'` for better readability
2. **Set up environment variables**: Export `BASE_URL` to avoid repetition
3. **Test sequences**: Use the provided shell scripts for comprehensive testing
4. **Monitor responses**: Pay attention to status codes and error messages
5. **Pagination**: Use `limit` and `offset` parameters for large datasets

## Testing Scripts

- **Comprehensive testing**: `/docs/curl-requests.sh`
- **Simple examples**: `/docs/curl-requests-simple.sh`
- **Postman collection**: `/postman/CriticalPath.json`
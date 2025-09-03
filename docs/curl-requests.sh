#!/bin/bash

# Parking Garage Management System - Comprehensive curl Request Collection
# This script contains curl requests for all major API endpoints

# Configuration
BASE_URL="http://localhost:8742/api"
CONTENT_TYPE="Content-Type: application/json"

echo "==================================================="
echo "    PARKING GARAGE MANAGEMENT SYSTEM - API TESTS  "
echo "==================================================="

# ================================
# 1. GARAGE LAYOUT MANAGEMENT
# ================================
echo ""
echo "1. GARAGE LAYOUT MANAGEMENT"
echo "==========================="

echo "1.1 Initialize Garage Layout"
curl -X POST "$BASE_URL/garage/initialize" \
  -H "$CONTENT_TYPE" \
  -d '{
    "name": "Downtown Parking Garage",
    "floors": [
      {
        "number": 1,
        "bays": 3,
        "spotsPerBay": 20
      },
      {
        "number": 2,
        "bays": 4,
        "spotsPerBay": 25
      },
      {
        "number": 3,
        "bays": 2,
        "spotsPerBay": 15
      }
    ]
  }' \
  | jq '.'

echo ""
echo "1.2 Get Garage Configuration"
curl -X GET "$BASE_URL/garage?includeStats=true&includeSpots=false" \
  | jq '.'

echo ""
echo "1.3 Get Garage Configuration with Spot Details"
curl -X GET "$BASE_URL/garage?includeStats=true&includeSpots=true" \
  | jq '.'

echo ""
echo "1.4 Get Garage Status"
curl -X GET "$BASE_URL/garage/status" \
  | jq '.'

echo ""
echo "1.5 Get Garage Capacity Information"
curl -X GET "$BASE_URL/garage/capacity" \
  | jq '.'

echo ""
echo "1.6 Get Garage Statistics"
curl -X GET "$BASE_URL/garage/statistics" \
  | jq '.'

echo ""
echo "1.7 Update Garage Rates"
curl -X PUT "$BASE_URL/garage/rates" \
  -H "$CONTENT_TYPE" \
  -d '{
    "standard": 5.00,
    "compact": 4.00,
    "oversized": 7.00,
    "ev_charging": 6.00
  }' \
  | jq '.'

echo ""
echo "1.8 Get Current Garage Rates"
curl -X GET "$BASE_URL/garage/rates" \
  | jq '.'

echo ""
echo "1.9 Update Garage Configuration"
curl -X PUT "$BASE_URL/garage/config" \
  -H "$CONTENT_TYPE" \
  -d '{
    "name": "Updated Downtown Parking Garage"
  }' \
  | jq '.'

# ================================
# 2. PARKING SPOT MANAGEMENT
# ================================
echo ""
echo ""
echo "2. PARKING SPOT MANAGEMENT"
echo "=========================="

echo "2.1 Get All Available Spots"
curl -X GET "$BASE_URL/spots/available" \
  | jq '.'

echo ""
echo "2.2 Get Available Spots with Filtering"
curl -X GET "$BASE_URL/spots/available?vehicleType=standard&floor=2&limit=10" \
  | jq '.'

echo ""
echo "2.3 Get All Spots with Pagination"
curl -X GET "$BASE_URL/spots?limit=20&offset=0&sort=floor&order=asc" \
  | jq '.'

echo ""
echo "2.4 Get Spots Filtered by Status and Floor"
curl -X GET "$BASE_URL/spots?status=available&floor=1&type=compact" \
  | jq '.'

echo ""
echo "2.5 Get Occupied Spots"
curl -X GET "$BASE_URL/spots/occupied" \
  | jq '.'

echo ""
echo "2.6 Search Spots with Query"
curl -X GET "$BASE_URL/spots/search?query=floor:2%20compact%20available" \
  | jq '.'

echo ""
echo "2.7 Get Specific Spot Details (replace F1-B1-S001 with actual spot ID)"
SPOT_ID="F1-B1-S001"
curl -X GET "$BASE_URL/spots/$SPOT_ID" \
  | jq '.'

echo ""
echo "2.8 Update Spot Status"
curl -X PATCH "$BASE_URL/spots/$SPOT_ID" \
  -H "$CONTENT_TYPE" \
  -d '{
    "status": "available",
    "features": ["ev_charging"]
  }' \
  | jq '.'

echo ""
echo "2.9 Get Spot Statistics"
curl -X GET "$BASE_URL/spots/statistics" \
  | jq '.'

# ================================
# 3. VEHICLE CHECK-IN OPERATIONS
# ================================
echo ""
echo ""
echo "3. VEHICLE CHECK-IN OPERATIONS"
echo "=============================="

echo "3.1 Check General Availability"
curl -X GET "$BASE_URL/checkin/availability" \
  | jq '.'

echo ""
echo "3.2 Check Availability for Specific Vehicle Type"
curl -X GET "$BASE_URL/checkin/availability/standard" \
  | jq '.'

echo ""
echo "3.3 Simulate Vehicle Check-in"
curl -X POST "$BASE_URL/checkin/simulate" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "DEMO001",
    "vehicleType": "standard",
    "rateType": "hourly"
  }' \
  | jq '.'

echo ""
echo "3.4 Actual Vehicle Check-in"
curl -X POST "$BASE_URL/checkin" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "DEMO001",
    "vehicleType": "standard",
    "rateType": "hourly"
  }' \
  | jq '.'

echo ""
echo "3.5 Check-in Statistics"
curl -X GET "$BASE_URL/checkin/stats" \
  | jq '.'

echo ""
echo "3.6 Check-in Service Health Check"
curl -X GET "$BASE_URL/checkin/health" \
  | jq '.'

# ================================
# 4. VEHICLE CHECK-OUT OPERATIONS
# ================================
echo ""
echo ""
echo "4. VEHICLE CHECK-OUT OPERATIONS"
echo "==============================="

echo "4.1 Get Current Cost Estimate"
curl -X GET "$BASE_URL/checkout/estimate/DEMO001" \
  | jq '.'

echo ""
echo "4.2 Simulate Vehicle Check-out"
curl -X POST "$BASE_URL/checkout/simulate" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "DEMO001",
    "applyGracePeriod": false
  }' \
  | jq '.'

echo ""
echo "4.3 Actual Vehicle Check-out"
curl -X POST "$BASE_URL/checkout" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "DEMO001",
    "paymentMethod": "credit_card"
  }' \
  | jq '.'

echo ""
echo "4.4 Get Vehicles Ready for Checkout"
curl -X GET "$BASE_URL/checkout/ready?minMinutes=60&vehicleType=standard" \
  | jq '.'

echo ""
echo "4.5 Checkout Statistics"
curl -X GET "$BASE_URL/checkout/stats" \
  | jq '.'

echo ""
echo "4.6 Force Checkout (Admin)"
curl -X POST "$BASE_URL/checkout/force" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "PROBLEM001",
    "reason": "Vehicle abandoned",
    "adminKey": "admin123"
  }' \
  | jq '.'

echo ""
echo "4.7 Checkout Service Health Check"
curl -X GET "$BASE_URL/checkout/health" \
  | jq '.'

# ================================
# 5. VEHICLE MANAGEMENT
# ================================
echo ""
echo ""
echo "5. VEHICLE MANAGEMENT"
echo "===================="

echo "5.1 Create Vehicle Record"
curl -X POST "$BASE_URL/vehicles" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "VEHICLE001",
    "vehicleType": "standard",
    "rateType": "hourly",
    "make": "Toyota",
    "model": "Camry",
    "color": "Blue",
    "year": 2020,
    "ownerName": "John Doe",
    "ownerEmail": "john.doe@example.com",
    "ownerPhone": "555-0123",
    "notes": "Regular customer"
  }' \
  | jq '.'

echo ""
echo "5.2 Get All Vehicles with Filtering"
curl -X GET "$BASE_URL/vehicles?page=1&limit=20&search=VEHICLE&vehicleType=standard&status=active" \
  | jq '.'

echo ""
echo "5.3 Get Specific Vehicle Details"
curl -X GET "$BASE_URL/vehicles/VEHICLE001" \
  | jq '.'

echo ""
echo "5.4 Update Vehicle Information"
curl -X PUT "$BASE_URL/vehicles/VEHICLE001" \
  -H "$CONTENT_TYPE" \
  -d '{
    "make": "Honda",
    "model": "Civic",
    "ownerPhone": "555-9999"
  }' \
  | jq '.'

echo ""
echo "5.5 Search Vehicles"
curl -X GET "$BASE_URL/vehicles/search?search=VEHICLE&mode=partial&threshold=0.6&maxResults=10" \
  | jq '.'

echo ""
echo "5.6 Get Vehicle Metrics"
curl -X GET "$BASE_URL/vehicles/metrics" \
  | jq '.'

echo ""
echo "5.7 Bulk Delete Vehicles"
curl -X POST "$BASE_URL/vehicles/bulk-delete" \
  -H "$CONTENT_TYPE" \
  -d '{
    "vehicleIds": ["OLDVEHICLE001", "OLDVEHICLE002", "OLDVEHICLE003"]
  }' \
  | jq '.'

echo ""
echo "5.8 Delete Single Vehicle"
curl -X DELETE "$BASE_URL/vehicles/VEHICLE001" \
  | jq '.'

# ================================
# 6. COMPLEX SCENARIOS
# ================================
echo ""
echo ""
echo "6. COMPLEX END-TO-END SCENARIOS"
echo "==============================="

echo "6.1 Multi-Vehicle Check-in Scenario"
echo "Checking in multiple vehicles..."

# Vehicle 1
curl -X POST "$BASE_URL/checkin" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "MULTI001",
    "vehicleType": "compact",
    "rateType": "hourly"
  }' \
  | jq '.'

sleep 2

# Vehicle 2
curl -X POST "$BASE_URL/checkin" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "MULTI002",
    "vehicleType": "standard",
    "rateType": "hourly"
  }' \
  | jq '.'

sleep 2

# Vehicle 3
curl -X POST "$BASE_URL/checkin" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "MULTI003",
    "vehicleType": "oversized",
    "rateType": "daily"
  }' \
  | jq '.'

echo ""
echo "6.2 Get Current Occupancy After Multi Check-in"
curl -X GET "$BASE_URL/stats/occupancy" \
  | jq '.'

echo ""
echo "6.3 List All Currently Parked Vehicles"
curl -X GET "$BASE_URL/vehicles?status=parked" \
  | jq '.'

echo ""
echo "6.4 Check Out First Vehicle"
curl -X POST "$BASE_URL/checkout" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "MULTI001",
    "paymentMethod": "cash"
  }' \
  | jq '.'

echo ""
echo "6.5 Verify Occupancy After First Check-out"
curl -X GET "$BASE_URL/stats/occupancy" \
  | jq '.'

# ================================
# 7. ERROR HANDLING SCENARIOS
# ================================
echo ""
echo ""
echo "7. ERROR HANDLING SCENARIOS"
echo "==========================="

echo "7.1 Attempt Duplicate Check-in"
curl -X POST "$BASE_URL/checkin" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "MULTI002",
    "vehicleType": "standard",
    "rateType": "hourly"
  }' \
  | jq '.'

echo ""
echo "7.2 Invalid License Plate Check-in"
curl -X POST "$BASE_URL/checkin" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "",
    "vehicleType": "standard",
    "rateType": "hourly"
  }' \
  | jq '.'

echo ""
echo "7.3 Check Out Non-existent Vehicle"
curl -X POST "$BASE_URL/checkout" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "NONEXISTENT",
    "paymentMethod": "credit_card"
  }' \
  | jq '.'

echo ""
echo "7.4 Get Non-existent Spot"
curl -X GET "$BASE_URL/spots/INVALID-SPOT" \
  | jq '.'

echo ""
echo "7.5 Invalid Vehicle Type Check-in"
curl -X POST "$BASE_URL/checkin" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "INVALID001",
    "vehicleType": "invalid_type",
    "rateType": "hourly"
  }' \
  | jq '.'

# ================================
# 8. HEALTH AND MONITORING
# ================================
echo ""
echo ""
echo "8. HEALTH AND MONITORING"
echo "========================"

echo "8.1 System Health Check"
curl -X GET "$BASE_URL/health" \
  | jq '.'

echo ""
echo "8.2 API Statistics"
curl -X GET "$BASE_URL/stats" \
  | jq '.'

echo ""
echo "8.3 Performance Metrics"
curl -X GET "$BASE_URL/stats/performance" \
  | jq '.'

# ================================
# 9. CLEANUP (Optional)
# ================================
echo ""
echo ""
echo "9. CLEANUP OPERATIONS"
echo "===================="

echo "9.1 Clean up remaining test vehicles"
echo "Checking out MULTI002..."
curl -X POST "$BASE_URL/checkout" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "MULTI002",
    "paymentMethod": "credit_card"
  }' \
  | jq '.'

echo ""
echo "Checking out MULTI003..."
curl -X POST "$BASE_URL/checkout" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "MULTI003",
    "paymentMethod": "debit_card"
  }' \
  | jq '.'

echo ""
echo "9.2 Final Occupancy Check"
curl -X GET "$BASE_URL/checkin/availability" \
  | jq '.'

echo ""
echo "9.3 Reset Garage (Development/Testing Only)"
echo "WARNING: This will clear all garage data!"
read -p "Are you sure you want to reset the garage? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    curl -X DELETE "$BASE_URL/garage/reset" \
      | jq '.'
    echo "Garage has been reset."
else
    echo "Garage reset cancelled."
fi

echo ""
echo "==================================================="
echo "      API TESTING COMPLETE                        "
echo "==================================================="
echo ""
echo "Summary of tested endpoints:"
echo "• Garage Layout Management (9 endpoints)"
echo "• Parking Spot Management (9 endpoints)"
echo "• Vehicle Check-in Operations (6 endpoints)"
echo "• Vehicle Check-out Operations (7 endpoints)"
echo "• Vehicle Management (8 endpoints)"
echo "• Complex Scenarios (5 test cases)"
echo "• Error Handling (5 test cases)"
echo "• Health and Monitoring (3 endpoints)"
echo "• Cleanup Operations (3 endpoints)"
echo ""
echo "Total: 55+ API requests tested"
echo ""
#!/bin/bash

# Critical Path API Testing Script
# Tests all critical parking garage API endpoints and saves results to api-results.json

set -e

BASE_URL="http://localhost:8743/api"
RESULTS_FILE="api-results.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

# Initialize results array
echo "{" > "$RESULTS_FILE"
echo "  \"timestamp\": \"$TIMESTAMP\"," >> "$RESULTS_FILE"
echo "  \"baseUrl\": \"$BASE_URL\"," >> "$RESULTS_FILE"
echo "  \"testResults\": [" >> "$RESULTS_FILE"

# Helper function to make API calls and format results
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo "Testing: $name"
    
    local start_time=$(date +%s%N)
    
    if [[ "$method" == "POST" || "$method" == "PATCH" ]]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint" 2>/dev/null || echo -e "\n000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$BASE_URL$endpoint" 2>/dev/null || echo -e "\n000")
    fi
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
    
    # Extract status code (last line) and body (everything else)
    local status_code=$(echo "$response" | tail -n1)
    local response_body=$(echo "$response" | head -n -1)
    
    # Determine if test passed
    local status="PASS"
    if [[ "$status_code" != "$expected_status" ]]; then
        status="FAIL"
    fi
    
    # Format JSON response body (escape quotes and newlines)
    local escaped_body=$(echo "$response_body" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr '\n' ' ')
    
    cat << EOF >> "$RESULTS_FILE"
    {
      "name": "$name",
      "method": "$method",
      "endpoint": "$endpoint",
      "expectedStatus": $expected_status,
      "actualStatus": $status_code,
      "status": "$status",
      "responseTime": $duration,
      "responseBody": "$escaped_body"
    },
EOF
}

echo "🚀 Starting Critical Path API Tests..."
echo "📝 Results will be saved to: $RESULTS_FILE"
echo ""

# =============================================================================
# CRITICAL PATH 1: Initialize Test Environment
# =============================================================================
echo "🏗️  Critical Path 1: Initialize Test Environment"

test_endpoint "Health Check" "GET" "/health" "" "200"

test_endpoint "Initialize Garage Layout" "POST" "/garage/initialize" \
'{
  "name": "Critical Path Test Garage",
  "floors": [
    {
      "number": 1,
      "bays": 2,
      "spotsPerBay": 5
    },
    {
      "number": 2,
      "bays": 2,
      "spotsPerBay": 5
    }
  ]
}' "201"

test_endpoint "Verify Initial Availability" "GET" "/checkin/availability" "" "200"

# =============================================================================
# CRITICAL PATH 2: Garage Layout Management
# =============================================================================
echo ""
echo "🏢 Critical Path 2: Garage Layout Management"

test_endpoint "Get Garage Configuration" "GET" "/garage?includeStats=true&includeSpots=true" "" "200"

test_endpoint "Update Garage Rates" "PUT" "/garage/rates" \
'{
  "standard": 5.00,
  "compact": 4.00,
  "oversized": 7.00,
  "ev_charging": 3.00
}' "200"

# =============================================================================
# CRITICAL PATH 3: Parking Spot Management
# =============================================================================
echo ""
echo "🅿️  Critical Path 3: Parking Spot Management"

test_endpoint "Get All Available Spots" "GET" "/spots/available" "" "200"

test_endpoint "Get Available Spots by Vehicle Type" "GET" "/spots/available?vehicleType=standard" "" "200"

# Get a specific spot (we'll use F1-B1-S001 as it should exist)
test_endpoint "Get Specific Spot Details" "GET" "/spots/F1-B1-S001" "" "200"

test_endpoint "Get Spots with Filters" "GET" "/spots?floor=1&status=available&limit=10" "" "200"

# =============================================================================
# CRITICAL PATH 4: Vehicle Check-in Flow
# =============================================================================
echo ""
echo "🚗 Critical Path 4: Vehicle Check-in Flow"

test_endpoint "Check Availability Before Check-in" "GET" "/checkin/availability/standard" "" "200"

test_endpoint "Simulate Check-in (Preview)" "POST" "/checkin/simulate" \
'{
  "licensePlate": "CRITICAL001",
  "vehicleType": "standard",
  "rateType": "hourly"
}' "200"

test_endpoint "Actual Check-in Vehicle" "POST" "/checkin" \
'{
  "licensePlate": "CRITICAL001",
  "vehicleType": "standard",
  "rateType": "hourly"
}' "201"

# Wait a moment for the system to process
sleep 1

# =============================================================================
# CRITICAL PATH 5: Vehicle Check-out Flow
# =============================================================================
echo ""
echo "💳 Critical Path 5: Vehicle Check-out Flow"

test_endpoint "Simulate Checkout (Preview Billing)" "POST" "/checkout/simulate" \
'{
  "licensePlate": "CRITICAL001",
  "applyGracePeriod": false
}' "200"

test_endpoint "Get Vehicle Details Before Checkout" "GET" "/vehicles/CRITICAL001" "" "200"

test_endpoint "Actual Checkout Vehicle" "POST" "/checkout" \
'{
  "licensePlate": "CRITICAL001",
  "paymentMethod": "credit_card"
}' "200"

# =============================================================================
# CRITICAL PATH 6: End-to-End Scenarios
# =============================================================================
echo ""
echo "🔄 Critical Path 6: End-to-End Scenarios"

test_endpoint "Multi-Vehicle Check-in Scenario (Vehicle 1)" "POST" "/checkin" \
'{
  "licensePlate": "MULTI001",
  "vehicleType": "compact",
  "rateType": "hourly"
}' "201"

test_endpoint "Second Vehicle Check-in" "POST" "/checkin" \
'{
  "licensePlate": "MULTI002",
  "vehicleType": "standard",
  "rateType": "hourly"
}' "201"

test_endpoint "Get Current Occupancy Status" "GET" "/stats/occupancy" "" "200"

test_endpoint "Bulk Vehicle List" "GET" "/vehicles?status=parked" "" "200"

test_endpoint "Checkout First Vehicle" "POST" "/checkout" \
'{
  "licensePlate": "MULTI001",
  "paymentMethod": "cash"
}' "200"

test_endpoint "Verify Occupancy After First Checkout" "GET" "/stats/occupancy" "" "200"

# =============================================================================
# CRITICAL PATH 7: Error Handling & Edge Cases
# =============================================================================
echo ""
echo "⚠️  Critical Path 7: Error Handling & Edge Cases"

test_endpoint "Duplicate Check-in Attempt" "POST" "/checkin" \
'{
  "licensePlate": "MULTI002",
  "vehicleType": "standard",
  "rateType": "hourly"
}' "400"

test_endpoint "Invalid License Plate Check-in" "POST" "/checkin" \
'{
  "licensePlate": "",
  "vehicleType": "standard",
  "rateType": "hourly"
}' "400"

test_endpoint "Checkout Non-existent Vehicle" "POST" "/checkout" \
'{
  "licensePlate": "NONEXISTENT",
  "paymentMethod": "credit_card"
}' "404"

test_endpoint "Get Non-existent Spot" "GET" "/spots/INVALID-SPOT" "" "404"

test_endpoint "Invalid Vehicle Type Check-in" "POST" "/checkin" \
'{
  "licensePlate": "INVALID001",
  "vehicleType": "invalid_type",
  "rateType": "hourly"
}' "400"

# =============================================================================
# CLEANUP: Reset Test Environment
# =============================================================================
echo ""
echo "🧹 Cleanup: Reset Test Environment"

test_endpoint "Cleanup Remaining Vehicles" "POST" "/checkout" \
'{
  "licensePlate": "MULTI002",
  "paymentMethod": "credit_card"
}' "200"

test_endpoint "Verify All Spots Available" "GET" "/checkin/availability" "" "200"

# Finalize JSON file
# Remove the last comma and close the array
sed -i '$ s/,$//' "$RESULTS_FILE"
echo "  ]," >> "$RESULTS_FILE"

# Add summary statistics
total_tests=$(grep -c '"name":' "$RESULTS_FILE")
passed_tests=$(grep -c '"status": "PASS"' "$RESULTS_FILE")
failed_tests=$(grep -c '"status": "FAIL"' "$RESULTS_FILE")
end_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

cat << EOF >> "$RESULTS_FILE"
  "summary": {
    "totalTests": $total_tests,
    "passed": $passed_tests,
    "failed": $failed_tests,
    "successRate": $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l)%,
    "endTimestamp": "$end_timestamp"
  }
}
EOF

echo ""
echo "✅ Critical Path Testing Complete!"
echo "📊 Results Summary:"
echo "   Total Tests: $total_tests"
echo "   Passed: $passed_tests"
echo "   Failed: $failed_tests"
echo "   Success Rate: $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l)%"
echo ""
echo "📁 Detailed results saved to: $RESULTS_FILE"
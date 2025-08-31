#!/bin/bash

# Test script to verify all API endpoints are working with seed data
# Run this after starting the server with: npm run dev

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Testing Parking Garage API Endpoints${NC}\n"

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${YELLOW}Testing:${NC} $description"
    echo "  $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    elif [ "$method" = "PATCH" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PATCH "$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "  ${GREEN}✓ Success (HTTP $http_code)${NC}"
        echo "  Response preview: $(echo "$body" | jq -c . 2>/dev/null | cut -c1-100)..."
    else
        echo -e "  ${RED}✗ Failed (HTTP $http_code)${NC}"
        echo "  Response: $body"
    fi
    echo ""
}

# Health Check
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}1. SYSTEM ENDPOINTS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "GET" "$BASE_URL/health" "" "Health Check"
test_endpoint "GET" "$API_URL" "" "API Information"

# Garage Management
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}2. GARAGE MANAGEMENT${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "GET" "$API_URL/garage" "" "Get Garage Info"
test_endpoint "GET" "$API_URL/garage/status" "" "Get Garage Status"
test_endpoint "GET" "$API_URL/garage/capacity" "" "Get Capacity Info"
test_endpoint "GET" "$API_URL/garage/statistics" "" "Get Statistics"
test_endpoint "GET" "$API_URL/garage/rates" "" "Get Parking Rates"

# Spot Management
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}3. SPOT MANAGEMENT${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "GET" "$API_URL/spots" "" "List All Spots"
test_endpoint "GET" "$API_URL/spots?status=available" "" "Get Available Spots"
test_endpoint "GET" "$API_URL/spots?status=occupied" "" "Get Occupied Spots"
test_endpoint "GET" "$API_URL/spots?floor=1" "" "Get Spots on Floor 1"
test_endpoint "GET" "$API_URL/spots?floor=1&bay=1" "" "Get Spots on Floor 1, Bay 1"
test_endpoint "GET" "$API_URL/spots/available" "" "Get All Available Spots"
test_endpoint "GET" "$API_URL/spots/occupied" "" "Get All Occupied Spots"
test_endpoint "GET" "$API_URL/spots/statistics" "" "Get Spot Statistics"

# Get a sample spot ID for testing
echo -e "${YELLOW}Getting a sample spot for testing...${NC}"
sample_spot=$(curl -s "$API_URL/spots?status=available" | jq -r '.spots[0].id' 2>/dev/null)
if [ ! -z "$sample_spot" ] && [ "$sample_spot" != "null" ]; then
    test_endpoint "GET" "$API_URL/spots/$sample_spot" "" "Get Specific Spot Details"
else
    echo -e "${RED}Could not get sample spot ID${NC}\n"
fi

# Vehicle Check-in
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}4. VEHICLE CHECK-IN${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "GET" "$API_URL/checkin/availability" "" "Get General Availability"
test_endpoint "GET" "$API_URL/checkin/availability/standard" "" "Get Availability for Standard Vehicles"
test_endpoint "GET" "$API_URL/checkin/stats" "" "Get Check-in Statistics"
test_endpoint "GET" "$API_URL/checkin/health" "" "Check-in Service Health"

# Simulate check-in
test_endpoint "POST" "$API_URL/checkin/simulate" \
    '{"licensePlate":"TEST-999","vehicleType":"standard"}' \
    "Simulate Vehicle Check-in"

# Actual check-in
test_endpoint "POST" "$API_URL/checkin" \
    '{"licensePlate":"NEW-CAR1","vehicleType":"standard"}' \
    "Check In New Vehicle"

# Vehicle Check-out
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}5. VEHICLE CHECK-OUT${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Test with one of the seeded vehicles
test_endpoint "POST" "$API_URL/checkout" \
    '{"licensePlate":"ABC-123"}' \
    "Check Out Seeded Vehicle"

test_endpoint "GET" "$API_URL/checkout/fee/ABC-123" "" "Calculate Fee for Vehicle"
test_endpoint "GET" "$API_URL/checkout/stats" "" "Get Checkout Statistics"

# Summary
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📊 TEST SUMMARY${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${GREEN}✅ All basic endpoint tests completed!${NC}"
echo ""
echo "Notes:"
echo "- Seed data provides 20 sample vehicles already parked"
echo "- Garage has 500 total spots across 5 floors"
echo "- Some spots are set to maintenance status"
echo "- Check-in operations will assign next available spot"
echo ""
echo -e "${YELLOW}To reset all data, use:${NC}"
echo "  curl -X DELETE $API_URL/garage/reset"
echo ""
echo -e "${YELLOW}To update parking rates, use:${NC}"
echo "  curl -X PUT $API_URL/garage/rates -H 'Content-Type: application/json' -d '{\"hourly\":6.00,\"daily\":35.00}'"
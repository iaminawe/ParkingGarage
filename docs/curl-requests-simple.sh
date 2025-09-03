#!/bin/bash

# Simple curl Request Collection for Parking Garage API
# Quick reference for essential operations

BASE_URL="http://localhost:8742/api"

# ================================
# GARAGE LAYOUT MANAGEMENT
# ================================

# Initialize garage with floors and spots
curl -X POST "$BASE_URL/garage/initialize" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Parking Garage",
    "floors": [
      {"number": 1, "bays": 2, "spotsPerBay": 10},
      {"number": 2, "bays": 2, "spotsPerBay": 10}
    ]
  }'

# Get garage configuration
curl -X GET "$BASE_URL/garage?includeStats=true"

# Update parking rates
curl -X PUT "$BASE_URL/garage/rates" \
  -H "Content-Type: application/json" \
  -d '{"standard": 5.00, "compact": 4.00, "oversized": 7.00}'

# ================================
# PARKING SPOT MANAGEMENT
# ================================

# Get all available spots
curl -X GET "$BASE_URL/spots/available"

# Get spots filtered by floor and type
curl -X GET "$BASE_URL/spots?floor=1&type=compact&status=available"

# Get specific spot details (replace F1-B1-S001 with actual spot ID)
curl -X GET "$BASE_URL/spots/F1-B1-S001"

# Update spot features
curl -X PATCH "$BASE_URL/spots/F1-B1-S001" \
  -H "Content-Type: application/json" \
  -d '{"features": ["ev_charging"]}'

# ================================
# VEHICLE CHECK-IN/CHECK-OUT
# ================================

# Check availability before check-in
curl -X GET "$BASE_URL/checkin/availability/standard"

# Check in a vehicle
curl -X POST "$BASE_URL/checkin" \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "ABC123",
    "vehicleType": "standard",
    "rateType": "hourly"
  }'

# Get current parking cost estimate
curl -X GET "$BASE_URL/checkout/estimate/ABC123"

# Check out a vehicle
curl -X POST "$BASE_URL/checkout" \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "ABC123",
    "paymentMethod": "credit_card"
  }'

# ================================
# VEHICLE MANAGEMENT
# ================================

# Create vehicle record
curl -X POST "$BASE_URL/vehicles" \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "XYZ789",
    "vehicleType": "compact",
    "make": "Toyota",
    "model": "Prius",
    "ownerName": "Jane Smith",
    "ownerEmail": "jane@example.com"
  }'

# Get vehicle details
curl -X GET "$BASE_URL/vehicles/XYZ789"

# List all parked vehicles
curl -X GET "$BASE_URL/vehicles?status=parked"

# Update vehicle info
curl -X PUT "$BASE_URL/vehicles/XYZ789" \
  -H "Content-Type: application/json" \
  -d '{"ownerPhone": "555-1234"}'

# ================================
# MONITORING & STATS
# ================================

# Get occupancy statistics
curl -X GET "$BASE_URL/stats/occupancy"

# System health check
curl -X GET "$BASE_URL/health"

# Spot statistics
curl -X GET "$BASE_URL/spots/statistics"
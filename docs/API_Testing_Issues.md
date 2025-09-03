# API Testing Issues Found

## Overview

During comprehensive testing of the API endpoints using the cURL commands from the API Testing Guide, several issues were identified. This document outlines the problems found and provides corrections.

## Issues Found

### 1. Authentication Issues

#### Issue: JSON Escaping Problem in Bash
**Location**: Login command with special characters in password
**Problem**: The exclamation mark `!` in passwords causes JSON parsing errors when used in bash curl commands
```bash
# ❌ This fails due to bash escaping
curl -X POST "$BASE_URL/auth/login" \
  -H "$CONTENT_TYPE" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```
**Error**: `Bad escaped character in JSON at position 61`

**Solution**: Use passwords without special characters that require escaping in bash, or escape properly
```bash
# ✅ This works
curl -X POST "$BASE_URL/auth/login" \
  -H "$CONTENT_TYPE" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123@"
  }'
```

#### Issue: Login Endpoint Internal Server Error
**Location**: `/api/auth/login`
**Problem**: Even with valid credentials (signup works), login returns "Internal server error"
**Status**: Needs investigation - possible backend issue

#### Issue: Password Validation Requirements
**Location**: `/api/auth/signup`
**Problem**: The documentation example uses `SecurePassword123!` but validation requires specific format
**Current Requirements**:
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character
- Last name validation prevents numbers (e.g., "User2" fails)

### 2. Rate Type Issues

#### Issue: Incorrect Rate Types in Check-in Commands
**Location**: All check-in examples in the API Testing Guide
**Problem**: Documentation uses `"rateType": "standard"` but API expects different values

```bash
# ❌ This fails
curl -X POST "$BASE_URL/checkin/" \
  -H "$CONTENT_TYPE" \
  -d '{
    "licensePlate": "ABC123",
    "vehicleType": "standard",
    "rateType": "standard"
  }'
```
**Error**: `Invalid rate type: standard. Valid types: hourly, daily, monthly`

**Correction Needed**: Update all check-in examples to use correct rate types:
- `"rateType": "hourly"` instead of `"rateType": "standard"`
- `"rateType": "daily"` instead of `"rateType": "compact"`  
- `"rateType": "monthly"` instead of `"rateType": "oversized"`

### 3. Server Stability Issues

#### Issue: Server Crashes During Testing
**Location**: After successful check-in operation
**Problem**: Server becomes unresponsive after processing some requests
**Impact**: Unable to complete full API testing suite
**Status**: Needs investigation

### 4. Documentation Inconsistencies

#### Issue: Pricing Rate Structure Mismatch
**Location**: Garage initialization examples
**Problem**: Documentation shows pricing rates for vehicle types but check-in uses time-based rates

**Garage Rates** (from successful initialization):
```json
{
  "rates": {
    "standard": 5,
    "compact": 4,
    "oversized": 7
  }
}
```

**But Check-in Expects**: `hourly`, `daily`, `monthly`

This suggests either:
1. The garage pricing system is separate from check-in rates
2. There's confusion between vehicle types and rate types
3. The API has inconsistent rate handling

## Working Commands Verified

### ✅ Health Check
```bash
curl -X GET http://localhost:8742/health
```

### ✅ User Registration (with correct password format)
```bash
curl -X POST "http://localhost:8742/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123@",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### ✅ Garage Initialization
```bash
curl -X POST "http://localhost:8742/api/garage/initialize" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Parking Garage",
    "floors": [
      {
        "number": 1,
        "bays": 4,
        "spotsPerBay": 25
      }
    ]
  }'
```

### ✅ Garage Configuration Retrieval
```bash
curl -X GET "http://localhost:8742/api/garage/"
```

### ✅ Parking Spots List
```bash
curl -X GET "http://localhost:8742/api/spots/"
```

### ✅ Available Spots List  
```bash
curl -X GET "http://localhost:8742/api/spots/available"
```

### ✅ Vehicle Check-in (with correct rate type)
```bash
curl -X POST "http://localhost:8742/api/checkin/" \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "ABC123",
    "vehicleType": "standard", 
    "rateType": "hourly"
  }'
```

## Recommendations

### Immediate Actions Required

1. **Update API Testing Guide**:
   - Replace all `"rateType": "standard"` with `"rateType": "hourly"`
   - Replace all `"rateType": "compact"` with `"rateType": "daily"`
   - Replace all `"rateType": "oversized"` with `"rateType": "monthly"`
   - Fix password examples to avoid bash escaping issues

2. **Investigate Backend Issues**:
   - Login endpoint returning internal server error
   - Server stability issues during operations
   - Rate type vs pricing model inconsistencies

3. **Clarify Documentation**:
   - Explain relationship between garage pricing rates and check-in rate types
   - Document exact password requirements clearly
   - Add note about bash escaping for special characters

### Testing Status

- **Health Checks**: ✅ Working
- **Authentication**: ❌ Signup works, Login fails
- **Garage Management**: ✅ Working
- **Spots Management**: ✅ Working  
- **Check-in**: ✅ Working (with rate type fix)
- **Check-out**: ❌ Server crashed during testing
- **Vehicle Management**: ❌ Not tested due to server issues
- **Sessions**: ❌ Not tested due to server issues
- **Statistics**: ❌ Not tested due to server issues

## Next Steps

1. Fix the identified documentation issues
2. Restart server and continue testing remaining endpoints
3. Investigate backend stability and login functionality
4. Update API Testing Guide with corrections
5. Complete full endpoint testing suite

## Date
2025-09-03
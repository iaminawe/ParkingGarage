#!/bin/bash

# Authentication System Test Runner
# Runs comprehensive tests for the authentication system including password operations

echo "🧪 Running Authentication System Tests"
echo "====================================="

# Set test environment
export NODE_ENV=test
export DATABASE_URL="file:./test.db"

# Function to run tests with proper error handling
run_test() {
    local test_name=$1
    local test_path=$2
    
    echo "Running $test_name..."
    
    if npm test "$test_path" 2>/dev/null; then
        echo "✅ $test_name: PASSED"
        return 0
    else
        echo "❌ $test_name: FAILED"
        return 1
    fi
}

# Initialize test database
echo "📊 Initializing test database..."
npx prisma generate --schema=./prisma/schema.prisma
npx prisma db push --schema=./prisma/schema.prisma --force-reset

# Initialize authentication system
echo "🔐 Initializing authentication system..."
npx ts-node src/scripts/initializeAuthSystem.ts

# Run authentication tests
echo "🔍 Running authentication tests..."

failed_tests=0
total_tests=0

# Password operations tests
((total_tests++))
if run_test "Password Operations" "tests/auth/password-operations.test.ts"; then
    :
else
    ((failed_tests++))
fi

# Auth service tests
((total_tests++))
if run_test "Auth Service" "tests/services/authService.test.ts"; then
    :
else
    ((failed_tests++))
fi

# Email service tests
((total_tests++))
if run_test "Email Service" "tests/services/EmailService.test.ts"; then
    :
else
    ((failed_tests++))
fi

# Security audit tests
((total_tests++))
if run_test "Security Audit" "tests/services/SecurityAuditService.test.ts"; then
    :
else
    ((failed_tests++))
fi

# Integration tests
((total_tests++))
if run_test "Auth Integration" "tests/integration/auth-integration.test.ts"; then
    :
else
    ((failed_tests++))
fi

# Performance tests
((total_tests++))
if run_test "Auth Performance" "tests/performance/auth-performance.test.ts"; then
    :
else
    ((failed_tests++))
fi

# Summary
echo ""
echo "📋 Test Summary"
echo "==============="
echo "Total tests: $total_tests"
echo "Passed: $((total_tests - failed_tests))"
echo "Failed: $failed_tests"

if [ $failed_tests -eq 0 ]; then
    echo "🎉 All authentication tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed. Please review the output above."
    exit 1
fi
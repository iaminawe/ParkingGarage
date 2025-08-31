#!/bin/bash

# Parking Garage API Test Runner
# This script runs the comprehensive test suite for the Parking Garage Management API

echo "================================================"
echo "   Parking Garage API - Test Suite Runner      "
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo ""
fi

# Function to run tests with nice formatting
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running $suite_name...${NC}"
    echo "----------------------------------------"
    
    if npm run $test_command; then
        echo -e "${GREEN}✓ $suite_name passed${NC}"
    else
        echo -e "${RED}✗ $suite_name failed${NC}"
        exit 1
    fi
    echo ""
}

# Parse command line arguments
case "$1" in
    "integration")
        run_test_suite "Integration Tests" "test:integration"
        ;;
    "unit")
        run_test_suite "Unit Tests" "test:unit"
        ;;
    "coverage")
        run_test_suite "Tests with Coverage" "test:coverage"
        echo -e "${GREEN}Coverage report generated in ./coverage${NC}"
        ;;
    "performance")
        echo -e "${YELLOW}Running Performance Tests...${NC}"
        npx jest tests/integration/performance.test.js --verbose
        ;;
    "watch")
        echo -e "${YELLOW}Starting test watcher...${NC}"
        npm run test:watch
        ;;
    "all")
        run_test_suite "All Tests" "test"
        ;;
    *)
        echo "Usage: ./run-tests.sh [integration|unit|coverage|performance|watch|all]"
        echo ""
        echo "Options:"
        echo "  integration  - Run integration tests only"
        echo "  unit        - Run unit tests only"
        echo "  coverage    - Run all tests with coverage report"
        echo "  performance - Run performance and load tests"
        echo "  watch       - Run tests in watch mode"
        echo "  all         - Run all tests (default)"
        echo ""
        echo "Running all tests by default..."
        echo ""
        run_test_suite "All Tests" "test"
        ;;
esac

echo "================================================"
echo "          Test Suite Complete                   "
echo "================================================"
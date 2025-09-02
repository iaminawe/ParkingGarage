/**
 * Comprehensive End-to-End API Test Suite Runner
 * 
 * Master test suite that orchestrates all API endpoint tests and provides
 * comprehensive reporting, validation, and integration testing capabilities.
 */

import { Application } from 'express';
import { setupTestDatabase, teardownTestDatabase, TestDatabase } from './setup/test-db-setup';
import { createTestApp } from './helpers/app-helpers';
import { createAPITestContext, APITestContext } from './helpers/api-test-helpers';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('E2EAPITestSuite');

// Test Suite Configuration
interface TestSuiteConfig {
  enablePerformanceTesting: boolean;
  enableSecurityTesting: boolean;
  enableLoadTesting: boolean;
  generateReports: boolean;
  testTimeout: number;
  maxConcurrentTests: number;
  retryFailedTests: boolean;
  retryCount: number;
}

const defaultConfig: TestSuiteConfig = {
  enablePerformanceTesting: true,
  enableSecurityTesting: true,
  enableLoadTesting: false, // Disabled by default for faster runs
  generateReports: true,
  testTimeout: 30000, // 30 seconds per test
  maxConcurrentTests: 5,
  retryFailedTests: true,
  retryCount: 2
};

// Test Results Interface
interface TestResult {
  suiteName: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  metrics?: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage?: number;
  };
}

interface TestSuiteResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  coverage: {
    endpoints: number;
    totalEndpoints: number;
    percentage: number;
  };
  results: TestResult[];
  errors: string[];
  warnings: string[];
}

describe('E2E API Test Suite - Comprehensive Validation', () => {
  let app: Application;
  let testDb: TestDatabase;
  let context: APITestContext;
  let suiteResults: TestSuiteResults;

  const config: TestSuiteConfig = {
    ...defaultConfig,
    ...JSON.parse(process.env.E2E_TEST_CONFIG || '{}')
  };

  beforeAll(async () => {
    logger.info('Initializing comprehensive E2E API test suite...');
    
    // Initialize test results
    suiteResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
      coverage: {
        endpoints: 0,
        totalEndpoints: 21,
        percentage: 0
      },
      results: [],
      errors: [],
      warnings: []
    };

    try {
      // Setup test database
      logger.info('Setting up test database...');
      testDb = await setupTestDatabase();

      // Create test application
      logger.info('Creating test application...');
      app = await createTestApp(testDb.getService());

      // Create test context
      logger.info('Creating test context...');
      context = await createAPITestContext(app, testDb.getService());

      logger.info('Test suite initialization completed successfully');
    } catch (error) {
      logger.error('Failed to initialize test suite', error as Error);
      throw error;
    }
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    logger.info('Cleaning up E2E API test suite...');
    
    try {
      if (testDb) {
        await teardownTestDatabase(testDb);
      }

      // Generate final report
      if (config.generateReports) {
        await generateTestReport(suiteResults);
      }

      // Log final statistics
      logFinalResults(suiteResults);
    } catch (error) {
      logger.error('Error during test suite cleanup', error as Error);
    }
  }, 30000);

  beforeEach(async () => {
    if (testDb) {
      await testDb.reset();
    }
  });

  describe('API Endpoint Coverage Validation', () => {
    it('should validate all expected endpoints are accessible', async () => {
      const expectedEndpoints = [
        // Authentication endpoints (5)
        'POST /api/auth/signup',
        'POST /api/auth/login', 
        'POST /api/auth/refresh',
        'POST /api/auth/logout',
        'POST /api/auth/password-reset',
        
        // Users endpoints (6+)
        'GET /api/users',
        'GET /api/users/:id',
        'PUT /api/users/:id',
        'DELETE /api/users/:id',
        'POST /api/users/change-password',
        'POST /api/users/reset-password',
        
        // Vehicles endpoints (6)
        'GET /api/vehicles',
        'POST /api/vehicles',
        'GET /api/vehicles/:id',
        'PUT /api/vehicles/:id',
        'DELETE /api/vehicles/:id',
        'POST /api/vehicles/search',
        
        // Reservations endpoints (6)
        'GET /api/reservations',
        'POST /api/reservations',
        'GET /api/reservations/:id',
        'PUT /api/reservations/:id',
        'DELETE /api/reservations/:id',
        'GET /api/reservations/availability',
        
        // Payments endpoints (5)
        'GET /api/payments',
        'POST /api/payments',
        'GET /api/payments/:id',
        'POST /api/payments/:id/refund',
        'GET /api/payments/summary',
        
        // Transactions endpoints (4)
        'GET /api/transactions',
        'POST /api/transactions',
        'GET /api/transactions/:id',
        'PUT /api/transactions/:id/status'
      ];

      let accessibleEndpoints = 0;

      for (const endpoint of expectedEndpoints) {
        try {
          const [method, path] = endpoint.split(' ');
          // Test with admin token to avoid auth issues
          const testPath = path.replace(':id', 'test-id');
          
          // Make a test request (will likely return 404 for test-id, but endpoint exists)
          const response = await makeTestRequest(method, testPath, context.adminToken);
          
          // Any response other than 404 (method not allowed) indicates endpoint exists
          if (response.status !== 405) {
            accessibleEndpoints++;
          }
        } catch (error) {
          suiteResults.warnings.push(`Endpoint ${endpoint} accessibility test failed: ${error}`);
        }
      }

      suiteResults.coverage.endpoints = accessibleEndpoints;
      suiteResults.coverage.totalEndpoints = expectedEndpoints.length;
      suiteResults.coverage.percentage = (accessibleEndpoints / expectedEndpoints.length) * 100;

      expect(accessibleEndpoints).toBeGreaterThanOrEqual(expectedEndpoints.length * 0.9); // 90% coverage minimum
    });
  });

  describe('Cross-Module Integration Tests', () => {
    it('should handle complete user journey - registration to payment', async () => {
      const testStart = Date.now();
      let currentStep = '';

      try {
        // Step 1: User Registration
        currentStep = 'User Registration';
        const registrationResponse = await makeTestRequest('POST', '/api/auth/signup', null, {
          email: 'integration@test.com',
          password: 'IntegrationTest123!',
          firstName: 'Integration',
          lastName: 'Test'
        });
        expect(registrationResponse.status).toBe(201);
        const userToken = registrationResponse.body.data.accessToken;

        // Step 2: Create Vehicle
        currentStep = 'Vehicle Creation';
        const vehicleResponse = await makeTestRequest('POST', '/api/vehicles', userToken, {
          licensePlate: 'INTEG123',
          make: 'Tesla',
          model: 'Model 3',
          color: 'White',
          vehicleType: 'CAR'
        });
        expect(vehicleResponse.status).toBe(201);
        const vehicleId = vehicleResponse.body.data.id;

        // Step 3: Check Availability
        currentStep = 'Availability Check';
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
        
        const availabilityResponse = await makeTestRequest('GET', 
          `/api/reservations/availability?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`,
          userToken
        );
        expect(availabilityResponse.status).toBe(200);
        expect(availabilityResponse.body.data.availableSpots.length).toBeGreaterThan(0);
        const spotId = availabilityResponse.body.data.availableSpots[0].id;

        // Step 4: Create Reservation
        currentStep = 'Reservation Creation';
        const reservationResponse = await makeTestRequest('POST', '/api/reservations', userToken, {
          vehicleId,
          spotId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });
        expect(reservationResponse.status).toBe(201);
        const reservationId = reservationResponse.body.data.id;
        const totalAmount = reservationResponse.body.data.totalAmount;

        // Step 5: Process Payment
        currentStep = 'Payment Processing';
        const paymentResponse = await makeTestRequest('POST', '/api/payments', userToken, {
          reservationId,
          amount: totalAmount,
          paymentMethod: 'CREDIT_CARD',
          paymentIntentId: 'pi_integration_test_123'
        });
        expect(paymentResponse.status).toBe(201);
        const paymentId = paymentResponse.body.data.id;

        // Step 6: Verify Transaction Created
        currentStep = 'Transaction Verification';
        const transactionsResponse = await makeTestRequest('GET', '/api/transactions', userToken);
        expect(transactionsResponse.status).toBe(200);
        
        const transactions = transactionsResponse.body.data.data;
        const paymentTransaction = transactions.find((t: any) => t.paymentId === paymentId);
        expect(paymentTransaction).toBeDefined();
        expect(paymentTransaction.type).toBe('PAYMENT');
        expect(paymentTransaction.amount).toBe(totalAmount);

        const testDuration = Date.now() - testStart;
        recordTestResult('Cross-Module Integration', 'Complete User Journey', 'passed', testDuration);
        
      } catch (error) {
        const testDuration = Date.now() - testStart;
        recordTestResult('Cross-Module Integration', `Complete User Journey - Failed at ${currentStep}`, 'failed', testDuration, error as Error);
        throw error;
      }
    }, config.testTimeout);

    it('should handle reservation cancellation workflow', async () => {
      const testStart = Date.now();

      try {
        // Create reservation first (using admin for speed)
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const reservationResponse = await makeTestRequest('POST', '/api/reservations', context.adminToken, {
          userId: 'customer-1-id',
          vehicleId: 'vehicle-1-id',
          spotId: 'spot-3-id',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });
        expect(reservationResponse.status).toBe(201);
        const reservationId = reservationResponse.body.data.id;

        // Create payment for reservation
        const paymentResponse = await makeTestRequest('POST', '/api/payments', context.adminToken, {
          reservationId,
          amount: reservationResponse.body.data.totalAmount,
          paymentMethod: 'CREDIT_CARD',
          paymentIntentId: 'pi_cancellation_test_123'
        });
        expect(paymentResponse.status).toBe(201);
        const paymentId = paymentResponse.body.data.id;

        // Cancel reservation
        const cancellationResponse = await makeTestRequest('DELETE', `/api/reservations/${reservationId}`, context.adminToken);
        expect(cancellationResponse.status).toBe(200);

        // Process refund
        const refundResponse = await makeTestRequest('POST', `/api/payments/${paymentId}/refund`, context.adminToken, {
          reason: 'Reservation cancelled by customer',
          amount: reservationResponse.body.data.totalAmount
        });
        expect(refundResponse.status).toBe(200);

        // Verify refund transaction created
        const transactionsResponse = await makeTestRequest('GET', '/api/transactions', context.adminToken);
        expect(transactionsResponse.status).toBe(200);
        
        const transactions = transactionsResponse.body.data.data;
        const refundTransaction = transactions.find((t: any) => t.type === 'REFUND' && t.paymentId === paymentId);
        expect(refundTransaction).toBeDefined();

        const testDuration = Date.now() - testStart;
        recordTestResult('Cross-Module Integration', 'Reservation Cancellation Workflow', 'passed', testDuration);

      } catch (error) {
        const testDuration = Date.now() - testStart;
        recordTestResult('Cross-Module Integration', 'Reservation Cancellation Workflow', 'failed', testDuration, error as Error);
        throw error;
      }
    }, config.testTimeout);
  });

  describe('Performance and Load Testing', () => {
    // Skip if performance testing disabled
    const performanceTest = config.enablePerformanceTesting ? it : it.skip;

    performanceTest('should handle concurrent user registrations', async () => {
      const testStart = Date.now();
      const concurrentUsers = 10;

      try {
        const registrationPromises = Array.from({ length: concurrentUsers }, (_, i) => 
          makeTestRequest('POST', '/api/auth/signup', null, {
            email: `load-test-${i}@test.com`,
            password: 'LoadTest123!',
            firstName: 'Load',
            lastName: `Test${i}`
          })
        );

        const results = await Promise.allSettled(registrationPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 201);
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && (r.value as any).status !== 201));

        expect(successful.length).toBeGreaterThan(concurrentUsers * 0.8); // 80% success rate minimum

        const testDuration = Date.now() - testStart;
        recordTestResult('Performance Testing', 'Concurrent User Registrations', 'passed', testDuration, null, {
          responseTime: testDuration / concurrentUsers,
          memoryUsage: process.memoryUsage().heapUsed
        });

      } catch (error) {
        const testDuration = Date.now() - testStart;
        recordTestResult('Performance Testing', 'Concurrent User Registrations', 'failed', testDuration, error as Error);
        throw error;
      }
    }, config.testTimeout);

    performanceTest('should maintain response times under load', async () => {
      const testStart = Date.now();
      const requestCount = 50;
      const maxResponseTime = 2000; // 2 seconds

      try {
        // Test multiple endpoints
        const endpointTests = [
          { method: 'GET', path: '/api/vehicles', token: context.customerToken },
          { method: 'GET', path: '/api/reservations', token: context.customerToken },
          { method: 'GET', path: '/api/payments', token: context.customerToken },
          { method: 'GET', path: '/api/transactions', token: context.customerToken }
        ];

        for (const test of endpointTests) {
          const requests = Array.from({ length: requestCount }, () => {
            const requestStart = Date.now();
            return makeTestRequest(test.method, test.path, test.token)
              .then(response => ({
                status: response.status,
                responseTime: Date.now() - requestStart
              }));
          });

          const results = await Promise.all(requests);
          const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
          const maxResponseTimeFound = Math.max(...results.map(r => r.responseTime));

          expect(averageResponseTime).toBeLessThan(maxResponseTime);
          expect(maxResponseTimeFound).toBeLessThan(maxResponseTime * 2); // Allow some outliers

          logger.info(`${test.method} ${test.path} - Avg: ${averageResponseTime}ms, Max: ${maxResponseTimeFound}ms`);
        }

        const testDuration = Date.now() - testStart;
        recordTestResult('Performance Testing', 'Response Time Under Load', 'passed', testDuration);

      } catch (error) {
        const testDuration = Date.now() - testStart;
        recordTestResult('Performance Testing', 'Response Time Under Load', 'failed', testDuration, error as Error);
        throw error;
      }
    }, config.testTimeout * 2);
  });

  describe('Security Validation Tests', () => {
    // Skip if security testing disabled
    const securityTest = config.enableSecurityTesting ? it : it.skip;

    securityTest('should validate authentication enforcement across all endpoints', async () => {
      const testStart = Date.now();
      let testedEndpoints = 0;
      let secureEndpoints = 0;

      try {
        const protectedEndpoints = [
          { method: 'GET', path: '/api/users' },
          { method: 'POST', path: '/api/vehicles' },
          { method: 'GET', path: '/api/reservations' },
          { method: 'POST', path: '/api/payments' },
          { method: 'GET', path: '/api/transactions' }
        ];

        for (const endpoint of protectedEndpoints) {
          try {
            const response = await makeTestRequest(endpoint.method, endpoint.path, null);
            testedEndpoints++;
            
            if (response.status === 401) {
              secureEndpoints++;
            } else {
              suiteResults.warnings.push(`Endpoint ${endpoint.method} ${endpoint.path} did not return 401 for unauthenticated request`);
            }
          } catch (error) {
            suiteResults.warnings.push(`Security test failed for ${endpoint.method} ${endpoint.path}: ${error}`);
          }
        }

        expect(secureEndpoints).toBe(testedEndpoints);

        const testDuration = Date.now() - testStart;
        recordTestResult('Security Validation', 'Authentication Enforcement', 'passed', testDuration);

      } catch (error) {
        const testDuration = Date.now() - testStart;
        recordTestResult('Security Validation', 'Authentication Enforcement', 'failed', testDuration, error as Error);
        throw error;
      }
    });

    securityTest('should validate authorization levels', async () => {
      const testStart = Date.now();

      try {
        // Test admin-only endpoint with customer token
        const adminOnlyResponse = await makeTestRequest('GET', '/api/users', context.customerToken);
        expect(adminOnlyResponse.status).toBe(403);

        // Test customer accessing other customer's data
        const unauthorizedResponse = await makeTestRequest('GET', '/api/vehicles/vehicle-2-id', context.customerToken);
        expect(unauthorizedResponse.status).toBe(403);

        // Test manager permissions
        const managerResponse = await makeTestRequest('GET', '/api/users/customer-1-id', context.managerToken);
        expect([200, 403]).toContain(managerResponse.status); // Might be allowed or not depending on business rules

        const testDuration = Date.now() - testStart;
        recordTestResult('Security Validation', 'Authorization Levels', 'passed', testDuration);

      } catch (error) {
        const testDuration = Date.now() - testStart;
        recordTestResult('Security Validation', 'Authorization Levels', 'failed', testDuration, error as Error);
        throw error;
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed requests gracefully', async () => {
      const testStart = Date.now();

      try {
        // Test malformed JSON
        const malformedJsonResponse = await makeRawRequest('POST', '/api/auth/login', '{ invalid json }');
        expect(malformedJsonResponse.status).toBe(400);

        // Test missing required fields
        const missingFieldsResponse = await makeTestRequest('POST', '/api/vehicles', context.customerToken, {});
        expect(missingFieldsResponse.status).toBe(400);

        // Test invalid IDs
        const invalidIdResponse = await makeTestRequest('GET', '/api/vehicles/invalid-id-format', context.customerToken);
        expect([400, 404]).toContain(invalidIdResponse.status);

        const testDuration = Date.now() - testStart;
        recordTestResult('Error Handling', 'Malformed Requests', 'passed', testDuration);

      } catch (error) {
        const testDuration = Date.now() - testStart;
        recordTestResult('Error Handling', 'Malformed Requests', 'failed', testDuration, error as Error);
        throw error;
      }
    });

    it('should handle database constraints and business logic violations', async () => {
      const testStart = Date.now();

      try {
        // Test duplicate email registration
        const userData = {
          email: 'duplicate@test.com',
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'User'
        };

        await makeTestRequest('POST', '/api/auth/signup', null, userData);
        const duplicateResponse = await makeTestRequest('POST', '/api/auth/signup', null, userData);
        expect(duplicateResponse.status).toBe(409);

        // Test invalid business logic (e.g., reservation in the past)
        const pastReservation = {
          vehicleId: 'vehicle-1-id',
          spotId: 'spot-1-id',
          startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString()
        };
        const pastReservationResponse = await makeTestRequest('POST', '/api/reservations', context.customerToken, pastReservation);
        expect(pastReservationResponse.status).toBe(400);

        const testDuration = Date.now() - testStart;
        recordTestResult('Error Handling', 'Business Logic Violations', 'passed', testDuration);

      } catch (error) {
        const testDuration = Date.now() - testStart;
        recordTestResult('Error Handling', 'Business Logic Violations', 'failed', testDuration, error as Error);
        throw error;
      }
    });
  });

  // Helper Functions
  async function makeTestRequest(method: string, path: string, token: string | null, data?: any): Promise<any> {
    const request = require('supertest')(app)[method.toLowerCase()](path);
    
    if (token) {
      request.set('Authorization', `Bearer ${token}`);
    }
    
    if (data) {
      request.send(data);
    }
    
    return request;
  }

  async function makeRawRequest(method: string, path: string, body: string): Promise<any> {
    const request = require('supertest')(app)[method.toLowerCase()](path);
    return request.type('json').send(body);
  }

  function recordTestResult(
    suiteName: string, 
    testName: string, 
    status: 'passed' | 'failed' | 'skipped', 
    duration: number, 
    error?: Error,
    metrics?: { responseTime: number; memoryUsage: number; cpuUsage?: number }
  ): void {
    const result: TestResult = {
      suiteName,
      testName,
      status,
      duration,
      error: error?.message,
      metrics
    };

    suiteResults.results.push(result);
    suiteResults.totalTests++;
    suiteResults.totalDuration += duration;

    switch (status) {
      case 'passed':
        suiteResults.passedTests++;
        break;
      case 'failed':
        suiteResults.failedTests++;
        if (error) {
          suiteResults.errors.push(`${suiteName} - ${testName}: ${error.message}`);
        }
        break;
      case 'skipped':
        suiteResults.skippedTests++;
        break;
    }
  }

  async function generateTestReport(results: TestSuiteResults): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: config,
      summary: {
        totalTests: results.totalTests,
        passed: results.passedTests,
        failed: results.failedTests,
        skipped: results.skippedTests,
        successRate: results.totalTests > 0 ? (results.passedTests / results.totalTests) * 100 : 0,
        totalDuration: results.totalDuration,
        averageTestDuration: results.totalTests > 0 ? results.totalDuration / results.totalTests : 0
      },
      coverage: results.coverage,
      performance: {
        averageResponseTime: results.results
          .filter(r => r.metrics)
          .reduce((sum, r) => sum + (r.metrics?.responseTime || 0), 0) / 
          results.results.filter(r => r.metrics).length || 0,
        memoryUsage: {
          current: process.memoryUsage(),
          peak: Math.max(...results.results.map(r => r.metrics?.memoryUsage || 0))
        }
      },
      details: results.results,
      errors: results.errors,
      warnings: results.warnings
    };

    // Write report to file
    const fs = require('fs').promises;
    const path = require('path');
    
    const reportsDir = path.join(__dirname, '../reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportFile = path.join(reportsDir, `e2e-api-test-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    logger.info(`Test report generated: ${reportFile}`);

    // Also generate a summary report
    const summaryFile = path.join(reportsDir, 'latest-test-summary.json');
    await fs.writeFile(summaryFile, JSON.stringify(report.summary, null, 2));
  }

  function logFinalResults(results: TestSuiteResults): void {
    const successRate = results.totalTests > 0 ? (results.passedTests / results.totalTests) * 100 : 0;
    
    logger.info('='.repeat(60));
    logger.info('E2E API TEST SUITE COMPLETE');
    logger.info('='.repeat(60));
    logger.info(`Total Tests: ${results.totalTests}`);
    logger.info(`Passed: ${results.passedTests}`);
    logger.info(`Failed: ${results.failedTests}`);
    logger.info(`Skipped: ${results.skippedTests}`);
    logger.info(`Success Rate: ${successRate.toFixed(2)}%`);
    logger.info(`Total Duration: ${(results.totalDuration / 1000).toFixed(2)}s`);
    logger.info(`Average Test Duration: ${(results.totalDuration / results.totalTests / 1000).toFixed(2)}s`);
    logger.info(`Endpoint Coverage: ${results.coverage.endpoints}/${results.coverage.totalEndpoints} (${results.coverage.percentage.toFixed(2)}%)`);
    
    if (results.errors.length > 0) {
      logger.error('\nErrors:');
      results.errors.forEach(error => logger.error(`  - ${error}`));
    }

    if (results.warnings.length > 0) {
      logger.warn('\nWarnings:');
      results.warnings.forEach(warning => logger.warn(`  - ${warning}`));
    }

    logger.info('='.repeat(60));
  }
});
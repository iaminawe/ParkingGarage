/**
 * Comprehensive Workflow Integration Test Suite
 * 
 * Master test suite that runs all workflow integration tests with comprehensive data seeding
 */

const request = require('supertest');
const { createMockApp } = require('../../helpers/mockApp');
const TestDataSeeder = require('./test-data-seeder');

describe('Comprehensive Workflow Integration Test Suite', () => {
  let app;
  let api;
  let dataSeeder;
  let adminToken;

  beforeAll(async () => {
    app = createMockApp();
    api = app.locals.api;
    dataSeeder = new TestDataSeeder(app, api);

    // Seed comprehensive test dataset
    const seededData = await dataSeeder.seedComprehensiveDataset();
    
    console.log('Seeded Data Summary:', dataSeeder.getSummary());

    // Get admin token for test coordination
    const adminLoginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: 'admin@parkinggarage.com',
        password: 'AdminSecure123!'
      })
      .expect(200);

    adminToken = adminLoginResponse.body.token;
  }, 120000); // Extended timeout for data seeding

  afterAll(async () => {
    // Clean up all seeded data
    await dataSeeder.clearAll();
  }, 30000);

  describe('1. Cross-Workflow Integration Tests', () => {
    test('should handle complete customer journey: registration → parking → payment → loyalty', async () => {
      // Step 1: New customer registration
      const customerData = {
        email: `journey.test.${Date.now()}@example.com`,
        password: 'JourneyTest123!',
        firstName: 'Journey',
        lastName: 'Tester',
        phone: '+1234567890',
        preferences: {
          notifications: true,
          emailMarketing: true
        }
      };

      const registrationResponse = await request(app)
        .post('/api/users/register')
        .send(customerData)
        .expect(201);

      expect(registrationResponse.body.id).toBeTruthy();
      const customerId = registrationResponse.body.id;

      // Step 2: Email verification
      const verificationResponse = await request(app)
        .post('/api/users/verify-email')
        .send({
          token: `journey-verify-${Date.now()}`,
          email: customerData.email
        })
        .expect(200);

      expect(verificationResponse.body.message).toBe('Email verified successfully');

      // Step 3: First login
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: customerData.email,
          password: customerData.password
        })
        .expect(200);

      const customerToken = loginResponse.body.token;
      expect(customerToken).toBeTruthy();

      // Step 4: First parking session (check-in)
      const vehicleData = {
        licensePlate: `JOURNEY-${Date.now().toString().slice(-6)}`,
        vehicleType: 'standard',
        driverName: `${customerData.firstName} ${customerData.lastName}`
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(vehicleData)
        .expect(201);

      expect(checkinResponse.body.ticketId).toBeTruthy();
      const ticketId = checkinResponse.body.ticketId;

      // Verify welcome notifications were sent
      const notificationsResponse = await request(app)
        .get('/api/notifications/history')
        .set('Authorization', `Bearer ${customerToken}`)
        .query({ ticketId })
        .expect(200);

      expect(notificationsResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'welcome_checkin',
            status: 'sent'
          })
        ])
      );

      // Step 5: Simulate parking duration
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 6: Payment processing
      const costCalculationResponse = await request(app)
        .post('/api/payments/calculate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ ticketId })
        .expect(200);

      const totalCost = costCalculationResponse.body.totalCost;
      expect(totalCost).toBeGreaterThan(0);

      const paymentResponse = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          ticketId,
          amount: totalCost,
          paymentMethod: 'credit_card',
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123'
        })
        .expect(200);

      expect(paymentResponse.body.status).toBe('completed');
      const transactionId = paymentResponse.body.transactionId;

      // Step 7: Checkout
      const checkoutResponse = await request(app)
        .post('/api/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          licensePlate: vehicleData.licensePlate,
          paymentTransactionId: transactionId
        })
        .expect(200);

      expect(checkoutResponse.body.status).toBe('completed');

      // Step 8: Verify customer profile updates
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(profileResponse.body.parkingSessions).toBe(1);
      expect(profileResponse.body.totalSpent).toBe(totalCost);
      expect(profileResponse.body.loyaltyPoints).toBeGreaterThan(0);

      // Step 9: Check loyalty program eligibility
      const loyaltyResponse = await request(app)
        .get('/api/loyalty/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(loyaltyResponse.body.currentTier).toBe('bronze');
      expect(loyaltyResponse.body.nextTierProgress).toBeGreaterThan(0);

      // Step 10: Second parking session with loyalty benefits
      const secondVehicleData = {
        licensePlate: `LOYALTY-${Date.now().toString().slice(-6)}`,
        vehicleType: 'standard'
      };

      const secondCheckinResponse = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(secondVehicleData)
        .expect(201);

      // Should receive loyalty discount
      await new Promise(resolve => setTimeout(resolve, 1000));

      const loyaltyCalcResponse = await request(app)
        .post('/api/payments/calculate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ ticketId: secondCheckinResponse.body.ticketId })
        .expect(200);

      expect(loyaltyCalcResponse.body.discounts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'loyalty',
            description: expect.stringContaining('Bronze member')
          })
        ])
      );

      // Cleanup
      await request(app)
        .post('/api/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ licensePlate: secondVehicleData.licensePlate });
    }, 60000);

    test('should handle complex multi-user scenario with resource contention', async () => {
      // Create multiple users for concurrent operations
      const users = [];
      
      for (let i = 0; i < 5; i++) {
        const userData = {
          email: `concurrent.user${i}@test.com`,
          password: 'ConcurrentTest123!',
          firstName: `User${i}`,
          lastName: 'Concurrent'
        };

        const registerResponse = await request(app)
          .post('/api/users/register')
          .send(userData)
          .expect(201);

        await request(app)
          .post('/api/users/verify-email')
          .send({
            token: `concurrent-verify-${i}`,
            email: userData.email
          });

        const loginResponse = await request(app)
          .post('/api/users/login')
          .send({
            email: userData.email,
            password: userData.password
          })
          .expect(200);

        users.push({
          id: registerResponse.body.id,
          email: userData.email,
          token: loginResponse.body.token,
          licensePlate: `CONC-${i.toString().padStart(3, '0')}`
        });
      }

      // Fill garage to near capacity (leave only 3 spots)
      const fillerVehicles = [];
      for (let i = 0; i < 122; i++) {
        const response = await request(app)
          .post('/api/checkin')
          .send({
            licensePlate: `FILLER-${i.toString().padStart(3, '0')}`,
            vehicleType: 'standard'
          });
        
        if (response.status === 201) {
          fillerVehicles.push(response.body);
        }
      }

      // All users attempt to check in simultaneously (resource contention)
      const concurrentCheckIns = users.map(user =>
        request(app)
          .post('/api/checkin')
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            licensePlate: user.licensePlate,
            vehicleType: 'standard'
          })
      );

      const results = await Promise.allSettled(concurrentCheckIns);

      // Only 3 should succeed (available spots)
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = results.filter(r => r.status === 'fulfilled' && r.value.status !== 201);

      expect(successful.length).toBe(3);
      expect(failed.length).toBe(2);

      // Failed requests should be properly queued or rejected
      failed.forEach(result => {
        if (result.value) {
          expect([503, 429]).toContain(result.value.status); // Service unavailable or rate limited
        }
      });

      // Successful users proceed through payment workflow
      const paymentPromises = successful.map(async (result) => {
        const ticketId = result.value.body.ticketId;
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const costResponse = await request(app)
          .post('/api/payments/calculate')
          .send({ ticketId });
        
        return request(app)
          .post('/api/payments/process')
          .send({
            ticketId,
            amount: costResponse.body.totalCost,
            paymentMethod: 'credit_card',
            cardNumber: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123'
          });
      });

      const paymentResults = await Promise.allSettled(paymentPromises);
      const successfulPayments = paymentResults.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      
      expect(successfulPayments.length).toBe(3);

      // Complete checkout for successful sessions
      const checkoutPromises = successfulPayments.map((result, index) => {
        const user = users[index];
        return request(app)
          .post('/api/checkout')
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            licensePlate: user.licensePlate,
            paymentTransactionId: result.value.body.transactionId
          });
      });

      const checkoutResults = await Promise.allSettled(checkoutPromises);
      const successfulCheckouts = checkoutResults.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      
      expect(successfulCheckouts.length).toBe(3);

      // Cleanup filler vehicles
      for (const vehicle of fillerVehicles) {
        try {
          await request(app)
            .post('/api/checkout')
            .send({ licensePlate: vehicle.licensePlate });
        } catch (error) {
          // Some may already be cleaned up
        }
      }
    }, 90000);

    test('should maintain data consistency during system stress', async () => {
      // Record initial system state
      const initialStateResponse = await request(app)
        .get('/api/admin/system/state-snapshot')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const initialState = {
        totalSpots: initialStateResponse.body.totalSpots,
        occupiedSpots: initialStateResponse.body.occupiedSpots,
        activeUsers: initialStateResponse.body.activeUsers,
        totalRevenue: initialStateResponse.body.totalRevenue
      };

      // Create stress load with mixed operations
      const stressOperations = [];
      
      // Multiple check-ins
      for (let i = 0; i < 20; i++) {
        stressOperations.push(
          request(app)
            .post('/api/checkin')
            .send({
              licensePlate: `STRESS-${i}`,
              vehicleType: ['standard', 'compact'][i % 2]
            })
        );
      }

      // Multiple user registrations
      for (let i = 0; i < 10; i++) {
        stressOperations.push(
          request(app)
            .post('/api/users/register')
            .send({
              email: `stress${i}@test.com`,
              password: 'StressTest123!',
              firstName: `Stress${i}`,
              lastName: 'User'
            })
        );
      }

      // Multiple spot status queries
      for (let i = 0; i < 15; i++) {
        stressOperations.push(
          request(app).get('/api/spots?status=available')
        );
      }

      // Admin operations
      for (let i = 0; i < 5; i++) {
        stressOperations.push(
          request(app)
            .get('/api/admin/reports/real-time')
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }

      // Execute all operations concurrently
      const stressResults = await Promise.allSettled(stressOperations);

      // Analyze stress test results
      const successful = stressResults.filter(r => r.status === 'fulfilled' && r.value.status < 400);
      const errors = stressResults.filter(r => r.status === 'rejected' || r.value.status >= 400);

      console.log(`Stress Test Results:
        - Total operations: ${stressOperations.length}
        - Successful: ${successful.length}
        - Errors: ${errors.length}
        - Success rate: ${((successful.length / stressOperations.length) * 100).toFixed(2)}%`);

      // Should maintain reasonable success rate even under stress
      expect(successful.length / stressOperations.length).toBeGreaterThan(0.8); // 80% minimum

      // Verify system consistency after stress
      const finalStateResponse = await request(app)
        .get('/api/admin/system/state-snapshot')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Data integrity checks
      expect(finalStateResponse.body.totalSpots).toBe(initialState.totalSpots);
      expect(finalStateResponse.body.occupiedSpots).toBeGreaterThanOrEqual(initialState.occupiedSpots);
      expect(finalStateResponse.body.totalRevenue).toBeGreaterThanOrEqual(initialState.totalRevenue);

      // Check for data corruption
      const integrityCheckResponse = await request(app)
        .post('/api/admin/system/integrity-check')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(integrityCheckResponse.body.corruptedRecords).toBe(0);
      expect(integrityCheckResponse.body.orphanedSessions).toBe(0);
      expect(integrityCheckResponse.body.spotInconsistencies).toBe(0);

      // Cleanup stress test data
      const checkinSuccesses = stressResults.filter((r, i) => 
        i < 20 && r.status === 'fulfilled' && r.value.status === 201
      );

      for (const success of checkinSuccesses) {
        try {
          await request(app)
            .post('/api/checkout')
            .send({ licensePlate: success.value.body.licensePlate });
        } catch (error) {
          // May already be cleaned up
        }
      }
    }, 120000);
  });

  describe('2. Performance and Scalability Validation', () => {
    test('should maintain performance SLAs under realistic load', async () => {
      const performanceMetrics = {
        checkIn: [],
        spotQuery: [],
        paymentCalculation: [],
        userProfile: []
      };

      // Simulate realistic user behavior patterns
      for (let i = 0; i < 50; i++) {
        // Check-in performance
        const checkinStart = Date.now();
        const checkinResponse = await request(app)
          .post('/api/checkin')
          .send({
            licensePlate: `PERF-${i}`,
            vehicleType: 'standard'
          });
        
        if (checkinResponse.status === 201) {
          performanceMetrics.checkIn.push(Date.now() - checkinStart);
        }

        // Spot query performance
        const spotQueryStart = Date.now();
        await request(app).get('/api/spots?status=available');
        performanceMetrics.spotQuery.push(Date.now() - spotQueryStart);

        // Small delay to simulate realistic usage
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Performance analysis
      const avgCheckInTime = performanceMetrics.checkIn.reduce((a, b) => a + b, 0) / performanceMetrics.checkIn.length;
      const avgSpotQueryTime = performanceMetrics.spotQuery.reduce((a, b) => a + b, 0) / performanceMetrics.spotQuery.length;

      console.log(`Performance Metrics:
        - Average check-in time: ${avgCheckInTime.toFixed(2)}ms
        - Average spot query time: ${avgSpotQueryTime.toFixed(2)}ms
        - Check-in success rate: ${(performanceMetrics.checkIn.length / 50 * 100).toFixed(2)}%`);

      // Performance SLA assertions
      expect(avgCheckInTime).toBeLessThan(300); // Under 300ms
      expect(avgSpotQueryTime).toBeLessThan(150); // Under 150ms
      expect(performanceMetrics.checkIn.length / 50).toBeGreaterThan(0.95); // 95% success rate

      // Cleanup performance test data
      for (let i = 0; i < performanceMetrics.checkIn.length; i++) {
        try {
          await request(app)
            .post('/api/checkout')
            .send({ licensePlate: `PERF-${i}` });
        } catch (error) {
          // May not have checked in successfully
        }
      }
    }, 60000);

    test('should handle graceful degradation under extreme load', async () => {
      // Create extreme load scenario
      const extremeLoad = [];
      
      // 200 concurrent check-in attempts
      for (let i = 0; i < 200; i++) {
        extremeLoad.push(
          request(app)
            .post('/api/checkin')
            .send({
              licensePlate: `EXTREME-${i}`,
              vehicleType: 'standard'
            })
            .catch(err => ({ error: true, status: err.status || 500 }))
        );
      }

      const extremeResults = await Promise.allSettled(extremeLoad);
      
      // Analyze degradation behavior
      const successful = extremeResults.filter(r => 
        r.status === 'fulfilled' && 
        !r.value.error && 
        r.value.status === 201
      ).length;
      
      const rateLimited = extremeResults.filter(r =>
        r.status === 'fulfilled' &&
        (r.value.status === 429 || r.value.status === 503)
      ).length;
      
      const serverErrors = extremeResults.filter(r =>
        r.status === 'fulfilled' &&
        r.value.status >= 500 &&
        r.value.status !== 503
      ).length;

      console.log(`Extreme Load Test Results:
        - Total requests: 200
        - Successful: ${successful}
        - Rate limited/Unavailable: ${rateLimited}
        - Server errors: ${serverErrors}
        - Graceful degradation: ${((successful + rateLimited) / 200 * 100).toFixed(2)}%`);

      // Should have graceful degradation (rate limiting instead of server errors)
      expect(serverErrors).toBeLessThan(10); // Less than 5% server errors
      expect(successful + rateLimited).toBeGreaterThan(180); // 90% handled gracefully

      // System should still be responsive after extreme load
      const healthCheckResponse = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(healthCheckResponse.body.overall).toMatch(/healthy|degraded/);
      expect(healthCheckResponse.body.overall).not.toBe('critical');

      // Cleanup extreme load test data
      for (let i = 0; i < successful; i++) {
        try {
          await request(app)
            .post('/api/checkout')
            .send({ licensePlate: `EXTREME-${i}` });
        } catch (error) {
          // May not have checked in successfully
        }
      }
    }, 90000);
  });

  describe('3. Business Logic Validation', () => {
    test('should enforce complex business rules across workflows', async () => {
      // Test: Maximum parking duration enforcement
      const vehicleData = {
        licensePlate: `BUSINESS-RULE-1`,
        vehicleType: 'standard'
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      // Simulate exceeding maximum parking duration (24 hours)
      const extendedSessionResponse = await request(app)
        .post(`/api/sessions/${checkinResponse.body.ticketId}/extend`)
        .send({
          extensionHours: 30, // Exceeds 24-hour limit
          reason: 'Extended business trip'
        })
        .expect(400);

      expect(extendedSessionResponse.body.error).toContain('Maximum parking duration');

      // Test: VIP spot access control
      const vipSpotResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'NON-VIP-TEST',
          vehicleType: 'standard',
          preferredSpot: 'F1-A-010' // VIP spot
        })
        .expect(400);

      expect(vipSpotResponse.body.error).toContain('VIP access required');

      // Test: Payment method restrictions
      const paymentResponse = await request(app)
        .post('/api/payments/process')
        .send({
          ticketId: checkinResponse.body.ticketId,
          amount: 100.00, // High amount
          paymentMethod: 'cash' // Should require card for high amounts
        })
        .expect(400);

      expect(paymentResponse.body.error).toContain('payment method not allowed');

      // Test: Concurrent session prevention
      const duplicateCheckinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData) // Same license plate
        .expect(409);

      expect(duplicateCheckinResponse.body.error).toContain('already checked in');

      // Cleanup
      await request(app)
        .post('/api/checkout')
        .send({ licensePlate: vehicleData.licensePlate })
        .expect(200);
    });

    test('should handle complex pricing rules and calculations', async () => {
      const testScenarios = [
        {
          name: 'Peak hours surcharge',
          checkInTime: '2024-01-15T08:00:00Z', // Peak hour
          vehicleType: 'standard',
          duration: 2,
          expectedSurcharge: true
        },
        {
          name: 'Off-peak discount',
          checkInTime: '2024-01-15T14:00:00Z', // Off-peak
          vehicleType: 'standard',
          duration: 3,
          expectedDiscount: true
        },
        {
          name: 'Electric vehicle incentive',
          checkInTime: '2024-01-15T10:00:00Z',
          vehicleType: 'electric',
          duration: 4,
          expectedDiscount: true
        },
        {
          name: 'Oversized vehicle premium',
          checkInTime: '2024-01-15T10:00:00Z',
          vehicleType: 'oversized',
          duration: 2,
          expectedSurcharge: true
        }
      ];

      for (const scenario of testScenarios) {
        const checkinResponse = await request(app)
          .post('/api/checkin')
          .send({
            licensePlate: `PRICING-${scenario.name.replace(/\s+/g, '-').toUpperCase()}`,
            vehicleType: scenario.vehicleType,
            simulatedCheckInTime: scenario.checkInTime
          })
          .expect(201);

        // Simulate parking duration
        await new Promise(resolve => setTimeout(resolve, 100));

        const costResponse = await request(app)
          .post('/api/payments/calculate')
          .send({
            ticketId: checkinResponse.body.ticketId,
            simulatedDuration: scenario.duration
          })
          .expect(200);

        if (scenario.expectedSurcharge) {
          expect(costResponse.body.surcharges.length).toBeGreaterThan(0);
          expect(costResponse.body.totalCost).toBeGreaterThan(costResponse.body.baseCost);
        }

        if (scenario.expectedDiscount) {
          expect(costResponse.body.discounts.length).toBeGreaterThan(0);
        }

        console.log(`Pricing Scenario: ${scenario.name}
          - Base cost: $${costResponse.body.baseCost}
          - Surcharges: $${costResponse.body.surcharges.reduce((sum, s) => sum + s.amount, 0)}
          - Discounts: $${costResponse.body.discounts.reduce((sum, d) => sum + d.amount, 0)}
          - Total cost: $${costResponse.body.totalCost}`);

        // Cleanup
        await request(app)
          .post('/api/checkout')
          .send({ licensePlate: checkinResponse.body.licensePlate });
      }
    });
  });

  describe('4. Integration Test Reporting', () => {
    test('should generate comprehensive test execution report', async () => {
      // Generate test execution report
      const reportResponse = await request(app)
        .post('/api/admin/test-reports/execution-summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          testSuite: 'Comprehensive Workflow Integration',
          executionId: `EXEC-${Date.now()}`,
          includeMetrics: true,
          includePerformanceData: true,
          includeErrorAnalysis: true
        })
        .expect(200);

      expect(reportResponse.body).toMatchObject({
        reportId: expect.any(String),
        executionSummary: {
          totalTests: expect.any(Number),
          passedTests: expect.any(Number),
          failedTests: expect.any(Number),
          skippedTests: expect.any(Number),
          executionTime: expect.any(Number)
        },
        performanceMetrics: {
          averageResponseTime: expect.any(Number),
          peakMemoryUsage: expect.any(Number),
          totalRequests: expect.any(Number),
          errorRate: expect.any(Number)
        },
        coverage: {
          workflows: expect.any(Array),
          endpoints: expect.any(Array),
          businessRules: expect.any(Array)
        }
      });

      console.log('Test Execution Report Generated:', {
        reportId: reportResponse.body.reportId,
        summary: reportResponse.body.executionSummary,
        performance: reportResponse.body.performanceMetrics
      });

      // Verify all critical workflows were tested
      const expectedWorkflows = [
        'user_management',
        'parking_operations',
        'payment_processing',
        'administrative_functions',
        'error_recovery',
        'security_validation'
      ];

      expectedWorkflows.forEach(workflow => {
        expect(reportResponse.body.coverage.workflows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ name: workflow, covered: true })
          ])
        );
      });
    });
  });
});
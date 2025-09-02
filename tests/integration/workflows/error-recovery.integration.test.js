/**
 * Error Recovery Workflow Integration Tests
 * 
 * Tests system resilience and error recovery mechanisms across all workflows
 */

const request = require('supertest');
const { faker } = require('@faker-js/faker');
const { createMockApp } = require('../../helpers/mockApp');

describe('Error Recovery Workflow Integration Tests', () => {
  let app;
  let api;
  let adminToken;

  beforeEach(async () => {
    app = createMockApp();
    api = app.locals.api;

    // Set up admin user for testing recovery mechanisms
    const adminUser = {
      email: 'admin@test.com',
      password: 'AdminPass123!',
      role: 'admin'
    };

    await request(app)
      .post('/api/users/register')
      .send(adminUser)
      .expect(201);

    await request(app)
      .post('/api/users/verify-email')
      .send({ token: 'admin-verify', email: adminUser.email })
      .expect(200);

    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: adminUser.email,
        password: adminUser.password
      })
      .expect(200);

    adminToken = loginResponse.body.token;
  });

  describe('1. Database Connection Failure Recovery', () => {
    test('should handle database disconnection with automatic retry and failover', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard'
      };

      // Normal operation - check in should work
      const normalCheckinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      expect(normalCheckinResponse.body.ticketId).toBeTruthy();

      // Simulate database connection failure
      const dbFailureResponse = await request(app)
        .post('/api/admin/system/simulate-failure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          component: 'database',
          failureType: 'connection_timeout',
          duration: 10000 // 10 seconds
        })
        .expect(200);

      expect(dbFailureResponse.body.message).toBe('Database failure simulated');

      // Operations should fail initially but return graceful errors
      const failedCheckinResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: faker.vehicle.vrm(),
          vehicleType: 'standard'
        })
        .expect(503);

      expect(failedCheckinResponse.body).toMatchObject({
        error: 'Service temporarily unavailable',
        retryAfter: expect.any(Number),
        errorCode: 'DB_CONNECTION_ERROR'
      });

      // Check system health during failure
      const healthResponse = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(healthResponse.body.overall).toBe('degraded');
      expect(healthResponse.body.components.database.status).toBe('unhealthy');
      expect(healthResponse.body.components.database.lastError).toBeTruthy();

      // Wait for automatic recovery (retry mechanism)
      await new Promise(resolve => setTimeout(resolve, 12000));

      // System should recover automatically
      const recoveredHealthResponse = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(recoveredHealthResponse.body.overall).toBe('healthy');
      expect(recoveredHealthResponse.body.components.database.status).toBe('healthy');

      // Operations should work again
      const recoveredCheckinResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: faker.vehicle.vrm(),
          vehicleType: 'standard'
        })
        .expect(201);

      expect(recoveredCheckinResponse.body.ticketId).toBeTruthy();

      // Verify recovery metrics were logged
      const recoveryMetricsResponse = await request(app)
        .get('/api/admin/system/recovery-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          component: 'database',
          startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        })
        .expect(200);

      expect(recoveryMetricsResponse.body.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            component: 'database',
            eventType: 'failure_detected',
            recoveryTime: expect.any(Number)
          })
        ])
      );
    });

    test('should maintain data consistency during partial database failures', async () => {
      // Create multiple parking sessions
      const vehicles = [];
      for (let i = 0; i < 5; i++) {
        const vehicleData = {
          licensePlate: `CONSISTENCY-${i}`,
          vehicleType: 'standard'
        };

        const checkinResponse = await request(app)
          .post('/api/checkin')
          .send(vehicleData)
          .expect(201);

        vehicles.push({
          licensePlate: vehicleData.licensePlate,
          ticketId: checkinResponse.body.ticketId,
          spotId: checkinResponse.body.spot
        });
      }

      // Simulate partial database failure (read-only mode)
      await request(app)
        .post('/api/admin/system/simulate-failure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          component: 'database',
          failureType: 'read_only_mode',
          duration: 5000
        })
        .expect(200);

      // Read operations should work
      const readResponse = await request(app)
        .get('/api/spots')
        .expect(200);

      expect(readResponse.body.spots).toBeInstanceOf(Array);

      // Write operations should be queued or rejected gracefully
      const writeResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'READONLY-TEST',
          vehicleType: 'standard'
        })
        .expect(503);

      expect(writeResponse.body.error).toContain('read-only');

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Verify all original data is intact
      for (const vehicle of vehicles) {
        const vehicleSearchResponse = await request(app)
          .get(`/api/cars/${vehicle.licensePlate}`)
          .expect(200);

        expect(vehicleSearchResponse.body.found).toBe(true);
        expect(vehicleSearchResponse.body.spot).toBe(vehicle.spotId);
      }

      // New operations should work
      const newCheckinResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'POST-RECOVERY',
          vehicleType: 'standard'
        })
        .expect(201);

      expect(newCheckinResponse.body.ticketId).toBeTruthy();

      // Clean up
      for (const vehicle of vehicles) {
        await request(app)
          .post('/api/checkout')
          .send({ licensePlate: vehicle.licensePlate })
          .expect(200);
      }

      await request(app)
        .post('/api/checkout')
        .send({ licensePlate: 'POST-RECOVERY' })
        .expect(200);
    });
  });

  describe('2. Payment Gateway Failure Recovery', () => {
    let parkingSession;

    beforeEach(async () => {
      // Set up parking session for payment testing
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard'
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      parkingSession = {
        licensePlate: vehicleData.licensePlate,
        ticketId: checkinResponse.body.ticketId
      };

      // Wait for parking time
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterEach(async () => {
      // Clean up parking session
      try {
        await request(app)
          .post('/api/checkout')
          .send({ licensePlate: parkingSession.licensePlate });
      } catch (error) {
        // Session may already be cleaned up
      }
    });

    test('should handle payment gateway failures with fallback processing', async () => {
      // Calculate parking cost
      const costResponse = await request(app)
        .post('/api/payments/calculate')
        .send({ 
          ticketId: parkingSession.ticketId,
          licensePlate: parkingSession.licensePlate
        })
        .expect(200);

      const totalAmount = costResponse.body.totalAmount;

      // Initiate payment
      const paymentInitResponse = await request(app)
        .post('/api/payments/initiate')
        .send({
          ticketId: parkingSession.ticketId,
          amount: totalAmount,
          paymentMethod: 'credit_card'
        })
        .expect(201);

      const paymentId = paymentInitResponse.body.paymentId;

      // Simulate payment gateway failure
      await request(app)
        .post('/api/admin/system/simulate-failure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          component: 'payment_gateway',
          failureType: 'service_unavailable',
          duration: 8000
        })
        .expect(200);

      // Payment processing should fail with appropriate response
      const failedPaymentResponse = await request(app)
        .post(`/api/payments/${paymentId}/process`)
        .send({
          number: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123'
        })
        .expect(503);

      expect(failedPaymentResponse.body).toMatchObject({
        status: 'gateway_unavailable',
        error: 'Payment gateway temporarily unavailable',
        retryRecommended: true,
        fallbackOptions: expect.any(Array)
      });

      // System should offer fallback options
      expect(failedPaymentResponse.body.fallbackOptions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: 'cash',
            location: 'Pay at exit booth'
          }),
          expect.objectContaining({
            method: 'mobile_app',
            description: 'Pay through mobile app when service restored'
          })
        ])
      );

      // Process with fallback method (cash)
      const fallbackPaymentResponse = await request(app)
        .post(`/api/payments/${paymentId}/process-fallback`)
        .send({
          fallbackMethod: 'cash',
          amount: totalAmount,
          processedBy: 'booth_operator'
        })
        .expect(200);

      expect(fallbackPaymentResponse.body.status).toBe('completed');
      expect(fallbackPaymentResponse.body.paymentMethod).toBe('cash');
      expect(fallbackPaymentResponse.body.fallbackProcessed).toBe(true);

      // Wait for gateway recovery
      await new Promise(resolve => setTimeout(resolve, 9000));

      // Verify gateway is back online
      const healthResponse = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(healthResponse.body.components.paymentGateway.status).toBe('healthy');

      // Complete checkout with fallback payment
      const checkoutResponse = await request(app)
        .post('/api/checkout')
        .send({ 
          licensePlate: parkingSession.licensePlate,
          paymentTransactionId: fallbackPaymentResponse.body.transactionId
        })
        .expect(200);

      expect(checkoutResponse.body.status).toBe('completed');
      expect(checkoutResponse.body.paymentMethod).toBe('cash');

      parkingSession = null; // Mark as cleaned up
    });

    test('should queue failed transactions for retry when gateway recovers', async () => {
      // Simulate multiple payment attempts during gateway failure
      const paymentAttempts = [];

      // First, fail the gateway
      await request(app)
        .post('/api/admin/system/simulate-failure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          component: 'payment_gateway',
          failureType: 'network_timeout',
          duration: 10000
        })
        .expect(200);

      // Create multiple parking sessions and payment attempts
      for (let i = 0; i < 3; i++) {
        const vehicleData = {
          licensePlate: `QUEUE-TEST-${i}`,
          vehicleType: 'standard'
        };

        const checkinResponse = await request(app)
          .post('/api/checkin')
          .send(vehicleData)
          .expect(201);

        await new Promise(resolve => setTimeout(resolve, 500));

        const costResponse = await request(app)
          .post('/api/payments/calculate')
          .send({ ticketId: checkinResponse.body.ticketId })
          .expect(200);

        const paymentInitResponse = await request(app)
          .post('/api/payments/initiate')
          .send({
            ticketId: checkinResponse.body.ticketId,
            amount: costResponse.body.totalAmount,
            paymentMethod: 'credit_card'
          })
          .expect(201);

        // This should be queued due to gateway failure
        const queuedPaymentResponse = await request(app)
          .post(`/api/payments/${paymentInitResponse.body.paymentId}/process`)
          .send({
            number: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123',
            autoRetry: true
          })
          .expect(202); // Accepted for processing

        expect(queuedPaymentResponse.body.status).toBe('queued');
        expect(queuedPaymentResponse.body.queuePosition).toBeTruthy();

        paymentAttempts.push({
          licensePlate: vehicleData.licensePlate,
          paymentId: paymentInitResponse.body.paymentId,
          ticketId: checkinResponse.body.ticketId
        });
      }

      // Check queue status
      const queueStatusResponse = await request(app)
        .get('/api/admin/payments/queue-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(queueStatusResponse.body.queuedPayments).toBe(3);
      expect(queueStatusResponse.body.estimatedProcessingTime).toBeGreaterThan(0);

      // Wait for gateway recovery
      await new Promise(resolve => setTimeout(resolve, 12000));

      // Check that payments were automatically processed
      for (const attempt of paymentAttempts) {
        const paymentStatusResponse = await request(app)
          .get(`/api/payments/${attempt.paymentId}/status`)
          .expect(200);

        expect(paymentStatusResponse.body.status).toMatch(/processing|completed/);

        // Complete checkout if payment succeeded
        if (paymentStatusResponse.body.status === 'completed') {
          await request(app)
            .post('/api/checkout')
            .send({ 
              licensePlate: attempt.licensePlate,
              paymentTransactionId: paymentStatusResponse.body.transactionId
            })
            .expect(200);
        }
      }

      // Verify queue was cleared
      const finalQueueStatusResponse = await request(app)
        .get('/api/admin/payments/queue-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(finalQueueStatusResponse.body.queuedPayments).toBe(0);
    });
  });

  describe('3. Authentication System Failure Recovery', () => {
    test('should handle authentication service outages with emergency access', async () => {
      // Normal authentication should work first
      const userResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(userResponse.body.email).toBe('admin@test.com');

      // Simulate authentication service failure
      await request(app)
        .post('/api/admin/system/simulate-failure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          component: 'authentication',
          failureType: 'service_unavailable',
          duration: 8000
        })
        .expect(200);

      // Regular token validation should fail
      const failedAuthResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(503);

      expect(failedAuthResponse.body.error).toContain('Authentication service unavailable');

      // Emergency access token should be provided for critical operations
      const emergencyAccessResponse = await request(app)
        .post('/api/auth/emergency-access')
        .send({
          reason: 'System maintenance required during auth outage',
          requestedBy: 'admin@test.com',
          scope: 'system_admin'
        })
        .expect(200);

      expect(emergencyAccessResponse.body.emergencyToken).toBeTruthy();
      expect(emergencyAccessResponse.body.expiresIn).toBeLessThanOrEqual(300); // 5 minutes max

      const emergencyToken = emergencyAccessResponse.body.emergencyToken;

      // Emergency token should allow critical operations
      const emergencyOperationResponse = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${emergencyToken}`)
        .expect(200);

      expect(emergencyOperationResponse.body.overall).toBeTruthy();

      // But should not allow regular user operations
      const restrictedOperationResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${emergencyToken}`)
        .expect(403);

      expect(restrictedOperationResponse.body.error).toContain('Emergency token limited scope');

      // Wait for auth service recovery
      await new Promise(resolve => setTimeout(resolve, 9000));

      // Regular authentication should work again
      const recoveredAuthResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(recoveredAuthResponse.body.email).toBe('admin@test.com');

      // Emergency token should be invalidated
      const invalidEmergencyResponse = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${emergencyToken}`)
        .expect(401);

      expect(invalidEmergencyResponse.body.error).toContain('Emergency access expired');
    });

    test('should maintain session continuity during brief auth service interruptions', async () => {
      // Create user session
      const userTokenResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: 'admin@test.com',
          password: 'AdminPass123!'
        })
        .expect(200);

      const userToken = userTokenResponse.body.token;
      const refreshToken = userTokenResponse.body.refreshToken;

      // Verify session works
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Simulate brief auth service interruption (less than session timeout)
      await request(app)
        .post('/api/admin/system/simulate-failure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          component: 'authentication',
          failureType: 'temporary_unavailable',
          duration: 3000 // 3 seconds
        })
        .expect(200);

      // During interruption, cached sessions should still work
      const cachedSessionResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(cachedSessionResponse.body.email).toBe('admin@test.com');
      expect(cachedSessionResponse.headers['x-session-source']).toBe('cache');

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 4000));

      // After recovery, token refresh should work
      const refreshResponse = await request(app)
        .post('/api/users/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.token).toBeTruthy();
      expect(refreshResponse.body.token).not.toBe(userToken);

      // New token should work
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.token}`)
        .expect(200);
    });
  });

  describe('4. Network and Communication Failure Recovery', () => {
    test('should handle external service communication failures gracefully', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard',
        notificationPreferences: ['email', 'sms']
      };

      // Check in vehicle
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      // Simulate notification service failure
      await request(app)
        .post('/api/admin/system/simulate-failure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          component: 'notification_service',
          failureType: 'network_unreachable',
          duration: 5000
        })
        .expect(200);

      // Check-in should still work, but notifications should be queued
      const notificationResponse = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ticketId: checkinResponse.body.ticketId,
          type: 'parking_reminder',
          message: 'Your parking session will expire in 30 minutes'
        })
        .expect(202); // Accepted but queued

      expect(notificationResponse.body.status).toBe('queued');
      expect(notificationResponse.body.retryScheduled).toBe(true);

      // Check notification queue
      const queueResponse = await request(app)
        .get('/api/admin/notifications/queue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(queueResponse.body.queuedNotifications).toBeGreaterThan(0);

      // Wait for service recovery
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Check that queued notifications were processed
      const processedQueueResponse = await request(app)
        .get('/api/admin/notifications/queue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(processedQueueResponse.body.queuedNotifications).toBe(0);

      // Verify notification was actually sent
      const notificationHistoryResponse = await request(app)
        .get(`/api/notifications/history?ticketId=${checkinResponse.body.ticketId}`)
        .expect(200);

      expect(notificationHistoryResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'parking_reminder',
            status: 'delivered',
            deliveryAttempts: expect.any(Number)
          })
        ])
      );

      // Clean up
      await request(app)
        .post('/api/checkout')
        .send({ licensePlate: vehicleData.licensePlate })
        .expect(200);
    });

    test('should implement circuit breaker pattern for external dependencies', async () => {
      // Configure circuit breaker thresholds
      await request(app)
        .post('/api/admin/system/circuit-breaker/configure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          service: 'email_service',
          failureThreshold: 3,
          resetTimeout: 5000, // 5 seconds
          halfOpenMaxCalls: 2
        })
        .expect(200);

      // Simulate multiple failures to trip circuit breaker
      await request(app)
        .post('/api/admin/system/simulate-failure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          component: 'email_service',
          failureType: 'consistent_failures',
          failureCount: 5
        })
        .expect(200);

      // Attempt operations that would use email service
      for (let i = 0; i < 4; i++) {
        const emailResponse = await request(app)
          .post('/api/notifications/send-email')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            to: 'test@example.com',
            subject: 'Test Email',
            template: 'parking_confirmation'
          });

        if (i < 3) {
          expect(emailResponse.status).toBe(503); // Service fails
        } else {
          expect(emailResponse.status).toBe(429); // Circuit breaker open
          expect(emailResponse.body.error).toContain('Circuit breaker open');
        }
      }

      // Check circuit breaker status
      const circuitStatusResponse = await request(app)
        .get('/api/admin/system/circuit-breaker/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(circuitStatusResponse.body.email_service.state).toBe('open');
      expect(circuitStatusResponse.body.email_service.failureCount).toBeGreaterThanOrEqual(3);

      // Wait for circuit breaker to enter half-open state
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Restore email service
      await request(app)
        .post('/api/admin/system/restore-service')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ component: 'email_service' })
        .expect(200);

      // Circuit breaker should now allow limited requests (half-open)
      const halfOpenResponse = await request(app)
        .post('/api/notifications/send-email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          to: 'test@example.com',
          subject: 'Test Recovery Email',
          template: 'parking_confirmation'
        })
        .expect(200);

      expect(halfOpenResponse.body.status).toBe('sent');

      // After successful calls, circuit should close
      const closedCircuitStatusResponse = await request(app)
        .get('/api/admin/system/circuit-breaker/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(closedCircuitStatusResponse.body.email_service.state).toBe('closed');
    });
  });

  describe('5. Data Corruption and Recovery Scenarios', () => {
    test('should detect and recover from data corruption', async () => {
      // Create test data
      const vehicles = [];
      for (let i = 0; i < 10; i++) {
        const vehicleData = {
          licensePlate: `CORRUPT-${i}`,
          vehicleType: 'standard'
        };

        const checkinResponse = await request(app)
          .post('/api/checkin')
          .send(vehicleData)
          .expect(201);

        vehicles.push({
          licensePlate: vehicleData.licensePlate,
          ticketId: checkinResponse.body.ticketId,
          spotId: checkinResponse.body.spot
        });
      }

      // Simulate data corruption
      await request(app)
        .post('/api/admin/system/simulate-failure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          component: 'data_store',
          failureType: 'data_corruption',
          affectedRecords: 3
        })
        .expect(200);

      // Run data integrity check
      const integrityCheckResponse = await request(app)
        .post('/api/admin/system/data-integrity/check')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(integrityCheckResponse.body.corruptedRecords).toBeGreaterThan(0);
      expect(integrityCheckResponse.body.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: 'restore_from_backup',
            priority: 'high'
          })
        ])
      );

      // Attempt automatic data repair
      const repairResponse = await request(app)
        .post('/api/admin/system/data-integrity/repair')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          strategy: 'auto_repair',
          useBackup: true,
          verifyIntegrity: true
        })
        .expect(200);

      expect(repairResponse.body.repairedRecords).toBeGreaterThan(0);
      expect(repairResponse.body.success).toBe(true);

      // Verify data integrity after repair
      const postRepairCheckResponse = await request(app)
        .post('/api/admin/system/data-integrity/check')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(postRepairCheckResponse.body.corruptedRecords).toBe(0);
      expect(postRepairCheckResponse.body.overall).toBe('healthy');

      // Verify all original vehicles are still accessible
      for (const vehicle of vehicles) {
        const searchResponse = await request(app)
          .get(`/api/cars/${vehicle.licensePlate}`)
          .expect(200);

        expect(searchResponse.body.found).toBe(true);
        expect(searchResponse.body.spot).toBe(vehicle.spotId);
      }

      // Clean up
      for (const vehicle of vehicles) {
        await request(app)
          .post('/api/checkout')
          .send({ licensePlate: vehicle.licensePlate })
          .expect(200);
      }
    });

    test('should maintain transactional integrity during system failures', async () => {
      // Start multiple concurrent transactions
      const concurrentOperations = [];

      for (let i = 0; i < 5; i++) {
        const operation = async () => {
          const vehicleData = {
            licensePlate: `TRANSACTION-${i}`,
            vehicleType: 'standard'
          };

          try {
            // Start transaction
            const transactionResponse = await request(app)
              .post('/api/admin/transactions/begin')
              .set('Authorization', `Bearer ${adminToken}`)
              .send({
                operations: [
                  { type: 'checkin', data: vehicleData },
                  { type: 'update_spot', data: { status: 'occupied' } },
                  { type: 'create_session', data: { vehicleType: 'standard' } }
                ]
              });

            return transactionResponse;
          } catch (error) {
            return { error: error.message };
          }
        };

        concurrentOperations.push(operation());
      }

      // Simulate system failure during transaction processing
      setTimeout(async () => {
        await request(app)
          .post('/api/admin/system/simulate-failure')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            component: 'transaction_manager',
            failureType: 'processing_interruption',
            duration: 2000
          });
      }, 1000);

      // Wait for all operations to complete or fail
      const results = await Promise.allSettled(concurrentOperations);

      // Check transaction status and recovery
      const transactionStatusResponse = await request(app)
        .get('/api/admin/transactions/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(transactionStatusResponse.body).toMatchObject({
        pendingTransactions: expect.any(Number),
        failedTransactions: expect.any(Number),
        completedTransactions: expect.any(Number),
        recoveredTransactions: expect.any(Number)
      });

      // Run transaction recovery
      const recoveryResponse = await request(app)
        .post('/api/admin/transactions/recover')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          strategy: 'rollback_incomplete',
          verifyIntegrity: true
        })
        .expect(200);

      expect(recoveryResponse.body.recovered).toBe(true);

      // Verify system consistency
      const consistencyCheckResponse = await request(app)
        .get('/api/admin/system/consistency-check')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(consistencyCheckResponse.body.consistent).toBe(true);
      expect(consistencyCheckResponse.body.orphanedRecords).toBe(0);
    });
  });

  describe('6. Cascading Failure Prevention', () => {
    test('should prevent cascading failures through isolation and bulkheads', async () => {
      // Set up system bulkheads
      await request(app)
        .post('/api/admin/system/bulkheads/configure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bulkheads: [
            {
              name: 'payment_processing',
              maxConcurrent: 10,
              queue: 100,
              timeout: 30000
            },
            {
              name: 'user_operations',
              maxConcurrent: 50,
              queue: 200,
              timeout: 10000
            },
            {
              name: 'reporting',
              maxConcurrent: 5,
              queue: 50,
              timeout: 60000
            }
          ]
        })
        .expect(200);

      // Simulate high load on payment processing
      const paymentOperations = [];
      for (let i = 0; i < 15; i++) {
        paymentOperations.push(
          request(app)
            .post('/api/payments/calculate')
            .send({
              ticketId: `LOAD-TEST-${i}`,
              amount: 10.00
            })
        );
      }

      // Some should be queued due to bulkhead limits
      const paymentResults = await Promise.allSettled(paymentOperations);
      
      const accepted = paymentResults.filter(r => r.value?.status === 200).length;
      const queued = paymentResults.filter(r => r.value?.status === 429).length;

      expect(accepted).toBeLessThanOrEqual(10); // Bulkhead limit
      expect(queued).toBeGreaterThan(0);

      // Meanwhile, user operations should not be affected
      const userOperationResponse = await request(app)
        .get('/api/spots')
        .expect(200);

      expect(userOperationResponse.body.spots).toBeInstanceOf(Array);

      // Reporting should also work independently
      const reportResponse = await request(app)
        .get('/api/admin/reports/system-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(reportResponse.body.bulkheadStatus).toMatchObject({
        payment_processing: {
          utilization: expect.any(Number),
          queue: expect.any(Number)
        },
        user_operations: {
          utilization: expect.any(Number),
          queue: expect.any(Number)
        }
      });

      // Simulate payment system complete failure
      await request(app)
        .post('/api/admin/system/simulate-failure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          component: 'payment_processing',
          failureType: 'complete_failure',
          duration: 5000
        })
        .expect(200);

      // User operations should still work (isolation)
      const isolatedUserResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'ISOLATED-TEST',
          vehicleType: 'standard'
        })
        .expect(201);

      expect(isolatedUserResponse.body.ticketId).toBeTruthy();

      // Reporting should show the failure but continue working
      const failureReportResponse = await request(app)
        .get('/api/admin/reports/system-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(failureReportResponse.body.componentStatus.payment_processing).toBe('failed');
      expect(failureReportResponse.body.componentStatus.user_operations).toBe('healthy');

      // Clean up
      await request(app)
        .post('/api/checkout')
        .send({ licensePlate: 'ISOLATED-TEST' })
        .expect(200);
    });
  });
});
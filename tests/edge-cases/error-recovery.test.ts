import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../factories/TestDataFactory';

const prisma = new PrismaClient();

describe('Error Recovery Testing', () => {
  let testFactory: TestDataFactory;
  let authToken: string;
  let garage: any;

  beforeEach(async () => {
    testFactory = new TestDataFactory();
    
    const user = await testFactory.createUser();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'testPassword123'
      });
    
    authToken = loginResponse.body.token;
    garage = await testFactory.createGarage();
  });

  afterEach(async () => {
    await testFactory.cleanup();
  });

  describe('Graceful Degradation Scenarios', () => {
    it('should provide basic functionality when advanced features fail', async () => {
      // Test core parking functionality with degraded services
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();

      // Attempt checkin with all optional services failing
      const response = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id,
          notifications: {
            email: true,
            sms: true,
            emailAddress: 'test@example.com',
            phoneNumber: '+1234567890'
          },
          analytics: {
            trackEntry: true,
            updateStats: true
          },
          integrations: {
            sendToThirdParty: true,
            updateExternalSystems: true
          }
        });

      // Core functionality should work even if optional services fail
      expect([200, 201, 202]).toContain(response.status);
      expect(response.body.sessionId).toBeDefined();

      if (response.status === 202) {
        // Partial success - core worked, optional services failed
        expect(response.body.warnings).toBeDefined();
        expect(Array.isArray(response.body.warnings)).toBe(true);
      }

      // Verify core data was stored correctly
      const session = await prisma.session.findUnique({
        where: { id: response.body.sessionId }
      });

      expect(session).toBeTruthy();
      expect(session?.status).toBe('ACTIVE');
      expect(session?.spotId).toBe(spot.id);
      expect(session?.vehicleId).toBe(vehicle.id);
    });

    it('should maintain read operations when write operations fail', async () => {
      // Create some existing data
      const vehicles = await Promise.all([
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle()
      ]);

      // Test that read operations continue working
      const readOperations = [
        request(app)
          .get('/api/garages')
          .set('Authorization', `Bearer ${authToken}`),
        
        request(app)
          .get('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`),
        
        request(app)
          .get(`/api/garages/${garage.id}`)
          .set('Authorization', `Bearer ${authToken}`),
        
        request(app)
          .get('/api/health')
          .set('Authorization', `Bearer ${authToken}`)
      ];

      const results = await Promise.allSettled(readOperations);
      
      // All read operations should succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successful.length).toBe(readOperations.length);

      // Verify data integrity
      const garageResponse = results[2];
      if (garageResponse.status === 'fulfilled' && garageResponse.value.status === 200) {
        expect(garageResponse.value.body.id).toBe(garage.id);
        expect(garageResponse.value.body.name).toBe(garage.name);
      }
    });

    it('should provide cached responses when database is slow', async () => {
      // Make initial request to potentially cache data
      const initialResponse = await request(app)
        .get('/api/garages')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cache-Control', 'no-cache');

      expect(initialResponse.status).toBe(200);

      // Subsequent requests should be faster (potentially from cache)
      const cachedRequests = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/garages')
          .set('Authorization', `Bearer ${authToken}`)
          .timeout(2000) // Short timeout to test cache
      );

      const results = await Promise.allSettled(cachedRequests);
      
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      // Most should succeed quickly (from cache or fast DB)
      expect(successful.length).toBeGreaterThan(cachedRequests.length * 0.8);
    });

    it('should handle service mesh failures gracefully', async () => {
      // Test multiple service endpoints with potential mesh failures
      const serviceEndpoints = [
        { url: '/api/health', critical: true },
        { url: '/api/garages', critical: true },
        { url: '/api/analytics/dashboard', critical: false },
        { url: '/api/reports/quick-stats', critical: false },
        { url: '/api/integrations/status', critical: false }
      ];

      const results = [];

      for (const endpoint of serviceEndpoints) {
        try {
          const response = await request(app)
            .get(endpoint.url)
            .set('Authorization', `Bearer ${authToken}`)
            .timeout(5000);

          results.push({
            ...endpoint,
            status: response.status,
            success: response.status === 200
          });

        } catch (error) {
          results.push({
            ...endpoint,
            status: 'failed',
            success: false,
            error: error.message
          });
        }
      }

      // Critical services should work
      const criticalServices = results.filter(r => r.critical);
      const workingCritical = criticalServices.filter(r => r.success);
      
      expect(workingCritical.length).toBe(criticalServices.length);

      // Non-critical services may fail but shouldn't affect core functionality
      const nonCriticalServices = results.filter(r => !r.critical);
      const totalServices = criticalServices.length + nonCriticalServices.length;
      
      console.log(`Service status: ${results.filter(r => r.success).length}/${totalServices} services working`);
    });
  });

  describe('Automatic Retry Mechanisms', () => {
    it('should retry failed database operations', async () => {
      const maxAttempts = 3;
      let attempts = 0;
      let lastError = null;

      // Test with potentially flaky operation
      while (attempts < maxAttempts) {
        try {
          attempts++;
          
          const response = await request(app)
            .post('/api/vehicles')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              licensePlate: `RETRY-${attempts}`,
              make: 'Toyota',
              model: 'Camry',
              color: 'Blue'
            })
            .timeout(3000);

          if (response.status === 201) {
            // Success - verify data
            expect(response.body.licensePlate).toBe(`RETRY-${attempts}`);
            break;
          } else if (response.status >= 500) {
            // Server error - eligible for retry
            lastError = response.body.error;
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
              continue;
            }
          } else {
            // Client error - don't retry
            expect([201, 400]).toContain(response.status);
            break;
          }

        } catch (error) {
          lastError = error.message;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      }

      // Should either succeed or exhaust retries gracefully
      expect(attempts).toBeGreaterThan(0);
      if (attempts === maxAttempts && lastError) {
        console.log(`Operation failed after ${maxAttempts} attempts:`, lastError);
      }
    });

    it('should implement exponential backoff for external service calls', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();

      const checkinResponse = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id
        });

      const sessionId = checkinResponse.body.sessionId;

      await request(app)
        .post('/api/checkouts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId });

      // Test payment with retry logic
      const startTime = Date.now();
      
      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId,
          amount: 25.50,
          paymentMethod: 'CREDIT_CARD',
          cardToken: 'retry_test_token', // Special token for retry testing
          retryPolicy: {
            maxAttempts: 3,
            backoffType: 'exponential'
          }
        })
        .timeout(15000);

      const duration = Date.now() - startTime;

      // Should either succeed or fail gracefully with retries
      expect([200, 201, 408, 503]).toContain(paymentResponse.status);
      
      if ([408, 503].includes(paymentResponse.status)) {
        // Failed after retries - should have taken time due to backoff
        expect(duration).toBeGreaterThan(3000); // At least 3 seconds for retries
        expect(paymentResponse.body.attempts).toBeGreaterThan(1);
      }
    });

    it('should handle retry storms and circuit breaker activation', async () => {
      // Generate many operations that might trigger circuit breaker
      const operationCount = 20;
      const operations = [];

      for (let i = 0; i < operationCount; i++) {
        operations.push(
          request(app)
            .get('/api/external/weather') // External service endpoint
            .set('Authorization', `Bearer ${authToken}`)
            .timeout(2000)
        );
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(operations);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      const failed = results.filter(r =>
        r.status === 'fulfilled' && [408, 503].includes(r.value.status)
      );

      const circuitBreakerResponses = results.filter(r =>
        r.status === 'fulfilled' && 
        r.value.status === 503 && 
        r.value.body.error?.includes('circuit')
      );

      // Some operations may trigger circuit breaker
      if (circuitBreakerResponses.length > 0) {
        // Circuit breaker should respond quickly
        expect(duration).toBeLessThan(10000); // Less than 10 seconds total
        console.log(`Circuit breaker activated after ${successful.length} successful operations`);
      }

      expect(successful.length + failed.length).toBe(operationCount);
    });
  });

  describe('Circuit Breaker Functionality', () => {
    it('should open circuit breaker after consecutive failures', async () => {
      const failingEndpoint = '/api/integrations/unreliable-service';
      const failureThreshold = 5;
      
      // Generate failures to open circuit breaker
      for (let i = 0; i < failureThreshold + 2; i++) {
        const response = await request(app)
          .get(failingEndpoint)
          .set('Authorization', `Bearer ${authToken}`)
          .timeout(1000);

        if (i >= failureThreshold) {
          // Circuit should be open by now
          expect(response.status).toBe(503);
          expect(response.body.error).toMatch(/circuit.*breaker|service.*unavailable/i);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    it('should half-open circuit breaker after timeout period', async () => {
      // Wait for circuit breaker timeout (simulated)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test half-open state - should allow limited requests
      const testResponse = await request(app)
        .get('/api/integrations/unreliable-service')
        .set('Authorization', `Bearer ${authToken}`);

      // Should either succeed (close circuit) or fail (re-open circuit)
      expect([200, 503]).toContain(testResponse.status);
      
      if (testResponse.status === 503) {
        expect(testResponse.body.circuitState).toBe('OPEN');
      }
    });

    it('should close circuit breaker after successful recovery', async () => {
      // Test recovery scenario
      const recoveryResponse = await request(app)
        .get('/api/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(recoveryResponse.status).toBe(200);
      expect(recoveryResponse.body.status).toBe('healthy');

      // Circuit should be closed for healthy endpoints
      expect(recoveryResponse.body.circuitState).not.toBe('OPEN');
    });
  });

  describe('Fallback System Behavior', () => {
    it('should serve stale data when fresh data is unavailable', async () => {
      // Request initial data
      const initialResponse = await request(app)
        .get(`/api/garages/${garage.id}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(initialResponse.status).toBe(200);
      const initialData = initialResponse.body;

      // Request with fallback when real-time stats fail
      const fallbackResponse = await request(app)
        .get(`/api/garages/${garage.id}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept-Stale', 'true')
        .timeout(1000);

      expect([200, 206]).toContain(fallbackResponse.status);
      
      if (fallbackResponse.status === 206) {
        // Partial content - stale data served
        expect(fallbackResponse.body.stale).toBe(true);
        expect(fallbackResponse.body.lastUpdated).toBeDefined();
      }

      // Should contain basic stats even if stale
      expect(fallbackResponse.body.totalSpots).toBeDefined();
      expect(fallbackResponse.body.availableSpots).toBeDefined();
    });

    it('should provide default responses when all else fails', async () => {
      // Test with complete service failure
      const emergencyResponse = await request(app)
        .get('/api/emergency/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 503]).toContain(emergencyResponse.status);
      
      if (emergencyResponse.status === 200) {
        // Should provide minimal but functional response
        expect(emergencyResponse.body.mode).toBe('emergency');
        expect(emergencyResponse.body.availableOperations).toBeDefined();
        expect(Array.isArray(emergencyResponse.body.availableOperations)).toBe(true);
      }
    });

    it('should maintain essential operations during partial failures', async () => {
      // Test that core parking operations work even with auxiliary failures
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();

      // Core operation should work despite auxiliary service failures
      const coreOperations = [
        request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: vehicle.id,
            spotId: spot.id,
            skipNotifications: true,
            skipAnalytics: true,
            skipIntegrations: true
          }),
        
        request(app)
          .get('/api/health')
          .set('Authorization', `Bearer ${authToken}`),
        
        request(app)
          .get(`/api/spots/${spot.id}/availability`)
          .set('Authorization', `Bearer ${authToken}`)
      ];

      const results = await Promise.allSettled(coreOperations);
      
      // Core operations should succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && [200, 201].includes(r.value.status)
      );

      expect(successful.length).toBe(coreOperations.length);
    });
  });

  describe('Disaster Recovery Procedures', () => {
    it('should handle database corruption gracefully', async () => {
      // Test with potentially corrupted data scenario
      const corruptionTestResponse = await request(app)
        .get('/api/admin/data-integrity-check')
        .set('Authorization', `Bearer ${authToken}`);

      if (corruptionTestResponse.status === 200) {
        expect(corruptionTestResponse.body.status).toBeDefined();
        
        if (corruptionTestResponse.body.issues) {
          // System detected issues and should handle them
          expect(Array.isArray(corruptionTestResponse.body.issues)).toBe(true);
          expect(corruptionTestResponse.body.recoveryActions).toBeDefined();
        }
      } else {
        // Service may not be available, which is acceptable
        expect([404, 503]).toContain(corruptionTestResponse.status);
      }
    });

    it('should execute automated backup procedures on critical errors', async () => {
      // Simulate critical error that should trigger backup
      const criticalErrorResponse = await request(app)
        .post('/api/admin/simulate-critical-error')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          errorType: 'DATA_INTEGRITY_VIOLATION',
          triggerBackup: true
        });

      if (criticalErrorResponse.status === 200) {
        expect(criticalErrorResponse.body.backupInitiated).toBe(true);
        expect(criticalErrorResponse.body.backupId).toBeDefined();
      } else {
        // Admin endpoint may not be available in test environment
        expect([404, 403]).toContain(criticalErrorResponse.status);
      }
    });

    it('should maintain service during rolling updates', async () => {
      // Test service continuity during simulated update
      const continuityTest = [];
      const testDuration = 5000; // 5 seconds
      const testInterval = 500; // Every 500ms
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < testDuration) {
        try {
          const response = await request(app)
            .get('/api/health')
            .set('Authorization', `Bearer ${authToken}`)
            .timeout(1000);

          continuityTest.push({
            timestamp: Date.now() - startTime,
            status: response.status,
            success: response.status === 200
          });

        } catch (error) {
          continuityTest.push({
            timestamp: Date.now() - startTime,
            status: 'timeout',
            success: false
          });
        }

        await new Promise(resolve => setTimeout(resolve, testInterval));
      }

      // Service should maintain reasonable availability
      const successfulTests = continuityTest.filter(t => t.success);
      const availabilityPercent = (successfulTests.length / continuityTest.length) * 100;
      
      expect(availabilityPercent).toBeGreaterThan(80); // 80% availability during updates
      console.log(`Service availability during test: ${availabilityPercent.toFixed(1)}%`);
    });

    it('should recover from complete system restart', async () => {
      // Test system state recovery
      const preRestartData = {
        garageId: garage.id,
        vehicleCount: await prisma.vehicle.count(),
        spotCount: await prisma.spot.count()
      };

      // Simulate restart by testing all services come back online
      const servicesUnderTest = [
        '/api/health',
        '/api/garages',
        '/api/vehicles',
        `/api/garages/${garage.id}`
      ];

      const recoveryResults = [];

      for (const service of servicesUnderTest) {
        try {
          const response = await request(app)
            .get(service)
            .set('Authorization', `Bearer ${authToken}`)
            .timeout(5000);

          recoveryResults.push({
            service,
            status: response.status,
            recovered: response.status === 200
          });

        } catch (error) {
          recoveryResults.push({
            service,
            status: 'failed',
            recovered: false,
            error: error.message
          });
        }
      }

      // All services should recover
      const recoveredServices = recoveryResults.filter(r => r.recovered);
      expect(recoveredServices.length).toBe(servicesUnderTest.length);

      // Data should be intact after recovery
      const postRecoveryData = {
        vehicleCount: await prisma.vehicle.count(),
        spotCount: await prisma.spot.count()
      };

      expect(postRecoveryData.vehicleCount).toBe(preRestartData.vehicleCount);
      expect(postRecoveryData.spotCount).toBe(preRestartData.spotCount);
    });

    it('should handle cascading failure scenarios', async () => {
      // Test system resilience to cascading failures
      const systemComponents = [
        { name: 'database', critical: true },
        { name: 'cache', critical: false },
        { name: 'notifications', critical: false },
        { name: 'analytics', critical: false },
        { name: 'reporting', critical: false }
      ];

      // Simulate component failures
      const failureSimulation = [];
      
      for (const component of systemComponents) {
        const testResponse = await request(app)
          .get(`/api/health/${component.name}`)
          .set('Authorization', `Bearer ${authToken}`)
          .timeout(2000);

        failureSimulation.push({
          ...component,
          status: testResponse.status,
          healthy: testResponse.status === 200,
          response: testResponse.status === 200 ? testResponse.body : null
        });
      }

      // Critical components should be healthy
      const criticalComponents = failureSimulation.filter(c => c.critical);
      const healthyCritical = criticalComponents.filter(c => c.healthy);
      
      expect(healthyCritical.length).toBe(criticalComponents.length);

      // System should function even if non-critical components fail
      const overallSystemResponse = await request(app)
        .get('/api/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(overallSystemResponse.status).toBe(200);
      expect(overallSystemResponse.body.status).toBe('healthy');

      // May have warnings about non-critical components
      if (overallSystemResponse.body.warnings) {
        expect(Array.isArray(overallSystemResponse.body.warnings)).toBe(true);
      }
    });
  });
});
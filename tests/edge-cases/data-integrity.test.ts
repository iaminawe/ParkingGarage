import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../factories/TestDataFactory';

const prisma = new PrismaClient();

describe('Data Integrity Testing', () => {
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

  describe('Database Constraint Violations', () => {
    describe('Primary Key Constraints', () => {
      it('should prevent duplicate primary key insertion', async () => {
        const vehicle = await testFactory.createVehicle();
        
        // Attempt to create another vehicle with same ID
        try {
          await prisma.vehicle.create({
            data: {
              id: vehicle.id,
              licensePlate: 'DUPLICATE',
              make: 'Toyota',
              model: 'Camry',
              color: 'Blue'
            }
          });
          
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error.message).toMatch(/unique.*constraint|duplicate.*key/i);
        }
      });

      it('should handle concurrent primary key generation', async () => {
        // Test UUID collision prevention (extremely unlikely but possible)
        const concurrentCreations = Array(100).fill(null).map(() =>
          testFactory.createVehicle()
        );

        const vehicles = await Promise.allSettled(concurrentCreations);
        
        const successful = vehicles.filter(v => v.status === 'fulfilled');
        expect(successful.length).toBe(100);

        // Verify all IDs are unique
        const ids = successful.map(v => v.value.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(100);
      });
    });

    describe('Unique Constraints', () => {
      it('should enforce unique license plate constraint', async () => {
        const licensePlate = 'UNIQUE123';
        
        // Create first vehicle
        const firstVehicle = await testFactory.createVehicle({ 
          licensePlate 
        });
        expect(firstVehicle.licensePlate).toBe(licensePlate);

        // Attempt to create second vehicle with same license plate
        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            licensePlate,
            make: 'Honda',
            model: 'Civic',
            color: 'Red'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/license.*plate.*already.*exists|unique.*constraint/i);
      });

      it('should enforce unique email constraint for users', async () => {
        const email = 'duplicate@test.com';
        
        // Create first user
        const firstUserResponse = await request(app)
          .post('/api/auth/register')
          .send({
            email,
            password: 'TestPassword123!',
            firstName: 'First',
            lastName: 'User'
          });

        expect(firstUserResponse.status).toBe(201);

        // Attempt to create second user with same email
        const secondUserResponse = await request(app)
          .post('/api/auth/register')
          .send({
            email,
            password: 'AnotherPassword123!',
            firstName: 'Second',
            lastName: 'User'
          });

        expect(secondUserResponse.status).toBe(400);
        expect(secondUserResponse.body.error).toMatch(/email.*already.*exists|unique.*constraint/i);
      });

      it('should handle case sensitivity in unique constraints', async () => {
        const baseEmail = 'case@test.com';
        
        // Create user with lowercase email
        const firstResponse = await request(app)
          .post('/api/auth/register')
          .send({
            email: baseEmail.toLowerCase(),
            password: 'TestPassword123!',
            firstName: 'Lower',
            lastName: 'Case'
          });

        expect(firstResponse.status).toBe(201);

        // Attempt with uppercase email
        const secondResponse = await request(app)
          .post('/api/auth/register')
          .send({
            email: baseEmail.toUpperCase(),
            password: 'TestPassword123!',
            firstName: 'Upper',
            lastName: 'Case'
          });

        // Should be treated as duplicate (case-insensitive)
        expect(secondResponse.status).toBe(400);
        expect(secondResponse.body.error).toMatch(/email.*already.*exists/i);
      });
    });

    describe('Foreign Key Constraints', () => {
      it('should prevent orphaned records - spot without garage', async () => {
        const nonExistentGarageId = 'non-existent-garage-id';
        
        const response = await request(app)
          .post(`/api/garages/${nonExistentGarageId}/spots`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            spotNumber: 1,
            type: 'REGULAR',
            status: 'AVAILABLE'
          });

        expect(response.status).toBe(404);
        expect(response.body.error).toMatch(/garage.*not.*found/i);
      });

      it('should prevent session creation with invalid references', async () => {
        const response = await request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: 'non-existent-vehicle-id',
            spotId: 'non-existent-spot-id'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/vehicle.*not.*found|spot.*not.*found|invalid.*reference/i);
      });

      it('should handle cascade deletion properly', async () => {
        // Create garage with spots and sessions
        const spot = await testFactory.createSpot({ garageId: garage.id });
        const vehicle = await testFactory.createVehicle();
        const session = await testFactory.createSession({
          spotId: spot.id,
          vehicleId: vehicle.id
        });

        // Delete garage - should handle cascade properly
        const deleteResponse = await request(app)
          .delete(`/api/garages/${garage.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(deleteResponse.status).toBe(200);

        // Verify related records are properly handled
        const remainingSpot = await prisma.spot.findUnique({
          where: { id: spot.id }
        });
        expect(remainingSpot).toBeNull();

        const remainingSession = await prisma.session.findUnique({
          where: { id: session.id }
        });
        expect(remainingSession).toBeNull();
      });

      it('should prevent deletion of referenced records', async () => {
        const spot = await testFactory.createSpot({ garageId: garage.id });
        const vehicle = await testFactory.createVehicle();
        const session = await testFactory.createSession({
          spotId: spot.id,
          vehicleId: vehicle.id,
          status: 'ACTIVE'
        });

        // Attempt to delete vehicle with active session
        const deleteResponse = await request(app)
          .delete(`/api/vehicles/${vehicle.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(deleteResponse.status).toBe(400);
        expect(deleteResponse.body.error).toMatch(/cannot.*delete.*active.*session|foreign.*key.*constraint/i);
      });
    });

    describe('Check Constraints', () => {
      it('should enforce positive price constraints', async () => {
        const response = await request(app)
          .put(`/api/garages/${garage.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: garage.name,
            hourlyRate: -5.00 // Negative price
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/hourly.*rate.*positive|price.*constraint/i);
      });

      it('should enforce valid enum values', async () => {
        const response = await request(app)
          .post(`/api/garages/${garage.id}/spots`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            spotNumber: 1,
            type: 'INVALID_TYPE', // Invalid enum value
            status: 'AVAILABLE'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/invalid.*type|enum.*constraint/i);
      });

      it('should enforce date range constraints', async () => {
        const spot = await testFactory.createSpot({ garageId: garage.id });
        const vehicle = await testFactory.createVehicle();
        
        const futureCheckIn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const pastCheckOut = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const response = await request(app)
          .post('/api/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            spotId: spot.id,
            vehicleId: vehicle.id,
            checkInTime: futureCheckIn,
            checkOutTime: pastCheckOut // Checkout before checkin
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/checkout.*after.*checkin|invalid.*date.*range/i);
      });
    });
  });

  describe('Foreign Key Relationship Failures', () => {
    it('should maintain referential integrity during concurrent operations', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicles = await Promise.all([
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle()
      ]);

      // Concurrent session creation and spot deletion
      const operations = [
        // Try to create sessions
        ...vehicles.map(vehicle =>
          request(app)
            .post('/api/checkins')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              vehicleId: vehicle.id,
              spotId: spot.id
            })
        ),
        
        // Try to delete spot
        request(app)
          .delete(`/api/spots/${spot.id}`)
          .set('Authorization', `Bearer ${authToken}`)
      ];

      const results = await Promise.allSettled(operations);
      
      // Verify data consistency
      const finalSpot = await prisma.spot.findUnique({
        where: { id: spot.id },
        include: { sessions: true }
      });

      if (finalSpot) {
        // Spot exists - check sessions are valid
        const activeSessions = await prisma.session.findMany({
          where: { 
            spotId: spot.id,
            status: 'ACTIVE'
          }
        });
        
        // Only one session should be active (first successful checkin)
        expect(activeSessions.length).toBeLessThanOrEqual(1);
      } else {
        // Spot deleted - no sessions should reference it
        const orphanedSessions = await prisma.session.findMany({
          where: { spotId: spot.id }
        });
        
        expect(orphanedSessions).toHaveLength(0);
      }
    });

    it('should handle circular dependency scenarios', async () => {
      // Test potential circular references in data model
      const user1 = await testFactory.createUser();
      const user2 = await testFactory.createUser();
      
      // Create cross-references that could cause issues
      const vehicle1 = await testFactory.createVehicle({ ownerId: user1.id });
      const vehicle2 = await testFactory.createVehicle({ ownerId: user2.id });

      // Update user preferences to reference vehicles
      const updateResponse1 = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          defaultVehicleId: vehicle2.id, // User1 references User2's vehicle
          preferences: {
            favoriteSpotType: 'PREMIUM'
          }
        });

      // This should either succeed with proper validation or fail gracefully
      expect([200, 400]).toContain(updateResponse1.status);
      
      if (updateResponse1.status === 400) {
        expect(updateResponse1.body.error).toMatch(/invalid.*vehicle|access.*denied/i);
      }
    });
  });

  describe('Transaction Rollback Scenarios', () => {
    it('should rollback partial failures in complex operations', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();

      // Mock a complex operation that should rollback on failure
      const complexOperationResponse = await request(app)
        .post('/api/checkins/with-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id,
          payment: {
            amount: 25.50,
            paymentMethod: 'CREDIT_CARD',
            cardToken: 'invalid_card_token' // This should cause failure
          }
        });

      expect(complexOperationResponse.status).toBe(400);

      // Verify rollback - no session should be created
      const sessions = await prisma.session.findMany({
        where: { 
          vehicleId: vehicle.id,
          spotId: spot.id 
        }
      });

      expect(sessions).toHaveLength(0);

      // Verify spot is still available
      const spotStatus = await prisma.spot.findUnique({
        where: { id: spot.id }
      });

      expect(spotStatus?.status).toBe('AVAILABLE');
    });

    it('should handle nested transaction failures', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();

      // Simulate nested transaction failure during checkout process
      const checkinResponse = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id
        });

      expect(checkinResponse.status).toBe(201);
      const sessionId = checkinResponse.body.sessionId;

      // Attempt complex checkout with billing failure
      const checkoutResponse = await request(app)
        .post('/api/checkouts/with-billing')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId,
          billing: {
            generateInvoice: true,
            sendEmail: true,
            emailAddress: 'invalid-email-format' // Should cause failure
          }
        });

      expect(checkoutResponse.status).toBe(400);

      // Verify session is still active (rollback occurred)
      const session = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      expect(session?.status).toBe('ACTIVE');
    });

    it('should maintain consistency during concurrent transactions', async () => {
      const spots = await Promise.all([
        testFactory.createSpot({ garageId: garage.id }),
        testFactory.createSpot({ garageId: garage.id })
      ]);

      const vehicle = await testFactory.createVehicle();

      // Concurrent complex operations that might conflict
      const concurrentOperations = spots.map(spot =>
        request(app)
          .post('/api/checkins/with-reservation')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: vehicle.id,
            spotId: spot.id,
            duration: 2, // hours
            paymentMethod: 'CREDIT_CARD',
            cardToken: 'test_token'
          })
      );

      const results = await Promise.allSettled(concurrentOperations);
      
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );

      // Only one should succeed
      expect(successful).toHaveLength(1);

      // Verify database consistency
      const vehicleSessions = await prisma.session.findMany({
        where: { 
          vehicleId: vehicle.id,
          status: 'ACTIVE' 
        }
      });

      expect(vehicleSessions).toHaveLength(1);
    });
  });

  describe('Data Corruption Recovery', () => {
    it('should detect and handle data inconsistencies', async () => {
      // Create inconsistent state for testing recovery
      const spot = await testFactory.createSpot({ 
        garageId: garage.id,
        status: 'AVAILABLE' 
      });

      const vehicle = await testFactory.createVehicle();
      
      // Create session but manually set spot as available (inconsistent state)
      const session = await prisma.session.create({
        data: {
          spotId: spot.id,
          vehicleId: vehicle.id,
          checkInTime: new Date(),
          status: 'ACTIVE'
        }
      });

      // System should detect inconsistency
      const consistencyCheckResponse = await request(app)
        .get('/api/admin/consistency-check')
        .set('Authorization', `Bearer ${authToken}`);

      expect(consistencyCheckResponse.status).toBe(200);
      expect(consistencyCheckResponse.body.inconsistencies).toBeDefined();
      expect(consistencyCheckResponse.body.inconsistencies.length).toBeGreaterThan(0);

      // Test auto-correction
      const autoFixResponse = await request(app)
        .post('/api/admin/auto-fix')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fixTypes: ['spot_session_mismatch']
        });

      expect(autoFixResponse.status).toBe(200);

      // Verify correction
      const correctedSpot = await prisma.spot.findUnique({
        where: { id: spot.id }
      });

      expect(correctedSpot?.status).toBe('OCCUPIED');
    });

    it('should handle partial data corruption gracefully', async () => {
      // Simulate corrupted data scenario
      const vehicle = await testFactory.createVehicle();
      
      // Corrupt some data manually
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          make: null as any, // This violates NOT NULL constraint
        }
      }).catch(() => {
        // Expected to fail - we'll create the corruption differently
      });

      // Try to create corrupted record via API
      const corruptResponse = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licensePlate: 'CORRUPT1',
          make: '', // Empty string instead of null
          model: 'Test',
          color: 'Blue'
        });

      // System should validate and reject
      expect(corruptResponse.status).toBe(400);
      expect(corruptResponse.body.error).toMatch(/make.*required|validation.*error/i);
    });

    it('should recover from database connection issues', async () => {
      // Test resilience to temporary database issues
      let consecutiveFailures = 0;
      const maxRetries = 5;

      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await request(app)
            .get('/api/garages')
            .set('Authorization', `Bearer ${authToken}`)
            .timeout(5000);

          if (response.status !== 200) {
            consecutiveFailures++;
          } else {
            // Success - reset counter
            consecutiveFailures = 0;
            break;
          }
        } catch (error) {
          consecutiveFailures++;
        }

        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Should eventually succeed or fail gracefully
      expect(consecutiveFailures).toBeLessThan(maxRetries);
    });
  });

  describe('Backup and Restore Procedures', () => {
    it('should maintain data integrity during backup operations', async () => {
      // Create test data
      const vehicles = await Promise.all([
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle()
      ]);

      const initialCount = await prisma.vehicle.count();

      // Simulate backup operation
      const backupResponse = await request(app)
        .post('/api/admin/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'FULL',
          includeFiles: false
        });

      if (backupResponse.status === 200) {
        // Verify data is still accessible during backup
        const duringBackupResponse = await request(app)
          .get('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`);

        expect(duringBackupResponse.status).toBe(200);

        // Verify count consistency
        const finalCount = await prisma.vehicle.count();
        expect(finalCount).toBe(initialCount);
      }
    });

    it('should validate data integrity after restore operations', async () => {
      // Create some initial data
      const originalVehicle = await testFactory.createVehicle();
      const originalGarage = garage;

      // Simulate restore operation
      const restoreResponse = await request(app)
        .post('/api/admin/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          backupId: 'test-backup-id',
          validateIntegrity: true
        });

      // Should either succeed with validation or fail gracefully
      expect([200, 400, 404]).toContain(restoreResponse.status);

      if (restoreResponse.status === 200) {
        // Verify data integrity after restore
        const integrityResponse = await request(app)
          .get('/api/admin/integrity-check')
          .set('Authorization', `Bearer ${authToken}`);

        expect(integrityResponse.status).toBe(200);
        expect(integrityResponse.body.status).toBe('HEALTHY');
      }
    });
  });

  describe('Cross-Table Consistency', () => {
    it('should maintain consistency across related tables', async () => {
      // Create complex related data
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

      const checkoutResponse = await request(app)
        .post('/api/checkouts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId
        });

      // Create payment
      await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId,
          amount: checkoutResponse.body.totalAmount,
          paymentMethod: 'CREDIT_CARD',
          cardToken: 'test_token'
        });

      // Verify consistency across all related tables
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          payments: true,
          spot: true,
          vehicle: true
        }
      });

      expect(session).toBeTruthy();
      expect(session?.status).toBe('COMPLETED');
      expect(session?.payments.length).toBe(1);
      expect(session?.payments[0].status).toBe('COMPLETED');
      expect(session?.spot.status).toBe('AVAILABLE');

      // Verify totals match
      const totalPayments = session?.payments.reduce(
        (sum, payment) => sum + payment.amount, 0
      );
      expect(totalPayments).toBe(session?.totalAmount);
    });

    it('should handle complex cascading updates correctly', async () => {
      // Create garage with multiple spots and sessions
      const spots = await Promise.all([
        testFactory.createSpot({ garageId: garage.id }),
        testFactory.createSpot({ garageId: garage.id }),
        testFactory.createSpot({ garageId: garage.id })
      ]);

      const vehicles = await Promise.all([
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle()
      ]);

      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const session = await testFactory.createSession({
          spotId: spots[i].id,
          vehicleId: vehicles[i].id,
          status: 'COMPLETED'
        });
        sessions.push(session);
      }

      // Update garage settings that should cascade
      const updateResponse = await request(app)
        .put(`/api/garages/${garage.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: garage.name,
          hourlyRate: 10.00, // Changed rate
          timezone: 'America/New_York' // Changed timezone
        });

      expect(updateResponse.status).toBe(200);

      // Verify cascading updates
      const updatedSessions = await prisma.session.findMany({
        where: {
          spot: { garageId: garage.id }
        }
      });

      // Check that historical data remains consistent
      expect(updatedSessions.length).toBe(3);
      updatedSessions.forEach(session => {
        expect(session.totalAmount).toBeGreaterThan(0);
      });
    });
  });
});
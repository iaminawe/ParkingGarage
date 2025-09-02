/**
 * Unit Tests for SessionRepository (Prisma Integration)
 * 
 * Tests all data access methods in SessionRepository with Prisma ORM.
 * Tests parking session management and related operations.
 */

const SessionRepository = require('../../../src/repositories/sessionsRepository');
const { SessionFactory, VehicleFactory, SpotFactory, GarageFactory } = require('../../factories');

describe('SessionRepository (Prisma)', () => {
  let sessionRepository;
  let testGarage;
  let testVehicle;
  let testSpot;

  beforeEach(async () => {
    sessionRepository = new SessionRepository();
    
    // Create test entities for sessions
    testGarage = await GarageFactory.createGarage({ name: 'Test Garage' });
    testVehicle = await VehicleFactory.createVehicle({ licensePlate: 'TEST001' });
    testSpot = await SpotFactory.createSpot({
      garageId: testGarage.id,
      floor: 1,
      bay: 1,
      spotNumber: 1
    });
  });

  describe('create', () => {
    test('should create session with valid data', async () => {
      const sessionData = {
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        garageId: testGarage.id,
        hourlyRate: 5.00
      };
      
      const session = await sessionRepository.create(sessionData);
      
      expect(session).toEqual(expect.objectContaining({
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        garageId: testGarage.id,
        status: 'active',
        hourlyRate: 5.00,
        totalAmount: null,
        paymentStatus: 'pending'
      }));
      
      expect(session.id).toBeDefined();
      expect(session.startTime).toBeDefined();
      expect(session.endTime).toBeNull();
      expect(session.createdAt).toBeDefined();
    });

    test('should prevent duplicate active sessions for same vehicle', async () => {
      const sessionData = {
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        garageId: testGarage.id
      };
      
      await sessionRepository.create(sessionData);
      
      // Attempt to create another active session for the same vehicle
      await expect(sessionRepository.create(sessionData))
        .rejects.toThrow(/active session|already parked/i);
    });

    test('should validate required relationships', async () => {
      // Test invalid vehicle ID
      await expect(sessionRepository.create({
        vehicleId: '00000000-0000-0000-0000-000000000000',
        spotId: testSpot.id,
        garageId: testGarage.id
      })).rejects.toThrow(/foreign key|vehicle not found/i);
      
      // Test invalid spot ID
      await expect(sessionRepository.create({
        vehicleId: testVehicle.id,
        spotId: '00000000-0000-0000-0000-000000000000',
        garageId: testGarage.id
      })).rejects.toThrow(/foreign key|spot not found/i);
    });
  });

  describe('findById', () => {
    test('should find existing session by ID', async () => {
      const createdSession = await SessionFactory.createSession({
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        garageId: testGarage.id
      });
      
      const foundSession = await sessionRepository.findById(createdSession.id);
      
      expect(foundSession).toEqual(createdSession);
    });

    test('should return null for non-existent session', async () => {
      const session = await sessionRepository.findById('00000000-0000-0000-0000-000000000000');
      expect(session).toBeNull();
    });

    test('should include related entities when requested', async () => {
      const createdSession = await SessionFactory.createSession({
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        garageId: testGarage.id
      });
      
      const sessionWithRelations = await sessionRepository.findById(createdSession.id, {
        include: { vehicle: true, spot: true, garage: true }
      });
      
      expect(sessionWithRelations.vehicle).toBeDefined();
      expect(sessionWithRelations.spot).toBeDefined();
      expect(sessionWithRelations.garage).toBeDefined();
      expect(sessionWithRelations.vehicle.licensePlate).toBe('TEST001');
    });
  });

  describe('findAll', () => {
    test('should return empty array when no sessions exist', async () => {
      const sessions = await sessionRepository.findAll();
      expect(sessions).toEqual([]);
    });

    test('should return all sessions with pagination', async () => {
      // Create 15 sessions
      for (let i = 0; i < 15; i++) {
        const vehicle = await VehicleFactory.createVehicle({ 
          licensePlate: `TEST${String(i).padStart(3, '0')}` 
        });
        await SessionFactory.createSession({
          vehicleId: vehicle.id,
          spotId: testSpot.id,
          garageId: testGarage.id
        });
      }
      
      const allSessions = await sessionRepository.findAll();
      expect(allSessions).toHaveLength(15);
      
      // Test pagination
      const firstPage = await sessionRepository.findAll({ limit: 10, offset: 0 });
      const secondPage = await sessionRepository.findAll({ limit: 10, offset: 10 });
      
      expect(firstPage).toHaveLength(10);
      expect(secondPage).toHaveLength(5);
    });
  });

  describe('findActive', () => {
    test('should find only active sessions', async () => {
      // Create active session
      const activeSession = await SessionFactory.createActiveSession(
        testVehicle.id,
        testSpot.id,
        { garageId: testGarage.id }
      );
      
      // Create completed session
      const vehicle2 = await VehicleFactory.createVehicle({ licensePlate: 'TEST002' });
      await SessionFactory.createCompletedSession(
        vehicle2.id,
        testSpot.id,
        { garageId: testGarage.id }
      );
      
      const activeSessions = await sessionRepository.findActive();
      
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].id).toBe(activeSession.id);
      expect(activeSessions[0].status).toBe('active');
      expect(activeSessions[0].endTime).toBeNull();
    });

    test('should filter active sessions by garage', async () => {
      const garage2 = await GarageFactory.createGarage({ name: 'Garage 2' });
      const spot2 = await SpotFactory.createSpot({ garageId: garage2.id });
      
      // Create active sessions in different garages
      await SessionFactory.createActiveSession(testVehicle.id, testSpot.id, { 
        garageId: testGarage.id 
      });
      
      const vehicle2 = await VehicleFactory.createVehicle({ licensePlate: 'TEST002' });
      await SessionFactory.createActiveSession(vehicle2.id, spot2.id, { 
        garageId: garage2.id 
      });
      
      const garage1Active = await sessionRepository.findActive({ garageId: testGarage.id });
      const garage2Active = await sessionRepository.findActive({ garageId: garage2.id });
      
      expect(garage1Active).toHaveLength(1);
      expect(garage2Active).toHaveLength(1);
      expect(garage1Active[0].garageId).toBe(testGarage.id);
      expect(garage2Active[0].garageId).toBe(garage2.id);
    });
  });

  describe('findByVehicle', () => {
    test('should find sessions for specific vehicle', async () => {
      // Create sessions for test vehicle
      await SessionFactory.createSessionsForVehicle(testVehicle.id, 3, {
        spotId: testSpot.id,
        garageId: testGarage.id
      });
      
      // Create sessions for different vehicle
      const vehicle2 = await VehicleFactory.createVehicle({ licensePlate: 'TEST002' });
      await SessionFactory.createSessionsForVehicle(vehicle2.id, 2, {
        spotId: testSpot.id,
        garageId: testGarage.id
      });
      
      const vehicleSessions = await sessionRepository.findByVehicle(testVehicle.id);
      
      expect(vehicleSessions).toHaveLength(3);
      expect(vehicleSessions.every(s => s.vehicleId === testVehicle.id)).toBe(true);
    });

    test('should order sessions by start time descending', async () => {
      // Create sessions with different start times
      const session1 = await SessionFactory.createSession({
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        garageId: testGarage.id,
        startTime: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      });
      
      const session2 = await SessionFactory.createSession({
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        garageId: testGarage.id,
        startTime: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
      });
      
      const sessions = await sessionRepository.findByVehicle(testVehicle.id);
      
      expect(sessions).toHaveLength(2);
      expect(new Date(sessions[0].startTime)).toBeAfter(new Date(sessions[1].startTime));
    });
  });

  describe('findBySpot', () => {
    test('should find sessions for specific spot', async () => {
      const spot2 = await SpotFactory.createSpot({
        garageId: testGarage.id,
        floor: 1,
        bay: 1,
        spotNumber: 2
      });
      
      // Create sessions in testSpot
      await SessionFactory.createSession({
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        garageId: testGarage.id
      });
      
      const vehicle2 = await VehicleFactory.createVehicle({ licensePlate: 'TEST002' });
      await SessionFactory.createSession({
        vehicleId: vehicle2.id,
        spotId: testSpot.id,
        garageId: testGarage.id
      });
      
      // Create session in different spot
      const vehicle3 = await VehicleFactory.createVehicle({ licensePlate: 'TEST003' });
      await SessionFactory.createSession({
        vehicleId: vehicle3.id,
        spotId: spot2.id,
        garageId: testGarage.id
      });
      
      const spotSessions = await sessionRepository.findBySpot(testSpot.id);
      
      expect(spotSessions).toHaveLength(2);
      expect(spotSessions.every(s => s.spotId === testSpot.id)).toBe(true);
    });
  });

  describe('findByDateRange', () => {
    test('should find sessions within date range', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();
      
      // Create sessions with different start times
      const vehicle1 = await VehicleFactory.createVehicle({ licensePlate: 'OLD001' });
      await SessionFactory.createSession({
        vehicleId: vehicle1.id,
        spotId: testSpot.id,
        garageId: testGarage.id,
        startTime: threeDaysAgo.toISOString()
      });
      
      const vehicle2 = await VehicleFactory.createVehicle({ licensePlate: 'MID001' });
      await SessionFactory.createSession({
        vehicleId: vehicle2.id,
        spotId: testSpot.id,
        garageId: testGarage.id,
        startTime: oneDayAgo.toISOString()
      });
      
      const vehicle3 = await VehicleFactory.createVehicle({ licensePlate: 'NEW001' });
      await SessionFactory.createSession({
        vehicleId: vehicle3.id,
        spotId: testSpot.id,
        garageId: testGarage.id,
        startTime: today.toISOString()
      });
      
      // Find sessions from 2 days ago to now
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const sessions = await sessionRepository.findByDateRange(twoDaysAgo, today);
      
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.vehicleId)).toEqual(
        expect.arrayContaining([vehicle2.id, vehicle3.id])
      );
    });
  });

  describe('endSession', () => {
    test('should successfully end active session', async () => {
      const activeSession = await SessionFactory.createActiveSession(
        testVehicle.id,
        testSpot.id,
        { garageId: testGarage.id, hourlyRate: 5.00 }
      );
      
      const endTime = new Date();
      const endedSession = await sessionRepository.endSession(activeSession.id, {
        endTime: endTime.toISOString(),
        totalAmount: 10.00
      });
      
      expect(endedSession.status).toBe('completed');
      expect(endedSession.endTime).toBeDefined();
      expect(endedSession.totalAmount).toBe(10.00);
      expect(new Date(endedSession.endTime)).toBeAfter(new Date(endedSession.startTime));
    });

    test('should calculate total amount automatically if not provided', async () => {
      const startTime = new Date(Date.now() - 2.5 * 60 * 60 * 1000); // 2.5 hours ago
      const activeSession = await SessionFactory.createSession({
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        garageId: testGarage.id,
        startTime: startTime.toISOString(),
        hourlyRate: 4.00,
        status: 'active'
      });
      
      const endedSession = await sessionRepository.endSession(activeSession.id);
      
      // Should charge for 3 hours (rounded up) at $4/hour = $12
      expect(endedSession.totalAmount).toBe(12.00);
    });

    test('should fail to end non-existent session', async () => {
      await expect(sessionRepository.endSession('00000000-0000-0000-0000-000000000000'))
        .rejects.toThrow(/not found/i);
    });

    test('should fail to end already completed session', async () => {
      const completedSession = await SessionFactory.createCompletedSession(
        testVehicle.id,
        testSpot.id,
        { garageId: testGarage.id }
      );
      
      await expect(sessionRepository.endSession(completedSession.id))
        .rejects.toThrow(/already completed|not active/i);
    });
  });

  describe('updatePaymentStatus', () => {
    test('should update payment status successfully', async () => {
      const session = await SessionFactory.createCompletedSession(
        testVehicle.id,
        testSpot.id,
        { garageId: testGarage.id, paymentStatus: 'pending' }
      );
      
      const updatedSession = await sessionRepository.updatePaymentStatus(
        session.id,
        'paid'
      );
      
      expect(updatedSession.paymentStatus).toBe('paid');
    });

    test('should validate payment status values', async () => {
      const session = await SessionFactory.createCompletedSession(
        testVehicle.id,
        testSpot.id,
        { garageId: testGarage.id }
      );
      
      await expect(sessionRepository.updatePaymentStatus(session.id, 'invalid'))
        .rejects.toThrow(/invalid payment status/i);
    });
  });

  describe('delete', () => {
    test('should soft delete session', async () => {
      const session = await SessionFactory.createCompletedSession(
        testVehicle.id,
        testSpot.id,
        { garageId: testGarage.id }
      );
      
      const deleted = await sessionRepository.delete(session.id);
      expect(deleted).toBe(true);
      
      // Session should not be found in regular queries
      const foundSession = await sessionRepository.findById(session.id);
      expect(foundSession).toBeNull();
      
      // But should be found in deleted sessions if implemented
      const deletedSession = await sessionRepository.findDeleted(session.id);
      if (deletedSession) {
        expect(deletedSession.deletedAt).toBeDefined();
      }
    });

    test('should prevent deleting active sessions', async () => {
      const activeSession = await SessionFactory.createActiveSession(
        testVehicle.id,
        testSpot.id,
        { garageId: testGarage.id }
      );
      
      await expect(sessionRepository.delete(activeSession.id))
        .rejects.toThrow(/cannot delete active/i);
    });
  });

  describe('getSessionStatistics', () => {
    test('should return comprehensive session statistics', async () => {
      // Create various types of sessions
      await SessionFactory.createActiveSession(testVehicle.id, testSpot.id, {
        garageId: testGarage.id
      });
      
      const vehicle2 = await VehicleFactory.createVehicle({ licensePlate: 'TEST002' });
      await SessionFactory.createCompletedSession(vehicle2.id, testSpot.id, {
        garageId: testGarage.id,
        totalAmount: 15.00,
        paymentStatus: 'paid'
      });
      
      const vehicle3 = await VehicleFactory.createVehicle({ licensePlate: 'TEST003' });
      await SessionFactory.createCompletedSession(vehicle3.id, testSpot.id, {
        garageId: testGarage.id,
        totalAmount: 25.00,
        paymentStatus: 'pending'
      });
      
      const stats = await sessionRepository.getSessionStatistics();
      
      expect(stats).toEqual(expect.objectContaining({
        totalSessions: 3,
        activeSessions: 1,
        completedSessions: 2,
        totalRevenue: 15.00, // Only paid sessions
        pendingRevenue: 25.00,
        averageSessionDuration: expect.any(Number),
        averageRevenue: expect.any(Number)
      }));
    });
  });

  describe('Database Integration', () => {
    test('should maintain data consistency across session lifecycle', async () => {
      // Start session
      const session = await sessionRepository.create({
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        garageId: testGarage.id,
        hourlyRate: 5.00
      });
      
      expect(session.status).toBe('active');
      expect(session.endTime).toBeNull();
      
      // End session
      const endedSession = await sessionRepository.endSession(session.id, {
        totalAmount: 10.00
      });
      
      expect(endedSession.status).toBe('completed');
      expect(endedSession.totalAmount).toBe(10.00);
      expect(endedSession.endTime).toBeDefined();
      
      // Update payment
      const paidSession = await sessionRepository.updatePaymentStatus(
        session.id,
        'paid'
      );
      
      expect(paidSession.paymentStatus).toBe('paid');
      expect(paidSession.id).toBe(session.id);
    });

    test('should handle concurrent session operations', async () => {
      const vehicles = [];
      const spots = [];
      
      // Create multiple vehicles and spots
      for (let i = 0; i < 5; i++) {
        vehicles.push(await VehicleFactory.createVehicle({ 
          licensePlate: `CONC${String(i).padStart(3, '0')}` 
        }));
        spots.push(await SpotFactory.createSpot({
          garageId: testGarage.id,
          floor: 1,
          bay: 1,
          spotNumber: i + 1
        }));
      }
      
      // Create sessions concurrently
      const sessionPromises = vehicles.map((vehicle, index) =>
        sessionRepository.create({
          vehicleId: vehicle.id,
          spotId: spots[index].id,
          garageId: testGarage.id,
          hourlyRate: 5.00
        })
      );
      
      const sessions = await Promise.all(sessionPromises);
      
      expect(sessions).toHaveLength(5);
      expect(sessions.every(s => s.status === 'active')).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should handle large number of sessions efficiently', async () => {
      const startTime = Date.now();
      
      // Create 50 sessions
      const promises = [];
      for (let i = 0; i < 50; i++) {
        const vehicle = await VehicleFactory.createVehicle({ 
          licensePlate: `PERF${String(i).padStart(3, '0')}` 
        });
        
        promises.push(SessionFactory.createSession({
          vehicleId: vehicle.id,
          spotId: testSpot.id,
          garageId: testGarage.id
        }));
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(15000); // 15 seconds
      
      // Query should also be fast
      const queryStartTime = Date.now();
      const allSessions = await sessionRepository.findAll();
      const queryEndTime = Date.now();
      
      expect(allSessions).toHaveLength(50);
      expect(queryEndTime - queryStartTime).toBeLessThan(1000); // 1 second
    });
  });
});
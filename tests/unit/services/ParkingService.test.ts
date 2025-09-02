/**
 * Unit tests for ParkingService
 * 
 * Tests all parking operations with comprehensive scenario coverage,
 * transaction handling, error conditions, and edge cases.
 */

import { ParkingService, IParkingSessionData, ISpotTransferData } from '../../../src/services/ParkingService';
import { TransactionManager } from '../../../src/services/TransactionManager';
import { DatabaseService } from '../../../src/services/DatabaseService';
import { SpotRepository } from '../../../src/repositories/SpotRepository';
import { VehicleRepository } from '../../../src/repositories/VehicleRepository';
import { SessionRepository } from '../../../src/repositories/SessionRepository';
import { SpotStatus, SpotType, SessionStatus, VehicleType, VehicleStatus } from '@prisma/client';
import { TransactionError, TransactionPriority } from '../../../src/types/transaction.types';
import { createLogger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/services/TransactionManager');
jest.mock('../../../src/services/DatabaseService');
jest.mock('../../../src/repositories/SpotRepository');
jest.mock('../../../src/repositories/VehicleRepository');
jest.mock('../../../src/repositories/SessionRepository');
jest.mock('../../../src/utils/logger');

describe('ParkingService', () => {
  let parkingService: ParkingService;
  let mockTransactionManager: jest.Mocked<TransactionManager>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockSpotRepository: jest.Mocked<SpotRepository>;
  let mockVehicleRepository: jest.Mocked<VehicleRepository>;
  let mockSessionRepository: jest.Mocked<SessionRepository>;
  let mockLogger: any;

  const mockTransaction = {
    $transaction: jest.fn(),
    vehicle: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    spot: { findUnique: jest.fn(), update: jest.fn() },
    session: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() }
  };

  const mockTransactionContext = {
    id: 'test-transaction-id',
    startTime: Date.now(),
    priority: TransactionPriority.HIGH,
    metadata: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup logger mock
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };
    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    // Setup database service mock
    mockDatabaseService = {
      getInstance: jest.fn().mockReturnThis(),
      getClient: jest.fn().mockReturnValue(mockTransaction)
    } as any;
    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDatabaseService);

    // Setup transaction manager mock
    mockTransactionManager = {
      getInstance: jest.fn().mockReturnThis(),
      executeTransaction: jest.fn(),
      createSavepoint: jest.fn(),
      releaseSavepoint: jest.fn(),
      rollbackToSavepoint: jest.fn(),
      getTransactionStatistics: jest.fn()
    } as any;
    (TransactionManager.getInstance as jest.Mock).mockReturnValue(mockTransactionManager);

    // Setup repository mocks
    mockSpotRepository = {
      findById: jest.fn(),
      update: jest.fn()
    } as any;
    (SpotRepository as jest.Mock).mockImplementation(() => mockSpotRepository);

    mockVehicleRepository = {
      findByLicensePlate: jest.fn(),
      create: jest.fn()
    } as any;
    (VehicleRepository as jest.Mock).mockImplementation(() => mockVehicleRepository);

    mockSessionRepository = {
      findActiveByVehicle: jest.fn(),
      findBySpotAndStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    } as any;
    (SessionRepository as jest.Mock).mockImplementation(() => mockSessionRepository);

    parkingService = new ParkingService(mockDatabaseService, mockLogger);
  });

  describe('constructor', () => {
    it('should create instance with provided dependencies', () => {
      expect(parkingService).toBeInstanceOf(ParkingService);
      expect(createLogger).toHaveBeenCalledWith('ParkingService');
      expect(TransactionManager.getInstance).toHaveBeenCalledWith(mockDatabaseService);
    });

    it('should create instance with default dependencies when none provided', () => {
      const service = new ParkingService();
      expect(service).toBeInstanceOf(ParkingService);
      expect(DatabaseService.getInstance).toHaveBeenCalled();
    });
  });

  describe('parkVehicle', () => {
    const mockSessionData: IParkingSessionData = {
      vehicle: {
        licensePlate: 'ABC123',
        vehicleType: 'STANDARD',
        color: 'Blue',
        make: 'Toyota',
        model: 'Camry',
        year: 2020
      },
      spotId: 'spot-1',
      entryTime: new Date('2024-01-01T10:00:00Z'),
      expectedExitTime: new Date('2024-01-01T18:00:00Z')
    };

    const mockSpot = {
      id: 'spot-1',
      number: 'A001',
      status: SpotStatus.AVAILABLE,
      type: SpotType.STANDARD,
      garageId: 'garage-1'
    };

    const mockVehicle = {
      id: 'vehicle-1',
      licensePlate: 'ABC123',
      vehicleType: VehicleType.STANDARD,
      status: VehicleStatus.ACTIVE
    };

    const mockSession = {
      id: 'session-1',
      spotId: 'spot-1',
      vehicleId: 'vehicle-1',
      status: SessionStatus.ACTIVE,
      entryTime: new Date('2024-01-01T10:00:00Z')
    };

    beforeEach(() => {
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        const result = await callback(mockTransaction, mockTransactionContext);
        return {
          success: true,
          result,
          context: mockTransactionContext
        };
      });
    });

    it('should successfully park a new vehicle', async () => {
      // Setup mocks
      mockSpotRepository.findById.mockResolvedValue(mockSpot);
      mockVehicleRepository.findByLicensePlate.mockResolvedValue(null);
      mockVehicleRepository.create.mockResolvedValue(mockVehicle);
      mockSessionRepository.findActiveByVehicle.mockResolvedValue(null);
      mockSessionRepository.create.mockResolvedValue(mockSession);
      mockSpotRepository.update.mockResolvedValue({ ...mockSpot, status: SpotStatus.OCCUPIED });
      
      mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
      mockTransactionManager.releaseSavepoint.mockResolvedValue(undefined);

      const result = await parkingService.parkVehicle(mockSessionData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        session: mockSession,
        spot: { ...mockSpot, status: SpotStatus.OCCUPIED },
        vehicle: mockVehicle
      });
      expect(result.transactionId).toBe(mockTransactionContext.id);
      expect(typeof result.duration).toBe('number');

      // Verify sequence of operations
      expect(mockSpotRepository.findById).toHaveBeenCalledWith('spot-1', undefined, mockTransaction);
      expect(mockVehicleRepository.findByLicensePlate).toHaveBeenCalledWith('ABC123', undefined, mockTransaction);
      expect(mockVehicleRepository.create).toHaveBeenCalled();
      expect(mockSessionRepository.findActiveByVehicle).toHaveBeenCalled();
      expect(mockSessionRepository.create).toHaveBeenCalled();
      expect(mockSpotRepository.update).toHaveBeenCalledWith(
        'spot-1',
        { status: SpotStatus.OCCUPIED, currentVehicleId: 'vehicle-1' },
        undefined,
        mockTransaction
      );
    });

    it('should successfully park an existing vehicle', async () => {
      // Setup mocks for existing vehicle
      mockSpotRepository.findById.mockResolvedValue(mockSpot);
      mockVehicleRepository.findByLicensePlate.mockResolvedValue(mockVehicle);
      mockSessionRepository.findActiveByVehicle.mockResolvedValue(null);
      mockSessionRepository.create.mockResolvedValue(mockSession);
      mockSpotRepository.update.mockResolvedValue({ ...mockSpot, status: SpotStatus.OCCUPIED });
      
      mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
      mockTransactionManager.releaseSavepoint.mockResolvedValue(undefined);

      const result = await parkingService.parkVehicle(mockSessionData);

      expect(result.success).toBe(true);
      expect(mockVehicleRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when spot is not found', async () => {
      mockSpotRepository.findById.mockResolvedValue(null);
      
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockTransaction, mockTransactionContext);
        } catch (error) {
          return {
            success: false,
            error,
            context: mockTransactionContext
          };
        }
      });

      const result = await parkingService.parkVehicle(mockSessionData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Spot spot-1 not found');
    });

    it('should throw error when spot is not available', async () => {
      mockSpotRepository.findById.mockResolvedValue({
        ...mockSpot,
        status: SpotStatus.OCCUPIED
      });
      
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockTransaction, mockTransactionContext);
        } catch (error) {
          return {
            success: false,
            error,
            context: mockTransactionContext
          };
        }
      });

      const result = await parkingService.parkVehicle(mockSessionData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('is not available');
    });

    it('should throw error when vehicle is already parked', async () => {
      const existingSession = {
        id: 'existing-session',
        spotId: 'other-spot',
        vehicleId: 'vehicle-1',
        status: SessionStatus.ACTIVE
      };

      mockSpotRepository.findById.mockResolvedValue(mockSpot);
      mockVehicleRepository.findByLicensePlate.mockResolvedValue(mockVehicle);
      mockSessionRepository.findActiveByVehicle.mockResolvedValue(existingSession);
      
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockTransaction, mockTransactionContext);
        } catch (error) {
          return {
            success: false,
            error,
            context: mockTransactionContext
          };
        }
      });

      const result = await parkingService.parkVehicle(mockSessionData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('is already parked');
    });

    it('should handle savepoint rollback on vehicle creation error', async () => {
      mockSpotRepository.findById.mockResolvedValue(mockSpot);
      mockVehicleRepository.findByLicensePlate.mockResolvedValue(null);
      mockVehicleRepository.create.mockRejectedValue(new Error('Database error'));
      
      mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
      mockTransactionManager.rollbackToSavepoint.mockResolvedValue(undefined);
      
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockTransaction, mockTransactionContext);
        } catch (error) {
          return {
            success: false,
            error,
            context: mockTransactionContext
          };
        }
      });

      const result = await parkingService.parkVehicle(mockSessionData);

      expect(result.success).toBe(false);
      expect(mockTransactionManager.rollbackToSavepoint).toHaveBeenCalledWith(
        'savepoint-1',
        mockTransactionContext
      );
    });

    it('should use correct transaction options', async () => {
      const customOptions = {
        priority: TransactionPriority.LOW,
        timeout: 30000
      };

      mockSpotRepository.findById.mockResolvedValue(mockSpot);
      mockVehicleRepository.findByLicensePlate.mockResolvedValue(mockVehicle);
      mockSessionRepository.findActiveByVehicle.mockResolvedValue(null);
      mockSessionRepository.create.mockResolvedValue(mockSession);
      mockSpotRepository.update.mockResolvedValue({ ...mockSpot, status: SpotStatus.OCCUPIED });
      
      await parkingService.parkVehicle(mockSessionData, customOptions);

      expect(mockTransactionManager.executeTransaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          priority: TransactionPriority.LOW,
          timeout: 30000
        })
      );
    });

    it('should normalize license plate to uppercase', async () => {
      const sessionDataWithLowercase = {
        ...mockSessionData,
        vehicle: {
          ...mockSessionData.vehicle,
          licensePlate: 'abc123'
        }
      };

      mockSpotRepository.findById.mockResolvedValue(mockSpot);
      mockVehicleRepository.findByLicensePlate.mockResolvedValue(null);
      mockVehicleRepository.create.mockResolvedValue(mockVehicle);
      mockSessionRepository.findActiveByVehicle.mockResolvedValue(null);
      mockSessionRepository.create.mockResolvedValue(mockSession);
      mockSpotRepository.update.mockResolvedValue({ ...mockSpot, status: SpotStatus.OCCUPIED });
      
      mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
      mockTransactionManager.releaseSavepoint.mockResolvedValue(undefined);

      await parkingService.parkVehicle(sessionDataWithLowercase);

      expect(mockVehicleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          licensePlate: 'ABC123'
        }),
        mockTransaction
      );
    });
  });

  describe('exitVehicle', () => {
    const mockVehicle = {
      id: 'vehicle-1',
      licensePlate: 'ABC123',
      vehicleType: VehicleType.STANDARD
    };

    const mockSession = {
      id: 'session-1',
      spotId: 'spot-1',
      vehicleId: 'vehicle-1',
      status: SessionStatus.ACTIVE,
      entryTime: new Date('2024-01-01T10:00:00Z')
    };

    const mockSpot = {
      id: 'spot-1',
      status: SpotStatus.OCCUPIED
    };

    beforeEach(() => {
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        const result = await callback(mockTransaction, mockTransactionContext);
        return {
          success: true,
          result,
          context: mockTransactionContext
        };
      });
    });

    it('should successfully exit vehicle and calculate payment', async () => {
      const exitTime = new Date('2024-01-01T12:30:00Z'); // 2.5 hours later
      const expectedFee = 5 + (2 * 3); // Base rate + 2 additional hours
      
      mockVehicleRepository.findByLicensePlate.mockResolvedValue(mockVehicle);
      mockSessionRepository.findActiveByVehicle.mockResolvedValue(mockSession);
      mockSessionRepository.update.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.COMPLETED,
        exitTime,
        totalFee: expectedFee
      });
      mockSpotRepository.update.mockResolvedValue({
        ...mockSpot,
        status: SpotStatus.AVAILABLE
      });
      
      mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
      mockTransactionManager.releaseSavepoint.mockResolvedValue(undefined);

      const result = await parkingService.exitVehicle('ABC123', exitTime);

      expect(result.success).toBe(true);
      expect(result.data?.payment.amount).toBe(expectedFee);
      expect(result.data?.payment.hours).toBe(3); // Rounded up
      expect(result.data?.session.status).toBe(SessionStatus.COMPLETED);
      expect(result.data?.spot.status).toBe(SpotStatus.AVAILABLE);
    });

    it('should use current time when exit time not provided', async () => {
      mockVehicleRepository.findByLicensePlate.mockResolvedValue(mockVehicle);
      mockSessionRepository.findActiveByVehicle.mockResolvedValue(mockSession);
      mockSessionRepository.update.mockResolvedValue({ ...mockSession, status: SessionStatus.COMPLETED });
      mockSpotRepository.update.mockResolvedValue({ ...mockSpot, status: SpotStatus.AVAILABLE });
      
      mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
      mockTransactionManager.releaseSavepoint.mockResolvedValue(undefined);

      const startTime = Date.now();
      await parkingService.exitVehicle('ABC123');
      const endTime = Date.now();

      // Verify that update was called with an exit time close to current time
      const updateCall = mockSessionRepository.update.mock.calls[0];
      const exitTime = updateCall[1].exitTime;
      expect(exitTime.getTime()).toBeGreaterThanOrEqual(startTime);
      expect(exitTime.getTime()).toBeLessThanOrEqual(endTime);
    });

    it('should throw error when vehicle not found', async () => {
      mockVehicleRepository.findByLicensePlate.mockResolvedValue(null);
      
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockTransaction, mockTransactionContext);
        } catch (error) {
          return {
            success: false,
            error,
            context: mockTransactionContext
          };
        }
      });

      const result = await parkingService.exitVehicle('NOTFOUND');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should throw error when no active session found', async () => {
      mockVehicleRepository.findByLicensePlate.mockResolvedValue(mockVehicle);
      mockSessionRepository.findActiveByVehicle.mockResolvedValue(null);
      
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockTransaction, mockTransactionContext);
        } catch (error) {
          return {
            success: false,
            error,
            context: mockTransactionContext
          };
        }
      });

      const result = await parkingService.exitVehicle('ABC123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active parking session');
    });

    it('should handle parking fee calculation correctly', async () => {
      // Test various durations
      const testCases = [
        { hours: 0.5, expectedFee: 5 }, // Under 1 hour
        { hours: 1, expectedFee: 5 },   // Exactly 1 hour
        { hours: 1.1, expectedFee: 8 }, // Just over 1 hour (2 hours)
        { hours: 3, expectedFee: 11 },  // 3 hours
        { hours: 5.5, expectedFee: 17 } // 6 hours (rounded up)
      ];

      for (const testCase of testCases) {
        const entryTime = new Date('2024-01-01T10:00:00Z');
        const exitTime = new Date(entryTime.getTime() + (testCase.hours * 60 * 60 * 1000));
        
        const sessionWithTime = {
          ...mockSession,
          entryTime
        };

        mockVehicleRepository.findByLicensePlate.mockResolvedValue(mockVehicle);
        mockSessionRepository.findActiveByVehicle.mockResolvedValue(sessionWithTime);
        mockSessionRepository.update.mockResolvedValue({ ...sessionWithTime, status: SessionStatus.COMPLETED });
        mockSpotRepository.update.mockResolvedValue({ ...mockSpot, status: SpotStatus.AVAILABLE });
        
        mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
        mockTransactionManager.releaseSavepoint.mockResolvedValue(undefined);

        const result = await parkingService.exitVehicle('ABC123', exitTime);

        expect(result.data?.payment.amount).toBe(testCase.expectedFee);
      }
    });
  });

  describe('transferVehicle', () => {
    const mockTransferData: ISpotTransferData = {
      fromSpotId: 'spot-1',
      toSpotId: 'spot-2',
      reason: 'Customer request',
      metadata: { requestedBy: 'staff-1' }
    };

    const mockFromSpot = {
      id: 'spot-1',
      status: SpotStatus.OCCUPIED,
      currentVehicleId: 'vehicle-1'
    };

    const mockToSpot = {
      id: 'spot-2',
      status: SpotStatus.AVAILABLE
    };

    const mockSession = {
      id: 'session-1',
      spotId: 'spot-1',
      vehicleId: 'vehicle-1',
      status: SessionStatus.ACTIVE
    };

    beforeEach(() => {
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        const result = await callback(mockTransaction, mockTransactionContext);
        return {
          success: true,
          result,
          context: mockTransactionContext
        };
      });
    });

    it('should successfully transfer vehicle between spots', async () => {
      mockSpotRepository.findById
        .mockResolvedValueOnce(mockFromSpot)
        .mockResolvedValueOnce(mockToSpot);
      mockSessionRepository.findBySpotAndStatus.mockResolvedValue(mockSession);
      mockSessionRepository.update.mockResolvedValue({
        ...mockSession,
        spotId: 'spot-2'
      });
      mockSpotRepository.update
        .mockResolvedValueOnce({ ...mockFromSpot, status: SpotStatus.AVAILABLE })
        .mockResolvedValueOnce({ ...mockToSpot, status: SpotStatus.OCCUPIED });
      
      mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
      mockTransactionManager.releaseSavepoint.mockResolvedValue(undefined);

      const result = await parkingService.transferVehicle(mockTransferData);

      expect(result.success).toBe(true);
      expect(result.data?.session.spotId).toBe('spot-2');
      expect(result.data?.fromSpot.status).toBe(SpotStatus.AVAILABLE);
      expect(result.data?.toSpot.status).toBe(SpotStatus.OCCUPIED);

      // Verify sequence of operations
      expect(mockSpotRepository.findById).toHaveBeenCalledWith('spot-1', undefined, mockTransaction);
      expect(mockSpotRepository.findById).toHaveBeenCalledWith('spot-2', undefined, mockTransaction);
      expect(mockSessionRepository.findBySpotAndStatus).toHaveBeenCalledWith(
        'spot-1',
        SessionStatus.ACTIVE,
        undefined,
        mockTransaction
      );
    });

    it('should throw error when source spot is not occupied', async () => {
      mockSpotRepository.findById.mockResolvedValueOnce({
        ...mockFromSpot,
        status: SpotStatus.AVAILABLE
      });
      
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockTransaction, mockTransactionContext);
        } catch (error) {
          return {
            success: false,
            error,
            context: mockTransactionContext
          };
        }
      });

      const result = await parkingService.transferVehicle(mockTransferData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('is not occupied');
    });

    it('should throw error when destination spot is not available', async () => {
      mockSpotRepository.findById
        .mockResolvedValueOnce(mockFromSpot)
        .mockResolvedValueOnce({ ...mockToSpot, status: SpotStatus.OCCUPIED });
      
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockTransaction, mockTransactionContext);
        } catch (error) {
          return {
            success: false,
            error,
            context: mockTransactionContext
          };
        }
      });

      const result = await parkingService.transferVehicle(mockTransferData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('is not available');
    });

    it('should throw error when no active session found for source spot', async () => {
      mockSpotRepository.findById
        .mockResolvedValueOnce(mockFromSpot)
        .mockResolvedValueOnce(mockToSpot);
      mockSessionRepository.findBySpotAndStatus.mockResolvedValue(null);
      
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockTransaction, mockTransactionContext);
        } catch (error) {
          return {
            success: false,
            error,
            context: mockTransactionContext
          };
        }
      });

      const result = await parkingService.transferVehicle(mockTransferData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active session found');
    });
  });

  describe('bulkUpdateSpotStatus', () => {
    const spotIds = ['spot-1', 'spot-2', 'spot-3'];
    const targetStatus = SpotStatus.MAINTENANCE;
    const reason = 'Scheduled maintenance';

    beforeEach(() => {
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        const result = await callback(mockTransaction, mockTransactionContext);
        return {
          success: true,
          result,
          context: mockTransactionContext
        };
      });
    });

    it('should successfully update multiple spot statuses', async () => {
      const mockSpots = spotIds.map((id, index) => ({
        id,
        number: `A00${index + 1}`,
        status: SpotStatus.AVAILABLE
      }));

      const updatedSpots = mockSpots.map(spot => ({ ...spot, status: targetStatus }));

      mockSpotRepository.findById.mockImplementation((id) => 
        Promise.resolve(mockSpots.find(spot => spot.id === id) || null)
      );
      mockSpotRepository.update.mockImplementation((id) => 
        Promise.resolve(updatedSpots.find(spot => spot.id === id)!)
      );
      
      mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
      mockTransactionManager.releaseSavepoint.mockResolvedValue(undefined);

      const result = await parkingService.bulkUpdateSpotStatus(spotIds, targetStatus, reason);

      expect(result.success).toBe(true);
      expect(result.data?.updatedCount).toBe(3);
      expect(result.data?.spots).toHaveLength(3);
      expect(result.data?.spots.every(spot => spot.status === targetStatus)).toBe(true);
    });

    it('should handle large batches correctly', async () => {
      const largeSpotList = Array.from({ length: 150 }, (_, i) => `spot-${i + 1}`);
      
      mockSpotRepository.findById.mockResolvedValue({ id: 'spot-1', status: SpotStatus.AVAILABLE });
      mockSpotRepository.update.mockResolvedValue({ id: 'spot-1', status: targetStatus });
      
      mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
      mockTransactionManager.releaseSavepoint.mockResolvedValue(undefined);

      const result = await parkingService.bulkUpdateSpotStatus(largeSpotList, targetStatus);

      expect(result.success).toBe(true);
      expect(result.data?.updatedCount).toBe(150);
      // Should create savepoints for batches (150 spots / 50 batch size = 3 batches)
      expect(mockTransactionManager.createSavepoint).toHaveBeenCalledTimes(3);
    });

    it('should skip non-existent spots', async () => {
      mockSpotRepository.findById
        .mockResolvedValueOnce({ id: 'spot-1', status: SpotStatus.AVAILABLE })
        .mockResolvedValueOnce(null) // spot-2 doesn't exist
        .mockResolvedValueOnce({ id: 'spot-3', status: SpotStatus.AVAILABLE });
      
      mockSpotRepository.update.mockResolvedValue({ id: 'spot-1', status: targetStatus });
      
      mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
      mockTransactionManager.releaseSavepoint.mockResolvedValue(undefined);

      const result = await parkingService.bulkUpdateSpotStatus(spotIds, targetStatus);

      expect(result.success).toBe(true);
      expect(result.data?.updatedCount).toBe(2); // Only 2 spots updated (skip the null one)
      expect(mockSpotRepository.update).toHaveBeenCalledTimes(2);
    });

    it('should use correct transaction timeout for bulk operations', async () => {
      mockSpotRepository.findById.mockResolvedValue({ id: 'spot-1', status: SpotStatus.AVAILABLE });
      mockSpotRepository.update.mockResolvedValue({ id: 'spot-1', status: targetStatus });
      
      mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
      mockTransactionManager.releaseSavepoint.mockResolvedValue(undefined);

      await parkingService.bulkUpdateSpotStatus(spotIds, targetStatus);

      expect(mockTransactionManager.executeTransaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          priority: TransactionPriority.NORMAL,
          timeout: 60000
        })
      );
    });
  });

  describe('getServiceStatistics', () => {
    it('should return transaction statistics', async () => {
      const mockStats = {
        active: 2,
        total: 100,
        success: 95,
        averageDuration: 1500
      };

      mockTransactionManager.getTransactionStatistics.mockReturnValue(mockStats);

      const result = await parkingService.getServiceStatistics();

      expect(result).toEqual({
        activeTransactions: 2,
        totalTransactions: 100,
        successRate: 95,
        averageDuration: 1500
      });
    });

    it('should handle zero total transactions', async () => {
      const mockStats = {
        active: 0,
        total: 0,
        success: 0,
        averageDuration: 0
      };

      mockTransactionManager.getTransactionStatistics.mockReturnValue(mockStats);

      const result = await parkingService.getServiceStatistics();

      expect(result.successRate).toBe(0);
      expect(result.totalTransactions).toBe(0);
    });
  });

  describe('calculateParkingFee (private method testing via public methods)', () => {
    it('should calculate fees correctly through exitVehicle', async () => {
      const mockVehicle = {
        id: 'vehicle-1',
        licensePlate: 'ABC123',
        vehicleType: VehicleType.STANDARD
      };

      const testCases = [
        {
          entryTime: new Date('2024-01-01T10:00:00Z'),
          exitTime: new Date('2024-01-01T10:30:00Z'), // 30 minutes
          expectedFee: 5, // Base rate
          expectedHours: 1
        },
        {
          entryTime: new Date('2024-01-01T10:00:00Z'),
          exitTime: new Date('2024-01-01T11:00:00Z'), // 1 hour
          expectedFee: 5, // Base rate
          expectedHours: 1
        },
        {
          entryTime: new Date('2024-01-01T10:00:00Z'),
          exitTime: new Date('2024-01-01T11:01:00Z'), // 1 hour 1 minute
          expectedFee: 8, // Base rate + 1 additional hour
          expectedHours: 2
        },
        {
          entryTime: new Date('2024-01-01T10:00:00Z'),
          exitTime: new Date('2024-01-01T14:00:00Z'), // 4 hours
          expectedFee: 14, // Base rate + 3 additional hours
          expectedHours: 4
        }
      ];

      for (const testCase of testCases) {
        const mockSession = {
          id: 'session-1',
          spotId: 'spot-1',
          vehicleId: 'vehicle-1',
          status: SessionStatus.ACTIVE,
          entryTime: testCase.entryTime
        };

        mockVehicleRepository.findByLicensePlate.mockResolvedValue(mockVehicle);
        mockSessionRepository.findActiveByVehicle.mockResolvedValue(mockSession);
        mockSessionRepository.update.mockResolvedValue({
          ...mockSession,
          status: SessionStatus.COMPLETED,
          exitTime: testCase.exitTime,
          totalFee: testCase.expectedFee
        });
        mockSpotRepository.update.mockResolvedValue({
          id: 'spot-1',
          status: SpotStatus.AVAILABLE
        });
        
        mockTransactionManager.createSavepoint.mockResolvedValue({ id: 'savepoint-1' });
        mockTransactionManager.releaseSavepoint.mockResolvedValue(undefined);
        
        mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
          const result = await callback(mockTransaction, mockTransactionContext);
          return {
            success: true,
            result,
            context: mockTransactionContext
          };
        });

        const result = await parkingService.exitVehicle('ABC123', testCase.exitTime);

        expect(result.success).toBe(true);
        expect(result.data?.payment.amount).toBe(testCase.expectedFee);
        expect(result.data?.payment.hours).toBe(testCase.expectedHours);
      }
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle transaction manager initialization failure', () => {
      (TransactionManager.getInstance as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to initialize transaction manager');
      });

      expect(() => new ParkingService()).toThrow('Failed to initialize transaction manager');
    });

    it('should handle logging errors gracefully', async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      // Should not throw even if logging fails
      const sessionData: IParkingSessionData = {
        vehicle: { licensePlate: 'ABC123' },
        spotId: 'spot-1'
      };

      mockTransactionManager.executeTransaction.mockResolvedValue({
        success: false,
        error: new Error('Some error'),
        context: mockTransactionContext
      });

      const result = await parkingService.parkVehicle(sessionData);
      expect(result.success).toBe(false);
    });

    it('should handle concurrent park requests for same spot', async () => {
      // This would typically be handled by database constraints and transaction isolation
      const sessionData: IParkingSessionData = {
        vehicle: { licensePlate: 'ABC123' },
        spotId: 'spot-1'
      };

      mockTransactionManager.executeTransaction.mockRejectedValue(
        new TransactionError('Spot already occupied', 'CONCURRENT_ACCESS', 'tx-1', mockTransactionContext)
      );

      const result = await parkingService.parkVehicle(sessionData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Spot already occupied');
    });
  });

  describe('integration with transaction manager', () => {
    it('should properly handle transaction rollback on error', async () => {
      const sessionData: IParkingSessionData = {
        vehicle: { licensePlate: 'ABC123' },
        spotId: 'spot-1'
      };

      const mockError = new TransactionError('Test error', 'TEST_ERROR', 'tx-1', mockTransactionContext);
      
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockTransaction, mockTransactionContext);
        } catch (error) {
          return {
            success: false,
            error,
            context: mockTransactionContext
          };
        }
      });

      mockSpotRepository.findById.mockRejectedValue(mockError);

      const result = await parkingService.parkVehicle(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError.message);
      expect(result.transactionId).toBe(mockTransactionContext.id);
    });

    it('should measure operation duration correctly', async () => {
      const sessionData: IParkingSessionData = {
        vehicle: { licensePlate: 'ABC123' },
        spotId: 'spot-1'
      };

      // Mock a delayed response
      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        return {
          success: true,
          result: { session: {}, spot: {}, vehicle: {} },
          context: mockTransactionContext
        };
      });

      const startTime = Date.now();
      const result = await parkingService.parkVehicle(sessionData);
      const endTime = Date.now();

      expect(result.duration).toBeGreaterThanOrEqual(90); // Allow some tolerance
      expect(result.duration).toBeLessThanOrEqual(endTime - startTime + 10);
    });
  });
});

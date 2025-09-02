/**
 * Unit tests for VehicleRepository
 * 
 * Tests vehicle data access operations, search functionality,
 * validation, and error handling scenarios.
 */

import { VehicleRepository, CreateVehicleData, UpdateVehicleData, VehicleSearchCriteria } from '../../../src/repositories/VehicleRepository';
import { DatabaseService } from '../../../src/services/DatabaseService';
import { PrismaAdapter } from '../../../src/adapters/PrismaAdapter';
import { Vehicle, VehicleType, VehicleStatus, Prisma } from '@prisma/client';
import { createLogger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/services/DatabaseService');
jest.mock('../../../src/utils/logger');

describe('VehicleRepository', () => {
  let vehicleRepository: VehicleRepository;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockPrismaClient: any;
  let mockVehicleDelegate: any;
  let mockLogger: any;

  const mockVehicle: Vehicle = {
    id: 'vehicle-1',
    licensePlate: 'ABC123',
    vehicleType: VehicleType.STANDARD,
    make: 'Toyota',
    model: 'Camry',
    color: 'Blue',
    year: 2020,
    ownerName: 'John Doe',
    ownerEmail: 'john@example.com',
    ownerPhone: '+1234567890',
    status: VehicleStatus.ACTIVE,
    currentSpotId: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    deletedAt: null
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup logger mock
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    // Setup vehicle delegate mock
    mockVehicleDelegate = {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    };

    // Setup Prisma client mock
    mockPrismaClient = {
      vehicle: mockVehicleDelegate,
      $queryRaw: jest.fn(),
      $transaction: jest.fn()
    };

    // Setup database service mock
    mockDatabaseService = {
      getInstance: jest.fn().mockReturnThis(),
      getClient: jest.fn().mockReturnValue(mockPrismaClient)
    } as any;
    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDatabaseService);

    vehicleRepository = new VehicleRepository(mockDatabaseService, mockLogger);
  });

  describe('constructor', () => {
    it('should create instance with provided dependencies', () => {
      expect(vehicleRepository).toBeInstanceOf(VehicleRepository);
      expect(vehicleRepository).toBeInstanceOf(PrismaAdapter);
      expect(createLogger).toHaveBeenCalledWith('VehicleRepository');
      expect(mockDatabaseService.getClient).toHaveBeenCalled();
    });

    it('should create instance with default dependencies when none provided', () => {
      const repository = new VehicleRepository();
      expect(repository).toBeInstanceOf(VehicleRepository);
      expect(DatabaseService.getInstance).toHaveBeenCalled();
    });
  });

  describe('findByLicensePlate', () => {
    it('should find vehicle by license plate', async () => {
      mockVehicleDelegate.findFirst.mockResolvedValue(mockVehicle);

      const result = await vehicleRepository.findByLicensePlate('ABC123');

      expect(result).toEqual(mockVehicle);
      expect(mockVehicleDelegate.findFirst).toHaveBeenCalledWith({
        where: {
          licensePlate: 'ABC123',
          deletedAt: null
        }
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Found vehicle by license plate', {
        licensePlate: 'ABC123',
        found: true
      });
    });

    it('should normalize license plate to uppercase', async () => {
      mockVehicleDelegate.findFirst.mockResolvedValue(mockVehicle);

      await vehicleRepository.findByLicensePlate('abc123');

      expect(mockVehicleDelegate.findFirst).toHaveBeenCalledWith({
        where: {
          licensePlate: 'ABC123',
          deletedAt: null
        }
      });
    });

    it('should return null when vehicle not found', async () => {
      mockVehicleDelegate.findFirst.mockResolvedValue(null);

      const result = await vehicleRepository.findByLicensePlate('NOTFOUND');

      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith('Found vehicle by license plate', {
        licensePlate: 'NOTFOUND',
        found: false
      });
    });

    it('should work with transaction client', async () => {
      const mockTx = { vehicle: { findFirst: jest.fn().mockResolvedValue(mockVehicle) } };
      
      const result = await vehicleRepository.findByLicensePlate('ABC123', undefined, mockTx as any);

      expect(result).toEqual(mockVehicle);
      expect(mockTx.vehicle.findFirst).toHaveBeenCalled();
      expect(mockVehicleDelegate.findFirst).not.toHaveBeenCalled();
    });

    it('should apply query options', async () => {
      mockVehicleDelegate.findFirst.mockResolvedValue(mockVehicle);
      const options = {
        include: { sessions: true },
        select: { id: true, licensePlate: true }
      };

      // Mock buildQueryOptions method
      const buildQueryOptionsSpy = jest.spyOn(vehicleRepository as any, 'buildQueryOptions')
        .mockReturnValue(options);

      await vehicleRepository.findByLicensePlate('ABC123', options);

      expect(buildQueryOptionsSpy).toHaveBeenCalledWith(options);
      expect(mockVehicleDelegate.findFirst).toHaveBeenCalledWith({
        where: {
          licensePlate: 'ABC123',
          deletedAt: null
        },
        ...options
      });
    });
  });

  describe('findByStatus', () => {
    it('should find vehicles by status', async () => {
      const vehicles = [mockVehicle, { ...mockVehicle, id: 'vehicle-2' }];
      const findManySpy = jest.spyOn(vehicleRepository, 'findMany')
        .mockResolvedValue(vehicles);

      const result = await vehicleRepository.findByStatus(VehicleStatus.ACTIVE);

      expect(result).toEqual(vehicles);
      expect(findManySpy).toHaveBeenCalledWith({ status: VehicleStatus.ACTIVE }, undefined);
    });
  });

  describe('findByType', () => {
    it('should find vehicles by type', async () => {
      const vehicles = [mockVehicle];
      const findManySpy = jest.spyOn(vehicleRepository, 'findMany')
        .mockResolvedValue(vehicles);

      const result = await vehicleRepository.findByType(VehicleType.STANDARD);

      expect(result).toEqual(vehicles);
      expect(findManySpy).toHaveBeenCalledWith({ vehicleType: VehicleType.STANDARD }, undefined);
    });
  });

  describe('findByOwner', () => {
    it('should find vehicles by owner name', async () => {
      const vehicles = [mockVehicle];
      mockVehicleDelegate.findMany.mockResolvedValue(vehicles);

      const result = await vehicleRepository.findByOwner('John Doe');

      expect(result).toEqual(vehicles);
      expect(mockVehicleDelegate.findMany).toHaveBeenCalledWith({
        where: {
          ownerName: {
            contains: 'John Doe'
          },
          deletedAt: null
        }
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Found vehicles by owner', {
        ownerName: 'John Doe',
        count: 1
      });
    });

    it('should return empty array when no vehicles found for owner', async () => {
      mockVehicleDelegate.findMany.mockResolvedValue([]);

      const result = await vehicleRepository.findByOwner('Unknown Owner');

      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith('Found vehicles by owner', {
        ownerName: 'Unknown Owner',
        count: 0
      });
    });
  });

  describe('findByMakeModel', () => {
    it('should find vehicles by make and model', async () => {
      const vehicles = [mockVehicle];
      mockVehicleDelegate.findMany.mockResolvedValue(vehicles);

      const result = await vehicleRepository.findByMakeModel('Toyota', 'Camry');

      expect(result).toEqual(vehicles);
      expect(mockVehicleDelegate.findMany).toHaveBeenCalledWith({
        where: {
          make: { contains: 'Toyota' },
          model: { contains: 'Camry' },
          deletedAt: null
        }
      });
    });

    it('should find vehicles by make only', async () => {
      const vehicles = [mockVehicle];
      mockVehicleDelegate.findMany.mockResolvedValue(vehicles);

      const result = await vehicleRepository.findByMakeModel('Toyota');

      expect(result).toEqual(vehicles);
      expect(mockVehicleDelegate.findMany).toHaveBeenCalledWith({
        where: {
          make: { contains: 'Toyota' },
          deletedAt: null
        }
      });
    });

    it('should find vehicles by model only', async () => {
      const vehicles = [mockVehicle];
      mockVehicleDelegate.findMany.mockResolvedValue(vehicles);

      const result = await vehicleRepository.findByMakeModel(undefined, 'Camry');

      expect(result).toEqual(vehicles);
      expect(mockVehicleDelegate.findMany).toHaveBeenCalledWith({
        where: {
          model: { contains: 'Camry' },
          deletedAt: null
        }
      });
    });
  });

  describe('search', () => {
    const searchCriteria: VehicleSearchCriteria = {
      licensePlate: 'ABC',
      vehicleType: VehicleType.STANDARD,
      make: 'Toyota',
      model: 'Camry',
      color: 'Blue',
      ownerName: 'John',
      ownerEmail: 'john@',
      status: VehicleStatus.ACTIVE,
      yearFrom: 2019,
      yearTo: 2021
    };

    it('should search vehicles with all criteria', async () => {
      const vehicles = [mockVehicle];
      mockVehicleDelegate.findMany.mockResolvedValue(vehicles);

      const result = await vehicleRepository.search(searchCriteria);

      expect(result).toEqual(vehicles);
      expect(mockVehicleDelegate.findMany).toHaveBeenCalledWith({
        where: {
          licensePlate: { contains: 'ABC' },
          vehicleType: VehicleType.STANDARD,
          status: VehicleStatus.ACTIVE,
          make: { contains: 'Toyota' },
          model: { contains: 'Camry' },
          color: { contains: 'Blue' },
          ownerName: { contains: 'John' },
          ownerEmail: { contains: 'john@' },
          year: {
            gte: 2019,
            lte: 2021
          },
          deletedAt: null
        }
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Vehicle search completed', {
        criteria: searchCriteria,
        count: 1
      });
    });

    it('should search with partial criteria', async () => {
      const partialCriteria = {
        licensePlate: 'ABC',
        vehicleType: VehicleType.STANDARD
      };
      const vehicles = [mockVehicle];
      mockVehicleDelegate.findMany.mockResolvedValue(vehicles);

      const result = await vehicleRepository.search(partialCriteria);

      expect(result).toEqual(vehicles);
      expect(mockVehicleDelegate.findMany).toHaveBeenCalledWith({
        where: {
          licensePlate: { contains: 'ABC' },
          vehicleType: VehicleType.STANDARD,
          deletedAt: null
        }
      });
    });

    it('should handle year range with only yearFrom', async () => {
      const criteria = { yearFrom: 2020 };
      mockVehicleDelegate.findMany.mockResolvedValue([mockVehicle]);

      await vehicleRepository.search(criteria);

      expect(mockVehicleDelegate.findMany).toHaveBeenCalledWith({
        where: {
          year: { gte: 2020 },
          deletedAt: null
        }
      });
    });

    it('should handle year range with only yearTo', async () => {
      const criteria = { yearTo: 2020 };
      mockVehicleDelegate.findMany.mockResolvedValue([mockVehicle]);

      await vehicleRepository.search(criteria);

      expect(mockVehicleDelegate.findMany).toHaveBeenCalledWith({
        where: {
          year: { lte: 2020 },
          deletedAt: null
        }
      });
    });
  });

  describe('findCurrentlyParked', () => {
    it('should find vehicles currently parked', async () => {
      const parkedVehicles = [{
        ...mockVehicle,
        currentSpotId: 'spot-1',
        currentSpot: { id: 'spot-1', number: 'A001' },
        sessions: [{
          id: 'session-1',
          status: 'ACTIVE',
          checkInTime: new Date()
        }]
      }];
      mockVehicleDelegate.findMany.mockResolvedValue(parkedVehicles);

      const result = await vehicleRepository.findCurrentlyParked();

      expect(result).toEqual(parkedVehicles);
      expect(mockVehicleDelegate.findMany).toHaveBeenCalledWith({
        where: {
          currentSpotId: { not: null },
          sessions: {
            some: {
              status: 'ACTIVE',
              deletedAt: null
            }
          },
          deletedAt: null
        },
        include: {
          currentSpot: true,
          sessions: {
            where: {
              status: 'ACTIVE',
              deletedAt: null
            },
            take: 1,
            orderBy: {
              checkInTime: 'desc'
            }
          }
        }
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Found currently parked vehicles', {
        count: 1
      });
    });
  });

  describe('getStats', () => {
    it('should return comprehensive vehicle statistics', async () => {
      const countSpy = jest.spyOn(vehicleRepository, 'count').mockResolvedValue(100);
      
      const statusCounts = [
        { status: VehicleStatus.ACTIVE, count: BigInt(80) },
        { status: VehicleStatus.INACTIVE, count: BigInt(20) }
      ];
      
      const typeCounts = [
        { vehicleType: VehicleType.STANDARD, count: BigInt(70) },
        { vehicleType: VehicleType.COMPACT, count: BigInt(30) }
      ];
      
      const revenueAndDuration = [
        { totalRevenue: 5000.50, avgDuration: 120.5 }
      ];

      mockPrismaClient.$queryRaw
        .mockResolvedValueOnce(statusCounts)
        .mockResolvedValueOnce(typeCounts)
        .mockResolvedValueOnce(revenueAndDuration);

      const result = await vehicleRepository.getStats();

      expect(result).toEqual({
        total: 100,
        byStatus: {
          [VehicleStatus.ACTIVE]: 80,
          [VehicleStatus.INACTIVE]: 20
        },
        byType: {
          [VehicleType.STANDARD]: 70,
          [VehicleType.COMPACT]: 30
        },
        totalRevenue: 5000.50,
        averageSessionDuration: 120.5
      });
      
      expect(countSpy).toHaveBeenCalled();
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(3);
      expect(mockLogger.debug).toHaveBeenCalledWith('Vehicle statistics calculated', expect.any(Object));
    });

    it('should handle empty statistics gracefully', async () => {
      const countSpy = jest.spyOn(vehicleRepository, 'count').mockResolvedValue(0);
      
      mockPrismaClient.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await vehicleRepository.getStats();

      expect(result).toEqual({
        total: 0,
        byStatus: {},
        byType: {},
        totalRevenue: 0,
        averageSessionDuration: 0
      });
    });
  });

  describe('findOverstayed', () => {
    it('should find vehicles that have overstayed parking time', async () => {
      const overstayedVehicles = [{
        ...mockVehicle,
        currentSpotId: 'spot-1',
        currentSpot: { id: 'spot-1', number: 'A001' },
        sessions: [{
          id: 'session-1',
          status: 'ACTIVE',
          checkInTime: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
        }]
      }];
      
      mockVehicleDelegate.findMany.mockResolvedValue(overstayedVehicles);
      
      const maxHours = 24;
      const result = await vehicleRepository.findOverstayed(maxHours);

      expect(result).toEqual(overstayedVehicles);
      expect(mockVehicleDelegate.findMany).toHaveBeenCalledWith({
        where: {
          currentSpotId: { not: null },
          sessions: {
            some: {
              status: 'ACTIVE',
              checkInTime: {
                lte: expect.any(Date)
              },
              deletedAt: null
            }
          },
          deletedAt: null
        },
        include: {
          currentSpot: true,
          sessions: {
            where: {
              status: 'ACTIVE',
              deletedAt: null
            },
            take: 1,
            orderBy: {
              checkInTime: 'desc'
            }
          }
        }
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Found overstayed vehicles', {
        maxHours,
        count: 1,
        cutoffTime: expect.any(Date)
      });
    });

    it('should use default max hours when not specified', async () => {
      mockVehicleDelegate.findMany.mockResolvedValue([]);

      await vehicleRepository.findOverstayed();

      expect(mockLogger.debug).toHaveBeenCalledWith('Found overstayed vehicles', {
        maxHours: 24, // Default value
        count: 0,
        cutoffTime: expect.any(Date)
      });
    });
  });

  describe('updateWithValidation', () => {
    it('should update vehicle with license plate validation', async () => {
      const updateData: UpdateVehicleData = {
        licensePlate: 'xyz789',
        color: 'Red'
      };
      
      const updatedVehicle = { ...mockVehicle, ...updateData, licensePlate: 'XYZ789' };
      
      // Mock that no other vehicle has this license plate
      mockVehicleDelegate.findFirst.mockResolvedValue(null);
      
      const updateSpy = jest.spyOn(vehicleRepository, 'update').mockResolvedValue(updatedVehicle);

      const result = await vehicleRepository.updateWithValidation('vehicle-1', updateData);

      expect(result).toEqual(updatedVehicle);
      expect(mockVehicleDelegate.findFirst).toHaveBeenCalledWith({
        where: {
          licensePlate: 'XYZ789',
          id: { not: 'vehicle-1' },
          deletedAt: null
        }
      });
      expect(updateSpy).toHaveBeenCalledWith('vehicle-1', {
        ...updateData,
        licensePlate: 'XYZ789'
      }, undefined);
    });

    it('should throw error when license plate already exists', async () => {
      const updateData: UpdateVehicleData = {
        licensePlate: 'xyz789'
      };
      
      // Mock that another vehicle already has this license plate
      mockVehicleDelegate.findFirst.mockResolvedValue({
        id: 'other-vehicle',
        licensePlate: 'XYZ789'
      });

      await expect(vehicleRepository.updateWithValidation('vehicle-1', updateData))
        .rejects.toThrow('Vehicle with license plate XYZ789 already exists');
      
      expect(mockVehicleDelegate.findFirst).toHaveBeenCalledWith({
        where: {
          licensePlate: 'XYZ789',
          id: { not: 'vehicle-1' },
          deletedAt: null
        }
      });
    });

    it('should update without validation when license plate not changed', async () => {
      const updateData: UpdateVehicleData = {
        color: 'Red'
      };
      
      const updatedVehicle = { ...mockVehicle, color: 'Red' };
      const updateSpy = jest.spyOn(vehicleRepository, 'update').mockResolvedValue(updatedVehicle);

      const result = await vehicleRepository.updateWithValidation('vehicle-1', updateData);

      expect(result).toEqual(updatedVehicle);
      expect(mockVehicleDelegate.findFirst).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith('vehicle-1', updateData, undefined);
    });
  });

  describe('createWithValidation', () => {
    it('should create vehicle with license plate validation', async () => {
      const createData: CreateVehicleData = {
        licensePlate: 'xyz789',
        vehicleType: VehicleType.STANDARD,
        make: 'Honda',
        model: 'Accord'
      };
      
      const createdVehicle = { ...mockVehicle, ...createData, licensePlate: 'XYZ789' };
      
      // Mock that no vehicle has this license plate
      mockVehicleDelegate.findFirst.mockResolvedValue(null);
      
      const createSpy = jest.spyOn(vehicleRepository, 'create').mockResolvedValue(createdVehicle);

      const result = await vehicleRepository.createWithValidation(createData);

      expect(result).toEqual(createdVehicle);
      expect(mockVehicleDelegate.findFirst).toHaveBeenCalledWith({
        where: {
          licensePlate: 'XYZ789',
          deletedAt: null
        }
      });
      expect(createSpy).toHaveBeenCalledWith({
        ...createData,
        licensePlate: 'XYZ789'
      });
    });

    it('should throw error when license plate already exists', async () => {
      const createData: CreateVehicleData = {
        licensePlate: 'abc123',
        vehicleType: VehicleType.STANDARD
      };
      
      // Mock that a vehicle already has this license plate
      mockVehicleDelegate.findFirst.mockResolvedValue(mockVehicle);

      await expect(vehicleRepository.createWithValidation(createData))
        .rejects.toThrow('Vehicle with license plate ABC123 already exists');
      
      expect(mockVehicleDelegate.findFirst).toHaveBeenCalledWith({
        where: {
          licensePlate: 'ABC123',
          deletedAt: null
        }
      });
    });
  });

  describe('legacy findById method', () => {
    it('should use findByLicensePlate for license plate format', async () => {
      const findByLicensePlateSpy = jest.spyOn(vehicleRepository, 'findByLicensePlate')
        .mockResolvedValue(mockVehicle);
      
      const result = await vehicleRepository.findById('ABC123');

      expect(result).toEqual(mockVehicle);
      expect(findByLicensePlateSpy).toHaveBeenCalledWith('ABC123', undefined);
    });

    it('should use parent findById for UUID format', async () => {
      const uuidId = '123e4567-e89b-12d3-a456-426614174000';
      const parentFindByIdSpy = jest.spyOn(PrismaAdapter.prototype, 'findById')
        .mockResolvedValue(mockVehicle);
      
      const result = await vehicleRepository.findById(uuidId);

      expect(result).toEqual(mockVehicle);
      expect(parentFindByIdSpy).toHaveBeenCalledWith(uuidId, undefined);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockVehicleDelegate.findFirst.mockRejectedValue(dbError);

      await expect(vehicleRepository.findByLicensePlate('ABC123'))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle transaction rollback scenarios', async () => {
      const transactionError = new Error('Transaction rolled back');
      const mockTx = { 
        vehicle: { 
          findFirst: jest.fn().mockRejectedValue(transactionError) 
        } 
      };

      await expect(vehicleRepository.findByLicensePlate('ABC123', undefined, mockTx as any))
        .rejects.toThrow('Transaction rolled back');
    });

    it('should handle invalid query options', async () => {
      const invalidOptions = { invalidOption: true } as any;
      mockVehicleDelegate.findFirst.mockResolvedValue(mockVehicle);
      
      // Mock buildQueryOptions to handle invalid options
      const buildQueryOptionsSpy = jest.spyOn(vehicleRepository as any, 'buildQueryOptions')
        .mockReturnValue({});

      await vehicleRepository.findByLicensePlate('ABC123', invalidOptions);

      expect(buildQueryOptionsSpy).toHaveBeenCalledWith(invalidOptions);
    });

    it('should handle empty search results consistently', async () => {
      mockVehicleDelegate.findMany.mockResolvedValue([]);

      const results = await Promise.all([
        vehicleRepository.findByOwner('Nonexistent Owner'),
        vehicleRepository.findByMakeModel('Nonexistent Make'),
        vehicleRepository.search({ licensePlate: 'NOTFOUND' }),
        vehicleRepository.findCurrentlyParked(),
        vehicleRepository.findOverstayed()
      ]);

      results.forEach(result => {
        expect(result).toEqual([]);
      });
    });

    it('should handle large result sets efficiently', async () => {
      const largeResultSet = Array.from({ length: 10000 }, (_, i) => ({
        ...mockVehicle,
        id: `vehicle-${i}`,
        licensePlate: `ABC${i.toString().padStart(3, '0')}`
      }));
      
      mockVehicleDelegate.findMany.mockResolvedValue(largeResultSet);

      const result = await vehicleRepository.search({});

      expect(result).toHaveLength(10000);
      expect(mockLogger.debug).toHaveBeenCalledWith('Vehicle search completed', {
        criteria: {},
        count: 10000
      });
    });
  });

  describe('performance and optimization', () => {
    it('should use appropriate query options for performance', async () => {
      const performanceOptions = {
        select: {
          id: true,
          licensePlate: true,
          status: true
        },
        take: 100,
        skip: 0
      };
      
      mockVehicleDelegate.findMany.mockResolvedValue([mockVehicle]);
      
      const buildQueryOptionsSpy = jest.spyOn(vehicleRepository as any, 'buildQueryOptions')
        .mockReturnValue(performanceOptions);

      await vehicleRepository.search({}, performanceOptions);

      expect(buildQueryOptionsSpy).toHaveBeenCalledWith(performanceOptions);
      expect(mockVehicleDelegate.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        ...performanceOptions
      });
    });

    it('should handle concurrent read operations', async () => {
      mockVehicleDelegate.findFirst.mockImplementation((query) => {
        return Promise.resolve({
          ...mockVehicle,
          licensePlate: query.where.licensePlate
        });
      });

      const concurrentOperations = Array.from({ length: 10 }, (_, i) => 
        vehicleRepository.findByLicensePlate(`ABC${i}`)
      );

      const results = await Promise.all(concurrentOperations);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result?.licensePlate).toBe(`ABC${i}`);
      });
    });
  });

  describe('data consistency', () => {
    it('should maintain data integrity during updates', async () => {
      const updateData: UpdateVehicleData = {
        licensePlate: 'NEW123',
        status: VehicleStatus.INACTIVE
      };
      
      mockVehicleDelegate.findFirst.mockResolvedValue(null);
      const updateSpy = jest.spyOn(vehicleRepository, 'update')
        .mockResolvedValue({ ...mockVehicle, ...updateData });

      await vehicleRepository.updateWithValidation('vehicle-1', updateData);

      expect(updateSpy).toHaveBeenCalledWith('vehicle-1', updateData, undefined);
    });

    it('should handle soft deletes correctly', async () => {
      const deletedVehicle = {
        ...mockVehicle,
        deletedAt: new Date()
      };
      
      // Should not find soft-deleted vehicles in normal queries
      mockVehicleDelegate.findFirst.mockImplementation(({ where }) => {
        if (where.deletedAt === null) {
          return Promise.resolve(null);
        }
        return Promise.resolve(deletedVehicle);
      });

      const result = await vehicleRepository.findByLicensePlate('ABC123');
      expect(result).toBeNull();
      
      expect(mockVehicleDelegate.findFirst).toHaveBeenCalledWith({
        where: {
          licensePlate: 'ABC123',
          deletedAt: null
        }
      });
    });
  });
});

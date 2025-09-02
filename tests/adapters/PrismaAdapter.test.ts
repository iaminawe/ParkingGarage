/**
 * PrismaAdapter unit tests
 * 
 * Comprehensive tests for the PrismaAdapter base class
 * including CRUD operations, error handling, transactions,
 * and connection management.
 * 
 * @module PrismaAdapterTests
 */

import { PrismaClient, Prisma, VehicleStatus, VehicleType } from '../../src/generated/prisma';
import { PrismaAdapter, PrismaConnectionManager } from '../../src/adapters/PrismaAdapter';
import { VehicleAdapter, VehicleCreateData, VehicleUpdateData } from '../../src/adapters/VehicleAdapter';
import { DomainError, ErrorCode, handlePrismaError } from '../../src/utils/prisma-errors';
import { ConsoleLogger, NoopLogger } from '../../src/utils/logger';

// Test implementation of PrismaAdapter for testing
class TestAdapter extends PrismaAdapter<any, any, any> {
  protected readonly modelName = 'vehicle'; // Use actual model name from schema
  protected readonly delegate = {} as any;
}

// Mock PrismaClient for testing
const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  $queryRawUnsafe: jest.fn(),
  $executeRaw: jest.fn(),
  $executeRawUnsafe: jest.fn(),
  $transaction: jest.fn(),
  vehicle: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    groupBy: jest.fn()
  }
} as unknown as PrismaClient;

describe('PrismaAdapter', () => {
  let adapter: TestAdapter;
  let logger: NoopLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new NoopLogger();
    adapter = new TestAdapter(mockPrismaClient, logger);
  });

  describe('Connection Management', () => {
    let connectionManager: PrismaConnectionManager;

    beforeEach(() => {
      connectionManager = new PrismaConnectionManager(mockPrismaClient, logger);
    });

    test('should connect to database successfully', async () => {
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValue(undefined);

      await connectionManager.connect();

      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
      expect(connectionManager.isConnected()).toBe(true);
    });

    test('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      (mockPrismaClient.$connect as jest.Mock).mockRejectedValue(error);

      await expect(connectionManager.connect()).rejects.toThrow(DomainError);
      expect(connectionManager.isConnected()).toBe(false);
    });

    test('should disconnect from database', async () => {
      (mockPrismaClient.$disconnect as jest.Mock).mockResolvedValue(undefined);

      await connectionManager.disconnect();

      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1);
      expect(connectionManager.isConnected()).toBe(false);
    });

    test('should perform health check', async () => {
      (mockPrismaClient.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const isHealthy = await connectionManager.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });

    test('should handle failed health check', async () => {
      (mockPrismaClient.$queryRaw as jest.Mock).mockRejectedValue(new Error('Query failed'));

      const isHealthy = await connectionManager.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('CRUD Operations', () => {
    const mockRecord = {
      id: 'test-id-1',
      name: 'Test Record',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    };

    describe('create', () => {
      test('should create a new record successfully', async () => {
        const createData = { name: 'Test Record' };
        (mockPrismaClient.vehicle.create as jest.Mock).mockResolvedValue(mockRecord);

        const result = await adapter.create(createData);

        expect(result).toEqual(mockRecord);
        expect(mockPrismaClient.vehicle.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'Test Record',
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date)
          })
        });
      });

      test('should handle create errors', async () => {
        const createData = { name: 'Test Record' };
        const prismaError = new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed',
          { code: 'P2002', clientVersion: '4.0.0' }
        );
        (mockPrismaClient.vehicle.create as jest.Mock).mockRejectedValue(prismaError);

        await expect(adapter.create(createData)).rejects.toThrow(DomainError);
      });
    });

    describe('findById', () => {
      test('should find record by ID', async () => {
        (mockPrismaClient.vehicle.findFirst as jest.Mock).mockResolvedValue(mockRecord);

        const result = await adapter.findById('test-id-1');

        expect(result).toEqual(mockRecord);
        expect(mockPrismaClient.vehicle.findFirst).toHaveBeenCalledWith({
          where: { id: 'test-id-1', deletedAt: null }
        });
      });

      test('should return null when record not found', async () => {
        (mockPrismaClient.vehicle.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await adapter.findById('nonexistent-id');

        expect(result).toBeNull();
      });
    });

    describe('findMany', () => {
      test('should find multiple records with filter', async () => {
        const records = [mockRecord];
        (mockPrismaClient.vehicle.findMany as jest.Mock).mockResolvedValue(records);

        const result = await adapter.findMany({ name: 'Test' });

        expect(result).toEqual(records);
        expect(mockPrismaClient.vehicle.findMany).toHaveBeenCalledWith({
          where: { name: 'Test', deletedAt: null }
        });
      });
    });

    describe('findAll', () => {
      test('should find all records with pagination', async () => {
        const records = [mockRecord];
        (mockPrismaClient.vehicle.count as jest.Mock).mockResolvedValue(1);
        (mockPrismaClient.vehicle.findMany as jest.Mock).mockResolvedValue(records);

        const result = await adapter.findAll({ take: 10, skip: 0 });

        expect(result).toEqual({
          data: records,
          totalCount: 1,
          hasNextPage: false,
          hasPrevPage: false,
          currentPage: 1,
          totalPages: 1
        });
      });
    });

    describe('update', () => {
      test('should update record successfully', async () => {
        const updateData = { name: 'Updated Record' };
        const updatedRecord = { ...mockRecord, name: 'Updated Record' };
        (mockPrismaClient.vehicle.update as jest.Mock).mockResolvedValue(updatedRecord);

        const result = await adapter.update('test-id-1', updateData);

        expect(result).toEqual(updatedRecord);
        expect(mockPrismaClient.vehicle.update).toHaveBeenCalledWith({
          where: { id: 'test-id-1', deletedAt: null },
          data: expect.objectContaining({
            name: 'Updated Record',
            updatedAt: expect.any(Date)
          })
        });
      });

      test('should handle update errors', async () => {
        const updateData = { name: 'Updated Record' };
        const prismaError = new Prisma.PrismaClientKnownRequestError(
          'Record not found',
          { code: 'P2025', clientVersion: '4.0.0' }
        );
        (mockPrismaClient.vehicle.update as jest.Mock).mockRejectedValue(prismaError);

        await expect(adapter.update('nonexistent-id', updateData)).rejects.toThrow(DomainError);
      });
    });

    describe('delete', () => {
      test('should delete record successfully', async () => {
        (mockPrismaClient.vehicle.delete as jest.Mock).mockResolvedValue(mockRecord);

        const result = await adapter.delete('test-id-1');

        expect(result).toEqual(mockRecord);
        expect(mockPrismaClient.vehicle.delete).toHaveBeenCalledWith({
          where: { id: 'test-id-1' }
        });
      });
    });

    describe('softDelete', () => {
      test('should soft delete record successfully', async () => {
        const softDeletedRecord = { ...mockRecord, deletedAt: new Date() };
        (mockPrismaClient.vehicle.update as jest.Mock).mockResolvedValue(softDeletedRecord);

        const result = await adapter.softDelete('test-id-1');

        expect(result).toEqual(softDeletedRecord);
        expect(mockPrismaClient.vehicle.update).toHaveBeenCalledWith({
          where: { id: 'test-id-1', deletedAt: null },
          data: {
            deletedAt: expect.any(Date),
            updatedAt: expect.any(Date)
          }
        });
      });
    });

    describe('count', () => {
      test('should count records successfully', async () => {
        (mockPrismaClient.vehicle.count as jest.Mock).mockResolvedValue(5);

        const result = await adapter.count({ name: 'Test' });

        expect(result).toBe(5);
        expect(mockPrismaClient.vehicle.count).toHaveBeenCalledWith({
          where: { name: 'Test', deletedAt: null }
        });
      });
    });

    describe('exists', () => {
      test('should return true when record exists', async () => {
        (mockPrismaClient.vehicle.findFirst as jest.Mock).mockResolvedValue({ id: 'test-id-1' });

        const result = await adapter.exists('test-id-1');

        expect(result).toBe(true);
        expect(mockPrismaClient.vehicle.findFirst).toHaveBeenCalledWith({
          where: { id: 'test-id-1', deletedAt: null },
          select: { id: true }
        });
      });

      test('should return false when record does not exist', async () => {
        (mockPrismaClient.vehicle.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await adapter.exists('nonexistent-id');

        expect(result).toBe(false);
      });
    });
  });

  describe('Bulk Operations', () => {
    test('should create many records', async () => {
      const batchResult = { count: 3 };
      (mockPrismaClient.vehicle.createMany as jest.Mock).mockResolvedValue(batchResult);

      const data = [
        { name: 'Record 1' },
        { name: 'Record 2' },
        { name: 'Record 3' }
      ];

      const result = await adapter.createMany(data);

      expect(result).toEqual(batchResult);
      expect(mockPrismaClient.vehicle.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Record 1' }),
          expect.objectContaining({ name: 'Record 2' }),
          expect.objectContaining({ name: 'Record 3' })
        ]),
        skipDuplicates: true
      });
    });

    test('should update many records', async () => {
      const batchResult = { count: 2 };
      (mockPrismaClient.vehicle.updateMany as jest.Mock).mockResolvedValue(batchResult);

      const result = await adapter.updateMany(
        { name: 'Old Name' },
        { name: 'New Name' }
      );

      expect(result).toEqual(batchResult);
      expect(mockPrismaClient.vehicle.updateMany).toHaveBeenCalledWith({
        where: { name: 'Old Name', deletedAt: null },
        data: expect.objectContaining({
          name: 'New Name',
          updatedAt: expect.any(Date)
        })
      });
    });

    test('should delete many records', async () => {
      const batchResult = { count: 2 };
      (mockPrismaClient.vehicle.deleteMany as jest.Mock).mockResolvedValue(batchResult);

      const result = await adapter.deleteMany({ name: 'Test' });

      expect(result).toEqual(batchResult);
      expect(mockPrismaClient.vehicle.deleteMany).toHaveBeenCalledWith({
        where: { name: 'Test' }
      });
    });
  });

  describe('Raw Queries', () => {
    test('should execute raw SQL', async () => {
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValue(1);

      const result = await adapter.executeRaw('UPDATE table SET column = value');

      expect(result).toBe(1);
    });

    test('should query raw SQL', async () => {
      const queryResult = [{ count: 5 }];
      (mockPrismaClient.$queryRawUnsafe as jest.Mock).mockResolvedValue(queryResult);

      const result = await adapter.queryRaw('SELECT COUNT(*) as count FROM table');

      expect(result).toEqual(queryResult);
    });
  });

  describe('Transactions', () => {
    test('should execute transaction successfully', async () => {
      const transactionResult = { success: true };
      (mockPrismaClient.$transaction as jest.Mock).mockImplementation(callback => 
        callback(mockPrismaClient)
      );

      const result = await adapter.executeTransaction(async (tx) => {
        return { success: true };
      });

      expect(result).toEqual(transactionResult);
      expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(1);
    });

    test('should handle transaction errors', async () => {
      const transactionError = new Error('Transaction failed');
      (mockPrismaClient.$transaction as jest.Mock).mockRejectedValue(transactionError);

      await expect(
        adapter.executeTransaction(async (tx) => {
          return { success: true };
        })
      ).rejects.toThrow();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources', async () => {
      (mockPrismaClient.$disconnect as jest.Mock).mockResolvedValue(undefined);

      await adapter.cleanup();

      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1);
    });
  });
});

describe('VehicleAdapter', () => {
  let vehicleAdapter: VehicleAdapter;
  let logger: NoopLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new NoopLogger();
    vehicleAdapter = new VehicleAdapter(mockPrismaClient, logger);
  });

  const mockVehicle = {
    id: 'vehicle-1',
    licensePlate: 'ABC123',
    vehicleType: VehicleType.STANDARD,
    status: VehicleStatus.ACTIVE,
    make: 'Toyota',
    model: 'Camry',
    color: 'Blue',
    year: 2020,
    ownerName: 'John Doe',
    ownerEmail: 'john@example.com',
    ownerPhone: '555-1234',
    currentSpotId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null
  };

  describe('findByLicensePlate', () => {
    test('should find vehicle by license plate', async () => {
      (mockPrismaClient.vehicle.findFirst as jest.Mock).mockResolvedValue(mockVehicle);

      const result = await vehicleAdapter.findByLicensePlate('abc123');

      expect(result).toEqual(mockVehicle);
      expect(mockPrismaClient.vehicle.findFirst).toHaveBeenCalledWith({
        where: { licensePlate: 'ABC123', deletedAt: null }
      });
    });

    test('should return null when vehicle not found', async () => {
      (mockPrismaClient.vehicle.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await vehicleAdapter.findByLicensePlate('NOTFOUND');

      expect(result).toBeNull();
    });
  });

  describe('findByStatus', () => {
    test('should find vehicles by status', async () => {
      const vehicles = [mockVehicle];
      (mockPrismaClient.vehicle.findMany as jest.Mock).mockResolvedValue(vehicles);

      const result = await vehicleAdapter.findByStatus(VehicleStatus.ACTIVE);

      expect(result).toEqual(vehicles);
      expect(mockPrismaClient.vehicle.findMany).toHaveBeenCalledWith({
        where: { status: VehicleStatus.ACTIVE, deletedAt: null },
        orderBy: { updatedAt: 'desc' }
      });
    });
  });

  describe('searchVehicles', () => {
    test('should search vehicles with multiple criteria', async () => {
      const vehicles = [mockVehicle];
      (mockPrismaClient.vehicle.findMany as jest.Mock).mockResolvedValue(vehicles);

      const criteria = {
        licensePlate: 'ABC',
        vehicleType: VehicleType.STANDARD,
        make: 'Toyota',
        status: VehicleStatus.ACTIVE
      };

      const result = await vehicleAdapter.searchVehicles(criteria);

      expect(result).toEqual(vehicles);
      expect(mockPrismaClient.vehicle.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          licensePlate: { contains: 'ABC', mode: 'insensitive' },
          vehicleType: VehicleType.STANDARD,
          make: { contains: 'Toyota', mode: 'insensitive' },
          status: VehicleStatus.ACTIVE
        },
        orderBy: { updatedAt: 'desc' }
      });
    });
  });

  describe('updateLicensePlate', () => {
    test('should update license plate successfully', async () => {
      const updatedVehicle = { ...mockVehicle, licensePlate: 'XYZ789' };
      
      // Mock findByLicensePlate to return null (license plate available)
      (mockPrismaClient.vehicle.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrismaClient.vehicle.update as jest.Mock).mockResolvedValue(updatedVehicle);

      const result = await vehicleAdapter.updateLicensePlate('vehicle-1', 'xyz789');

      expect(result).toEqual(updatedVehicle);
      expect(mockPrismaClient.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-1', deletedAt: null },
        data: {
          licensePlate: 'XYZ789',
          updatedAt: expect.any(Date)
        }
      });
    });

    test('should throw error when license plate is already taken', async () => {
      // Mock findByLicensePlate to return a different vehicle
      const existingVehicle = { ...mockVehicle, id: 'different-id' };
      (mockPrismaClient.vehicle.findFirst as jest.Mock).mockResolvedValue(existingVehicle);

      await expect(
        vehicleAdapter.updateLicensePlate('vehicle-1', 'ABC123')
      ).rejects.toThrow('License plate ABC123 is already in use');
    });
  });

  describe('assignToSpot', () => {
    test('should assign vehicle to parking spot', async () => {
      const assignedVehicle = { ...mockVehicle, currentSpotId: 'spot-1', status: VehicleStatus.ACTIVE };
      (mockPrismaClient.vehicle.update as jest.Mock).mockResolvedValue(assignedVehicle);

      const result = await vehicleAdapter.assignToSpot('vehicle-1', 'spot-1');

      expect(result).toEqual(assignedVehicle);
      expect(mockPrismaClient.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-1', deletedAt: null },
        data: {
          currentSpotId: 'spot-1',
          status: VehicleStatus.ACTIVE,
          updatedAt: expect.any(Date)
        },
        include: { currentSpot: true }
      });
    });
  });

  describe('getStatistics', () => {
    test('should return vehicle statistics', async () => {
      const mockCounts = [
        10, // total
        8,  // active
        1,  // blocked
        0,  // banned
        1,  // inactive
        5,  // currently parked
      ];

      const mockTypeStats = [
        { vehicleType: VehicleType.STANDARD, _count: { id: 6 } },
        { vehicleType: VehicleType.COMPACT, _count: { id: 3 } },
        { vehicleType: VehicleType.OVERSIZED, _count: { id: 1 } }
      ];

      (mockPrismaClient.vehicle.count as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8)  // active
        .mockResolvedValueOnce(1)  // blocked
        .mockResolvedValueOnce(0)  // banned
        .mockResolvedValueOnce(1)  // inactive
        .mockResolvedValueOnce(5); // currently parked

      (mockPrismaClient.vehicle.groupBy as jest.Mock).mockResolvedValue(mockTypeStats);

      const result = await vehicleAdapter.getStatistics();

      expect(result).toEqual({
        total: 10,
        active: 8,
        blocked: 1,
        banned: 0,
        inactive: 1,
        currentlyParked: 5,
        byType: {
          [VehicleType.STANDARD]: 6,
          [VehicleType.COMPACT]: 3,
          [VehicleType.OVERSIZED]: 1
        }
      });
    });
  });
});

describe('Error Handling', () => {
  test('should handle Prisma unique constraint errors', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`email`)',
      {
        code: 'P2002',
        clientVersion: '4.0.0',
        meta: { target: ['email'] }
      }
    );

    const domainError = handlePrismaError(prismaError, 'create user');

    expect(domainError).toBeInstanceOf(DomainError);
    expect(domainError.code).toBe(ErrorCode.DUPLICATE_KEY);
    expect(domainError.message).toContain('Duplicate entry');
  });

  test('should handle Prisma not found errors', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Record to update not found',
      {
        code: 'P2025',
        clientVersion: '4.0.0'
      }
    );

    const domainError = handlePrismaError(prismaError, 'update user');

    expect(domainError).toBeInstanceOf(DomainError);
    expect(domainError.code).toBe(ErrorCode.NOT_FOUND);
    expect(domainError.message).toContain('Record not found');
  });

  test('should handle Prisma validation errors', () => {
    const prismaError = new Prisma.PrismaClientValidationError(
      'Invalid value provided for field',
      { clientVersion: '4.0.0' }
    );

    const domainError = handlePrismaError(prismaError, 'validate data');

    expect(domainError).toBeInstanceOf(DomainError);
    expect(domainError.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(domainError.message).toContain('Validation error');
  });
});
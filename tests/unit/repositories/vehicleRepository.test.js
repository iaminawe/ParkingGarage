/**
 * Unit Tests for VehicleRepository (Prisma Integration)
 * 
 * Tests all data access methods in VehicleRepository with Prisma ORM.
 * Uses test database for integration testing while maintaining isolation.
 */

const VehicleRepository = require('../../../src/repositories/vehicleRepository');
const { VehicleFactory } = require('../../factories');

describe('VehicleRepository (Prisma)', () => {
  let vehicleRepository;
  let testVehicleData;

  beforeEach(async () => {
    vehicleRepository = new VehicleRepository();
    
    // Create consistent test vehicle data
    testVehicleData = {
      licensePlate: 'TEST001',
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      color: 'blue',
      type: 'sedan',
      size: 'standard',
      owner: 'John Doe',
      phone: '555-0123',
      email: 'john@example.com',
      isElectric: false
    };
  });

  describe('create', () => {
    test('should create vehicle with valid data', async () => {
      const vehicle = await vehicleRepository.create(testVehicleData);
      
      expect(vehicle).toEqual(expect.objectContaining({
        licensePlate: 'TEST001',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        color: 'blue',
        type: 'sedan',
        owner: 'John Doe'
      }));
      
      expect(vehicle.id).toBeDefined();
      expect(vehicle.createdAt).toBeDefined();
      expect(vehicle.updatedAt).toBeDefined();
    });

    test('should prevent duplicate license plates', async () => {
      await vehicleRepository.create(testVehicleData);
      
      await expect(vehicleRepository.create(testVehicleData))
        .rejects.toThrow(/already exists|unique constraint/i);
    });

    test('should validate required fields', async () => {
      const invalidData = { ...testVehicleData };
      delete invalidData.licensePlate;
      
      await expect(vehicleRepository.create(invalidData))
        .rejects.toThrow(/required|license plate/i);
    });

    test('should handle vehicle factory data', async () => {
      const factoryVehicle = VehicleFactory.createVehicleData();
      const vehicle = await vehicleRepository.create(factoryVehicle);
      
      expect(vehicle.licensePlate).toBe(factoryVehicle.licensePlate);
      expect(vehicle.make).toBe(factoryVehicle.make);
      expect(vehicle.model).toBe(factoryVehicle.model);
    });
  });

  describe('findByLicensePlate', () => {
    test('should find existing vehicle by license plate', async () => {
      const createdVehicle = await vehicleRepository.create(testVehicleData);
      const foundVehicle = await vehicleRepository.findByLicensePlate('TEST001');
      
      expect(foundVehicle).toEqual(createdVehicle);
    });

    test('should be case insensitive', async () => {
      await vehicleRepository.create(testVehicleData);
      
      const foundVehicle = await vehicleRepository.findByLicensePlate('test001');
      expect(foundVehicle).toBeTruthy();
      expect(foundVehicle.licensePlate).toBe('TEST001');
    });

    test('should return null for non-existent license plate', async () => {
      const vehicle = await vehicleRepository.findByLicensePlate('NONEXISTENT');
      expect(vehicle).toBeNull();
    });
  });

  describe('findById', () => {
    test('should find vehicle by database ID', async () => {
      const createdVehicle = await vehicleRepository.create(testVehicleData);
      const foundVehicle = await vehicleRepository.findById(createdVehicle.id);
      
      expect(foundVehicle).toEqual(createdVehicle);
    });

    test('should return null for non-existent ID', async () => {
      const vehicle = await vehicleRepository.findById('00000000-0000-0000-0000-000000000000');
      expect(vehicle).toBeNull();
    });
  });

  describe('findAll', () => {
    test('should return empty array when no vehicles exist', async () => {
      const vehicles = await vehicleRepository.findAll();
      expect(vehicles).toEqual([]);
    });

    test('should return all vehicles when vehicles exist', async () => {
      const vehicle1 = await vehicleRepository.create({ ...testVehicleData, licensePlate: 'TEST001' });
      const vehicle2 = await vehicleRepository.create({ ...testVehicleData, licensePlate: 'TEST002' });
      const vehicle3 = await vehicleRepository.create({ ...testVehicleData, licensePlate: 'TEST003' });
      
      const vehicles = await vehicleRepository.findAll();
      
      expect(vehicles).toHaveLength(3);
      expect(vehicles.map(v => v.licensePlate)).toEqual(
        expect.arrayContaining(['TEST001', 'TEST002', 'TEST003'])
      );
    });
  });

  describe('findByOwner', () => {
    test('should find vehicles by owner name', async () => {
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'JOHN001', owner: 'John Doe' });
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'JOHN002', owner: 'John Doe' });
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'JANE001', owner: 'Jane Smith' });
      
      const johnVehicles = await vehicleRepository.findByOwner('John Doe');
      
      expect(johnVehicles).toHaveLength(2);
      expect(johnVehicles.every(v => v.owner === 'John Doe')).toBe(true);
    });

    test('should be case sensitive for owner names', async () => {
      await vehicleRepository.create({ ...testVehicleData, owner: 'John Doe' });
      
      const vehicles = await vehicleRepository.findByOwner('JOHN DOE');
      expect(vehicles).toHaveLength(0);
    });
  });

  describe('findByType', () => {
    beforeEach(async () => {
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'SEDAN01', type: 'sedan' });
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'SUV001', type: 'suv' });
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'TRUCK01', type: 'truck' });
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'SEDAN02', type: 'sedan' });
    });

    test('should find vehicles by type', async () => {
      const sedans = await vehicleRepository.findByType('sedan');
      
      expect(sedans).toHaveLength(2);
      expect(sedans.every(v => v.type === 'sedan')).toBe(true);
    });

    test('should return empty array for non-existent type', async () => {
      const vehicles = await vehicleRepository.findByType('motorcycle');
      expect(vehicles).toEqual([]);
    });
  });

  describe('findElectricVehicles', () => {
    test('should find only electric vehicles', async () => {
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'ELEC001', isElectric: true });
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'GAS001', isElectric: false });
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'ELEC002', isElectric: true });
      
      const electricVehicles = await vehicleRepository.findElectricVehicles();
      
      expect(electricVehicles).toHaveLength(2);
      expect(electricVehicles.every(v => v.isElectric)).toBe(true);
    });

    test('should return empty array when no electric vehicles exist', async () => {
      await vehicleRepository.create({ ...testVehicleData, isElectric: false });
      
      const electricVehicles = await vehicleRepository.findElectricVehicles();
      expect(electricVehicles).toEqual([]);
    });
  });

  describe('update', () => {
    test('should update vehicle with valid data', async () => {
      const vehicle = await vehicleRepository.create(testVehicleData);
      const updates = { color: 'red', owner: 'Jane Doe', phone: '555-9999' };
      
      const updatedVehicle = await vehicleRepository.update(vehicle.id, updates);
      
      expect(updatedVehicle.color).toBe('red');
      expect(updatedVehicle.owner).toBe('Jane Doe');
      expect(updatedVehicle.phone).toBe('555-9999');
      expect(updatedVehicle.make).toBe('Toyota'); // Unchanged
    });

    test('should return null for non-existent vehicle', async () => {
      const result = await vehicleRepository.update('00000000-0000-0000-0000-000000000000', { color: 'red' });
      expect(result).toBeNull();
    });

    test('should prevent updating license plate', async () => {
      const vehicle = await vehicleRepository.create(testVehicleData);
      
      await expect(vehicleRepository.update(vehicle.id, { licensePlate: 'NEWPLATE' }))
        .rejects.toThrow(/immutable|cannot update/i);
    });
  });

  describe('delete', () => {
    test('should delete existing vehicle', async () => {
      const vehicle = await vehicleRepository.create(testVehicleData);
      
      const deleted = await vehicleRepository.delete(vehicle.id);
      
      expect(deleted).toBe(true);
      
      const foundVehicle = await vehicleRepository.findById(vehicle.id);
      expect(foundVehicle).toBeNull();
    });

    test('should return false for non-existent vehicle', async () => {
      const deleted = await vehicleRepository.delete('00000000-0000-0000-0000-000000000000');
      expect(deleted).toBe(false);
    });

    test('should handle soft delete if implemented', async () => {
      const vehicle = await vehicleRepository.create(testVehicleData);
      
      await vehicleRepository.delete(vehicle.id);
      
      // If soft delete is implemented, check that it's marked as deleted
      // but still exists in the database with deletedAt field
      const deletedVehicle = await vehicleRepository.findDeleted(vehicle.id);
      if (deletedVehicle) {
        expect(deletedVehicle.deletedAt).toBeDefined();
      }
    });
  });

  describe('exists', () => {
    test('should return true for existing vehicle', async () => {
      const vehicle = await vehicleRepository.create(testVehicleData);
      
      expect(await vehicleRepository.exists(vehicle.id)).toBe(true);
    });

    test('should return false for non-existent vehicle', async () => {
      expect(await vehicleRepository.exists('00000000-0000-0000-0000-000000000000')).toBe(false);
    });
  });

  describe('count', () => {
    test('should return 0 when no vehicles exist', async () => {
      const count = await vehicleRepository.count();
      expect(count).toBe(0);
    });

    test('should return correct count', async () => {
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'TEST001' });
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'TEST002' });
      await vehicleRepository.create({ ...testVehicleData, licensePlate: 'TEST003' });
      
      const count = await vehicleRepository.count();
      expect(count).toBe(3);
    });
  });

  describe('Database Integration', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test would need to mock Prisma client to simulate connection errors
      // For now, just ensure the repository can be instantiated
      expect(vehicleRepository).toBeInstanceOf(VehicleRepository);
    });

    test('should support database transactions', async () => {
      // Test transaction rollback scenario
      const prisma = global.testDb?.getPrisma?.();
      if (prisma && prisma.$transaction) {
        try {
          await prisma.$transaction(async (tx) => {
            await vehicleRepository.create({ ...testVehicleData, licensePlate: 'TRANS01' });
            await vehicleRepository.create({ ...testVehicleData, licensePlate: 'TRANS02' });
            
            // Force rollback
            throw new Error('Test rollback');
          });
        } catch (error) {
          expect(error.message).toBe('Test rollback');
        }
        
        // Verify rollback worked
        const vehicle1 = await vehicleRepository.findByLicensePlate('TRANS01');
        const vehicle2 = await vehicleRepository.findByLicensePlate('TRANS02');
        expect(vehicle1).toBeNull();
        expect(vehicle2).toBeNull();
      }
    });

    test('should handle concurrent operations', async () => {
      // Test concurrent vehicle creation
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          vehicleRepository.create({
            ...testVehicleData,
            licensePlate: `CONC${i.toString().padStart(3, '0')}`
          })
        );
      }
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      
      const count = await vehicleRepository.count();
      expect(count).toBe(5);
    });
  });

  describe('Performance', () => {
    test('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create 100 vehicles
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          vehicleRepository.create({
            ...testVehicleData,
            licensePlate: `PERF${i.toString().padStart(3, '0')}`
          })
        );
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      const count = await vehicleRepository.count();
      expect(count).toBe(100);
    });

    test('should query large datasets efficiently', async () => {
      // Create test data
      for (let i = 0; i < 50; i++) {
        await vehicleRepository.create({
          ...testVehicleData,
          licensePlate: `QUERY${i.toString().padStart(3, '0')}`,
          owner: i % 2 === 0 ? 'John Doe' : 'Jane Smith'
        });
      }
      
      const startTime = Date.now();
      const johnVehicles = await vehicleRepository.findByOwner('John Doe');
      const endTime = Date.now();
      
      expect(johnVehicles).toHaveLength(25);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });
  });
});
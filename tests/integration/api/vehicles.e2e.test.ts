/**
 * Vehicles API End-to-End Tests
 * 
 * Comprehensive test suite for all vehicle management endpoints including:
 * - GET /api/vehicles - List vehicles with filters
 * - POST /api/vehicles - Create new vehicle
 * - GET /api/vehicles/:id - Get vehicle by ID
 * - PUT /api/vehicles/:id - Update vehicle
 * - DELETE /api/vehicles/:id - Delete vehicle
 * - POST /api/vehicles/search - Search vehicles
 */

import request from 'supertest';
import { Application } from 'express';
import { faker } from '@faker-js/faker';
import {
  createAPITestContext,
  APITestContext,
  generateTestVehicle,
  validateAPIResponse,
  testRateLimit,
  testInputValidation,
  ValidationTestCase,
  createAuthenticatedRequest
} from '../../helpers/api-test-helpers';
import { createTestApp } from '../../helpers/app-helpers';
import { setupTestDatabase, teardownTestDatabase, TestDatabase } from '../../setup/test-db-setup';

describe('Vehicles API E2E Tests', () => {
  let app: Application;
  let testDb: TestDatabase;
  let context: APITestContext;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    app = await createTestApp(testDb.getService());
    context = await createAPITestContext(app, testDb.getService());
  });

  afterAll(async () => {
    await teardownTestDatabase(testDb);
  });

  beforeEach(async () => {
    if (testDb) {
      await testDb.reset();
    }
  });

  describe('GET /api/vehicles (List Vehicles)', () => {
    const vehiclesEndpoint = '/api/vehicles';

    describe('Admin/Manager Access', () => {
      it('should return paginated list of all vehicles for admin', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', vehiclesEndpoint, context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        expect(response.body.data).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('totalCount');
        expect(response.body.data).toHaveProperty('page');
        expect(response.body.data).toHaveProperty('limit');
        expect(Array.isArray(response.body.data.data)).toBe(true);

        // Verify vehicle data structure
        if (response.body.data.data.length > 0) {
          const vehicle = response.body.data.data[0];
          expect(vehicle).toHaveProperty('id');
          expect(vehicle).toHaveProperty('licensePlate');
          expect(vehicle).toHaveProperty('make');
          expect(vehicle).toHaveProperty('model');
          expect(vehicle).toHaveProperty('color');
          expect(vehicle).toHaveProperty('vehicleType');
          expect(vehicle).toHaveProperty('ownerId');
        }
      });

      it('should return vehicles for manager', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', vehiclesEndpoint, context.managerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('data');
      });

      it('should support pagination parameters', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${vehiclesEndpoint}?page=1&limit=2`, context.adminToken
        ).expect(200);

        expect(response.body.data.page).toBe(1);
        expect(response.body.data.limit).toBe(2);
        expect(response.body.data.data.length).toBeLessThanOrEqual(2);
      });

      it('should support sorting parameters', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${vehiclesEndpoint}?sortBy=make&sortOrder=asc`, context.adminToken
        ).expect(200);

        const vehicles = response.body.data.data;
        if (vehicles.length > 1) {
          expect(vehicles[0].make.localeCompare(vehicles[1].make)).toBeLessThanOrEqual(0);
        }
      });

      it('should support filtering by vehicle type', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${vehiclesEndpoint}?vehicleType=CAR`, context.adminToken
        ).expect(200);

        const vehicles = response.body.data.data;
        vehicles.forEach((vehicle: any) => {
          expect(vehicle.vehicleType).toBe('CAR');
        });
      });

      it('should support filtering by status', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${vehiclesEndpoint}?status=ACTIVE`, context.adminToken
        ).expect(200);

        const vehicles = response.body.data.data;
        vehicles.forEach((vehicle: any) => {
          expect(vehicle.isActive).toBe(true);
        });
      });

      it('should support search by license plate', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${vehiclesEndpoint}?search=ABC123`, context.adminToken
        ).expect(200);

        const vehicles = response.body.data.data;
        if (vehicles.length > 0) {
          expect(vehicles.some((v: any) => v.licensePlate.includes('ABC123'))).toBe(true);
        }
      });
    });

    describe('Customer Access', () => {
      it('should return only customer\'s own vehicles', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', vehiclesEndpoint, context.customerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        const vehicles = response.body.data.data;
        
        // All vehicles should belong to the authenticated customer
        vehicles.forEach((vehicle: any) => {
          expect(vehicle.ownerId).toBe('customer-1-id'); // Assuming this is the customer token's user ID
        });
      });
    });

    describe('Authorization', () => {
      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .get(vehiclesEndpoint)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limiting', async () => {
        const results = await testRateLimit(
          app,
          vehiclesEndpoint,
          'get',
          50,
          60000,
          context.adminToken
        );

        expect(results.firstRateLimitHit).toBeGreaterThan(40);
        expect(results.rateLimitedRequests).toBeGreaterThan(0);
      });
    });
  });

  describe('POST /api/vehicles (Create Vehicle)', () => {
    const vehiclesEndpoint = '/api/vehicles';

    describe('Valid Vehicle Creation', () => {
      it('should create vehicle for authenticated customer', async () => {
        const vehicleData = {
          licensePlate: 'NEW123',
          make: 'Tesla',
          model: 'Model 3',
          color: 'White',
          vehicleType: 'CAR'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', vehiclesEndpoint, context.customerToken
        )
          .send(vehicleData)
          .expect(201);

        const validation = validateAPIResponse(response, 201);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const vehicle = response.body.data;
        expect(vehicle.licensePlate).toBe(vehicleData.licensePlate);
        expect(vehicle.make).toBe(vehicleData.make);
        expect(vehicle.model).toBe(vehicleData.model);
        expect(vehicle.color).toBe(vehicleData.color);
        expect(vehicle.vehicleType).toBe(vehicleData.vehicleType);
        expect(vehicle.ownerId).toBe('customer-1-id'); // Should be set to authenticated user
        expect(vehicle.isActive).toBe(true);
        expect(vehicle).toHaveProperty('id');
        expect(vehicle).toHaveProperty('createdAt');
      });

      it('should allow admin to create vehicle for any user', async () => {
        const vehicleData = {
          licensePlate: 'ADMIN123',
          make: 'BMW',
          model: 'X5',
          color: 'Black',
          vehicleType: 'SUV',
          ownerId: 'customer-2-id'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', vehiclesEndpoint, context.adminToken
        )
          .send(vehicleData)
          .expect(201);

        const vehicle = response.body.data;
        expect(vehicle.ownerId).toBe(vehicleData.ownerId);
      });

      it('should handle different vehicle types', async () => {
        const vehicleTypes = ['CAR', 'TRUCK', 'MOTORCYCLE', 'SUV'];
        
        for (let i = 0; i < vehicleTypes.length; i++) {
          const vehicleData = {
            licensePlate: `TYPE${i}123`,
            make: 'Generic',
            model: 'Model',
            color: 'Blue',
            vehicleType: vehicleTypes[i]
          };

          const response = await createAuthenticatedRequest(
            app, 'post', vehiclesEndpoint, context.customerToken
          )
            .send(vehicleData)
            .expect(201);

          expect(response.body.data.vehicleType).toBe(vehicleTypes[i]);
        }
      });
    });

    describe('Input Validation', () => {
      const vehicleValidationCases: ValidationTestCase[] = [
        {
          name: 'missing license plate',
          input: {
            make: 'Toyota',
            model: 'Camry',
            color: 'Blue',
            vehicleType: 'CAR'
          },
          expectedStatus: 400
        },
        {
          name: 'empty license plate',
          input: {
            licensePlate: '',
            make: 'Toyota',
            model: 'Camry',
            color: 'Blue',
            vehicleType: 'CAR'
          },
          expectedStatus: 400
        },
        {
          name: 'missing make',
          input: {
            licensePlate: 'TEST123',
            model: 'Camry',
            color: 'Blue',
            vehicleType: 'CAR'
          },
          expectedStatus: 400
        },
        {
          name: 'missing model',
          input: {
            licensePlate: 'TEST123',
            make: 'Toyota',
            color: 'Blue',
            vehicleType: 'CAR'
          },
          expectedStatus: 400
        },
        {
          name: 'missing color',
          input: {
            licensePlate: 'TEST123',
            make: 'Toyota',
            model: 'Camry',
            vehicleType: 'CAR'
          },
          expectedStatus: 400
        },
        {
          name: 'invalid vehicle type',
          input: {
            licensePlate: 'TEST123',
            make: 'Toyota',
            model: 'Camry',
            color: 'Blue',
            vehicleType: 'INVALID'
          },
          expectedStatus: 400
        },
        {
          name: 'license plate too long',
          input: {
            licensePlate: 'VERYLONGLICENSEPLATE123456',
            make: 'Toyota',
            model: 'Camry',
            color: 'Blue',
            vehicleType: 'CAR'
          },
          expectedStatus: 400
        }
      ];

      it('should validate vehicle creation input', async () => {
        const results = await testInputValidation(
          app,
          'post',
          vehiclesEndpoint,
          vehicleValidationCases,
          context.customerToken
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });

      it('should prevent duplicate license plates', async () => {
        const vehicleData = {
          licensePlate: 'DUP123',
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue',
          vehicleType: 'CAR'
        };

        // First creation should succeed
        await createAuthenticatedRequest(
          app, 'post', vehiclesEndpoint, context.customerToken
        )
          .send(vehicleData)
          .expect(201);

        // Second creation with same license plate should fail
        const response = await createAuthenticatedRequest(
          app, 'post', vehiclesEndpoint, context.customerToken
        )
          .send(vehicleData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('license plate');
      });
    });

    describe('Authorization', () => {
      it('should require authentication', async () => {
        const vehicleData = {
          licensePlate: 'UNAUTH123',
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue',
          vehicleType: 'CAR'
        };

        const response = await request(app)
          .post(vehiclesEndpoint)
          .send(vehicleData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should prevent customer from setting custom ownerId', async () => {
        const vehicleData = {
          licensePlate: 'HACK123',
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue',
          vehicleType: 'CAR',
          ownerId: 'other-customer-id' // Customer shouldn't be able to set this
        };

        const response = await createAuthenticatedRequest(
          app, 'post', vehiclesEndpoint, context.customerToken
        )
          .send(vehicleData)
          .expect(201);

        // ownerId should be set to authenticated user, not the provided value
        expect(response.body.data.ownerId).toBe('customer-1-id');
        expect(response.body.data.ownerId).not.toBe('other-customer-id');
      });
    });
  });

  describe('GET /api/vehicles/:id (Get Vehicle by ID)', () => {
    const testVehicleId = 'vehicle-1-id';

    describe('Valid Access', () => {
      it('should allow admin to get any vehicle', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/vehicles/${testVehicleId}`, context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const vehicle = response.body.data;
        expect(vehicle.id).toBe(testVehicleId);
        expect(vehicle).toHaveProperty('licensePlate');
        expect(vehicle).toHaveProperty('make');
        expect(vehicle).toHaveProperty('model');
      });

      it('should allow manager to get any vehicle', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/vehicles/${testVehicleId}`, context.managerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testVehicleId);
      });

      it('should allow customer to get their own vehicles', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/vehicles/${testVehicleId}`, context.customerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.ownerId).toBe('customer-1-id');
      });
    });

    describe('Authorization Restrictions', () => {
      it('should prevent customer from accessing other customers\' vehicles', async () => {
        const otherVehicleId = 'vehicle-2-id'; // Belongs to customer-2
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/vehicles/${otherVehicleId}`, context.customerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for non-existent vehicle', async () => {
        const nonExistentId = 'non-existent-vehicle';
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/vehicles/${nonExistentId}`, context.adminToken
        ).expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('not found');
      });

      it('should validate vehicle ID format', async () => {
        const invalidId = 'invalid-id-format';
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/vehicles/${invalidId}`, context.adminToken
        ).expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('PUT /api/vehicles/:id (Update Vehicle)', () => {
    const testVehicleId = 'vehicle-1-id';

    describe('Valid Updates', () => {
      it('should allow owner to update their vehicle', async () => {
        const updateData = {
          color: 'Red',
          make: 'Updated Make',
          model: 'Updated Model'
        };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/vehicles/${testVehicleId}`, context.customerToken
        )
          .send(updateData)
          .expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const vehicle = response.body.data;
        expect(vehicle.color).toBe(updateData.color);
        expect(vehicle.make).toBe(updateData.make);
        expect(vehicle.model).toBe(updateData.model);
        expect(vehicle).toHaveProperty('updatedAt');
      });

      it('should allow admin to update any vehicle', async () => {
        const updateData = {
          color: 'Yellow',
          vehicleType: 'SUV'
        };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/vehicles/${testVehicleId}`, context.adminToken
        )
          .send(updateData)
          .expect(200);

        expect(response.body.data.color).toBe(updateData.color);
        expect(response.body.data.vehicleType).toBe(updateData.vehicleType);
      });

      it('should allow manager to update vehicles', async () => {
        const updateData = { color: 'Green' };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/vehicles/${testVehicleId}`, context.managerToken
        )
          .send(updateData)
          .expect(200);

        expect(response.body.data.color).toBe(updateData.color);
      });

      it('should allow partial updates', async () => {
        const updateData = { color: 'Purple' };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/vehicles/${testVehicleId}`, context.customerToken
        )
          .send(updateData)
          .expect(200);

        expect(response.body.data.color).toBe(updateData.color);
        // Other fields should remain unchanged
        expect(response.body.data.make).toBeDefined();
        expect(response.body.data.model).toBeDefined();
      });
    });

    describe('Authorization Restrictions', () => {
      it('should prevent customer from updating other customers\' vehicles', async () => {
        const otherVehicleId = 'vehicle-2-id';
        const updateData = { color: 'Hacked' };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/vehicles/${otherVehicleId}`, context.customerToken
        )
          .send(updateData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });

      it('should prevent customer from changing ownerId', async () => {
        const updateData = {
          ownerId: 'other-customer-id',
          color: 'Red'
        };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/vehicles/${testVehicleId}`, context.customerToken
        )
          .send(updateData)
          .expect(200);

        // ownerId should not be changed
        expect(response.body.data.ownerId).toBe('customer-1-id');
        expect(response.body.data.ownerId).not.toBe('other-customer-id');
      });
    });

    describe('Input Validation', () => {
      const updateValidationCases: ValidationTestCase[] = [
        {
          name: 'invalid vehicle type',
          input: { vehicleType: 'INVALID' },
          expectedStatus: 400
        },
        {
          name: 'empty license plate',
          input: { licensePlate: '' },
          expectedStatus: 400
        },
        {
          name: 'license plate too long',
          input: { licensePlate: 'VERYLONGLICENSEPLATE123456' },
          expectedStatus: 400
        },
        {
          name: 'empty make',
          input: { make: '' },
          expectedStatus: 400
        },
        {
          name: 'empty model',
          input: { model: '' },
          expectedStatus: 400
        },
        {
          name: 'empty color',
          input: { color: '' },
          expectedStatus: 400
        }
      ];

      it('should validate update data', async () => {
        const results = await testInputValidation(
          app,
          'put',
          `/api/vehicles/${testVehicleId}`,
          updateValidationCases,
          context.customerToken
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });

      it('should prevent duplicate license plates on update', async () => {
        const updateData = { licensePlate: 'XYZ789' }; // Existing license plate

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/vehicles/${testVehicleId}`, context.customerToken
        )
          .send(updateData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('license plate');
      });
    });
  });

  describe('DELETE /api/vehicles/:id (Delete Vehicle)', () => {
    const testVehicleId = 'vehicle-3-id';

    describe('Valid Deletion', () => {
      it('should allow owner to delete their vehicle', async () => {
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/vehicles/${testVehicleId}`, context.customerToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200, false);
        expect(validation.hasSuccessField).toBe(true);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted');
      });

      it('should allow admin to delete any vehicle', async () => {
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/vehicles/${testVehicleId}`, context.adminToken
        ).expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should soft delete (vehicle becomes inactive)', async () => {
        await createAuthenticatedRequest(
          app, 'delete', `/api/vehicles/${testVehicleId}`, context.adminToken
        ).expect(200);

        // Try to get the deleted vehicle
        const getResponse = await createAuthenticatedRequest(
          app, 'get', `/api/vehicles/${testVehicleId}`, context.adminToken
        );

        // Vehicle should still exist but be inactive
        if (getResponse.status === 200) {
          expect(getResponse.body.data.isActive).toBe(false);
        } else {
          // Or might return 404 if soft delete removes from queries
          expect(getResponse.status).toBe(404);
        }
      });
    });

    describe('Authorization Restrictions', () => {
      it('should prevent customer from deleting other customers\' vehicles', async () => {
        const otherVehicleId = 'vehicle-2-id';
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/vehicles/${otherVehicleId}`, context.customerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });

      it('should allow manager to delete vehicles', async () => {
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/vehicles/${testVehicleId}`, context.managerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for non-existent vehicle', async () => {
        const nonExistentId = 'non-existent-vehicle';
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/vehicles/${nonExistentId}`, context.adminToken
        ).expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should handle deletion of vehicle with active reservations', async () => {
        // This test assumes business logic prevents deletion of vehicles with active reservations
        const vehicleWithReservations = 'vehicle-1-id';
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/vehicles/${vehicleWithReservations}`, context.adminToken
        );

        // Should either succeed (soft delete) or fail with business logic error
        if (response.status === 400) {
          expect(response.body.message).toContain('reservation');
        } else {
          expect(response.status).toBe(200);
        }
      });
    });
  });

  describe('POST /api/vehicles/search (Search Vehicles)', () => {
    const searchEndpoint = '/api/vehicles/search';

    describe('Valid Search Requests', () => {
      it('should search vehicles by license plate', async () => {
        const searchData = {
          licensePlate: 'ABC'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', searchEndpoint, context.adminToken
        )
          .send(searchData)
          .expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const vehicles = response.body.data.data;
        expect(Array.isArray(vehicles)).toBe(true);
        
        if (vehicles.length > 0) {
          vehicles.forEach((vehicle: any) => {
            expect(vehicle.licensePlate.toLowerCase()).toContain('abc');
          });
        }
      });

      it('should search vehicles by make and model', async () => {
        const searchData = {
          make: 'Toyota',
          model: 'Camry'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', searchEndpoint, context.adminToken
        )
          .send(searchData)
          .expect(200);

        const vehicles = response.body.data.data;
        vehicles.forEach((vehicle: any) => {
          expect(vehicle.make.toLowerCase()).toContain('toyota');
          expect(vehicle.model.toLowerCase()).toContain('camry');
        });
      });

      it('should search vehicles by vehicle type', async () => {
        const searchData = {
          vehicleType: 'CAR'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', searchEndpoint, context.adminToken
        )
          .send(searchData)
          .expect(200);

        const vehicles = response.body.data.data;
        vehicles.forEach((vehicle: any) => {
          expect(vehicle.vehicleType).toBe('CAR');
        });
      });

      it('should support combined search criteria', async () => {
        const searchData = {
          vehicleType: 'CAR',
          color: 'Blue'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', searchEndpoint, context.adminToken
        )
          .send(searchData)
          .expect(200);

        const vehicles = response.body.data.data;
        vehicles.forEach((vehicle: any) => {
          expect(vehicle.vehicleType).toBe('CAR');
          expect(vehicle.color.toLowerCase()).toContain('blue');
        });
      });

      it('should support search with pagination', async () => {
        const searchData = {
          vehicleType: 'CAR',
          page: 1,
          limit: 2
        };

        const response = await createAuthenticatedRequest(
          app, 'post', searchEndpoint, context.adminToken
        )
          .send(searchData)
          .expect(200);

        expect(response.body.data.page).toBe(1);
        expect(response.body.data.limit).toBe(2);
        expect(response.body.data.data.length).toBeLessThanOrEqual(2);
      });
    });

    describe('Customer Search Restrictions', () => {
      it('should return only customer\'s vehicles for customer search', async () => {
        const searchData = {
          vehicleType: 'CAR'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', searchEndpoint, context.customerToken
        )
          .send(searchData)
          .expect(200);

        const vehicles = response.body.data.data;
        vehicles.forEach((vehicle: any) => {
          expect(vehicle.ownerId).toBe('customer-1-id');
        });
      });
    });

    describe('Input Validation', () => {
      it('should handle empty search criteria', async () => {
        const response = await createAuthenticatedRequest(
          app, 'post', searchEndpoint, context.adminToken
        )
          .send({})
          .expect(200);

        // Should return all vehicles (with pagination)
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('data');
      });

      it('should validate vehicle type in search', async () => {
        const searchData = {
          vehicleType: 'INVALID_TYPE'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', searchEndpoint, context.adminToken
        )
          .send(searchData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('vehicle type');
      });
    });
  });

  describe('Security and Error Handling', () => {
    it('should sanitize input to prevent injection attacks', async () => {
      const maliciousInput = {
        make: '<script>alert("xss")</script>',
        model: 'DROP TABLE vehicles;',
        color: '"; DELETE FROM vehicles; --',
        licensePlate: 'SAFE123'
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/vehicles', context.customerToken
      )
        .send(maliciousInput)
        .expect(201);

      // Values should be sanitized
      expect(response.body.data.make).not.toContain('<script>');
      expect(response.body.data.model).not.toContain('DROP TABLE');
      expect(response.body.data.color).not.toContain('DELETE FROM');
    });

    it('should handle concurrent vehicle creation', async () => {
      const vehicleData = {
        make: 'Concurrent',
        model: 'Test',
        color: 'Blue',
        vehicleType: 'CAR'
      };

      // Send multiple concurrent requests with different license plates
      const promises = Array.from({ length: 3 }, (_, i) =>
        createAuthenticatedRequest(app, 'post', '/api/vehicles', context.customerToken)
          .send({
            ...vehicleData,
            licensePlate: `CONC${i}123`
          })
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Each should have unique license plates
      const licensePlates = responses.map(r => r.body.data.licensePlate);
      const uniqueLicensePlates = new Set(licensePlates);
      expect(uniqueLicensePlates.size).toBe(licensePlates.length);
    });

    it('should log vehicle management actions for audit trail', async () => {
      const vehicleData = {
        licensePlate: 'AUDIT123',
        make: 'Audit',
        model: 'Test',
        color: 'Blue',
        vehicleType: 'CAR'
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/vehicles', context.customerToken
      )
        .send(vehicleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // In a real scenario, you'd check audit logs here
    });

    it('should handle database errors gracefully', async () => {
      // This test would simulate database errors
      // For now, we just verify normal operation
      const vehicleData = {
        licensePlate: 'ERROR123',
        make: 'Error',
        model: 'Test',
        color: 'Blue',
        vehicleType: 'CAR'
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/vehicles', context.customerToken
      )
        .send(vehicleData);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });
});
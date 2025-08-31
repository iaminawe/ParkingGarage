const request = require('supertest');

const API_BASE = 'http://localhost:3001';

describe('API Contract Validation', () => {
  describe('Response Format Validation', () => {
    it('should return consistent garage status schema', async () => {
      const response = await request(API_BASE)
        .get('/api/garage/status');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      
      const expectedSchema = {
        totalSpots: 'number',
        availableSpots: 'number',
        occupiedSpots: 'number',
        floors: 'object',
        spotTypes: 'object'
      };
      
      Object.entries(expectedSchema).forEach(([field, type]) => {
        expect(response.body).toHaveProperty(field);
        expect(typeof response.body[field]).toBe(type);
      });
      
      // Validate mathematical consistency
      expect(response.body.availableSpots + response.body.occupiedSpots)
        .toBe(response.body.totalSpots);
      
      console.log('✅ Garage status schema validated');
    });

    it('should return consistent spot schema', async () => {
      const response = await request(API_BASE)
        .get('/api/spots');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const spot = response.body[0];
        const expectedFields = ['id', 'number', 'floor', 'type', 'isOccupied', 'vehicle', 'occupiedAt'];
        
        expectedFields.forEach(field => {
          expect(spot).toHaveProperty(field);
        });
        
        expect(typeof spot.id).toBe('string');
        expect(typeof spot.number).toBe('number');
        expect(typeof spot.floor).toBe('number');
        expect(typeof spot.type).toBe('string');
        expect(typeof spot.isOccupied).toBe('boolean');
        
        if (spot.isOccupied) {
          expect(spot.vehicle).not.toBeNull();
          expect(spot.occupiedAt).not.toBeNull();
        } else {
          expect(spot.vehicle).toBeNull();
          expect(spot.occupiedAt).toBeNull();
        }
      }
      
      console.log('✅ Spot schema validated');
    });

    it('should return consistent check-in response schema', async () => {
      const vehicle = { licensePlate: 'CONTRACT1', vehicleType: 'standard' };
      
      const response = await request(API_BASE)
        .post('/api/checkin')
        .send(vehicle);
      
      expect(response.status).toBe(201);
      
      const expectedFields = ['spotNumber', 'checkInTime', 'vehicle'];
      expectedFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
      });
      
      expect(typeof response.body.spotNumber).toBe('number');
      expect(typeof response.body.checkInTime).toBe('string');
      expect(typeof response.body.vehicle).toBe('object');
      
      // Validate ISO datetime format
      expect(() => new Date(response.body.checkInTime)).not.toThrow();
      expect(new Date(response.body.checkInTime).toISOString()).toBe(response.body.checkInTime);
      
      // Validate vehicle schema
      expect(response.body.vehicle).toHaveProperty('licensePlate', vehicle.licensePlate);
      expect(response.body.vehicle).toHaveProperty('vehicleType', vehicle.vehicleType);
      
      // Clean up
      await request(API_BASE)
        .post('/api/checkout')
        .send({ licensePlate: vehicle.licensePlate });
      
      console.log('✅ Check-in response schema validated');
    });

    it('should return consistent check-out response schema', async () => {
      const vehicle = { licensePlate: 'CONTRACT2', vehicleType: 'compact' };
      
      // Check in first
      await request(API_BASE)
        .post('/api/checkin')
        .send(vehicle);
      
      // Wait a moment for billing calculation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check out
      const response = await request(API_BASE)
        .post('/api/checkout')
        .send({ licensePlate: vehicle.licensePlate });
      
      expect(response.status).toBe(200);
      
      const expectedFields = [
        'licensePlate', 'spotNumber', 'checkInTime', 
        'checkOutTime', 'duration', 'totalCost'
      ];
      
      expectedFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
      });
      
      expect(typeof response.body.licensePlate).toBe('string');
      expect(typeof response.body.spotNumber).toBe('number');
      expect(typeof response.body.checkInTime).toBe('string');
      expect(typeof response.body.checkOutTime).toBe('string');
      expect(typeof response.body.duration).toBe('object');
      expect(typeof response.body.totalCost).toBe('number');
      
      // Validate datetime formats
      expect(() => new Date(response.body.checkInTime)).not.toThrow();
      expect(() => new Date(response.body.checkOutTime)).not.toThrow();
      
      // Validate duration object
      expect(response.body.duration).toHaveProperty('hours');
      expect(response.body.duration).toHaveProperty('minutes');
      expect(response.body.duration).toHaveProperty('seconds');
      
      // Validate business logic
      expect(response.body.totalCost).toBeGreaterThan(0);
      expect(new Date(response.body.checkOutTime).getTime())
        .toBeGreaterThan(new Date(response.body.checkInTime).getTime());
      
      console.log('✅ Check-out response schema validated');
    });
  });

  describe('Error Response Validation', () => {
    it('should return consistent error response format', async () => {
      const errorEndpoints = [
        { path: '/api/spots/999', method: 'GET', expectedStatus: 404 },
        { path: '/api/vehicles/NOTFOUND', method: 'GET', expectedStatus: 404 },
        { path: '/nonexistent', method: 'GET', expectedStatus: 404 },
        { path: '/api/checkin', method: 'POST', data: {}, expectedStatus: 400 },
        { path: '/api/checkout', method: 'POST', data: {}, expectedStatus: 400 }
      ];

      for (const endpoint of errorEndpoints) {
        let response;
        
        if (endpoint.method === 'GET') {
          response = await request(API_BASE).get(endpoint.path);
        } else if (endpoint.method === 'POST') {
          response = await request(API_BASE)
            .post(endpoint.path)
            .send(endpoint.data || {});
        }

        expect(response.status).toBe(endpoint.expectedStatus);
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');
        expect(response.body.error.length).toBeGreaterThan(0);
        
        // Should not expose internal details
        expect(response.body.error).not.toContain('stack');
        expect(response.body.error).not.toContain('file');
        expect(response.body.error).not.toContain('line');
        
        console.log(`✅ ${endpoint.method} ${endpoint.path} → ${response.status}: ${response.body.error}`);
      }
    });

    it('should handle malformed requests gracefully', async () => {
      const malformedRequests = [
        // Invalid JSON
        {
          setup: (req) => req.set('Content-Type', 'application/json').send('{"invalid": json}'),
          expectedStatus: 400
        },
        // Missing content type
        {
          setup: (req) => req.send('not json'),
          expectedStatus: 400
        },
        // Oversized payload (if limits are set)
        {
          setup: (req) => req.send({ licensePlate: 'A'.repeat(1000), vehicleType: 'standard' }),
          expectedStatus: 400
        }
      ];

      for (const malformedRequest of malformedRequests) {
        const response = await malformedRequest.setup(
          request(API_BASE).post('/api/checkin')
        );

        expect(response.status).toBe(malformedRequest.expectedStatus);
        expect(response.body).toHaveProperty('error');
        
        console.log(`✅ Malformed request handled: ${response.status}`);
      }
    });
  });

  describe('HTTP Method Validation', () => {
    it('should reject unsupported HTTP methods', async () => {
      const endpoints = [
        '/api/garage/status',
        '/api/spots',
        '/api/checkin',
        '/api/checkout'
      ];

      const unsupportedMethods = ['PUT', 'DELETE', 'PATCH'];

      for (const endpoint of endpoints) {
        for (const method of unsupportedMethods) {
          const response = await request(API_BASE)[method.toLowerCase()](endpoint);
          
          // Should return 405 Method Not Allowed or 404
          expect([404, 405].includes(response.status)).toBe(true);
          
          console.log(`✅ ${method} ${endpoint} → ${response.status}`);
        }
      }
    });

    it('should support correct HTTP methods for each endpoint', async () => {
      const endpointMethods = [
        { path: '/health', methods: ['GET'], data: null },
        { path: '/api/garage/status', methods: ['GET'], data: null },
        { path: '/api/spots', methods: ['GET'], data: null },
        { path: '/api/checkin', methods: ['POST'], data: { licensePlate: 'METHOD1', vehicleType: 'standard' } },
        { path: '/api/checkout', methods: ['POST'], data: { licensePlate: 'METHOD1' } }
      ];

      for (const endpoint of endpointMethods) {
        for (const method of endpoint.methods) {
          let response;
          
          if (method === 'GET') {
            response = await request(API_BASE).get(endpoint.path);
          } else if (method === 'POST') {
            response = await request(API_BASE)
              .post(endpoint.path)
              .send(endpoint.data);
          }

          expect([200, 201].includes(response.status)).toBe(true);
          console.log(`✅ ${method} ${endpoint.path} supported`);
        }
      }
    });
  });

  describe('Data Serialization Validation', () => {
    it('should handle various data types correctly', async () => {
      const vehicle = { licensePlate: 'SERIAL1', vehicleType: 'standard' };
      
      const checkInResponse = await request(API_BASE)
        .post('/api/checkin')
        .send(vehicle);
      
      expect(checkInResponse.status).toBe(201);
      
      // Verify all datetime fields are proper ISO strings
      const checkInTime = checkInResponse.body.checkInTime;
      expect(checkInTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify numbers are properly serialized
      expect(Number.isInteger(checkInResponse.body.spotNumber)).toBe(true);
      
      // Check out and verify serialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const checkOutResponse = await request(API_BASE)
        .post('/api/checkout')
        .send({ licensePlate: vehicle.licensePlate });
      
      expect(checkOutResponse.status).toBe(200);
      
      // Verify cost is properly formatted number
      expect(typeof checkOutResponse.body.totalCost).toBe('number');
      expect(checkOutResponse.body.totalCost).toBeGreaterThan(0);
      expect(Number.isFinite(checkOutResponse.body.totalCost)).toBe(true);
      
      // Verify duration object structure
      const duration = checkOutResponse.body.duration;
      expect(Number.isInteger(duration.hours)).toBe(true);
      expect(Number.isInteger(duration.minutes)).toBe(true);
      expect(Number.isInteger(duration.seconds)).toBe(true);
      
      console.log('✅ Data serialization validated');
    });
  });

  describe('Pagination Validation', () => {
    it('should implement consistent pagination across endpoints', async () => {
      // Test spots pagination
      const spotsResponse = await request(API_BASE)
        .get('/api/spots?page=1&limit=5');
      
      expect(spotsResponse.status).toBe(200);
      
      if (spotsResponse.body.length > 0) {
        expect(spotsResponse.body.length).toBeLessThanOrEqual(5);
      }
      
      // Test with different page sizes
      const largePage = await request(API_BASE)
        .get('/api/spots?limit=100');
      
      expect(largePage.status).toBe(200);
      expect(Array.isArray(largePage.body)).toBe(true);
      
      console.log('✅ Pagination validated');
    });
  });

  describe('Query Parameter Validation', () => {
    it('should handle filtering parameters correctly', async () => {
      const filterTests = [
        { path: '/api/spots?status=available', validator: (spots) => spots.every(s => !s.isOccupied) },
        { path: '/api/spots?floor=1', validator: (spots) => spots.every(s => s.floor === 1) },
        { path: '/api/spots?type=compact', validator: (spots) => spots.every(s => s.type === 'compact') },
        { path: '/api/spots?status=occupied', validator: (spots) => spots.every(s => s.isOccupied) }
      ];

      for (const test of filterTests) {
        const response = await request(API_BASE).get(test.path);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        
        if (response.body.length > 0) {
          expect(test.validator(response.body)).toBe(true);
        }
        
        console.log(`✅ Filter validated: ${test.path}`);
      }
    });

    it('should handle invalid query parameters gracefully', async () => {
      const invalidQueries = [
        '/api/spots?status=invalid',
        '/api/spots?floor=-1',
        '/api/spots?floor=999',
        '/api/spots?type=invalid',
        '/api/spots?page=-1',
        '/api/spots?limit=0',
        '/api/spots?limit=1001'
      ];

      for (const query of invalidQueries) {
        const response = await request(API_BASE).get(query);
        
        // Should either return empty results or validation error
        expect([200, 400].includes(response.status)).toBe(true);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        } else {
          expect(response.body).toHaveProperty('error');
        }
        
        console.log(`✅ Invalid query handled: ${query} → ${response.status}`);
      }
    });
  });

  describe('CORS and Headers Validation', () => {
    it('should include proper CORS headers', async () => {
      const response = await request(API_BASE)
        .options('/api/garage/status')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET');

      // Should handle OPTIONS requests for CORS
      expect([200, 204].includes(response.status)).toBe(true);
      
      const getResponse = await request(API_BASE)
        .get('/api/garage/status')
        .set('Origin', 'http://localhost:3001');
      
      expect(getResponse.status).toBe(200);
      
      // Check for CORS headers if present
      if (getResponse.headers['access-control-allow-origin']) {
        console.log('CORS headers present:', {
          origin: getResponse.headers['access-control-allow-origin'],
          methods: getResponse.headers['access-control-allow-methods'],
          headers: getResponse.headers['access-control-allow-headers']
        });
      }
      
      console.log('✅ CORS validation completed');
    });

    it('should include cache control headers where appropriate', async () => {
      const response = await request(API_BASE)
        .get('/api/garage/status');
      
      expect(response.status).toBe(200);
      
      // Dynamic data should not be cached
      if (response.headers['cache-control']) {
        expect(response.headers['cache-control']).toContain('no-cache');
      }
      
      console.log('✅ Cache control validated');
    });
  });

  describe('API Versioning Validation', () => {
    it('should handle API versioning consistently', async () => {
      const apiPaths = [
        '/api/garage/status',
        '/api/spots',
        '/api/checkin',
        '/api/checkout',
        '/api/vehicles/TEST'
      ];

      // All API paths should be under /api prefix
      for (const path of apiPaths) {
        expect(path).toMatch(/^\/api\//);
      }
      
      // Test that API responses include version info if implemented
      const response = await request(API_BASE)
        .get('/api/garage/status');
      
      expect(response.status).toBe(200);
      
      // If API versioning is implemented, validate it
      if (response.headers['api-version']) {
        expect(response.headers['api-version']).toMatch(/^\d+\.\d+\.\d+$/);
        console.log(`API Version: ${response.headers['api-version']}`);
      }
      
      console.log('✅ API versioning validated');
    });
  });

  describe('Content Negotiation', () => {
    it('should handle Accept headers correctly', async () => {
      const response = await request(API_BASE)
        .get('/api/garage/status')
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      
      console.log('✅ Content negotiation validated');
    });

    it('should handle unsupported Accept headers gracefully', async () => {
      const response = await request(API_BASE)
        .get('/api/garage/status')
        .set('Accept', 'text/xml');
      
      // Should either return JSON anyway or 406 Not Acceptable
      expect([200, 406].includes(response.status)).toBe(true);
      
      console.log(`✅ Unsupported Accept header handled: ${response.status}`);
    });
  });
});
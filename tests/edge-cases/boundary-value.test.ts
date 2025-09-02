import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../factories/TestDataFactory';

const prisma = new PrismaClient();

describe('Boundary Value Testing', () => {
  let testFactory: TestDataFactory;
  let authToken: string;

  beforeEach(async () => {
    testFactory = new TestDataFactory();
    
    // Create test user and get auth token
    const user = await testFactory.createUser();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'testPassword123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    await testFactory.cleanup();
  });

  describe('Numeric Input Boundaries', () => {
    describe('Parking Spot Numbers', () => {
      it('should handle minimum spot number (1)', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .post(`/api/garages/${garage.id}/spots`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            spotNumber: 1,
            type: 'REGULAR',
            status: 'AVAILABLE'
          });

        expect(response.status).toBe(201);
        expect(response.body.spotNumber).toBe(1);
      });

      it('should handle maximum spot number (999999)', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .post(`/api/garages/${garage.id}/spots`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            spotNumber: 999999,
            type: 'REGULAR',
            status: 'AVAILABLE'
          });

        expect(response.status).toBe(201);
        expect(response.body.spotNumber).toBe(999999);
      });

      it('should reject spot number 0', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .post(`/api/garages/${garage.id}/spots`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            spotNumber: 0,
            type: 'REGULAR',
            status: 'AVAILABLE'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/spot number/i);
      });

      it('should reject negative spot numbers', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .post(`/api/garages/${garage.id}/spots`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            spotNumber: -1,
            type: 'REGULAR',
            status: 'AVAILABLE'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/spot number/i);
      });

      it('should reject spot numbers exceeding maximum (1000000)', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .post(`/api/garages/${garage.id}/spots`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            spotNumber: 1000000,
            type: 'REGULAR',
            status: 'AVAILABLE'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/spot number/i);
      });
    });

    describe('Price Boundaries', () => {
      it('should handle minimum price (0.01)', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .put(`/api/garages/${garage.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: garage.name,
            hourlyRate: 0.01
          });

        expect(response.status).toBe(200);
        expect(response.body.hourlyRate).toBe(0.01);
      });

      it('should handle maximum reasonable price (999.99)', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .put(`/api/garages/${garage.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: garage.name,
            hourlyRate: 999.99
          });

        expect(response.status).toBe(200);
        expect(response.body.hourlyRate).toBe(999.99);
      });

      it('should reject zero price', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .put(`/api/garages/${garage.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: garage.name,
            hourlyRate: 0
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/hourly rate/i);
      });

      it('should reject negative prices', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .put(`/api/garages/${garage.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: garage.name,
            hourlyRate: -10.50
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/hourly rate/i);
      });

      it('should handle extreme precision (0.001)', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .put(`/api/garages/${garage.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: garage.name,
            hourlyRate: 0.001
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/precision|decimal/i);
      });
    });

    describe('Integer Overflow Protection', () => {
      it('should handle JavaScript MAX_SAFE_INTEGER', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .post(`/api/garages/${garage.id}/spots`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            spotNumber: Number.MAX_SAFE_INTEGER,
            type: 'REGULAR',
            status: 'AVAILABLE'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/spot number|range/i);
      });

      it('should handle floating point edge cases', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .put(`/api/garages/${garage.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: garage.name,
            hourlyRate: Number.MAX_VALUE
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/hourly rate|range/i);
      });

      it('should handle NaN values', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .put(`/api/garages/${garage.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: garage.name,
            hourlyRate: NaN
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/hourly rate|number/i);
      });

      it('should handle Infinity values', async () => {
        const garage = await testFactory.createGarage();
        
        const response = await request(app)
          .put(`/api/garages/${garage.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: garage.name,
            hourlyRate: Infinity
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/hourly rate|finite/i);
      });
    });
  });

  describe('String Length Boundaries', () => {
    describe('Empty String Handling', () => {
      it('should reject empty garage names', async () => {
        const response = await request(app)
          .post('/api/garages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: '',
            location: 'Test Location',
            hourlyRate: 5.00
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/name.*required|name.*empty/i);
      });

      it('should reject whitespace-only garage names', async () => {
        const response = await request(app)
          .post('/api/garages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: '   \t\n   ',
            location: 'Test Location',
            hourlyRate: 5.00
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/name.*required|name.*empty/i);
      });

      it('should reject empty vehicle license plates', async () => {
        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            licensePlate: '',
            make: 'Toyota',
            model: 'Camry',
            color: 'Blue'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/license.*plate/i);
      });
    });

    describe('Maximum Length Boundaries', () => {
      it('should handle maximum garage name length (255 characters)', async () => {
        const maxName = 'A'.repeat(255);
        
        const response = await request(app)
          .post('/api/garages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: maxName,
            location: 'Test Location',
            hourlyRate: 5.00
          });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(maxName);
      });

      it('should reject garage names exceeding maximum length', async () => {
        const tooLongName = 'A'.repeat(256);
        
        const response = await request(app)
          .post('/api/garages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: tooLongName,
            location: 'Test Location',
            hourlyRate: 5.00
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/name.*length|name.*too long/i);
      });

      it('should handle extremely long input (1MB+)', async () => {
        const hugeString = 'A'.repeat(1024 * 1024 + 1); // 1MB + 1 byte
        
        const response = await request(app)
          .post('/api/garages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: hugeString,
            location: 'Test Location',
            hourlyRate: 5.00
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/name.*length|payload.*large/i);
      });
    });

    describe('Special Characters and Unicode', () => {
      it('should handle Unicode characters in garage names', async () => {
        const unicodeName = '🚗 Garage Naïve Café 中文 العربية';
        
        const response = await request(app)
          .post('/api/garages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: unicodeName,
            location: 'Test Location',
            hourlyRate: 5.00
          });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(unicodeName);
      });

      it('should handle emojis in vehicle descriptions', async () => {
        const emojiDescription = '🔥 Hot ride! 🚗💨 Super fast car! ⚡🏎️';
        
        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            licensePlate: 'EMO123',
            make: 'Tesla',
            model: 'Model S',
            color: 'Red',
            description: emojiDescription
          });

        expect(response.status).toBe(201);
        expect(response.body.description).toBe(emojiDescription);
      });

      it('should handle null byte attempts', async () => {
        const nullByteString = 'Test\x00Garage';
        
        const response = await request(app)
          .post('/api/garages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: nullByteString,
            location: 'Test Location',
            hourlyRate: 5.00
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/invalid.*character|null.*byte/i);
      });

      it('should handle control characters', async () => {
        const controlChars = 'Test\r\n\t\b\f\vGarage';
        
        const response = await request(app)
          .post('/api/garages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: controlChars,
            location: 'Test Location',
            hourlyRate: 5.00
          });

        // Should either sanitize or reject
        expect([200, 201, 400]).toContain(response.status);
        if (response.status === 201) {
          expect(response.body.name).not.toBe(controlChars);
        }
      });
    });
  });

  describe('Date and Time Boundaries', () => {
    describe('Date Range Validation', () => {
      it('should handle minimum JavaScript date (1970-01-01)', async () => {
        const garage = await testFactory.createGarage();
        const spot = await testFactory.createSpot({ garageId: garage.id });
        const vehicle = await testFactory.createVehicle();
        
        const minDate = new Date(0).toISOString();
        
        const response = await request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: vehicle.id,
            spotId: spot.id,
            checkInTime: minDate
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/check.*in.*time|date.*range/i);
      });

      it('should handle maximum JavaScript date (2038-01-19)', async () => {
        const garage = await testFactory.createGarage();
        const spot = await testFactory.createSpot({ garageId: garage.id });
        const vehicle = await testFactory.createVehicle();
        
        const maxDate = new Date(2147483647 * 1000).toISOString();
        
        const response = await request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: vehicle.id,
            spotId: spot.id,
            checkInTime: maxDate
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/check.*in.*time|future.*date/i);
      });

      it('should handle leap year edge case (Feb 29)', async () => {
        const garage = await testFactory.createGarage();
        const spot = await testFactory.createSpot({ garageId: garage.id });
        const vehicle = await testFactory.createVehicle();
        
        const leapYearDate = new Date('2024-02-29T12:00:00Z').toISOString();
        
        const response = await request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: vehicle.id,
            spotId: spot.id,
            checkInTime: leapYearDate
          });

        expect(response.status).toBe(201);
        expect(new Date(response.body.checkInTime).getDate()).toBe(29);
      });

      it('should reject non-leap year Feb 29', async () => {
        const garage = await testFactory.createGarage();
        const spot = await testFactory.createSpot({ garageId: garage.id });
        const vehicle = await testFactory.createVehicle();
        
        const invalidDate = '2023-02-29T12:00:00Z';
        
        const response = await request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: vehicle.id,
            spotId: spot.id,
            checkInTime: invalidDate
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/invalid.*date/i);
      });
    });

    describe('Timezone Edge Cases', () => {
      it('should handle UTC midnight boundaries', async () => {
        const garage = await testFactory.createGarage();
        const spot = await testFactory.createSpot({ garageId: garage.id });
        const vehicle = await testFactory.createVehicle();
        
        const utcMidnight = new Date('2024-01-01T00:00:00Z').toISOString();
        
        const response = await request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: vehicle.id,
            spotId: spot.id,
            checkInTime: utcMidnight
          });

        expect(response.status).toBe(201);
      });

      it('should handle daylight saving time transitions', async () => {
        const garage = await testFactory.createGarage();
        const spot = await testFactory.createSpot({ garageId: garage.id });
        const vehicle = await testFactory.createVehicle();
        
        // Spring forward: 2:00 AM becomes 3:00 AM
        const dstTransition = '2024-03-10T07:00:00Z'; // 2 AM EST = 7 AM UTC
        
        const response = await request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: vehicle.id,
            spotId: spot.id,
            checkInTime: dstTransition
          });

        expect(response.status).toBe(201);
      });
    });
  });

  describe('Null and Undefined Boundaries', () => {
    it('should handle null values in optional fields', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licensePlate: 'NULL123',
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue',
          description: null
        });

      expect(response.status).toBe(201);
      expect(response.body.description).toBeNull();
    });

    it('should reject null values in required fields', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licensePlate: null,
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/license.*plate.*required/i);
    });

    it('should handle undefined values', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licensePlate: 'UND123',
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue',
          description: undefined
        });

      expect(response.status).toBe(201);
      expect(response.body.description).toBeNull();
    });
  });

  describe('Array and Object Boundaries', () => {
    it('should handle empty arrays', async () => {
      const response = await request(app)
        .get('/api/garages')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          tags: '[]'
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle very large arrays', async () => {
      const largeArray = Array(10000).fill('tag');
      
      const response = await request(app)
        .get('/api/garages')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          tags: JSON.stringify(largeArray)
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/too many|limit/i);
    });

    it('should handle deeply nested objects', async () => {
      const deepObject = { a: { b: { c: { d: { e: { f: 'deep' } } } } } };
      
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licensePlate: 'DEEP123',
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue',
          metadata: deepObject
        });

      expect([201, 400]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.error).toMatch(/nesting|depth/i);
      }
    });
  });
});
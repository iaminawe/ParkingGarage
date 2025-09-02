import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../factories/TestDataFactory';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Security Edge Cases Testing', () => {
  let testFactory: TestDataFactory;
  let authToken: string;
  let garage: any;
  let user: any;

  beforeEach(async () => {
    testFactory = new TestDataFactory();
    
    user = await testFactory.createUser();
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

  describe('JWT Token Manipulation', () => {
    it('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'invalid.token.format',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid', // Invalid payload
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Incomplete token
        'eyJhbGciOiJub25lIn0.eyJ1c2VySWQiOiJhZG1pbiJ9.', // None algorithm
        '', // Empty token
        'null',
        'undefined'
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/garages')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.error).toMatch(/invalid.*token|unauthorized/i);
      }
    });

    it('should reject expired JWT tokens', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: user.id, exp: Math.floor(Date.now() / 1000) - 3600 }, // Expired 1 hour ago
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/garages')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/token.*expired|unauthorized/i);
    });

    it('should reject tokens with invalid signatures', async () => {
      // Create token with wrong secret
      const invalidSignatureToken = jwt.sign(
        { userId: user.id },
        'wrong-secret'
      );

      const response = await request(app)
        .get('/api/garages')
        .set('Authorization', `Bearer ${invalidSignatureToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid.*token|signature/i);
    });

    it('should prevent token replay attacks', async () => {
      // Use same token multiple times rapidly
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/garages')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(requests);
      
      // All should succeed (no replay protection at token level)
      // But should have rate limiting
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      
      const rateLimited = results.filter(r =>
        r.status === 'fulfilled' && r.value.status === 429
      );

      expect(successful.length + rateLimited.length).toBe(10);
    });

    it('should handle token with tampered claims', async () => {
      // Create token with elevated privileges
      const tamperedToken = jwt.sign(
        { 
          userId: user.id,
          role: 'admin', // User doesn't have admin role
          permissions: ['*'] 
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${tamperedToken}`);

      // Should either reject due to role validation or return 403
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('SQL Injection Attempts', () => {
    it('should prevent SQL injection in garage name search', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE garages; --",
        "' OR '1'='1",
        "'; UPDATE garages SET name='hacked' WHERE 1=1; --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO garages (name) VALUES ('injected'); --",
        "\"; DROP TABLE vehicles; --",
        "1'; EXEC sp_executesql N'SELECT * FROM users'; --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get('/api/garages')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ search: payload });

        // Should not crash and should handle safely
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        // Verify no SQL injection occurred by checking data integrity
        const garageName = await prisma.garage.findFirst({
          where: { name: 'hacked' }
        });
        expect(garageName).toBeNull();
      }

      // Verify tables still exist
      const garageCount = await prisma.garage.count();
      expect(garageCount).toBeGreaterThanOrEqual(1);
    });

    it('should prevent SQL injection in license plate queries', async () => {
      const vehicle = await testFactory.createVehicle({
        licensePlate: 'SAFE123'
      });

      const injectionPayloads = [
        "' OR 1=1 --",
        "'; DROP TABLE vehicles; SELECT * FROM users WHERE '1'='1",
        "ABC123'; DELETE FROM sessions; --"
      ];

      for (const payload of injectionPayloads) {
        const response = await request(app)
          .get('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ licensePlate: payload });

        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          // Should not return unauthorized data
          expect(Array.isArray(response.body.data)).toBe(true);
          expect(response.body.data.length).toBe(0); // No match for malicious query
        }
      }

      // Verify original vehicle still exists
      const originalVehicle = await prisma.vehicle.findUnique({
        where: { id: vehicle.id }
      });
      expect(originalVehicle).toBeTruthy();
      expect(originalVehicle?.licensePlate).toBe('SAFE123');
    });

    it('should sanitize ORDER BY clause injection', async () => {
      await Promise.all([
        testFactory.createVehicle({ make: 'Toyota' }),
        testFactory.createVehicle({ make: 'Honda' }),
        testFactory.createVehicle({ make: 'Ford' })
      ]);

      const maliciousOrderBy = "make; DROP TABLE vehicles; SELECT * FROM users; --";

      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          sortBy: maliciousOrderBy,
          sortOrder: 'asc'
        });

      // Should either reject or handle safely
      expect([200, 400]).toContain(response.status);
      
      // Verify table still exists
      const vehicleCount = await prisma.vehicle.count();
      expect(vehicleCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('XSS Payload Variations', () => {
    it('should sanitize basic XSS payloads in input fields', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
        '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--></SCRIPT>">\';alert(String.fromCharCode(88,83,83))//\';'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            licensePlate: 'XSS123',
            make: payload,
            model: 'Test',
            color: 'Blue'
          });

        if (response.status === 201) {
          // Verify payload was sanitized
          const createdVehicle = await prisma.vehicle.findUnique({
            where: { id: response.body.id }
          });
          
          expect(createdVehicle?.make).not.toBe(payload);
          expect(createdVehicle?.make).not.toContain('<script>');
          expect(createdVehicle?.make).not.toContain('javascript:');
          expect(createdVehicle?.make).not.toContain('onerror');
          expect(createdVehicle?.make).not.toContain('onload');
        } else {
          // Should be rejected with validation error
          expect(response.status).toBe(400);
          expect(response.body.error).toBeDefined();
        }
      }
    });

    it('should handle XSS in garage descriptions', async () => {
      const xssDescription = '<script>window.location="http://evil.com"</script>Premium parking facility';

      const response = await request(app)
        .post('/api/garages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'XSS Test Garage',
          location: 'Test Location',
          description: xssDescription,
          hourlyRate: 5.00
        });

      if (response.status === 201) {
        expect(response.body.description).not.toContain('<script>');
        expect(response.body.description).not.toContain('window.location');
        
        // Verify stored data is clean
        const storedGarage = await prisma.garage.findUnique({
          where: { id: response.body.id }
        });
        
        expect(storedGarage?.description).not.toContain('<script>');
      } else {
        expect(response.status).toBe(400);
      }
    });

    it('should prevent XSS in JSON responses', async () => {
      // Create vehicle with potentially dangerous characters
      const vehicle = await testFactory.createVehicle({
        make: 'Test</script><script>alert("XSS")</script>',
        model: 'Dangerous"Model',
        description: 'This car has <img src="x" onerror="alert(\'XSS\')">'
      });

      const response = await request(app)
        .get(`/api/vehicles/${vehicle.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Verify response doesn't contain executable scripts
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('<script>');
      expect(responseText).not.toContain('onerror');
      expect(responseText).not.toContain('javascript:');
    });
  });

  describe('Authentication Bypass Attempts', () => {
    it('should prevent authentication bypass with header manipulation', async () => {
      const bypassHeaders = [
        { 'X-User-ID': user.id },
        { 'X-Forwarded-User': user.email },
        { 'X-Real-IP': '127.0.0.1' },
        { 'X-Forwarded-For': '127.0.0.1' },
        { 'X-Admin': 'true' },
        { 'User-Agent': `AuthBypass userId=${user.id}` }
      ];

      for (const headers of bypassHeaders) {
        const response = await request(app)
          .get('/api/garages')
          .set(headers);

        expect(response.status).toBe(401);
        expect(response.body.error).toMatch(/unauthorized|authentication.*required/i);
      }
    });

    it('should prevent session fixation attacks', async () => {
      // Attempt to use a fixed session ID
      const fixedSessionId = 'fixed-session-id-12345';
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('Cookie', `sessionId=${fixedSessionId}`)
        .send({
          email: user.email,
          password: 'testPassword123'
        });

      expect(loginResponse.status).toBe(200);
      
      // Verify new session ID was generated (not the fixed one)
      const sessionCookie = loginResponse.headers['set-cookie']?.find(
        cookie => cookie.startsWith('sessionId=')
      );
      
      if (sessionCookie) {
        expect(sessionCookie).not.toContain(fixedSessionId);
      }
    });

    it('should prevent privilege escalation through role manipulation', async () => {
      // Try to escalate privileges through various means
      const escalationAttempts = [
        {
          method: 'PUT',
          url: '/api/users/profile',
          body: { role: 'admin', permissions: ['*'] }
        },
        {
          method: 'POST',
          url: '/api/users/role',
          body: { role: 'admin' }
        },
        {
          method: 'PUT',
          url: `/api/users/${user.id}`,
          body: { isAdmin: true, role: 'ADMIN' }
        }
      ];

      for (const attempt of escalationAttempts) {
        const response = await request(app)
          [attempt.method.toLowerCase()]
          (attempt.url)
          .set('Authorization', `Bearer ${authToken}`)
          .send(attempt.body);

        // Should reject or ignore privilege escalation attempts
        if (response.status === 200) {
          // If accepted, verify privileges weren't actually escalated
          const userAfter = await prisma.user.findUnique({
            where: { id: user.id }
          });
          expect(userAfter?.role).not.toBe('admin');
          expect(userAfter?.role).not.toBe('ADMIN');
        } else {
          // Should be rejected
          expect([400, 403, 404]).toContain(response.status);
        }
      }
    });

    it('should prevent brute force attacks on login', async () => {
      const wrongPassword = 'wrongpassword';
      const attempts = [];

      // Make multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: user.email,
              password: wrongPassword
            })
        );
      }

      const results = await Promise.allSettled(attempts);
      
      const unauthorizedAttempts = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 401
      );
      
      const blockedAttempts = results.filter(r =>
        r.status === 'fulfilled' && r.value.status === 429
      );

      // Should show rate limiting after several attempts
      expect(unauthorizedAttempts.length + blockedAttempts.length).toBe(10);
      expect(blockedAttempts.length).toBeGreaterThan(0);
    });
  });

  describe('Authorization Bypass Attempts', () => {
    it('should prevent access to other users\' resources', async () => {
      // Create another user and their resources
      const otherUser = await testFactory.createUser();
      const otherUserVehicle = await testFactory.createVehicle({
        ownerId: otherUser.id
      });

      // Try to access other user's vehicle
      const response = await request(app)
        .get(`/api/vehicles/${otherUserVehicle.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/access.*denied|forbidden/i);
    });

    it('should prevent unauthorized resource modification', async () => {
      const otherUser = await testFactory.createUser();
      const otherUserVehicle = await testFactory.createVehicle({
        ownerId: otherUser.id
      });

      // Try to modify other user's vehicle
      const response = await request(app)
        .put(`/api/vehicles/${otherUserVehicle.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          make: 'Hacked',
          model: 'Modified'
        });

      expect(response.status).toBe(403);
      
      // Verify vehicle wasn't modified
      const unchangedVehicle = await prisma.vehicle.findUnique({
        where: { id: otherUserVehicle.id }
      });
      expect(unchangedVehicle?.make).not.toBe('Hacked');
    });

    it('should prevent path traversal in file operations', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd'
      ];

      for (const payload of pathTraversalPayloads) {
        const response = await request(app)
          .get('/api/reports/download')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ filename: payload });

        // Should reject path traversal attempts
        expect([400, 403, 404]).toContain(response.status);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should prevent CSRF attacks', async () => {
      // Attempt operations without proper CSRF protection
      const csrfAttempt = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Origin', 'http://evil.com')
        .set('Referer', 'http://evil.com/attack.html')
        .send({
          licensePlate: 'CSRF123',
          make: 'Evil',
          model: 'Attack'
        });

      // Should be blocked by CORS or CSRF protection
      expect([400, 403, 404]).toContain(csrfAttempt.status);
    });
  });

  describe('Input Validation Bypass', () => {
    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'plaintext',
        '@missingusername.com',
        'missing@.com',
        'missing.domain@.com',
        'spaces in@email.com',
        'email@',
        'email@domain',
        'email@domain.',
        'email@domain..com',
        'admin@admin"injected',
        'test@example.com<script>alert("xss")</script>'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email,
            password: 'ValidPassword123!',
            firstName: 'Test',
            lastName: 'User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/invalid.*email|email.*format/i);
      }
    });

    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        'admin',
        '12345678',
        'password123',
        'abc123',
        '',
        'a', // Too short
        'NoNumbersOrSpecialChars', // Missing requirements
        '12345678901234567890123456789012345678901234567890123456789012345678901234567890' // Too long
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${Date.now()}@example.com`,
            password,
            firstName: 'Test',
            lastName: 'User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/password.*weak|password.*requirements/i);
      }
    });

    it('should prevent buffer overflow attempts', async () => {
      const overflowAttempts = [
        'A'.repeat(10000), // Very long string
        '\x00'.repeat(1000), // Null bytes
        '\xFF'.repeat(1000), // High bytes
        Array(1000).fill('🚗').join(''), // Unicode overflow
      ];

      for (const payload of overflowAttempts) {
        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            licensePlate: 'BUF123',
            make: payload,
            model: 'Test',
            color: 'Blue'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/too.*long|invalid.*input|validation.*error/i);
      }
    });
  });

  describe('Race Condition Exploits', () => {
    it('should prevent TOCTOU (Time-of-Check-Time-of-Use) attacks', async () => {
      const spot = await testFactory.createSpot({ 
        garageId: garage.id,
        status: 'AVAILABLE' 
      });

      // Concurrent attempts to exploit TOCTOU
      const toctouAttempts = Array(5).fill(null).map(async () => {
        // Check availability
        const checkResponse = await request(app)
          .get(`/api/spots/${spot.id}/availability`)
          .set('Authorization', `Bearer ${authToken}`);

        if (checkResponse.body.available) {
          // Immediately try to reserve
          return request(app)
            .post('/api/checkins')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              vehicleId: (await testFactory.createVehicle()).id,
              spotId: spot.id
            });
        }
        return { status: 400 };
      });

      const results = await Promise.allSettled(toctouAttempts);
      
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );

      // Only one should succeed despite all seeing it as available
      expect(successful).toHaveLength(1);
    });

    it('should handle concurrent account modifications safely', async () => {
      // Concurrent profile updates
      const updatePromises = Array(5).fill(null).map((_, index) =>
        request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: `Updated${index}`,
            lastName: 'User'
          })
      );

      const results = await Promise.allSettled(updatePromises);
      
      // All updates should complete successfully with proper concurrency control
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successful.length).toBeGreaterThan(0);
      
      // Final state should be consistent
      const finalUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      expect(finalUser?.firstName).toMatch(/^Updated\d+$/);
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should not leak sensitive information in error messages', async () => {
      // Test various error conditions
      const errorTests = [
        {
          url: '/api/vehicles/non-existent-id',
          expectedStatus: 404,
          shouldNotContain: ['user', 'password', 'database', 'table', 'column']
        },
        {
          url: '/api/admin/users',
          expectedStatus: 403,
          shouldNotContain: ['password', 'hash', 'salt', 'secret']
        }
      ];

      for (const test of errorTests) {
        const response = await request(app)
          .get(test.url)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(test.expectedStatus);
        
        const responseText = JSON.stringify(response.body).toLowerCase();
        for (const sensitiveWord of test.shouldNotContain) {
          expect(responseText).not.toContain(sensitiveWord);
        }
      }
    });

    it('should prevent username enumeration', async () => {
      const existingEmail = user.email;
      const nonExistentEmail = 'nonexistent@example.com';

      // Login attempts with both emails
      const existingResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: existingEmail,
          password: 'wrongpassword'
        });

      const nonExistentResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: nonExistentEmail,
          password: 'wrongpassword'
        });

      // Both should return similar generic error messages
      expect(existingResponse.status).toBe(401);
      expect(nonExistentResponse.status).toBe(401);
      
      // Error messages should be similar to prevent enumeration
      expect(existingResponse.body.error.toLowerCase())
        .toMatch(/invalid.*credentials|login.*failed/i);
      expect(nonExistentResponse.body.error.toLowerCase())
        .toMatch(/invalid.*credentials|login.*failed/i);
    });
  });
});
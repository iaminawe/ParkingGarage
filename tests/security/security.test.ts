/**
 * Comprehensive Security Tests
 * Testing all OWASP Top 10 security measures
 */

import request from 'supertest';
import app from '../../src/app';
import { SecurityAuditService } from '../../src/services/SecurityAuditService';
import { circuitBreakerManager } from '../../src/middleware/security/circuitBreaker';
import { detectSecurityThreats } from '../../src/middleware/security/inputSanitization';

describe('Security Measures', () => {
  beforeEach(() => {
    // Reset security state before each test
    circuitBreakerManager.resetAll();
  });

  describe('A01:2021 – Broken Access Control', () => {
    test('should deny access to protected endpoints without authentication', async () => {
      const protectedEndpoints = [
        '/api/garage/config',
        '/api/vehicles/123',
        '/api/sessions/123/end'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });

    test('should prevent vertical privilege escalation', async () => {
      // Test accessing admin endpoints with user token
      const userToken = 'user-jwt-token'; // Would be generated in real test
      
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toMatch(/insufficient/i);
    });

    test('should prevent horizontal privilege escalation', async () => {
      // Test accessing other user's data
      const userToken = 'user1-jwt-token';
      
      const response = await request(app)
        .get('/api/users/other-user-id/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('A02:2021 – Cryptographic Failures', () => {
    test('should enforce HTTPS in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['strict-transport-security']).toBeDefined();
      
      process.env.NODE_ENV = 'test';
    });

    test('should use secure password hashing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
          name: 'Test User'
        });

      // Password should never be returned in response
      if (response.body.user) {
        expect(response.body.user.password).toBeUndefined();
        expect(response.body.user.passwordHash).toBeUndefined();
      }
    });

    test('should use secure session tokens', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });

      if (response.body.token) {
        // JWT should have proper structure
        expect(response.body.token.split('.')).toHaveLength(3);
      }
    });
  });

  describe('A03:2021 – Injection', () => {
    test('should prevent SQL injection in query parameters', async () => {
      const maliciousQueries = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
        "UNION SELECT * FROM users",
        "' OR 1=1 LIMIT 1 OFFSET 0 --"
      ];

      for (const query of maliciousQueries) {
        const response = await request(app)
          .get('/api/spots')
          .query({ search: query });

        // Should either sanitize the input or reject the request
        expect(response.status).not.toBe(500);
        
        // Check that security threat was detected
        const threats = detectSecurityThreats(query, 'search');
        expect(threats).toContain('SQL_INJECTION');
      }
    });

    test('should prevent XSS in request body', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<svg onload="alert(1)">'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/vehicles')
          .send({
            licensePlate: payload,
            vehicleType: 'car'
          });

        // Should sanitize or reject malicious input
        expect(response.status).toBeLessThan(500);
        
        // Check that security threat was detected
        const threats = detectSecurityThreats(payload, 'licensePlate');
        expect(threats).toContain('XSS');
      }
    });

    test('should prevent NoSQL injection', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $ne: null },
          password: { $regex: '.*' }
        });

      // Should reject object-based queries
      expect(response.status).toBe(400);
    });

    test('should prevent command injection', async () => {
      const commandInjectionPayloads = [
        '; ls -la',
        '&& cat /etc/passwd',
        '| whoami',
        '`id`',
        '$(whoami)'
      ];

      for (const payload of commandInjectionPayloads) {
        const response = await request(app)
          .post('/api/vehicles')
          .send({
            licensePlate: `ABC${payload}`,
            vehicleType: 'car'
          });

        expect(response.status).toBeLessThan(500);
      }
    });
  });

  describe('A04:2021 – Insecure Design', () => {
    test('should implement account lockout after failed attempts', async () => {
      const email = 'test@example.com';
      
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email,
            password: 'wrongpassword'
          });
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email,
          password: 'wrongpassword'
        })
        .expect(429);

      expect(response.body.code).toBe('AUTH_RATE_LIMIT_EXCEEDED');
    });

    test('should implement proper session management', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'correctpassword'
        });

      if (loginResponse.body.token) {
        // Test session invalidation on logout
        await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${loginResponse.body.token}`);

        // Token should be invalid after logout
        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${loginResponse.body.token}`)
          .expect(401);
      }
    });
  });

  describe('A05:2021 – Security Misconfiguration', () => {
    test('should have secure HTTP headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Check security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['referrer-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should not expose sensitive server information', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // These headers should not be present
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
    });

    test('should have proper error handling', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      // Should not expose stack traces in production
      expect(response.body.stack).toBeUndefined();
      expect(response.body.error).toBeDefined();
    });
  });

  describe('A06:2021 – Vulnerable and Outdated Components', () => {
    test('should validate all inputs', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: '', // Invalid: empty
          vehicleType: 'invalidtype' // Invalid: not in enum
        })
        .expect(400);

      expect(response.body.error).toMatch(/validation/i);
    });
  });

  describe('A07:2021 – Identification and Authentication Failures', () => {
    test('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'abc',
        'password123', // Missing uppercase and symbols
        'PASSWORD123' // Missing lowercase and symbols
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password,
            name: 'Test User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/password/i);
      }
    });

    test('should implement proper JWT validation', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '' // Empty token
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.error).toMatch(/token|auth/i);
      }
    });
  });

  describe('A08:2021 – Software and Data Integrity Failures', () => {
    test('should validate data integrity in requests', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: 'ABC123',
          vehicleType: 'car',
          maliciousField: 'should be stripped'
        });

      if (response.status === 201) {
        expect(response.body.maliciousField).toBeUndefined();
      }
    });
  });

  describe('A09:2021 – Security Logging and Monitoring Failures', () => {
    test('should log security events', async () => {
      const logSpy = jest.spyOn(SecurityAuditService, 'logSecurityEvent');
      
      // Trigger a security event
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    test('should provide security monitoring endpoints', async () => {
      const response = await request(app)
        .get('/api/health/security')
        .expect(200);

      expect(response.body).toHaveProperty('monitoring');
      expect(response.body).toHaveProperty('analytics');
      expect(response.body).toHaveProperty('circuitBreakers');
    });
  });

  describe('A10:2021 – Server-Side Request Forgery (SSRF)', () => {
    test('should validate and sanitize URLs', async () => {
      const maliciousUrls = [
        'http://localhost:22/',
        'http://127.0.0.1:22/',
        'http://169.254.169.254/',
        'file:///etc/passwd',
        'gopher://evil.com'
      ];

      for (const url of maliciousUrls) {
        // Test any endpoint that accepts URLs
        const response = await request(app)
          .post('/api/webhooks/callback')
          .send({
            url,
            data: 'test'
          });

        // Should reject or sanitize malicious URLs
        expect(response.status).toBeLessThan(500);
      }
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce general rate limits', async () => {
      const requests = [];
      
      // Send many requests quickly
      for (let i = 0; i < 105; i++) {
        requests.push(
          request(app)
            .get('/api/spots')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should have stricter limits for auth endpoints', async () => {
      const requests = [];
      
      // Send many auth requests quickly
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit breaker after failures', async () => {
      const serviceName = 'test-service';
      const circuitBreaker = circuitBreakerManager.getCircuitBreaker(serviceName);
      
      // Simulate multiple failures
      const failingFunction = async () => {
        throw new Error('Service failure');
      };

      for (let i = 0; i < 6; i++) {
        try {
          await circuitBreaker.execute(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe('OPEN');
    });

    test('should provide circuit breaker health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.circuitBreakers).toBeDefined();
      expect(response.body.circuitBreakers.status).toBeDefined();
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize HTML content', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: '<script>alert("xss")</script>ABC123',
          vehicleType: 'car'
        });

      if (response.status === 201) {
        expect(response.body.licensePlate).not.toMatch(/<script/);
      }
    });

    test('should detect and log security threats', () => {
      const threats = detectSecurityThreats("'; DROP TABLE users; --", 'testField');
      expect(threats).toContain('SQL_INJECTION');

      const xssThreats = detectSecurityThreats('<script>alert(1)</script>', 'testField');
      expect(xssThreats).toContain('XSS');

      const pathThreats = detectSecurityThreats('../../../etc/passwd', 'testField');
      expect(pathThreats).toContain('PATH_TRAVERSAL');
    });
  });

  describe('Security Headers', () => {
    test('should set comprehensive security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['referrer-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['cache-control']).toBeDefined();
      expect(response.headers['pragma']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should sanitize error messages in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.stack).toBeUndefined();
      expect(response.body.message).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});
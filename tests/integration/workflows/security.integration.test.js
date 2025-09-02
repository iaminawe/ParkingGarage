/**
 * Security Integration Tests
 * 
 * Tests end-to-end security across all system workflows
 */

const request = require('supertest');
const { faker } = require('@faker-js/faker');
const { createMockApp } = require('../../helpers/mockApp');

describe('Security Integration Tests', () => {
  let app;
  let api;
  let adminToken;
  let userToken;

  beforeEach(async () => {
    app = createMockApp();
    api = app.locals.api;

    // Create admin user
    const adminUser = {
      email: 'admin@test.com',
      password: 'AdminPass123!',
      role: 'admin'
    };

    await request(app)
      .post('/api/users/register')
      .send(adminUser)
      .expect(201);

    await request(app)
      .post('/api/users/verify-email')
      .send({ token: 'admin-verify', email: adminUser.email })
      .expect(200);

    const adminLoginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: adminUser.email,
        password: adminUser.password
      })
      .expect(200);

    adminToken = adminLoginResponse.body.token;

    // Create regular user
    const regularUser = {
      email: 'user@test.com',
      password: 'UserPass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName()
    };

    await request(app)
      .post('/api/users/register')
      .send(regularUser)
      .expect(201);

    await request(app)
      .post('/api/users/verify-email')
      .send({ token: 'user-verify', email: regularUser.email })
      .expect(200);

    const userLoginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: regularUser.email,
        password: regularUser.password
      })
      .expect(200);

    userToken = userLoginResponse.body.token;
  });

  describe('1. Authentication Security Workflows', () => {
    test('should enforce secure authentication flow with proper token validation', async () => {
      // Test 1: Invalid token should be rejected
      const invalidTokenResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);

      expect(invalidTokenResponse.body.error).toContain('Invalid token');

      // Test 2: Expired token should be rejected
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const expiredTokenResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(expiredTokenResponse.body.error).toContain('Token expired');

      // Test 3: Missing Authorization header
      const noAuthResponse = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(noAuthResponse.body.error).toContain('No token provided');

      // Test 4: Malformed Authorization header
      const malformedAuthResponses = await Promise.allSettled([
        request(app).get('/api/users/profile').set('Authorization', 'InvalidFormat'),
        request(app).get('/api/users/profile').set('Authorization', 'Bearer'),
        request(app).get('/api/users/profile').set('Authorization', 'Basic dXNlcjpwYXNz')
      ]);

      malformedAuthResponses.forEach(result => {
        expect(result.value.status).toBe(401);
      });

      // Test 5: Valid token should work
      const validTokenResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(validTokenResponse.body.email).toBe('user@test.com');

      // Test 6: Token should include security metadata
      expect(validTokenResponse.headers).toHaveProperty('x-token-type');
      expect(validTokenResponse.headers).toHaveProperty('x-session-id');
    });

    test('should prevent brute force attacks with progressive lockout', async () => {
      const targetEmail = faker.internet.email();
      
      // Register target user
      await request(app)
        .post('/api/users/register')
        .send({
          email: targetEmail,
          password: 'CorrectPass123!',
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName()
        })
        .expect(201);

      await request(app)
        .post('/api/users/verify-email')
        .send({ token: 'target-verify', email: targetEmail })
        .expect(200);

      const attackAttempts = [];
      const wrongPassword = 'WrongPassword123!';

      // Attempt 1-3: Normal failure responses
      for (let i = 1; i <= 3; i++) {
        const startTime = Date.now();
        const response = await request(app)
          .post('/api/users/login')
          .send({
            email: targetEmail,
            password: wrongPassword
          })
          .expect(401);

        const responseTime = Date.now() - startTime;
        attackAttempts.push({ attempt: i, responseTime, status: response.status });

        expect(response.body.error).toBe('Invalid credentials');
        expect(response.body.attemptsRemaining).toBe(5 - i); // Assuming 5 attempts before lockout
      }

      // Attempt 4-5: Increased delay (rate limiting)
      for (let i = 4; i <= 5; i++) {
        const startTime = Date.now();
        const response = await request(app)
          .post('/api/users/login')
          .send({
            email: targetEmail,
            password: wrongPassword
          })
          .expect(401);

        const responseTime = Date.now() - startTime;
        attackAttempts.push({ attempt: i, responseTime, status: response.status });

        expect(responseTime).toBeGreaterThan(1000); // Progressive delay
        expect(response.body.error).toBe('Invalid credentials');
      }

      // Attempt 6: Account should be locked
      const lockoutResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: targetEmail,
          password: wrongPassword
        })
        .expect(423); // Locked

      expect(lockoutResponse.body.error).toBe('Account locked due to multiple failed attempts');
      expect(lockoutResponse.body.lockoutExpiry).toBeTruthy();

      // Even correct password should fail when locked
      const correctPasswordResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: targetEmail,
          password: 'CorrectPass123!'
        })
        .expect(423);

      expect(correctPasswordResponse.body.error).toContain('locked');

      // Check security event was logged
      const securityEventsResponse = await request(app)
        .get('/api/admin/security/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          eventType: 'brute_force_attempt',
          targetEmail: targetEmail
        })
        .expect(200);

      expect(securityEventsResponse.body.events).toHaveLength(1);
      expect(securityEventsResponse.body.events[0]).toMatchObject({
        eventType: 'brute_force_attempt',
        targetEmail: targetEmail,
        attempts: 6,
        sourceIP: expect.any(String),
        actionTaken: 'account_locked'
      });

      console.log('Brute Force Protection Results:', {
        attempts: attackAttempts,
        lockoutTriggered: true,
        securityEventLogged: true
      });
    });

    test('should detect and prevent session hijacking attempts', async () => {
      // Get user session token
      const sessionToken = userToken;

      // Valid request from original session
      const validResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${sessionToken}`)
        .set('User-Agent', 'TestApp/1.0')
        .set('X-Forwarded-For', '192.168.1.100')
        .expect(200);

      expect(validResponse.body.email).toBe('user@test.com');

      // Suspicious request: Same token but different user agent and IP
      const suspiciousResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${sessionToken}`)
        .set('User-Agent', 'AttackerBot/2.0')
        .set('X-Forwarded-For', '10.0.0.1') // Different IP
        .expect(401); // Should be blocked

      expect(suspiciousResponse.body.error).toContain('Session anomaly detected');

      // Check that security alert was generated
      const alertsResponse = await request(app)
        .get('/api/admin/security/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ alertType: 'session_hijacking' })
        .expect(200);

      expect(alertsResponse.body.alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'session_hijacking',
            severity: 'high',
            details: expect.objectContaining({
              originalUserAgent: 'TestApp/1.0',
              suspiciousUserAgent: 'AttackerBot/2.0',
              originalIP: '192.168.1.100',
              suspiciousIP: '10.0.0.1'
            })
          })
        ])
      );

      // Original session should be invalidated
      const invalidatedSessionResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${sessionToken}`)
        .set('User-Agent', 'TestApp/1.0')
        .set('X-Forwarded-For', '192.168.1.100')
        .expect(401);

      expect(invalidatedSessionResponse.body.error).toContain('Session invalidated');
    });
  });

  describe('2. Authorization and Access Control', () => {
    test('should enforce role-based access control across all endpoints', async () => {
      const restrictedEndpoints = [
        // Admin-only endpoints
        { method: 'get', path: '/api/admin/users', requiredRole: 'admin' },
        { method: 'post', path: '/api/admin/garage/structure', requiredRole: 'admin' },
        { method: 'get', path: '/api/admin/reports/revenue', requiredRole: 'admin' },
        { method: 'put', path: '/api/admin/system/maintenance', requiredRole: 'admin' },
        { method: 'delete', path: '/api/admin/sessions/bulk-delete', requiredRole: 'admin' },
        
        // Manager-level endpoints
        { method: 'put', path: '/api/spots/F1-A-001/status', requiredRole: 'manager' },
        { method: 'get', path: '/api/reports/utilization', requiredRole: 'manager' },
        { method: 'post', path: '/api/maintenance/schedule', requiredRole: 'manager' }
      ];

      for (const endpoint of restrictedEndpoints) {
        // Test with regular user token (should fail)
        const userAccessResponse = await request(app)[endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${userToken}`)
          .send({});

        expect(userAccessResponse.status).toBe(403);
        expect(userAccessResponse.body.error).toMatch(/insufficient permissions|forbidden/i);

        // Test with admin token (should work for admin endpoints)
        if (endpoint.requiredRole === 'admin') {
          const adminAccessResponse = await request(app)[endpoint.method](endpoint.path)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});

          // Should not be 403 (may be other errors like 400 for missing data)
          expect(adminAccessResponse.status).not.toBe(403);
        }
      }

      // Verify access control audit logging
      const auditResponse = await request(app)
        .get('/api/admin/audit/access-control')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startTime: new Date(Date.now() - 60000).toISOString() // Last minute
        })
        .expect(200);

      expect(auditResponse.body.events.length).toBeGreaterThan(0);
      
      const forbiddenEvents = auditResponse.body.events.filter(e => e.result === 'forbidden');
      expect(forbiddenEvents.length).toBeGreaterThan(0);
    });

    test('should validate resource ownership and prevent unauthorized access', async () => {
      // Create two users
      const user1Data = {
        email: 'user1@test.com',
        password: 'User1Pass123!',
        firstName: 'User',
        lastName: 'One'
      };

      const user2Data = {
        email: 'user2@test.com', 
        password: 'User2Pass123!',
        firstName: 'User',
        lastName: 'Two'
      };

      // Register both users
      await request(app).post('/api/users/register').send(user1Data).expect(201);
      await request(app).post('/api/users/register').send(user2Data).expect(201);
      
      await request(app).post('/api/users/verify-email')
        .send({ token: 'user1-verify', email: user1Data.email }).expect(200);
      await request(app).post('/api/users/verify-email')
        .send({ token: 'user2-verify', email: user2Data.email }).expect(200);

      // Get tokens for both users
      const user1LoginResponse = await request(app)
        .post('/api/users/login')
        .send({ email: user1Data.email, password: user1Data.password })
        .expect(200);

      const user2LoginResponse = await request(app)
        .post('/api/users/login') 
        .send({ email: user2Data.email, password: user2Data.password })
        .expect(200);

      const user1Token = user1LoginResponse.body.token;
      const user2Token = user2LoginResponse.body.token;

      // User 1 checks in a vehicle
      const user1CheckinResponse = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          licensePlate: 'USER1-CAR',
          vehicleType: 'standard'
        })
        .expect(201);

      const user1TicketId = user1CheckinResponse.body.ticketId;

      // User 2 should NOT be able to access User 1's parking session
      const unauthorizedAccessResponse = await request(app)
        .get(`/api/sessions/${user1TicketId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(unauthorizedAccessResponse.body.error).toContain('Access denied');

      // User 2 should NOT be able to checkout User 1's vehicle
      const unauthorizedCheckoutResponse = await request(app)
        .post('/api/checkout')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ licensePlate: 'USER1-CAR' })
        .expect(403);

      expect(unauthorizedCheckoutResponse.body.error).toContain('Not authorized');

      // User 1 should be able to access their own session
      const authorizedAccessResponse = await request(app)
        .get(`/api/sessions/${user1TicketId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(authorizedAccessResponse.body.ticketId).toBe(user1TicketId);

      // Admin should be able to access any session
      const adminAccessResponse = await request(app)
        .get(`/api/sessions/${user1TicketId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminAccessResponse.body.ticketId).toBe(user1TicketId);

      // Cleanup
      await request(app)
        .post('/api/checkout')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ licensePlate: 'USER1-CAR' })
        .expect(200);
    });
  });

  describe('3. Input Validation and Injection Prevention', () => {
    test('should prevent SQL injection attacks across all endpoints', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; UPDATE users SET password = 'hacked' WHERE id = 1; --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users (email, password) VALUES ('hacker@evil.com', 'password'); --"
      ];

      // Test SQL injection in various input fields
      const vulnerableEndpoints = [
        {
          method: 'post',
          path: '/api/users/register',
          payloadField: 'email',
          basePayload: { password: 'Test123!', firstName: 'Test', lastName: 'User' }
        },
        {
          method: 'post',
          path: '/api/checkin',
          payloadField: 'licensePlate',
          basePayload: { vehicleType: 'standard' }
        },
        {
          method: 'get',
          path: '/api/cars/',
          payloadField: 'licensePlate',
          basePayload: {}
        },
        {
          method: 'get',
          path: '/api/spots',
          payloadField: 'bay',
          basePayload: {},
          queryParam: true
        }
      ];

      for (const endpoint of vulnerableEndpoints) {
        for (const payload of sqlInjectionPayloads) {
          let response;
          
          if (endpoint.method === 'get' && endpoint.queryParam) {
            response = await request(app)
              .get(endpoint.path)
              .query({ [endpoint.payloadField]: payload });
          } else if (endpoint.method === 'get') {
            response = await request(app)
              .get(endpoint.path + encodeURIComponent(payload));
          } else {
            const requestPayload = {
              ...endpoint.basePayload,
              [endpoint.payloadField]: payload
            };
            
            response = await request(app)
              [endpoint.method](endpoint.path)
              .send(requestPayload);
          }

          // Should not return 500 (server error) or 200 with injection effects
          expect(response.status).not.toBe(500);
          
          // Response should indicate input validation error (400) or not found (404)
          expect([400, 404, 422]).toContain(response.status);
          
          if (response.body.error) {
            expect(response.body.error).toMatch(/invalid|validation|format/i);
          }
        }
      }

      // Verify database integrity after injection attempts
      const integrityCheckResponse = await request(app)
        .get('/api/admin/system/db-integrity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(integrityCheckResponse.body.tablesIntact).toBe(true);
      expect(integrityCheckResponse.body.noUnexpectedData).toBe(true);
    });

    test('should prevent XSS attacks and properly sanitize output', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        "';alert('XSS');//",
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ];

      // Test XSS prevention in user-generated content
      for (const payload of xssPayloads) {
        const userData = {
          email: faker.internet.email(),
          password: 'XSSTest123!',
          firstName: payload, // XSS payload in first name
          lastName: 'User',
          bio: `User bio with ${payload}` // XSS payload in bio
        };

        const registerResponse = await request(app)
          .post('/api/users/register')
          .send(userData)
          .expect(201);

        // Verify stored data is sanitized
        expect(registerResponse.body.firstName).not.toContain('<script>');
        expect(registerResponse.body.firstName).not.toContain('javascript:');
        
        // Should contain sanitized version
        expect(registerResponse.body.firstName).toMatch(/&lt;|&gt;|&quot;/);

        // Test vehicle registration with XSS
        const vehicleData = {
          licensePlate: `XSS-${Date.now()}`,
          vehicleType: 'standard',
          ownerName: payload, // XSS in owner name
          notes: `Vehicle notes ${payload}` // XSS in notes
        };

        const vehicleResponse = await request(app)
          .post('/api/admin/vehicles/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(vehicleData);

        if (vehicleResponse.status === 201) {
          expect(vehicleResponse.body.ownerName).not.toContain('<script>');
          expect(vehicleResponse.body.notes).not.toContain('javascript:');
        }
      }

      // Test API response headers for XSS protection
      const response = await request(app)
        .get('/api/spots')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    test('should validate and sanitize all input parameters', async () => {
      const invalidInputTests = [
        {
          endpoint: '/api/checkin',
          method: 'post',
          testCases: [
            { licensePlate: '', vehicleType: 'standard' }, // Empty license plate
            { licensePlate: 'A'.repeat(20), vehicleType: 'standard' }, // Too long
            { licensePlate: 'VALID-123', vehicleType: 'invalid_type' }, // Invalid vehicle type
            { licensePlate: 123, vehicleType: 'standard' }, // Wrong data type
            { vehicleType: 'standard' }, // Missing required field
          ]
        },
        {
          endpoint: '/api/users/register',
          method: 'post',
          testCases: [
            { email: 'invalid-email', password: 'Test123!' }, // Invalid email format
            { email: 'test@test.com', password: 'weak' }, // Weak password
            { email: 'test@test.com', password: 'Test123!', firstName: 'A'.repeat(101) }, // Too long name
            { email: 'test@test.com', password: 'Test123!', age: -5 }, // Invalid age
            { email: '', password: '' }, // Empty required fields
          ]
        }
      ];

      for (const testGroup of invalidInputTests) {
        for (const testCase of testGroup.testCases) {
          const response = await request(app)
            [testGroup.method](testGroup.endpoint)
            .send(testCase);

          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('errors');
          expect(Array.isArray(response.body.errors)).toBe(true);
          expect(response.body.errors.length).toBeGreaterThan(0);

          // Each error should specify the field and issue
          response.body.errors.forEach(error => {
            expect(error).toHaveProperty('field');
            expect(error).toHaveProperty('message');
            expect(typeof error.message).toBe('string');
          });
        }
      }
    });
  });

  describe('4. Data Protection and Privacy', () => {
    test('should not expose sensitive data in API responses', async () => {
      // Create user and check response doesn't include sensitive data
      const userData = {
        email: faker.internet.email(),
        password: 'SecurePass123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        ssn: '123-45-6789', // Sensitive data
        creditCard: '4111111111111111' // Sensitive data
      };

      const registerResponse = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      // Verify sensitive fields are not in response
      expect(registerResponse.body).not.toHaveProperty('password');
      expect(registerResponse.body).not.toHaveProperty('ssn');
      expect(registerResponse.body).not.toHaveProperty('creditCard');

      // Verify returned fields are properly formatted
      expect(registerResponse.body.email).toBe(userData.email);
      expect(registerResponse.body.firstName).toBe(userData.firstName);

      // Login and check profile endpoint
      await request(app)
        .post('/api/users/verify-email')
        .send({ token: 'privacy-verify', email: userData.email })
        .expect(200);

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(profileResponse.body).not.toHaveProperty('password');
      expect(profileResponse.body).not.toHaveProperty('ssn');
      expect(profileResponse.body).not.toHaveProperty('creditCard');

      // Admin endpoints should also protect sensitive data
      const adminUserResponse = await request(app)
        .get(`/api/admin/users/${registerResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminUserResponse.body).not.toHaveProperty('password');
      // Admin may see some sensitive data but it should be masked
      if (adminUserResponse.body.ssn) {
        expect(adminUserResponse.body.ssn).toMatch(/\*\*\*-\*\*-\d{4}/); // Masked format
      }
    });

    test('should implement proper data encryption for sensitive fields', async () => {
      // Test payment data encryption
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard'
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Process payment with sensitive card data
      const paymentData = {
        ticketId: checkinResponse.body.ticketId,
        amount: 15.00,
        paymentMethod: 'credit_card',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardholderName: faker.person.fullName()
      };

      const paymentResponse = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(200);

      // Verify payment response doesn't contain sensitive card data
      expect(paymentResponse.body).not.toHaveProperty('cardNumber');
      expect(paymentResponse.body).not.toHaveProperty('cvv');
      
      // Should contain masked version
      if (paymentResponse.body.maskedCardNumber) {
        expect(paymentResponse.body.maskedCardNumber).toMatch(/\*\*\*\*-\*\*\*\*-\*\*\*\*-\d{4}/);
      }

      // Admin should not see unencrypted card data either
      const paymentHistoryResponse = await request(app)
        .get(`/api/admin/payments/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ ticketId: checkinResponse.body.ticketId })
        .expect(200);

      if (paymentHistoryResponse.body.payments.length > 0) {
        const paymentRecord = paymentHistoryResponse.body.payments[0];
        expect(paymentRecord).not.toHaveProperty('cardNumber');
        expect(paymentRecord).not.toHaveProperty('cvv');
      }

      // Cleanup
      await request(app)
        .post('/api/checkout')
        .send({ 
          licensePlate: vehicleData.licensePlate,
          paymentTransactionId: paymentResponse.body.transactionId 
        })
        .expect(200);
    });

    test('should enforce data retention and deletion policies', async () => {
      // Create test user
      const userData = {
        email: faker.internet.email(),
        password: 'TestPass123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const registerResponse = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      const userId = registerResponse.body.id;

      // Request data deletion (GDPR right to be forgotten)
      const deletionResponse = await request(app)
        .post(`/api/users/${userId}/request-deletion`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'User requested account deletion',
          retentionPeriod: 30 // days
        })
        .expect(200);

      expect(deletionResponse.body.deletionRequestId).toBeTruthy();
      expect(deletionResponse.body.scheduledDeletion).toBeTruthy();

      // User data should be marked for deletion but not immediately removed
      const userDataResponse = await request(app)
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(userDataResponse.body.deletionScheduled).toBe(true);
      expect(userDataResponse.body.email).toBe(userData.email); // Still accessible during retention period

      // Test data export before deletion (GDPR right to data portability)
      const dataExportResponse = await request(app)
        .post(`/api/users/${userId}/export-data`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ format: 'json' })
        .expect(200);

      expect(dataExportResponse.body.exportId).toBeTruthy();
      expect(dataExportResponse.body.status).toBe('processing');

      // Check export status
      const exportStatusResponse = await request(app)
        .get(`/api/admin/exports/${dataExportResponse.body.exportId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(['processing', 'completed']).toContain(exportStatusResponse.body.status);

      // Test immediate deletion for sensitive cases
      const immediateDeletionResponse = await request(app)
        .delete(`/api/admin/users/${userId}/immediate-deletion`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Security incident - immediate deletion required',
          authorization: 'EMERGENCY_DELETE_AUTH_CODE'
        })
        .expect(200);

      expect(immediateDeletionResponse.body.deleted).toBe(true);

      // User should no longer be accessible
      const deletedUserResponse = await request(app)
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(deletedUserResponse.body.error).toBe('User not found');
    });
  });

  describe('5. Security Headers and Transport Security', () => {
    test('should set appropriate security headers on all responses', async () => {
      const endpoints = [
        '/api/garage/status',
        '/api/spots',
        '/api/users/profile'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', endpoint.includes('profile') ? `Bearer ${userToken}` : undefined);

        // Security headers that should be present
        const requiredHeaders = {
          'x-content-type-options': 'nosniff',
          'x-frame-options': /(DENY|SAMEORIGIN)/,
          'x-xss-protection': '1; mode=block',
          'strict-transport-security': /max-age=\d+/,
          'content-security-policy': /.+/,
          'referrer-policy': /(no-referrer|strict-origin-when-cross-origin)/
        };

        for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
          expect(response.headers).toHaveProperty(header);
          
          if (expectedValue instanceof RegExp) {
            expect(response.headers[header]).toMatch(expectedValue);
          } else {
            expect(response.headers[header]).toBe(expectedValue);
          }
        }

        // Headers that should NOT be present (information disclosure)
        const forbiddenHeaders = ['x-powered-by', 'server'];
        
        for (const header of forbiddenHeaders) {
          expect(response.headers).not.toHaveProperty(header);
        }
      }
    });

    test('should implement proper CORS configuration', async () => {
      // Test preflight request
      const preflightResponse = await request(app)
        .options('/api/spots')
        .set('Origin', 'https://parkingapp.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization')
        .expect(200);

      expect(preflightResponse.headers['access-control-allow-origin']).toBeTruthy();
      expect(preflightResponse.headers['access-control-allow-methods']).toContain('POST');
      expect(preflightResponse.headers['access-control-allow-headers']).toContain('Authorization');

      // Test actual CORS request
      const corsResponse = await request(app)
        .post('/api/checkin')
        .set('Origin', 'https://parkingapp.com')
        .send({
          licensePlate: 'CORS-TEST',
          vehicleType: 'standard'
        })
        .expect(201);

      expect(corsResponse.headers['access-control-allow-origin']).toBeTruthy();

      // Test blocked origin
      const blockedOriginResponse = await request(app)
        .post('/api/checkin')
        .set('Origin', 'https://malicious-site.com')
        .send({
          licensePlate: 'BLOCKED-TEST',
          vehicleType: 'standard'
        })
        .expect(403);

      expect(blockedOriginResponse.body.error).toContain('CORS policy');

      // Cleanup
      try {
        await request(app)
          .post('/api/checkout')
          .send({ licensePlate: 'CORS-TEST' });
      } catch (error) {
        // May have failed to create due to CORS
      }
    });

    test('should implement rate limiting to prevent abuse', async () => {
      const endpoint = '/api/spots';
      const rateLimit = 100; // Assume 100 requests per minute
      const testRequests = 110;

      const requests = [];
      const startTime = Date.now();

      // Send requests rapidly
      for (let i = 0; i < testRequests; i++) {
        requests.push(
          request(app)
            .get(endpoint)
            .catch(err => ({ error: err.message, status: err.status }))
        );
      }

      const results = await Promise.allSettled(requests);
      const endTime = Date.now();

      // Analyze results
      const successful = results.filter(r => 
        r.status === 'fulfilled' && 
        r.value.status === 200
      ).length;

      const rateLimited = results.filter(r => 
        r.status === 'fulfilled' && 
        r.value.status === 429
      ).length;

      console.log(`Rate Limiting Test Results:
        - Total requests: ${testRequests}
        - Successful: ${successful}
        - Rate limited: ${rateLimited}
        - Test duration: ${endTime - startTime}ms`);

      // Should have rate limited some requests
      expect(rateLimited).toBeGreaterThan(0);
      expect(successful).toBeLessThan(testRequests);

      // Check rate limit headers in successful responses
      const successfulResponse = results.find(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      if (successfulResponse) {
        const response = successfulResponse.value;
        expect(response.headers).toHaveProperty('x-ratelimit-limit');
        expect(response.headers).toHaveProperty('x-ratelimit-remaining');
        expect(response.headers).toHaveProperty('x-ratelimit-reset');
      }

      // Check rate limit response format
      const rateLimitedResponse = results.find(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );

      if (rateLimitedResponse) {
        const response = rateLimitedResponse.value;
        expect(response.body.error).toContain('rate limit');
        expect(response.headers).toHaveProperty('retry-after');
      }
    }, 30000);
  });
});
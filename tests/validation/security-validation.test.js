const request = require('supertest');

const API_BASE = 'http://localhost:3001';

describe('Security Validation', () => {
  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts in license plates', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '<svg/onload=alert(1)>',
        '"><script>alert(1)</script>',
        "'; DROP TABLE vehicles; --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(API_BASE)
          .post('/api/checkin')
          .send({
            licensePlate: maliciousInput,
            vehicleType: 'standard'
          });

        // Should either reject with validation error or sanitize
        if (response.status === 201) {
          // If accepted, verify it was sanitized
          expect(response.body.vehicle.licensePlate).not.toContain('<script>');
          expect(response.body.vehicle.licensePlate).not.toContain('javascript:');
          expect(response.body.vehicle.licensePlate).not.toContain('DROP TABLE');
          
          // Clean up if it was accepted
          await request(API_BASE)
            .post('/api/checkout')
            .send({ licensePlate: response.body.vehicle.licensePlate })
            .catch(() => {}); // Ignore if cleanup fails
        } else {
          // Should be rejected with proper error
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
        }
      }
    });

    it('should validate against SQL injection patterns', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE spots; --",
        "' OR '1'='1",
        "'; UPDATE spots SET isOccupied=false; --",
        "UNION SELECT * FROM spots",
        "'; INSERT INTO spots VALUES (); --"
      ];

      for (const injection of sqlInjectionAttempts) {
        const response = await request(API_BASE)
          .post('/api/checkin')
          .send({
            licensePlate: injection,
            vehicleType: 'standard'
          });

        // Should reject malicious input
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should not be vulnerable to basic DoS attacks', async () => {
      const rapidRequests = 100;
      const startTime = Date.now();
      
      const promises = Array.from({ length: rapidRequests }, () =>
        request(API_BASE)
          .get('/api/garage/status')
          .catch(err => ({ status: err.status || 500 }))
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      const successfulRequests = results.filter(r => r.status === 200).length;
      const rateLimitedRequests = results.filter(r => r.status === 429).length;
      
      console.log(`Rapid fire test (${rapidRequests} requests in ${endTime - startTime}ms):`);
      console.log(`  Successful: ${successfulRequests}`);
      console.log(`  Rate limited: ${rateLimitedRequests}`);
      console.log(`  Other errors: ${rapidRequests - successfulRequests - rateLimitedRequests}`);
      
      // Should either handle all requests or implement rate limiting
      if (rateLimitedRequests > 0) {
        console.log('✅ Rate limiting is active');
      } else {
        console.log('ℹ️ No rate limiting detected, but all requests handled');
        expect(successfulRequests).toBeGreaterThan(rapidRequests * 0.8);
      }
    });
  });

  describe('Data Validation Security', () => {
    it('should prevent buffer overflow attempts', async () => {
      const longString = 'A'.repeat(10000);
      
      const response = await request(API_BASE)
        .post('/api/checkin')
        .send({
          licensePlate: longString,
          vehicleType: 'standard'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(API_BASE)
        .post('/api/checkin')
        .set('Content-Type', 'application/json')
        .send('{"licensePlate": "TEST", "vehicleType":}'); // Malformed JSON

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate content type requirements', async () => {
      const response = await request(API_BASE)
        .post('/api/checkin')
        .set('Content-Type', 'text/plain')
        .send('not json data');

      expect(response.status).toBe(400);
    });
  });

  describe('Header Security', () => {
    it('should include security headers', async () => {
      const response = await request(API_BASE)
        .get('/api/garage/status');

      expect(response.status).toBe(200);
      
      // Check for common security headers
      const headers = response.headers;
      
      // These might be set by helmet middleware
      if (headers['x-content-type-options']) {
        expect(headers['x-content-type-options']).toBe('nosniff');
      }
      
      if (headers['x-frame-options']) {
        expect(['DENY', 'SAMEORIGIN'].includes(headers['x-frame-options'])).toBe(true);
      }
      
      console.log('Security headers present:', Object.keys(headers).filter(h => 
        h.startsWith('x-') || h.includes('security') || h.includes('content-security')
      ));
    });

    it('should not expose sensitive server information', async () => {
      const response = await request(API_BASE)
        .get('/api/garage/status');

      const headers = response.headers;
      
      // Should not expose detailed server info
      if (headers['server']) {
        expect(headers['server']).not.toContain('Express');
        expect(headers['server']).not.toContain('Node');
      }
      
      if (headers['x-powered-by']) {
        expect(headers['x-powered-by']).not.toContain('Express');
      }
    });
  });
});
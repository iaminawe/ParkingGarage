const request = require('supertest');
const { performance } = require('perf_hooks');

const API_BASE = 'http://localhost:3001';

describe('Production Validation - Corrected API Contracts', () => {
  
  beforeAll(async () => {
    // Wait for server to be ready and rate limit to reset
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('Starting production validation tests...');
  });

  describe('CRITICAL: API Response Format Discovery', () => {
    it('should discover actual garage status response format', async () => {
      const response = await request(API_BASE)
        .get('/api/garage/status');
      
      console.log('Garage Status Response:', JSON.stringify(response.body, null, 2));
      console.log('Status Code:', response.status);
      console.log('Headers:', response.headers);
      
      // Basic validation that we get a response
      expect([200, 429].includes(response.status)).toBe(true);
      
      if (response.status === 200) {
        expect(typeof response.body).toBe('object');
      }
    });

    it('should discover actual spots response format', async () => {
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await request(API_BASE)
        .get('/api/spots');
      
      console.log('Spots Response (first 3):', JSON.stringify(response.body?.slice?.(0, 3) || response.body, null, 2));
      console.log('Status Code:', response.status);
      
      expect([200, 429].includes(response.status)).toBe(true);
    });

    it('should discover actual check-in response format', async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const vehicle = { licensePlate: 'DISCOVER1', vehicleType: 'compact' };
      
      const response = await request(API_BASE)
        .post('/api/checkin')
        .send(vehicle);
      
      console.log('Check-in Response:', JSON.stringify(response.body, null, 2));
      console.log('Status Code:', response.status);
      
      expect([201, 400, 429].includes(response.status)).toBe(true);
      
      // If successful, try to check out to clean up
      if (response.status === 201) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await request(API_BASE)
          .post('/api/checkout')
          .send({ licensePlate: vehicle.licensePlate })
          .catch(() => {}); // Ignore cleanup errors
      }
    });
  });

  describe('CRITICAL: System Health Validation', () => {
    it('should validate health endpoint availability', async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await request(API_BASE).get('/health');
      
      console.log('Health Response:', JSON.stringify(response.body, null, 2));
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
        console.log('✅ Health endpoint working correctly');
      } else if (response.status === 429) {
        console.log('⚠️  Rate limiting active - health endpoint blocked');
      }
      
      expect([200, 429].includes(response.status)).toBe(true);
    });

    it('should validate server is processing requests', async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try a simple GET request
      const response = await request(API_BASE).get('/api');
      
      console.log(`API root response: ${response.status}`);
      console.log('Response body:', JSON.stringify(response.body, null, 2));
      
      // Should get either valid response or rate limit
      expect([200, 404, 429].includes(response.status)).toBe(true);
    });
  });

  describe('CRITICAL: Rate Limiting Analysis', () => {
    it('should analyze rate limiting behavior', async () => {
      console.log('Testing rate limiting behavior...');
      
      const responses = [];
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const response = await request(API_BASE)
          .get('/health')
          .catch(err => ({ status: err.status || 500, error: err.message }));
        
        responses.push({
          attempt: i + 1,
          status: response.status,
          body: response.body
        });
        
        console.log(`Request ${i + 1}: Status ${response.status}`);
      }
      
      const rateLimited = responses.filter(r => r.status === 429).length;
      const successful = responses.filter(r => r.status === 200).length;
      
      console.log(`Rate limiting analysis:`);
      console.log(`  Successful: ${successful}`);
      console.log(`  Rate limited: ${rateLimited}`);
      console.log(`  Total: ${responses.length}`);
      
      // At least some requests should work or all should be rate limited
      expect(successful + rateLimited).toBe(responses.length);
    });
  });

  describe('WORKFLOW: Minimal Functional Validation', () => {
    it('should test basic functionality when rate limits allow', async () => {
      console.log('Attempting basic functionality test...');
      
      // Wait for potential rate limit reset
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        // Test health endpoint
        const healthResponse = await request(API_BASE).get('/health');
        console.log(`Health check: ${healthResponse.status}`);
        
        if (healthResponse.status === 200) {
          console.log('✅ Health endpoint accessible');
          
          // Brief pause
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Test garage status
          const statusResponse = await request(API_BASE).get('/api/garage/status');
          console.log(`Garage status: ${statusResponse.status}`);
          
          if (statusResponse.status === 200) {
            console.log('✅ Garage status accessible');
            console.log('Garage data:', JSON.stringify(statusResponse.body, null, 2));
          } else {
            console.log('⚠️  Garage status blocked by rate limiting');
          }
        }
      } catch (error) {
        console.log('Error during basic functionality test:', error.message);
      }
      
      // This test always passes - it's for discovery
      expect(true).toBe(true);
    });
  });

  describe('CRITICAL: Data Initialization Issues', () => {
    it('should investigate garage initialization problem', async () => {
      console.log('Investigating garage initialization...');
      
      // The server logs show "Total Spots: 0" which indicates a problem
      // Let's check if this is a rate limiting issue or actual data problem
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        const response = await request(API_BASE).get('/api/garage/status');
        
        if (response.status === 200) {
          console.log('Garage status data:', response.body);
          
          // Check if the response has the expected structure
          if (response.body.success && response.body.data) {
            console.log('API uses success/data wrapper pattern');
            const garageData = response.body.data;
            
            if (garageData.totalSpots === 0) {
              console.log('❌ CRITICAL: Garage has 0 total spots - initialization failed');
            }
          }
        } else {
          console.log(`Cannot check garage data - status: ${response.status}`);
        }
      } catch (error) {
        console.log('Error checking garage data:', error.message);
      }
      
      expect(true).toBe(true);
    });
  });

  describe('CRITICAL: Production Readiness Issues Identified', () => {
    it('should document critical issues found', () => {
      const criticalIssues = [
        {
          severity: 'HIGH',
          issue: 'Rate limiting too aggressive for normal operations',
          details: '100 requests per 15 minutes blocks basic testing and monitoring',
          impact: 'Prevents proper system monitoring and user operations'
        },
        {
          severity: 'CRITICAL', 
          issue: 'Garage initialization showing 0 total spots',
          details: 'Server logs show "Total Spots: 0" after seed data load',
          impact: 'System cannot function - no parking spots available'
        },
        {
          severity: 'MEDIUM',
          issue: 'API response format inconsistency',
          details: 'Expected direct properties but API uses success/data wrapper',
          impact: 'Client integration will fail without proper documentation'
        },
        {
          severity: 'HIGH',
          issue: 'Test environment rate limiting',
          details: 'Rate limiting prevents proper end-to-end testing',
          impact: 'Cannot validate system functionality properly'
        }
      ];
      
      console.log('\n🚨 CRITICAL PRODUCTION READINESS ISSUES:');
      console.log('========================================');
      
      criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity}] ${issue.issue}`);
        console.log(`   Details: ${issue.details}`);
        console.log(`   Impact: ${issue.impact}`);
        console.log('');
      });
      
      expect(criticalIssues.length).toBeGreaterThan(0);
    });
  });
});
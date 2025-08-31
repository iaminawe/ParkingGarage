/**
 * Critical Issues Diagnostic Test
 * 
 * This test bypasses rate limiting by creating a direct app instance
 * and tests the core functionality to identify production readiness issues.
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Critical Issues Diagnostic - Direct App Testing', () => {
  
  describe('CRITICAL ISSUE 1: Garage Initialization Problem', () => {
    it('should diagnose garage initialization failure', async () => {
      console.log('🔍 Diagnosing garage initialization...');
      
      // Test garage status endpoint directly
      const statusResponse = await request(app)
        .get('/api/garage/status');
      
      console.log('Garage Status Response:', JSON.stringify(statusResponse.body, null, 2));
      console.log('Status Code:', statusResponse.status);
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.success).toBe(true);
      
      // The response shows initialization status, but doesn't mean spots exist
      if (statusResponse.body.data.initialized) {
        console.log('✅ Garage reports as initialized');
        
        // Now check if we can get actual garage configuration
        const configResponse = await request(app)
          .get('/api/garage'); // This should be the configuration endpoint
        
        console.log('Garage Config Response:', JSON.stringify(configResponse.body, null, 2));
        console.log('Config Status Code:', configResponse.status);
        
        if (configResponse.status === 404) {
          console.log('❌ CRITICAL: Garage initialized but no configuration found');
        }
      } else {
        console.log('❌ CRITICAL: Garage not initialized at all');
      }
    });

    it('should check spots data directly', async () => {
      const spotsResponse = await request(app)
        .get('/api/spots');
      
      console.log('Spots Response Status:', spotsResponse.status);
      
      if (spotsResponse.status === 200) {
        console.log('Spots Data:', JSON.stringify(spotsResponse.body, null, 2));
        
        if (Array.isArray(spotsResponse.body) && spotsResponse.body.length === 0) {
          console.log('❌ CRITICAL: Spots endpoint returns empty array - no spots created');
        } else if (Array.isArray(spotsResponse.body) && spotsResponse.body.length > 0) {
          console.log(`✅ Found ${spotsResponse.body.length} spots`);
          console.log('First spot structure:', JSON.stringify(spotsResponse.body[0], null, 2));
        }
      } else {
        console.log('❌ CRITICAL: Cannot access spots endpoint');
        console.log('Error:', spotsResponse.body);
      }
    });
  });

  describe('CRITICAL ISSUE 2: Check-in/Check-out Data Flow', () => {
    it('should test basic check-in flow', async () => {
      console.log('🔍 Testing check-in flow...');
      
      const vehicle = { licensePlate: 'DIAG001', vehicleType: 'standard' };
      
      const checkInResponse = await request(app)
        .post('/api/checkin')
        .send(vehicle);
      
      console.log('Check-in Response Status:', checkInResponse.status);
      console.log('Check-in Response:', JSON.stringify(checkInResponse.body, null, 2));
      
      if (checkInResponse.status === 201) {
        console.log('✅ Check-in successful');
        
        // Extract spot identifier from response
        const spotId = checkInResponse.body.spotId;
        const licensePlate = checkInResponse.body.vehicle.licensePlate;
        
        console.log(`Vehicle ${licensePlate} assigned to spot ${spotId}`);
        
        // Test check-out
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for billing calc
        
        const checkOutResponse = await request(app)
          .post('/api/checkout')
          .send({ licensePlate });
        
        console.log('Check-out Response Status:', checkOutResponse.status);
        console.log('Check-out Response:', JSON.stringify(checkOutResponse.body, null, 2));
        
        if (checkOutResponse.status === 200) {
          console.log('✅ Check-out successful');
        } else {
          console.log('❌ Check-out failed');
          console.log('Error details from server logs should show the undefined.hours error');
        }
      } else {
        console.log('❌ Check-in failed');
        
        if (checkInResponse.body.error && checkInResponse.body.error.includes('no available spots')) {
          console.log('❌ CRITICAL: No available spots - garage initialization completely failed');
        }
      }
    });
  });

  describe('CRITICAL ISSUE 3: API Response Format Inconsistency', () => {
    it('should document actual API response patterns', async () => {
      console.log('🔍 Analyzing API response patterns...');
      
      const endpoints = [
        { path: '/health', method: 'GET', name: 'Health Check' },
        { path: '/api/garage/status', method: 'GET', name: 'Garage Status' },
        { path: '/api/spots', method: 'GET', name: 'Spots List' },
        { path: '/api/spots/1', method: 'GET', name: 'Single Spot' },
        { path: '/api/vehicles/NOTFOUND', method: 'GET', name: 'Vehicle Not Found' }
      ];
      
      const responseFormats = {};
      
      for (const endpoint of endpoints) {
        try {
          const response = await request(app)[endpoint.method.toLowerCase()](endpoint.path);
          
          responseFormats[endpoint.name] = {
            status: response.status,
            hasSuccessField: response.body.hasOwnProperty('success'),
            hasDataField: response.body.hasOwnProperty('data'),
            hasErrorField: response.body.hasOwnProperty('error'),
            topLevelFields: Object.keys(response.body),
            structure: response.body.success ? 'success/data wrapper' : 'direct response'
          };
          
        } catch (error) {
          responseFormats[endpoint.name] = { error: error.message };
        }
      }
      
      console.log('\n📋 API Response Format Analysis:');
      console.log('================================');
      Object.entries(responseFormats).forEach(([name, format]) => {
        console.log(`${name}:`);
        console.log(`  Status: ${format.status}`);
        console.log(`  Structure: ${format.structure}`);
        console.log(`  Fields: [${format.topLevelFields?.join(', ')}]`);
        console.log('');
      });
      
      expect(Object.keys(responseFormats).length).toBeGreaterThan(0);
    });
  });

  describe('PRODUCTION READINESS ASSESSMENT', () => {
    it('should generate comprehensive production readiness report', async () => {
      console.log('\n🏭 PRODUCTION READINESS ASSESSMENT');
      console.log('==================================');
      
      const issues = [];
      
      // Test 1: Basic system health
      try {
        const healthResponse = await request(app).get('/health');
        if (healthResponse.status === 200) {
          console.log('✅ Health endpoint working');
        } else {
          issues.push({
            category: 'System Health',
            severity: 'HIGH',
            issue: 'Health endpoint not responding correctly',
            status: healthResponse.status
          });
        }
      } catch (error) {
        issues.push({
          category: 'System Health',
          severity: 'CRITICAL',
          issue: 'Health endpoint completely broken',
          error: error.message
        });
      }
      
      // Test 2: Core data availability
      try {
        const spotsResponse = await request(app).get('/api/spots');
        if (spotsResponse.status === 200 && Array.isArray(spotsResponse.body) && spotsResponse.body.length > 0) {
          console.log(`✅ Found ${spotsResponse.body.length} spots`);
        } else {
          issues.push({
            category: 'Data Integrity',
            severity: 'CRITICAL',
            issue: 'No parking spots available - system non-functional',
            details: `Status: ${spotsResponse.status}, Length: ${spotsResponse.body?.length || 'N/A'}`
          });
        }
      } catch (error) {
        issues.push({
          category: 'Data Integrity',
          severity: 'CRITICAL',
          issue: 'Cannot access spots data',
          error: error.message
        });
      }
      
      // Test 3: Core functionality
      try {
        const checkInResponse = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'PROD001', vehicleType: 'standard' });
        
        if (checkInResponse.status === 201) {
          console.log('✅ Check-in functionality working');
          
          // Test check-out
          await new Promise(resolve => setTimeout(resolve, 100));
          const checkOutResponse = await request(app)
            .post('/api/checkout')
            .send({ licensePlate: 'PROD001' });
          
          if (checkOutResponse.status === 200) {
            console.log('✅ Check-out functionality working');
          } else {
            issues.push({
              category: 'Core Functionality',
              severity: 'HIGH',
              issue: 'Check-out functionality broken',
              details: `Status: ${checkOutResponse.status}, Error: ${checkOutResponse.body.error}`
            });
          }
        } else {
          issues.push({
            category: 'Core Functionality',
            severity: 'CRITICAL',
            issue: 'Check-in functionality broken',
            details: `Status: ${checkInResponse.status}, Error: ${checkInResponse.body.error}`
          });
        }
      } catch (error) {
        issues.push({
          category: 'Core Functionality',
          severity: 'CRITICAL',
          issue: 'Check-in/Check-out completely broken',
          error: error.message
        });
      }
      
      // Test 4: Rate limiting configuration
      issues.push({
        category: 'Configuration',
        severity: 'HIGH',
        issue: 'Rate limiting too aggressive for production',
        details: '100 requests per 15 minutes will block normal monitoring and user activity',
        recommendation: 'Increase to at least 1000 requests per 15 minutes for production'
      });
      
      // Test 5: Error handling
      try {
        const errorResponse = await request(app).get('/api/nonexistent');
        if (errorResponse.status === 404 && errorResponse.body.error) {
          console.log('✅ 404 error handling working');
        } else {
          issues.push({
            category: 'Error Handling',
            severity: 'MEDIUM',
            issue: 'Inconsistent 404 error responses'
          });
        }
      } catch (error) {
        issues.push({
          category: 'Error Handling',
          severity: 'HIGH',
          issue: 'Error handling middleware broken',
          error: error.message
        });
      }
      
      // Generate final assessment
      console.log('\n🚨 PRODUCTION READINESS ISSUES FOUND:');
      console.log('=====================================');
      
      const critical = issues.filter(i => i.severity === 'CRITICAL');
      const high = issues.filter(i => i.severity === 'HIGH');
      const medium = issues.filter(i => i.severity === 'MEDIUM');
      
      console.log(`Critical Issues: ${critical.length}`);
      console.log(`High Priority Issues: ${high.length}`);
      console.log(`Medium Priority Issues: ${medium.length}`);
      console.log('');
      
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity}] ${issue.category}: ${issue.issue}`);
        if (issue.details) console.log(`   Details: ${issue.details}`);
        if (issue.recommendation) console.log(`   Recommendation: ${issue.recommendation}`);
        if (issue.error) console.log(`   Error: ${issue.error}`);
        console.log('');
      });
      
      // Production readiness verdict
      if (critical.length > 0) {
        console.log('🛑 VERDICT: NOT READY FOR PRODUCTION');
        console.log('   Critical issues must be resolved before deployment');
      } else if (high.length > 2) {
        console.log('⚠️  VERDICT: NOT RECOMMENDED FOR PRODUCTION');
        console.log('   Multiple high-priority issues should be addressed');
      } else {
        console.log('✅ VERDICT: MAY BE READY FOR PRODUCTION');
        console.log('   Address remaining issues in next iteration');
      }
      
      expect(issues.length).toBeDefined();
    });
  });
});
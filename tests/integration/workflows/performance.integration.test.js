/**
 * Performance Integration Tests
 * 
 * Tests system performance under various load conditions with concurrent operations
 */

const request = require('supertest');
const { faker } = require('@faker-js/faker');
const { createMockApp } = require('../../helpers/mockApp');

describe('Performance Integration Tests', () => {
  let app;
  let api;
  let adminToken;

  beforeEach(async () => {
    app = createMockApp();
    api = app.locals.api;

    // Create admin user for performance monitoring
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

    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: adminUser.email,
        password: adminUser.password
      })
      .expect(200);

    adminToken = loginResponse.body.token;
  });

  describe('1. Concurrent User Session Performance', () => {
    test('should handle 100 simultaneous check-ins without conflicts', async () => {
      const startTime = Date.now();
      const concurrentCheckIns = [];

      // Generate 100 unique vehicles for concurrent check-in
      for (let i = 0; i < 100; i++) {
        const vehicleData = {
          licensePlate: `PERF-${String(i).padStart(3, '0')}`,
          vehicleType: ['standard', 'compact', 'oversized'][i % 3],
          driverName: faker.person.fullName()
        };

        concurrentCheckIns.push(
          request(app)
            .post('/api/checkin')
            .send(vehicleData)
        );
      }

      // Execute all check-ins concurrently
      const results = await Promise.allSettled(concurrentCheckIns);
      const processingTime = Date.now() - startTime;

      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = results.filter(r => r.status === 'rejected' || r.value.status !== 201);

      expect(successful.length).toBeGreaterThan(95); // At least 95% success rate
      expect(processingTime).toBeLessThan(5000); // Under 5 seconds

      // Verify no duplicate spot assignments
      const assignedSpots = successful.map(r => r.value.body.spot);
      const uniqueSpots = new Set(assignedSpots);
      expect(uniqueSpots.size).toBe(assignedSpots.length);

      // Performance metrics
      const avgResponseTime = processingTime / successful.length;
      expect(avgResponseTime).toBeLessThan(100); // Average under 100ms per operation

      console.log(`Concurrent Check-ins Performance:
        - Total operations: 100
        - Successful: ${successful.length}
        - Failed: ${failed.length}
        - Total time: ${processingTime}ms
        - Average response time: ${avgResponseTime}ms
        - Throughput: ${(successful.length / processingTime * 1000).toFixed(2)} operations/sec`);

      // Verify system consistency after load
      const garageStatusResponse = await request(app)
        .get('/api/garage/status')
        .expect(200);

      expect(garageStatusResponse.body.occupied).toBe(successful.length);
      expect(garageStatusResponse.body.available).toBe(125 - successful.length);

      // Cleanup - concurrent checkout
      const checkoutPromises = successful.map(r => 
        request(app)
          .post('/api/checkout')
          .send({ licensePlate: r.value.body.licensePlate })
      );

      const checkoutResults = await Promise.allSettled(checkoutPromises);
      const successfulCheckouts = checkoutResults.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successfulCheckouts.length).toBe(successful.length);
    }, 30000); // Extended timeout for load test

    test('should maintain performance under mixed concurrent operations', async () => {
      // Pre-populate garage with some vehicles
      const prePopulateVehicles = [];
      for (let i = 0; i < 30; i++) {
        const vehicleData = {
          licensePlate: `PREPOP-${i}`,
          vehicleType: 'standard'
        };

        const response = await request(app)
          .post('/api/checkin')
          .send(vehicleData)
          .expect(201);

        prePopulateVehicles.push({
          licensePlate: vehicleData.licensePlate,
          ticketId: response.body.ticketId
        });
      }

      const startTime = Date.now();
      const mixedOperations = [];

      // Mix of different operations
      for (let i = 0; i < 50; i++) {
        const operationType = i % 5;

        switch (operationType) {
          case 0: // New check-ins
            mixedOperations.push({
              type: 'checkin',
              promise: request(app)
                .post('/api/checkin')
                .send({
                  licensePlate: `MIXED-CHECKIN-${i}`,
                  vehicleType: 'standard'
                })
            });
            break;

          case 1: // Vehicle searches
            mixedOperations.push({
              type: 'search',
              promise: request(app)
                .get(`/api/cars/${prePopulateVehicles[i % prePopulateVehicles.length].licensePlate}`)
            });
            break;

          case 2: // Spot queries
            mixedOperations.push({
              type: 'spots',
              promise: request(app)
                .get('/api/spots?status=available')
            });
            break;

          case 3: // Payment calculations
            mixedOperations.push({
              type: 'payment',
              promise: request(app)
                .post('/api/payments/calculate')
                .send({
                  ticketId: prePopulateVehicles[i % prePopulateVehicles.length].ticketId
                })
            });
            break;

          case 4: // Garage status
            mixedOperations.push({
              type: 'status',
              promise: request(app)
                .get('/api/garage/status')
            });
            break;
        }
      }

      // Execute all operations concurrently
      const results = await Promise.allSettled(mixedOperations.map(op => op.promise));
      const totalTime = Date.now() - startTime;

      // Analyze performance by operation type
      const performanceMetrics = {
        checkin: { successful: 0, failed: 0, totalTime: 0 },
        search: { successful: 0, failed: 0, totalTime: 0 },
        spots: { successful: 0, failed: 0, totalTime: 0 },
        payment: { successful: 0, failed: 0, totalTime: 0 },
        status: { successful: 0, failed: 0, totalTime: 0 }
      };

      results.forEach((result, index) => {
        const operationType = mixedOperations[index].type;
        
        if (result.status === 'fulfilled' && result.value.status < 400) {
          performanceMetrics[operationType].successful++;
        } else {
          performanceMetrics[operationType].failed++;
        }
      });

      // Verify performance thresholds
      const totalSuccessful = Object.values(performanceMetrics)
        .reduce((sum, metric) => sum + metric.successful, 0);
      
      expect(totalSuccessful).toBeGreaterThan(45); // 90% success rate
      expect(totalTime).toBeLessThan(8000); // Under 8 seconds

      console.log(`Mixed Operations Performance:
        - Total operations: 50
        - Total successful: ${totalSuccessful}
        - Total time: ${totalTime}ms
        - Average time per operation: ${(totalTime / 50).toFixed(2)}ms
        - Operations per second: ${(50 / totalTime * 1000).toFixed(2)}`);

      // Cleanup
      const allVehicles = [
        ...prePopulateVehicles.map(v => v.licensePlate),
        ...results
          .filter((r, i) => mixedOperations[i].type === 'checkin' && r.status === 'fulfilled' && r.value.status === 201)
          .map(r => r.value.body.licensePlate)
      ];

      for (const licensePlate of allVehicles) {
        try {
          await request(app)
            .post('/api/checkout')
            .send({ licensePlate });
        } catch (error) {
          // Vehicle may already be checked out
        }
      }
    }, 45000);

    test('should handle high-frequency spot status updates without degradation', async () => {
      const spotIds = [];
      
      // Get list of available spots
      const spotsResponse = await request(app)
        .get('/api/spots?status=available')
        .expect(200);

      spotIds.push(...spotsResponse.body.spots.slice(0, 20).map(s => s.spotId));

      const startTime = Date.now();
      const updatePromises = [];

      // Rapid status updates on multiple spots
      for (let i = 0; i < 100; i++) {
        const spotId = spotIds[i % spotIds.length];
        const newStatus = i % 2 === 0 ? 'maintenance' : 'available';

        updatePromises.push(
          request(app)
            .put(`/api/admin/spots/${spotId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              status: newStatus,
              reason: `Rapid update test ${i}`
            })
        );

        // Add small delay to avoid overwhelming the system
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const results = await Promise.allSettled(updatePromises);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const successRate = (successful.length / updatePromises.length) * 100;

      expect(successRate).toBeGreaterThan(95);
      expect(totalTime).toBeLessThan(10000); // Under 10 seconds

      console.log(`Rapid Updates Performance:
        - Total updates: 100
        - Successful: ${successful.length}
        - Success rate: ${successRate.toFixed(2)}%
        - Total time: ${totalTime}ms
        - Updates per second: ${(100 / totalTime * 1000).toFixed(2)}`);

      // Verify final consistency
      for (const spotId of spotIds) {
        const spotResponse = await request(app)
          .get(`/api/spots/${spotId}`)
          .expect(200);

        expect(['available', 'maintenance']).toContain(spotResponse.body.status);
      }
    });
  });

  describe('2. Large Dataset Operations Performance', () => {
    test('should efficiently process bulk operations on large datasets', async () => {
      // Create large dataset of completed parking sessions
      const bulkSessions = [];
      const batchSize = 50;
      const totalSessions = 500;

      console.log('Creating bulk test data...');
      
      for (let batch = 0; batch < totalSessions / batchSize; batch++) {
        const batchSessions = [];
        
        for (let i = 0; i < batchSize; i++) {
          const sessionIndex = batch * batchSize + i;
          batchSessions.push({
            licensePlate: `BULK-${String(sessionIndex).padStart(4, '0')}`,
            vehicleType: ['standard', 'compact', 'oversized', 'electric'][sessionIndex % 4],
            checkInTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            duration: Math.floor(Math.random() * 12 + 1), // 1-12 hours
            amount: Math.floor(Math.random() * 50 + 10) // $10-60
          });
        }

        const bulkCreateResponse = await request(app)
          .post('/api/admin/sessions/bulk-create')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ sessions: batchSessions })
          .expect(201);

        expect(bulkCreateResponse.body.created).toBe(batchSize);
        bulkSessions.push(...batchSessions);
      }

      console.log(`Created ${totalSessions} bulk sessions`);

      // Test bulk query performance
      const queryStartTime = Date.now();
      
      const bulkQueryResponse = await request(app)
        .post('/api/admin/sessions/bulk-query')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          filters: {
            vehicleType: 'standard',
            dateRange: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            }
          },
          pagination: { limit: 100, offset: 0 },
          sort: { field: 'checkInTime', direction: 'desc' }
        })
        .expect(200);

      const queryTime = Date.now() - queryStartTime;

      expect(bulkQueryResponse.body.sessions).toBeInstanceOf(Array);
      expect(bulkQueryResponse.body.total).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(2000); // Under 2 seconds

      console.log(`Bulk Query Performance:
        - Dataset size: ${totalSessions} sessions
        - Query time: ${queryTime}ms
        - Results returned: ${bulkQueryResponse.body.sessions.length}
        - Total matches: ${bulkQueryResponse.body.total}`);

      // Test bulk aggregation performance
      const aggregationStartTime = Date.now();
      
      const aggregationResponse = await request(app)
        .post('/api/admin/reports/bulk-aggregation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          aggregations: [
            { field: 'vehicleType', operation: 'count' },
            { field: 'amount', operation: 'sum' },
            { field: 'amount', operation: 'avg' },
            { field: 'duration', operation: 'max' },
            { field: 'duration', operation: 'min' }
          ],
          filters: {
            dateRange: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            }
          }
        })
        .expect(200);

      const aggregationTime = Date.now() - aggregationStartTime;

      expect(aggregationResponse.body.results).toHaveLength(5);
      expect(aggregationTime).toBeLessThan(3000); // Under 3 seconds

      console.log(`Bulk Aggregation Performance:
        - Dataset size: ${totalSessions} sessions
        - Aggregation time: ${aggregationTime}ms
        - Operations performed: 5`);

      // Test bulk update performance
      const updateStartTime = Date.now();
      const updateLicensePlates = bulkSessions.slice(0, 100).map(s => s.licensePlate);
      
      const bulkUpdateResponse = await request(app)
        .put('/api/admin/sessions/bulk-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          licensePlates: updateLicensePlates,
          updates: {
            notes: 'Bulk performance test update',
            updatedBy: 'performance-test'
          }
        })
        .expect(200);

      const updateTime = Date.now() - updateStartTime;

      expect(bulkUpdateResponse.body.updated).toBe(100);
      expect(updateTime).toBeLessThan(2000); // Under 2 seconds

      console.log(`Bulk Update Performance:
        - Records updated: 100
        - Update time: ${updateTime}ms
        - Average time per record: ${(updateTime / 100).toFixed(2)}ms`);

      // Cleanup bulk data
      const cleanupResponse = await request(app)
        .delete('/api/admin/sessions/bulk-delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          licensePlates: bulkSessions.map(s => s.licensePlate)
        })
        .expect(200);

      expect(cleanupResponse.body.deleted).toBe(totalSessions);
    }, 120000); // Extended timeout for bulk operations

    test('should maintain query performance with complex filtering and pagination', async () => {
      // Create diverse dataset
      const testSessions = [];
      for (let i = 0; i < 200; i++) {
        testSessions.push({
          licensePlate: `QUERY-${String(i).padStart(3, '0')}`,
          vehicleType: ['standard', 'compact', 'oversized', 'electric'][i % 4],
          checkInTime: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
          duration: Math.floor(Math.random() * 24 + 1),
          amount: Math.floor(Math.random() * 100 + 5),
          location: {
            floor: Math.floor(i / 50) + 1,
            bay: String.fromCharCode(65 + (i % 3)) // A, B, C
          },
          paymentMethod: ['cash', 'credit_card', 'debit_card', 'mobile_payment'][i % 4]
        });
      }

      // Bulk create test data
      await request(app)
        .post('/api/admin/sessions/bulk-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sessions: testSessions })
        .expect(201);

      // Test complex queries with various filters
      const complexQueries = [
        {
          name: 'Multi-field filter with pagination',
          query: {
            filters: {
              vehicleType: ['standard', 'electric'],
              amountRange: { min: 20, max: 80 },
              durationRange: { min: 2, max: 12 },
              floor: [1, 2]
            },
            pagination: { limit: 25, offset: 0 },
            sort: { field: 'amount', direction: 'desc' }
          }
        },
        {
          name: 'Date range with text search',
          query: {
            filters: {
              dateRange: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString()
              },
              searchText: 'QUERY-1',
              paymentMethod: ['credit_card', 'mobile_payment']
            },
            pagination: { limit: 20, offset: 10 }
          }
        },
        {
          name: 'Aggregated query with grouping',
          query: {
            groupBy: ['vehicleType', 'paymentMethod'],
            aggregations: [
              { field: 'amount', operation: 'sum' },
              { field: 'duration', operation: 'avg' }
            ],
            filters: {
              amountRange: { min: 10 }
            }
          }
        }
      ];

      for (const testCase of complexQueries) {
        const startTime = Date.now();
        
        const response = await request(app)
          .post('/api/admin/sessions/advanced-query')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(testCase.query)
          .expect(200);

        const queryTime = Date.now() - startTime;

        expect(response.body).toHaveProperty('results');
        expect(queryTime).toBeLessThan(1500); // Under 1.5 seconds

        console.log(`${testCase.name}:
          - Query time: ${queryTime}ms
          - Results: ${Array.isArray(response.body.results) ? response.body.results.length : 'N/A'}
          - Performance: ${queryTime < 500 ? 'Excellent' : queryTime < 1000 ? 'Good' : 'Acceptable'}`);
      }

      // Cleanup
      await request(app)
        .delete('/api/admin/sessions/bulk-delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          licensePlates: testSessions.map(s => s.licensePlate)
        })
        .expect(200);
    }, 60000);
  });

  describe('3. Memory Usage Under Load', () => {
    test('should maintain stable memory usage during sustained operations', async () => {
      // Get baseline memory usage
      const baselineResponse = await request(app)
        .get('/api/admin/system/memory-usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const baselineMemory = baselineResponse.body.heapUsed;
      console.log(`Baseline memory usage: ${(baselineMemory / 1024 / 1024).toFixed(2)} MB`);

      // Sustained load test - continuous operations for 30 seconds
      const loadDuration = 30000; // 30 seconds
      const operationInterval = 50; // 50ms between operations
      const startTime = Date.now();
      
      let operationCount = 0;
      const memoryReadings = [];

      const sustainedLoad = async () => {
        while (Date.now() - startTime < loadDuration) {
          // Perform mixed operations
          const operations = [
            () => request(app).get('/api/spots'),
            () => request(app).get('/api/garage/status'),
            () => request(app).post('/api/checkin').send({
              licensePlate: `LOAD-${operationCount}`,
              vehicleType: 'standard'
            }),
            () => request(app).get(`/api/cars/LOAD-${Math.max(0, operationCount - 5)}`)
          ];

          const randomOperation = operations[operationCount % operations.length];
          
          try {
            await randomOperation();
            operationCount++;
          } catch (error) {
            // Expected for some operations (e.g., car not found)
          }

          // Sample memory usage every 2 seconds
          if (operationCount % 40 === 0) {
            const memoryResponse = await request(app)
              .get('/api/admin/system/memory-usage')
              .set('Authorization', `Bearer ${adminToken}`);
            
            if (memoryResponse.status === 200) {
              memoryReadings.push({
                timestamp: Date.now() - startTime,
                heapUsed: memoryResponse.body.heapUsed,
                heapTotal: memoryResponse.body.heapTotal,
                external: memoryResponse.body.external
              });
            }
          }

          await new Promise(resolve => setTimeout(resolve, operationInterval));
        }
      };

      await sustainedLoad();

      // Analyze memory usage patterns
      const finalMemoryResponse = await request(app)
        .get('/api/admin/system/memory-usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const finalMemory = finalMemoryResponse.body.heapUsed;
      const memoryIncrease = finalMemory - baselineMemory;
      const memoryIncreasePercent = (memoryIncrease / baselineMemory) * 100;

      console.log(`Sustained Load Test Results:
        - Duration: ${loadDuration / 1000} seconds
        - Operations performed: ${operationCount}
        - Operations per second: ${(operationCount / (loadDuration / 1000)).toFixed(2)}
        - Baseline memory: ${(baselineMemory / 1024 / 1024).toFixed(2)} MB
        - Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB
        - Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(2)}%)
        - Memory readings: ${memoryReadings.length}`);

      // Memory usage should not increase by more than 50%
      expect(memoryIncreasePercent).toBeLessThan(50);

      // Check for memory leaks by analyzing trend
      if (memoryReadings.length >= 3) {
        const firstReading = memoryReadings[0];
        const lastReading = memoryReadings[memoryReadings.length - 1];
        const memoryTrend = lastReading.heapUsed - firstReading.heapUsed;
        const trendPercent = (memoryTrend / firstReading.heapUsed) * 100;

        console.log(`Memory trend analysis:
          - First reading: ${(firstReading.heapUsed / 1024 / 1024).toFixed(2)} MB
          - Last reading: ${(lastReading.heapUsed / 1024 / 1024).toFixed(2)} MB
          - Trend: ${trendPercent.toFixed(2)}%`);

        // Memory trend should not increase by more than 30% during sustained load
        expect(Math.abs(trendPercent)).toBeLessThan(30);
      }

      // Force garbage collection and check memory cleanup
      const gcResponse = await request(app)
        .post('/api/admin/system/force-gc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const postGcMemory = gcResponse.body.memoryAfterGC;
      const memoryRecovered = finalMemory - postGcMemory;
      
      console.log(`Garbage Collection:
        - Memory before GC: ${(finalMemory / 1024 / 1024).toFixed(2)} MB
        - Memory after GC: ${(postGcMemory / 1024 / 1024).toFixed(2)} MB
        - Memory recovered: ${(memoryRecovered / 1024 / 1024).toFixed(2)} MB`);

      expect(memoryRecovered).toBeGreaterThan(0);

      // Cleanup any remaining test data
      try {
        for (let i = 0; i < operationCount; i++) {
          await request(app)
            .post('/api/checkout')
            .send({ licensePlate: `LOAD-${i}` });
        }
      } catch (error) {
        // Some vehicles may not be checked in or already checked out
      }
    }, 90000); // Extended timeout for sustained load test
  });

  describe('4. Response Time Performance Thresholds', () => {
    test('should meet response time SLAs under normal load', async () => {
      const slaThresholds = {
        '/api/spots': 200, // 200ms
        '/api/garage/status': 150, // 150ms
        '/api/checkin': 300, // 300ms
        '/api/checkout': 250, // 250ms
        '/api/cars/:licensePlate': 180, // 180ms
        '/api/payments/calculate': 400 // 400ms
      };

      const testResults = {};

      // Test each endpoint multiple times
      for (const [endpoint, threshold] of Object.entries(slaThresholds)) {
        const measurements = [];
        
        for (let i = 0; i < 10; i++) {
          let startTime, endTime, response;
          
          try {
            switch (endpoint) {
              case '/api/spots':
                startTime = Date.now();
                response = await request(app).get('/api/spots');
                endTime = Date.now();
                break;
                
              case '/api/garage/status':
                startTime = Date.now();
                response = await request(app).get('/api/garage/status');
                endTime = Date.now();
                break;
                
              case '/api/checkin':
                startTime = Date.now();
                response = await request(app)
                  .post('/api/checkin')
                  .send({
                    licensePlate: `SLA-TEST-${i}`,
                    vehicleType: 'standard'
                  });
                endTime = Date.now();
                break;
                
              case '/api/checkout':
                // First check in a vehicle
                await request(app)
                  .post('/api/checkin')
                  .send({
                    licensePlate: `SLA-CHECKOUT-${i}`,
                    vehicleType: 'standard'
                  });
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
                startTime = Date.now();
                response = await request(app)
                  .post('/api/checkout')
                  .send({ licensePlate: `SLA-CHECKOUT-${i}` });
                endTime = Date.now();
                break;
                
              case '/api/cars/:licensePlate':
                // Use a checked-in vehicle
                if (i === 0) {
                  await request(app)
                    .post('/api/checkin')
                    .send({
                      licensePlate: 'SLA-SEARCH-VEHICLE',
                      vehicleType: 'standard'
                    });
                }
                
                startTime = Date.now();
                response = await request(app)
                  .get('/api/cars/SLA-SEARCH-VEHICLE');
                endTime = Date.now();
                break;
                
              case '/api/payments/calculate':
                // Need a valid ticket ID
                const checkinResp = await request(app)
                  .post('/api/checkin')
                  .send({
                    licensePlate: `SLA-PAYMENT-${i}`,
                    vehicleType: 'standard'
                  });
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
                startTime = Date.now();
                response = await request(app)
                  .post('/api/payments/calculate')
                  .send({ ticketId: checkinResp.body.ticketId });
                endTime = Date.now();
                
                // Checkout to clean up
                await request(app)
                  .post('/api/checkout')
                  .send({ licensePlate: `SLA-PAYMENT-${i}` });
                break;
            }

            const responseTime = endTime - startTime;
            
            if (response && response.status < 400) {
              measurements.push(responseTime);
            }
            
          } catch (error) {
            console.warn(`Error testing ${endpoint}:`, error.message);
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Calculate statistics
        if (measurements.length > 0) {
          const avg = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
          const p95 = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)];
          const p99 = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.99)];

          testResults[endpoint] = {
            measurements: measurements.length,
            average: avg,
            p95: p95,
            p99: p99,
            threshold: threshold,
            avgPassed: avg <= threshold,
            p95Passed: p95 <= threshold * 1.5, // Allow 50% margin for 95th percentile
            p99Passed: p99 <= threshold * 2    // Allow 100% margin for 99th percentile
          };
        }
      }

      // Report results and verify SLAs
      console.log('\nSLA Performance Test Results:');
      console.log('=====================================');
      
      for (const [endpoint, results] of Object.entries(testResults)) {
        console.log(`${endpoint}:
          - Threshold: ${results.threshold}ms
          - Average: ${results.average.toFixed(2)}ms (${results.avgPassed ? 'PASS' : 'FAIL'})
          - 95th percentile: ${results.p95}ms (${results.p95Passed ? 'PASS' : 'FAIL'})
          - 99th percentile: ${results.p99}ms (${results.p99Passed ? 'PASS' : 'FAIL'})
          - Measurements: ${results.measurements}`);

        // Assert SLA compliance
        expect(results.avgPassed).toBe(true);
        expect(results.p95Passed).toBe(true);
      }

      // Cleanup any remaining test vehicles
      const cleanupVehicles = ['SLA-SEARCH-VEHICLE'];
      for (const licensePlate of cleanupVehicles) {
        try {
          await request(app)
            .post('/api/checkout')
            .send({ licensePlate });
        } catch (error) {
          // Vehicle may not be checked in
        }
      }
    }, 60000);
  });
});
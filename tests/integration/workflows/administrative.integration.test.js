/**
 * Administrative Workflow Integration Tests
 * 
 * Tests complete administrative workflows including garage management and reporting
 */

const request = require('supertest');
const { faker } = require('@faker-js/faker');
const { createMockApp } = require('../../helpers/mockApp');

describe('Administrative Workflow Integration Tests', () => {
  let app;
  let api;
  let adminToken;
  let managerToken;

  beforeEach(async () => {
    app = createMockApp();
    api = app.locals.api;

    // Create admin user and get token
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

    // Create manager user and get token
    const managerUser = {
      email: 'manager@test.com',
      password: 'ManagerPass123!',
      role: 'manager'
    };

    await request(app)
      .post('/api/users/register')
      .send(managerUser)
      .expect(201);

    await request(app)
      .post('/api/users/verify-email')
      .send({ token: 'manager-verify', email: managerUser.email })
      .expect(200);

    const managerLoginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: managerUser.email,
        password: managerUser.password
      })
      .expect(200);

    managerToken = managerLoginResponse.body.token;
  });

  describe('1. Garage Management and Configuration', () => {
    test('should complete garage setup workflow: structure definition → spot configuration → pricing setup → activation', async () => {
      // Step 1: Define garage structure
      const garageStructure = {
        name: 'Test Corporate Garage',
        location: {
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          zipCode: faker.location.zipCode()
        },
        floors: [
          { 
            number: 1, 
            name: 'Ground Floor', 
            bays: ['A', 'B', 'C'],
            totalSpots: 75,
            features: ['handicap_accessible', 'ev_charging']
          },
          { 
            number: 2, 
            name: 'Second Floor', 
            bays: ['A', 'B'],
            totalSpots: 50,
            features: ['covered']
          }
        ],
        operatingHours: {
          weekdays: { open: '06:00', close: '22:00' },
          weekends: { open: '08:00', close: '20:00' }
        },
        timezone: 'America/New_York'
      };

      const structureResponse = await request(app)
        .post('/api/admin/garage/structure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(garageStructure)
        .expect(201);

      expect(structureResponse.body).toMatchObject({
        id: expect.any(String),
        name: garageStructure.name,
        totalSpots: 125,
        floorsCount: 2,
        status: 'configuration'
      });

      const garageId = structureResponse.body.id;

      // Step 2: Configure individual spots
      const spotConfigurations = [];
      for (let floor = 1; floor <= 2; floor++) {
        const bays = floor === 1 ? ['A', 'B', 'C'] : ['A', 'B'];
        const spotsPerBay = floor === 1 ? 25 : 25;
        
        for (const bay of bays) {
          for (let spot = 1; spot <= spotsPerBay; spot++) {
            let type = 'standard';
            let features = [];
            
            // Special configurations
            if (floor === 1 && bay === 'A' && spot <= 5) {
              type = 'handicap';
              features = ['handicap_accessible', 'wider_space'];
            } else if (spot % 10 === 1) {
              type = 'electric';
              features = ['ev_charging'];
            } else if (spot % 15 === 0) {
              type = 'oversized';
              features = ['large_space'];
            }

            spotConfigurations.push({
              spotId: `F${floor}-${bay}-${String(spot).padStart(3, '0')}`,
              floor,
              bay,
              spotNumber: spot,
              type,
              features,
              dimensions: {
                length: type === 'oversized' ? 20 : 18,
                width: type === 'handicap' ? 12 : 9
              }
            });
          }
        }
      }

      const spotsConfigResponse = await request(app)
        .post(`/api/admin/garage/${garageId}/spots/bulk-configure`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ spots: spotConfigurations })
        .expect(200);

      expect(spotsConfigResponse.body.configured).toBe(spotConfigurations.length);
      expect(spotsConfigResponse.body.summary).toMatchObject({
        standard: expect.any(Number),
        handicap: expect.any(Number),
        electric: expect.any(Number),
        oversized: expect.any(Number)
      });

      // Step 3: Set up pricing structure
      const pricingConfig = {
        rateTypes: {
          hourly: {
            standard: 5.00,
            handicap: 5.00,
            electric: 6.00,
            oversized: 7.00
          },
          daily: {
            standard: 25.00,
            handicap: 25.00,
            electric: 30.00,
            oversized: 35.00
          },
          monthly: {
            standard: 150.00,
            handicap: 150.00,
            electric: 180.00,
            oversized: 200.00
          }
        },
        surcharges: [
          {
            name: 'Peak Hours',
            multiplier: 1.5,
            timeRanges: [
              { start: '07:00', end: '09:00' },
              { start: '17:00', end: '19:00' }
            ],
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          }
        ],
        discounts: [
          {
            code: 'EARLY_BIRD',
            type: 'percentage',
            value: 20,
            conditions: {
              entryBefore: '08:00',
              minimumStay: 8
            }
          }
        ],
        taxes: {
          salesTax: 8.25,
          facilityFee: 1.50
        }
      };

      const pricingResponse = await request(app)
        .post(`/api/admin/garage/${garageId}/pricing`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(pricingConfig)
        .expect(200);

      expect(pricingResponse.body.message).toBe('Pricing configuration updated');
      expect(pricingResponse.body.rateTypesConfigured).toBe(3);
      expect(pricingResponse.body.surchargesConfigured).toBe(1);

      // Step 4: Configure access control and security
      const securityConfig = {
        accessMethods: ['ticket', 'license_plate', 'mobile_app', 'card'],
        entryGates: [
          { id: 'gate_1', location: 'Main Entrance', type: 'automatic' },
          { id: 'gate_2', location: 'Side Entrance', type: 'manual' }
        ],
        exitGates: [
          { id: 'exit_1', location: 'Main Exit', type: 'payment_required' },
          { id: 'exit_2', location: 'Emergency Exit', type: 'emergency_only' }
        ],
        securityFeatures: {
          cameraSystem: true,
          lightingSystem: true,
          emergencyCallBoxes: true,
          licensePlateRecognition: true
        }
      };

      const securityResponse = await request(app)
        .post(`/api/admin/garage/${garageId}/security`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(securityConfig)
        .expect(200);

      expect(securityResponse.body.message).toBe('Security configuration updated');

      // Step 5: Activate garage
      const activationResponse = await request(app)
        .post(`/api/admin/garage/${garageId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          activationDate: new Date().toISOString(),
          initialStaffing: {
            attendants: 2,
            security: 1,
            maintenance: 1
          }
        })
        .expect(200);

      expect(activationResponse.body.status).toBe('active');
      expect(activationResponse.body.activatedAt).toBeTruthy();

      // Step 6: Verify complete garage configuration
      const garageStatusResponse = await request(app)
        .get(`/api/admin/garage/${garageId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(garageStatusResponse.body).toMatchObject({
        id: garageId,
        status: 'active',
        totalSpots: 125,
        configuredSpots: spotConfigurations.length,
        pricingConfigured: true,
        securityConfigured: true,
        operationalStatus: 'ready'
      });
    });

    test('should handle spot maintenance and status management', async () => {
      // Start with active garage
      api.reset();

      // Mark spots for maintenance
      const maintenanceSpots = ['F1-A-001', 'F1-A-002', 'F2-B-015'];
      
      for (const spotId of maintenanceSpots) {
        const maintenanceResponse = await request(app)
          .put(`/api/admin/spots/${spotId}/maintenance`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            reason: 'Routine cleaning and inspection',
            estimatedDuration: 60, // minutes
            maintenanceType: 'cleaning',
            assignedTo: 'maintenance_crew_1'
          })
          .expect(200);

        expect(maintenanceResponse.body.status).toBe('maintenance');
        expect(maintenanceResponse.body.estimatedAvailable).toBeTruthy();
      }

      // Check garage capacity with maintenance spots
      const capacityResponse = await request(app)
        .get('/api/admin/garage/capacity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(capacityResponse.body.total).toBe(125);
      expect(capacityResponse.body.available).toBe(122); // 125 - 3 maintenance
      expect(capacityResponse.body.maintenance).toBe(3);

      // Complete maintenance on one spot
      const completionResponse = await request(app)
        .post(`/api/admin/spots/${maintenanceSpots[0]}/maintenance/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          completedBy: 'maintenance_crew_1',
          completionNotes: 'Spot cleaned and inspected - ready for use',
          actualDuration: 45
        })
        .expect(200);

      expect(completionResponse.body.status).toBe('available');
      expect(completionResponse.body.maintenanceHistory).toHaveLength(1);

      // Reserve spots for VIP customers
      const vipSpots = ['F1-A-010', 'F1-A-011'];
      
      for (const spotId of vipSpots) {
        const reservationResponse = await request(app)
          .post(`/api/admin/spots/${spotId}/reserve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            reservationType: 'vip',
            reservedFor: 'VIP Customer',
            duration: 4, // hours
            reason: 'Executive parking reservation'
          })
          .expect(200);

        expect(reservationResponse.body.status).toBe('reserved');
        expect(reservationResponse.body.reservedUntil).toBeTruthy();
      }

      // Get detailed spot status report
      const spotReportResponse = await request(app)
        .get('/api/admin/spots/status-report')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(spotReportResponse.body.summary).toMatchObject({
        total: 125,
        available: expect.any(Number),
        occupied: 0,
        maintenance: 2, // 2 remaining
        reserved: 2,
        outOfService: 0
      });

      expect(spotReportResponse.body.byFloor).toHaveProperty('1');
      expect(spotReportResponse.body.byFloor).toHaveProperty('2');
      expect(spotReportResponse.body.byType).toHaveProperty('standard');
    });

    test('should manage pricing changes with impact analysis', async () => {
      // Get current pricing
      const currentPricingResponse = await request(app)
        .get('/api/admin/garage/pricing')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const currentRates = currentPricingResponse.body.rateTypes.hourly;

      // Propose pricing changes
      const pricingChanges = {
        rateTypes: {
          hourly: {
            standard: currentRates.standard * 1.1, // 10% increase
            handicap: currentRates.handicap, // No change
            electric: currentRates.electric * 1.05, // 5% increase
            oversized: currentRates.oversized * 1.15 // 15% increase
          }
        },
        effectiveDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        reason: 'Annual rate adjustment for inflation and maintenance costs'
      };

      // Analyze pricing impact
      const impactAnalysisResponse = await request(app)
        .post('/api/admin/garage/pricing/analyze-impact')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(pricingChanges)
        .expect(200);

      expect(impactAnalysisResponse.body).toMatchObject({
        revenueImpact: {
          estimatedIncrease: expect.any(Number),
          percentageChange: expect.any(Number)
        },
        customerImpact: {
          affectedCustomers: expect.any(Number),
          priceIncrease: expect.any(Object)
        },
        competitiveAnalysis: {
          marketPosition: expect.any(String),
          recommendedAdjustments: expect.any(Array)
        }
      });

      // Schedule pricing change
      const schedulingResponse = await request(app)
        .post('/api/admin/garage/pricing/schedule-change')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(pricingChanges)
        .expect(200);

      expect(schedulingResponse.body.changeScheduled).toBe(true);
      expect(schedulingResponse.body.effectiveDate).toBe(pricingChanges.effectiveDate);

      // Verify scheduled change
      const scheduledChangesResponse = await request(app)
        .get('/api/admin/garage/pricing/scheduled-changes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(scheduledChangesResponse.body).toHaveLength(1);
      expect(scheduledChangesResponse.body[0]).toMatchObject({
        effectiveDate: pricingChanges.effectiveDate,
        status: 'scheduled',
        reason: pricingChanges.reason
      });

      // Test immediate pricing change for emergency
      const emergencyPricing = {
        rateTypes: {
          hourly: {
            standard: currentRates.standard * 0.5 // Emergency 50% discount
          }
        },
        reason: 'Emergency rate reduction due to construction nearby',
        applyImmediately: true
      };

      const emergencyResponse = await request(app)
        .post('/api/admin/garage/pricing/emergency-change')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emergencyPricing)
        .expect(200);

      expect(emergencyResponse.body.applied).toBe(true);
      expect(emergencyResponse.body.effectiveDate).toBeTruthy();

      // Verify emergency change is active
      const updatedPricingResponse = await request(app)
        .get('/api/admin/garage/pricing')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(updatedPricingResponse.body.rateTypes.hourly.standard)
        .toBe(emergencyPricing.rateTypes.hourly.standard);
    });
  });

  describe('2. Report Generation and Analytics Dashboard', () => {
    beforeEach(async () => {
      // Set up test data with various parking sessions
      const testSessions = [
        { licensePlate: 'TEST001', duration: 2, amount: 10.00, vehicleType: 'standard' },
        { licensePlate: 'TEST002', duration: 8, amount: 40.00, vehicleType: 'electric' },
        { licensePlate: 'TEST003', duration: 1, amount: 5.00, vehicleType: 'compact' },
        { licensePlate: 'TEST004', duration: 24, amount: 100.00, vehicleType: 'oversized' },
        { licensePlate: 'TEST005', duration: 4, amount: 20.00, vehicleType: 'standard' }
      ];

      for (const session of testSessions) {
        await request(app)
          .post('/api/admin/test/create-completed-session')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(session)
          .expect(201);
      }
    });

    test('should generate comprehensive financial reports with data export', async () => {
      const reportPeriod = {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      };

      // Generate revenue report
      const revenueReportResponse = await request(app)
        .post('/api/admin/reports/revenue')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...reportPeriod,
          groupBy: 'day',
          includeComparisons: true,
          breakdown: ['vehicle_type', 'rate_type', 'payment_method']
        })
        .expect(200);

      expect(revenueReportResponse.body).toMatchObject({
        reportId: expect.any(String),
        period: reportPeriod,
        summary: {
          totalRevenue: expect.any(Number),
          totalTransactions: expect.any(Number),
          averageTransactionValue: expect.any(Number),
          revenueGrowth: expect.any(Number)
        },
        breakdowns: {
          byVehicleType: expect.any(Array),
          byRateType: expect.any(Array),
          byPaymentMethod: expect.any(Array)
        },
        trends: expect.any(Array)
      });

      const reportId = revenueReportResponse.body.reportId;

      // Export report to different formats
      const exportFormats = ['pdf', 'excel', 'csv'];
      
      for (const format of exportFormats) {
        const exportResponse = await request(app)
          .post(`/api/admin/reports/${reportId}/export`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ format })
          .expect(200);

        expect(exportResponse.body).toMatchObject({
          exportId: expect.any(String),
          format,
          status: 'processing',
          estimatedCompletionTime: expect.any(Number)
        });

        // Check export status
        const exportStatusResponse = await request(app)
          .get(`/api/admin/reports/exports/${exportResponse.body.exportId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(exportStatusResponse.body.status).toMatch(/processing|completed/);
      }

      // Generate utilization report
      const utilizationReportResponse = await request(app)
        .post('/api/admin/reports/utilization')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...reportPeriod,
          includeHeatmap: true,
          granularity: 'hourly'
        })
        .expect(200);

      expect(utilizationReportResponse.body.summary).toMatchObject({
        averageOccupancy: expect.any(Number),
        peakOccupancy: expect.any(Number),
        peakTimes: expect.any(Array),
        turnoverRate: expect.any(Number)
      });

      expect(utilizationReportResponse.body.heatmapData).toBeInstanceOf(Array);

      // Generate customer analytics report
      const customerReportResponse = await request(app)
        .post('/api/admin/reports/customer-analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...reportPeriod,
          includeSegmentation: true,
          includeLoyalty: true
        })
        .expect(200);

      expect(customerReportResponse.body).toMatchObject({
        customerMetrics: {
          totalCustomers: expect.any(Number),
          newCustomers: expect.any(Number),
          returningCustomers: expect.any(Number),
          customerRetentionRate: expect.any(Number)
        },
        segmentation: expect.any(Array),
        loyaltyAnalysis: expect.any(Object)
      });
    });

    test('should provide real-time dashboard metrics and alerts', async () => {
      // Get real-time dashboard data
      const dashboardResponse = await request(app)
        .get('/api/admin/dashboard/real-time')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(dashboardResponse.body).toMatchObject({
        timestamp: expect.any(String),
        occupancy: {
          current: expect.any(Number),
          percentage: expect.any(Number),
          trend: expect.any(String)
        },
        revenue: {
          today: expect.any(Number),
          thisHour: expect.any(Number),
          trend: expect.any(String)
        },
        traffic: {
          entriesLastHour: expect.any(Number),
          exitsLastHour: expect.any(Number),
          currentVehicles: expect.any(Number)
        },
        alerts: expect.any(Array),
        systemHealth: {
          gatewayStatus: expect.any(String),
          paymentSystemStatus: expect.any(String),
          hardwareStatus: expect.any(String)
        }
      });

      // Set up custom alert thresholds
      const alertConfig = {
        occupancyThresholds: {
          high: 90,
          critical: 95
        },
        revenueThresholds: {
          dailyTarget: 1000.00,
          weeklyTarget: 7000.00
        },
        systemAlerts: {
          gatewayTimeout: 30, // seconds
          paymentFailureRate: 5 // percentage
        }
      };

      const alertSetupResponse = await request(app)
        .post('/api/admin/dashboard/alerts/configure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(alertConfig)
        .expect(200);

      expect(alertSetupResponse.body.message).toBe('Alert configuration updated');

      // Simulate high occupancy to trigger alert
      await request(app)
        .post('/api/admin/test/set-occupancy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ percentage: 0.92 })
        .expect(200);

      // Check for triggered alerts
      const alertsResponse = await request(app)
        .get('/api/admin/dashboard/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(alertsResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'occupancy_high',
            severity: 'warning',
            message: expect.stringContaining('92%')
          })
        ])
      );

      // Acknowledge alert
      if (alertsResponse.body.length > 0) {
        const alertId = alertsResponse.body[0].id;
        const acknowledgeResponse = await request(app)
          .post(`/api/admin/dashboard/alerts/${alertId}/acknowledge`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            acknowledgedBy: 'admin@test.com',
            note: 'High occupancy noted, monitoring situation'
          })
          .expect(200);

        expect(acknowledgeResponse.body.acknowledged).toBe(true);
      }
    });

    test('should generate automated recurring reports with email delivery', async () => {
      // Set up automated daily report
      const dailyReportConfig = {
        name: 'Daily Operations Summary',
        reportType: 'operations_summary',
        schedule: {
          frequency: 'daily',
          time: '08:00',
          timezone: 'America/New_York'
        },
        recipients: [
          { email: 'manager@test.com', role: 'manager' },
          { email: 'admin@test.com', role: 'admin' }
        ],
        content: {
          sections: [
            'occupancy_summary',
            'revenue_summary',
            'incidents',
            'maintenance_status'
          ],
          format: 'pdf'
        }
      };

      const scheduleResponse = await request(app)
        .post('/api/admin/reports/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dailyReportConfig)
        .expect(201);

      expect(scheduleResponse.body).toMatchObject({
        scheduleId: expect.any(String),
        name: dailyReportConfig.name,
        status: 'active',
        nextRun: expect.any(String)
      });

      const scheduleId = scheduleResponse.body.scheduleId;

      // Set up weekly executive report
      const weeklyReportConfig = {
        name: 'Weekly Executive Summary',
        reportType: 'executive_summary',
        schedule: {
          frequency: 'weekly',
          day: 'monday',
          time: '09:00',
          timezone: 'America/New_York'
        },
        recipients: [
          { email: 'ceo@test.com', role: 'executive' }
        ],
        content: {
          sections: [
            'financial_overview',
            'performance_metrics',
            'growth_analysis',
            'recommendations'
          ],
          format: 'executive_dashboard'
        }
      };

      const weeklyScheduleResponse = await request(app)
        .post('/api/admin/reports/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(weeklyReportConfig)
        .expect(201);

      // Get all scheduled reports
      const scheduledReportsResponse = await request(app)
        .get('/api/admin/reports/scheduled')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(scheduledReportsResponse.body).toHaveLength(2);
      expect(scheduledReportsResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Daily Operations Summary' }),
          expect.objectContaining({ name: 'Weekly Executive Summary' })
        ])
      );

      // Test manual report generation
      const manualRunResponse = await request(app)
        .post(`/api/admin/reports/scheduled/${scheduleId}/run`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(manualRunResponse.body.message).toBe('Report generation started');
      expect(manualRunResponse.body.executionId).toBeTruthy();

      // Check execution status
      const executionStatusResponse = await request(app)
        .get(`/api/admin/reports/executions/${manualRunResponse.body.executionId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(executionStatusResponse.body.status).toMatch(/processing|completed/);
    });
  });

  describe('3. User Management and Security Administration', () => {
    test('should manage user roles, permissions, and access control', async () => {
      // Create test users with different roles
      const testUsers = [
        { email: 'employee1@test.com', role: 'employee' },
        { email: 'supervisor1@test.com', role: 'supervisor' },
        { email: 'contractor1@test.com', role: 'contractor' }
      ];

      const createdUsers = [];

      for (const userData of testUsers) {
        const userResponse = await request(app)
          .post('/api/admin/users/create')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...userData,
            password: 'TempPass123!',
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            department: 'Operations',
            startDate: new Date().toISOString()
          })
          .expect(201);

        createdUsers.push(userResponse.body);
      }

      // Bulk assign permissions
      const permissionAssignments = [
        {
          userId: createdUsers[0].id,
          permissions: ['spot_monitoring', 'basic_reports']
        },
        {
          userId: createdUsers[1].id,
          permissions: ['spot_monitoring', 'basic_reports', 'user_management', 'maintenance_scheduling']
        },
        {
          userId: createdUsers[2].id,
          permissions: ['maintenance_access']
        }
      ];

      const bulkPermissionResponse = await request(app)
        .post('/api/admin/users/permissions/bulk-assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignments: permissionAssignments })
        .expect(200);

      expect(bulkPermissionResponse.body.updated).toBe(3);

      // Set up role-based access policies
      const accessPolicies = [
        {
          role: 'employee',
          resources: ['spots:read', 'sessions:read'],
          conditions: {
            timeRestrictions: {
              allowedHours: { start: '06:00', end: '22:00' },
              allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            }
          }
        },
        {
          role: 'supervisor',
          resources: ['spots:read', 'spots:update', 'sessions:read', 'users:read', 'reports:basic'],
          conditions: {
            departmentRestriction: 'Operations'
          }
        },
        {
          role: 'contractor',
          resources: ['maintenance:read', 'maintenance:update'],
          conditions: {
            contractExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      ];

      const policiesResponse = await request(app)
        .post('/api/admin/access-policies/configure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ policies: accessPolicies })
        .expect(200);

      expect(policiesResponse.body.policiesConfigured).toBe(3);

      // Test access control enforcement
      const employeeLoginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: 'employee1@test.com',
          password: 'TempPass123!'
        })
        .expect(200);

      const employeeToken = employeeLoginResponse.body.token;

      // Employee should be able to read spots
      await request(app)
        .get('/api/spots')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      // Employee should NOT be able to update spots
      await request(app)
        .put('/api/spots/F1-A-001')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'maintenance' })
        .expect(403);

      // Employee should NOT be able to access admin endpoints
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      // Test supervisor permissions
      const supervisorLoginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: 'supervisor1@test.com',
          password: 'TempPass123!'
        })
        .expect(200);

      const supervisorToken = supervisorLoginResponse.body.token;

      // Supervisor should be able to update spots
      await request(app)
        .put('/api/spots/F1-A-001')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ status: 'maintenance', reason: 'Routine maintenance' })
        .expect(200);

      // Audit user access activities
      const auditResponse = await request(app)
        .get('/api/admin/users/audit-log')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          userId: createdUsers[0].id,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        })
        .expect(200);

      expect(auditResponse.body).toBeInstanceOf(Array);
      expect(auditResponse.body.length).toBeGreaterThan(0);
      
      auditResponse.body.forEach(entry => {
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('userId', createdUsers[0].id);
        expect(entry).toHaveProperty('action');
        expect(entry).toHaveProperty('resource');
        expect(entry).toHaveProperty('result');
      });
    });

    test('should handle security monitoring and threat detection', async () => {
      // Set up security monitoring rules
      const securityRules = [
        {
          name: 'Multiple Failed Login Attempts',
          type: 'login_failure',
          threshold: 5,
          timeWindow: 300, // 5 minutes
          action: 'account_lockout'
        },
        {
          name: 'Suspicious API Access Pattern',
          type: 'api_abuse',
          threshold: 100,
          timeWindow: 60, // 1 minute
          action: 'rate_limit'
        },
        {
          name: 'Privilege Escalation Attempt',
          type: 'permission_violation',
          threshold: 3,
          timeWindow: 600, // 10 minutes
          action: 'alert_admin'
        }
      ];

      const securityRulesResponse = await request(app)
        .post('/api/admin/security/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rules: securityRules })
        .expect(200);

      expect(securityRulesResponse.body.rulesConfigured).toBe(3);

      // Simulate suspicious activity - multiple failed logins
      const suspiciousEmail = 'victim@test.com';
      
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/users/login')
          .send({
            email: suspiciousEmail,
            password: 'WrongPassword123!'
          })
          .expect(401);
      }

      // Check security events
      const securityEventsResponse = await request(app)
        .get('/api/admin/security/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          eventType: 'login_failure',
          startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        })
        .expect(200);

      expect(securityEventsResponse.body.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'login_failure',
            email: suspiciousEmail,
            count: expect.any(Number),
            actionTaken: 'account_lockout'
          })
        ])
      );

      // Get security dashboard
      const securityDashboardResponse = await request(app)
        .get('/api/admin/security/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(securityDashboardResponse.body).toMatchObject({
        threatLevel: expect.any(String),
        activeThreats: expect.any(Number),
        blockedIPs: expect.any(Array),
        lockedAccounts: expect.any(Number),
        recentEvents: expect.any(Array),
        systemHealth: {
          firewallStatus: expect.any(String),
          intrusionDetection: expect.any(String),
          accessControlStatus: expect.any(String)
        }
      });

      // Test incident response workflow
      if (securityEventsResponse.body.events.length > 0) {
        const incidentResponse = await request(app)
          .post('/api/admin/security/incidents/create')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            eventIds: [securityEventsResponse.body.events[0].id],
            severity: 'medium',
            title: 'Multiple Failed Login Attempts',
            description: 'Suspicious login activity detected',
            assignedTo: 'security@test.com'
          })
          .expect(201);

        expect(incidentResponse.body).toMatchObject({
          incidentId: expect.any(String),
          status: 'open',
          severity: 'medium'
        });

        // Update incident with investigation notes
        const incidentUpdateResponse = await request(app)
          .put(`/api/admin/security/incidents/${incidentResponse.body.incidentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            status: 'investigating',
            notes: 'Investigating source IP and user account status',
            investigatedBy: 'admin@test.com'
          })
          .expect(200);

        expect(incidentUpdateResponse.body.status).toBe('investigating');
      }
    });
  });

  describe('4. System Monitoring and Maintenance', () => {
    test('should monitor system health and performance metrics', async () => {
      // Get comprehensive system health status
      const healthCheckResponse = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(healthCheckResponse.body).toMatchObject({
        overall: expect.any(String), // healthy, degraded, critical
        timestamp: expect.any(String),
        components: {
          database: {
            status: expect.any(String),
            responseTime: expect.any(Number),
            connections: expect.any(Number)
          },
          paymentGateway: {
            status: expect.any(String),
            responseTime: expect.any(Number),
            successRate: expect.any(Number)
          },
          cache: {
            status: expect.any(String),
            hitRate: expect.any(Number),
            memoryUsage: expect.any(Number)
          },
          storage: {
            status: expect.any(String),
            diskUsage: expect.any(Number),
            freeSpace: expect.any(Number)
          }
        },
        metrics: {
          uptime: expect.any(Number),
          memoryUsage: expect.any(Number),
          cpuUsage: expect.any(Number),
          activeConnections: expect.any(Number)
        }
      });

      // Get detailed performance metrics
      const performanceResponse = await request(app)
        .get('/api/admin/system/performance')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          period: '1h',
          granularity: 'minute'
        })
        .expect(200);

      expect(performanceResponse.body).toMatchObject({
        period: '1h',
        dataPoints: expect.any(Array),
        summary: {
          averageResponseTime: expect.any(Number),
          requestsPerMinute: expect.any(Number),
          errorRate: expect.any(Number),
          throughput: expect.any(Number)
        }
      });

      // Set up performance alerts
      const alertThresholds = {
        responseTime: { warning: 1000, critical: 3000 }, // milliseconds
        errorRate: { warning: 5, critical: 10 }, // percentage
        memoryUsage: { warning: 80, critical: 95 }, // percentage
        diskSpace: { warning: 15, critical: 5 } // GB free space
      };

      const alertConfigResponse = await request(app)
        .post('/api/admin/system/alerts/configure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          thresholds: alertThresholds,
          notificationChannels: ['email', 'sms', 'slack'],
          recipients: ['admin@test.com', 'sysadmin@test.com']
        })
        .expect(200);

      expect(alertConfigResponse.body.message).toBe('Alert configuration updated');

      // Test system backup and recovery procedures
      const backupResponse = await request(app)
        .post('/api/admin/system/backup/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'full',
          description: 'Scheduled weekly backup',
          includeUserData: true,
          includeTransactions: true,
          includeSystemConfig: true
        })
        .expect(202);

      expect(backupResponse.body).toMatchObject({
        backupId: expect.any(String),
        status: 'initiated',
        estimatedDuration: expect.any(Number)
      });

      const backupId = backupResponse.body.backupId;

      // Monitor backup progress
      let backupComplete = false;
      let attempts = 0;
      
      while (attempts < 10 && !backupComplete) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await request(app)
          .get(`/api/admin/system/backup/${backupId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        if (statusResponse.body.status === 'completed') {
          backupComplete = true;
          expect(statusResponse.body.size).toBeGreaterThan(0);
          expect(statusResponse.body.location).toBeTruthy();
        }
        
        attempts++;
      }

      // List available backups
      const backupsListResponse = await request(app)
        .get('/api/admin/system/backups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(backupsListResponse.body).toBeInstanceOf(Array);
      expect(backupsListResponse.body.length).toBeGreaterThan(0);
    });

    test('should handle system maintenance and updates', async () => {
      // Schedule maintenance window
      const maintenanceWindow = {
        title: 'Monthly System Maintenance',
        description: 'Database optimization and security updates',
        scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 120, // minutes
        maintenanceType: 'scheduled',
        affectedServices: ['payment_processing', 'user_management'],
        notificationAdvance: 1440 // 24 hours
      };

      const maintenanceScheduleResponse = await request(app)
        .post('/api/admin/system/maintenance/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maintenanceWindow)
        .expect(201);

      expect(maintenanceScheduleResponse.body).toMatchObject({
        maintenanceId: expect.any(String),
        status: 'scheduled',
        notificationsSent: expect.any(Boolean)
      });

      const maintenanceId = maintenanceScheduleResponse.body.maintenanceId;

      // Get scheduled maintenance
      const scheduledMaintenanceResponse = await request(app)
        .get('/api/admin/system/maintenance/scheduled')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(scheduledMaintenanceResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: maintenanceId,
            title: maintenanceWindow.title
          })
        ])
      );

      // Simulate emergency maintenance
      const emergencyMaintenanceResponse = await request(app)
        .post('/api/admin/system/maintenance/emergency')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Critical security patch required',
          estimatedDuration: 30,
          immediateStart: true,
          affectedServices: ['all']
        })
        .expect(201);

      expect(emergencyMaintenanceResponse.body.status).toBe('active');

      // Check maintenance status
      const maintenanceStatusResponse = await request(app)
        .get('/api/admin/system/maintenance/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(maintenanceStatusResponse.body).toMatchObject({
        currentMaintenance: expect.any(Object),
        systemStatus: 'maintenance_mode',
        affectedServices: expect.any(Array)
      });

      // Complete emergency maintenance
      const completionResponse = await request(app)
        .post(`/api/admin/system/maintenance/${emergencyMaintenanceResponse.body.maintenanceId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          completionNotes: 'Security patch applied successfully',
          actualDuration: 25,
          servicesRestored: true
        })
        .expect(200);

      expect(completionResponse.body.status).toBe('completed');

      // Verify system is back online
      const postMaintenanceHealthResponse = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(postMaintenanceHealthResponse.body.overall).toBe('healthy');
    });
  });
});
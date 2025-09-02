/**
 * Test Data Seeder for Integration Tests
 * 
 * Provides utilities for seeding realistic test data for workflow integration tests
 */

const { faker } = require('@faker-js/faker');

class TestDataSeeder {
  constructor(app, api) {
    this.app = app;
    this.api = api;
    this.seededData = {
      users: [],
      vehicles: [],
      sessions: [],
      payments: [],
      spots: []
    };
  }

  /**
   * Clear all seeded data and reset the system
   */
  async clearAll() {
    console.log('Clearing all seeded test data...');
    
    // Clear in reverse dependency order
    await this.clearPayments();
    await this.clearSessions();
    await this.clearVehicles();
    await this.clearUsers();
    await this.clearSpots();
    
    // Reset API state
    this.api.reset();
    
    console.log('All test data cleared successfully');
  }

  /**
   * Seed comprehensive test dataset for full workflow testing
   */
  async seedComprehensiveDataset() {
    console.log('Seeding comprehensive test dataset...');

    // 1. Create users with different roles and statuses
    await this.seedUsers();
    
    // 2. Configure garage with realistic spot layout
    await this.seedGarageStructure();
    
    // 3. Create realistic vehicle fleet
    await this.seedVehicles();
    
    // 4. Create historical parking sessions
    await this.seedHistoricalSessions();
    
    // 5. Create ongoing parking sessions
    await this.seedActiveSessions();
    
    // 6. Create payment history
    await this.seedPaymentHistory();

    console.log('Comprehensive dataset seeded successfully');
    
    return this.seededData;
  }

  /**
   * Seed users with various roles and characteristics
   */
  async seedUsers() {
    const userProfiles = [
      // Admin users
      {
        role: 'admin',
        email: 'admin@parkinggarage.com',
        password: 'AdminSecure123!',
        firstName: 'System',
        lastName: 'Administrator',
        department: 'IT',
        isEmailVerified: true,
        status: 'active',
        permissions: ['full_access']
      },
      {
        role: 'admin',
        email: 'superadmin@parkinggarage.com',
        password: 'SuperAdmin456!',
        firstName: 'Super',
        lastName: 'Admin',
        department: 'Management',
        isEmailVerified: true,
        status: 'active',
        permissions: ['full_access', 'system_config']
      },
      
      // Manager users
      {
        role: 'manager',
        email: 'manager1@parkinggarage.com',
        password: 'Manager789!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        department: 'Operations',
        isEmailVerified: true,
        status: 'active',
        permissions: ['user_management', 'reports', 'garage_config']
      },
      {
        role: 'manager',
        email: 'manager2@parkinggarage.com',
        password: 'Manager101!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        department: 'Security',
        isEmailVerified: true,
        status: 'active',
        permissions: ['security', 'incident_management']
      },
      
      // Regular employees
      ...Array.from({ length: 5 }, (_, i) => ({
        role: 'employee',
        email: `employee${i + 1}@parkinggarage.com`,
        password: `Employee${i + 1}23!`,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        department: ['Operations', 'Maintenance', 'Customer Service'][i % 3],
        isEmailVerified: true,
        status: 'active',
        permissions: ['basic_operations']
      })),
      
      // Regular customers
      ...Array.from({ length: 25 }, (_, i) => ({
        role: 'customer',
        email: faker.internet.email(),
        password: 'Customer123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: faker.phone.number(),
        isEmailVerified: Math.random() > 0.1, // 90% verified
        status: ['active', 'active', 'active', 'inactive'][Math.floor(Math.random() * 4)], // 75% active
        membershipType: ['none', 'none', 'basic', 'premium'][Math.floor(Math.random() * 4)],
        preferences: {
          notifications: Math.random() > 0.3,
          emailMarketing: Math.random() > 0.5,
          smsAlerts: Math.random() > 0.4
        }
      })),
      
      // Test edge cases
      {
        role: 'customer',
        email: 'locked.user@test.com',
        password: 'LockedUser123!',
        firstName: 'Locked',
        lastName: 'User',
        isEmailVerified: true,
        status: 'locked',
        lockReason: 'Multiple failed login attempts',
        lockedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        role: 'customer',
        email: 'unverified.user@test.com',
        password: 'Unverified123!',
        firstName: 'Unverified',
        lastName: 'User',
        isEmailVerified: false,
        status: 'pending_verification',
        verificationTokenSent: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    for (const profile of userProfiles) {
      try {
        const response = await this.seedUser(profile);
        this.seededData.users.push({
          ...response,
          originalPassword: profile.password
        });
      } catch (error) {
        console.warn(`Failed to seed user ${profile.email}:`, error.message);
      }
    }

    console.log(`Seeded ${this.seededData.users.length} users`);
  }

  /**
   * Seed individual user
   */
  async seedUser(profile) {
    // Create user via API
    const userResponse = await this.makeRequest('POST', '/api/users/register', profile);
    
    if (profile.isEmailVerified) {
      await this.makeRequest('POST', '/api/users/verify-email', {
        token: `seed-verify-${Date.now()}`,
        email: profile.email
      });
    }

    return {
      id: userResponse.body.id,
      email: profile.email,
      role: profile.role,
      status: profile.status
    };
  }

  /**
   * Seed garage structure with realistic layout
   */
  async seedGarageStructure() {
    // Default structure is already created by mockApp
    // Just add some special spots and configurations
    
    const specialSpots = [
      // Handicap spots
      { spotId: 'F1-A-001', type: 'handicap', features: ['handicap_accessible', 'wider_space'] },
      { spotId: 'F1-A-002', type: 'handicap', features: ['handicap_accessible', 'wider_space'] },
      
      // Electric charging spots
      { spotId: 'F1-B-001', type: 'electric', features: ['ev_charging', 'level2_charging'] },
      { spotId: 'F1-B-002', type: 'electric', features: ['ev_charging', 'level2_charging'] },
      { spotId: 'F2-A-001', type: 'electric', features: ['ev_charging', 'dcfast_charging'] },
      
      // Oversized spots
      { spotId: 'F1-A-025', type: 'oversized', features: ['large_space', 'high_clearance'] },
      { spotId: 'F2-B-025', type: 'oversized', features: ['large_space', 'high_clearance'] },
      
      // VIP spots
      { spotId: 'F1-A-010', type: 'vip', features: ['covered', 'security_camera', 'close_to_entrance'] },
      { spotId: 'F1-A-011', type: 'vip', features: ['covered', 'security_camera', 'close_to_entrance'] },
      
      // Compact spots
      ...Array.from({ length: 15 }, (_, i) => ({
        spotId: `F3-A-${String(i + 1).padStart(3, '0')}`,
        type: 'compact',
        features: ['compact_only']
      }))
    ];

    for (const spot of specialSpots) {
      this.seededData.spots.push(spot);
    }

    console.log(`Configured ${specialSpots.length} special spots`);
  }

  /**
   * Seed realistic vehicle fleet
   */
  async seedVehicles() {
    const vehicleTypes = ['standard', 'compact', 'oversized', 'electric'];
    const makes = ['Toyota', 'Honda', 'Ford', 'BMW', 'Tesla', 'Chevrolet', 'Nissan', 'Hyundai'];
    const models = {
      Toyota: ['Camry', 'Corolla', 'RAV4', 'Prius'],
      Honda: ['Civic', 'Accord', 'CR-V', 'Pilot'],
      Ford: ['F-150', 'Mustang', 'Explorer', 'Focus'],
      BMW: ['3 Series', '5 Series', 'X3', 'X5'],
      Tesla: ['Model S', 'Model 3', 'Model X', 'Model Y'],
      Chevrolet: ['Silverado', 'Equinox', 'Malibu', 'Tahoe'],
      Nissan: ['Altima', 'Sentra', 'Rogue', 'Pathfinder'],
      Hyundai: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe']
    };

    const colors = ['Black', 'White', 'Silver', 'Blue', 'Red', 'Gray', 'Green', 'Brown'];

    for (let i = 0; i < 100; i++) {
      const make = makes[Math.floor(Math.random() * makes.length)];
      const model = models[make][Math.floor(Math.random() * models[make].length)];
      const year = 2015 + Math.floor(Math.random() * 9); // 2015-2023
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      let vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
      
      // Adjust type based on make/model
      if (make === 'Tesla') vehicleType = 'electric';
      if (model.includes('F-150') || model.includes('Silverado') || model.includes('Tahoe')) {
        vehicleType = 'oversized';
      }

      const vehicle = {
        licensePlate: this.generateLicensePlate(),
        make,
        model,
        year,
        color,
        vehicleType,
        vin: this.generateVIN(),
        ownerName: faker.person.fullName(),
        ownerPhone: faker.phone.number(),
        insuranceProvider: faker.company.name(),
        registrationExpiry: faker.date.future({ years: 1 }).toISOString()
      };

      this.seededData.vehicles.push(vehicle);
    }

    console.log(`Seeded ${this.seededData.vehicles.length} vehicles`);
  }

  /**
   * Seed historical parking sessions (completed)
   */
  async seedHistoricalSessions() {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

    for (let i = 0; i < 500; i++) {
      const vehicle = this.seededData.vehicles[Math.floor(Math.random() * this.seededData.vehicles.length)];
      
      // Random date in the past 90 days
      const checkInTime = new Date(
        startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
      );
      
      // Random duration between 30 minutes and 12 hours
      const durationMinutes = 30 + Math.floor(Math.random() * (12 * 60 - 30));
      const checkOutTime = new Date(checkInTime.getTime() + durationMinutes * 60 * 1000);

      // Calculate cost based on duration and vehicle type
      const hourlyRates = {
        standard: 5.00,
        compact: 4.00,
        oversized: 7.00,
        electric: 6.00
      };
      
      const hours = Math.ceil(durationMinutes / 60);
      const baseCost = hours * hourlyRates[vehicle.vehicleType];
      
      // Add random surcharges/discounts
      const surcharges = Math.random() > 0.7 ? baseCost * 0.1 : 0; // 30% chance of surcharge
      const discounts = Math.random() > 0.8 ? baseCost * 0.15 : 0; // 20% chance of discount
      const taxes = baseCost * 0.08; // 8% tax
      
      const totalCost = baseCost + surcharges + taxes - discounts;

      const session = {
        ticketId: `TKT-${Date.now()}-${i}`,
        licensePlate: vehicle.licensePlate,
        vehicleType: vehicle.vehicleType,
        checkInTime: checkInTime.toISOString(),
        checkOutTime: checkOutTime.toISOString(),
        durationMinutes,
        spotId: this.getRandomSpotId(),
        status: 'completed',
        baseCost: parseFloat(baseCost.toFixed(2)),
        surcharges: parseFloat(surcharges.toFixed(2)),
        discounts: parseFloat(discounts.toFixed(2)),
        taxes: parseFloat(taxes.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        paymentMethod: ['cash', 'credit_card', 'debit_card', 'mobile_payment'][Math.floor(Math.random() * 4)],
        paymentStatus: Math.random() > 0.05 ? 'completed' : 'failed', // 95% success rate
        customerSatisfaction: Math.floor(Math.random() * 3) + 3, // 3-5 stars
        notes: Math.random() > 0.9 ? faker.lorem.sentence() : null
      };

      this.seededData.sessions.push(session);
    }

    console.log(`Seeded ${this.seededData.sessions.filter(s => s.status === 'completed').length} historical sessions`);
  }

  /**
   * Seed active parking sessions
   */
  async seedActiveSessions() {
    const now = new Date();
    
    for (let i = 0; i < 30; i++) {
      const vehicle = this.seededData.vehicles[Math.floor(Math.random() * this.seededData.vehicles.length)];
      
      // Check in time between 30 minutes and 8 hours ago
      const minutesAgo = 30 + Math.floor(Math.random() * (8 * 60 - 30));
      const checkInTime = new Date(now.getTime() - minutesAgo * 60 * 1000);

      const session = {
        ticketId: `ACT-${Date.now()}-${i}`,
        licensePlate: `ACTIVE-${String(i + 1).padStart(3, '0')}`,
        vehicleType: vehicle.vehicleType,
        checkInTime: checkInTime.toISOString(),
        spotId: this.getRandomSpotId(),
        status: 'active',
        estimatedCost: this.calculateEstimatedCost(minutesAgo, vehicle.vehicleType),
        notificationsSent: Math.floor(minutesAgo / 120), // Notification every 2 hours
        lastActivity: new Date(now.getTime() - Math.random() * 60 * 60 * 1000).toISOString()
      };

      this.seededData.sessions.push(session);
    }

    console.log(`Seeded ${this.seededData.sessions.filter(s => s.status === 'active').length} active sessions`);
  }

  /**
   * Seed payment history
   */
  async seedPaymentHistory() {
    const completedSessions = this.seededData.sessions.filter(s => s.status === 'completed' && s.paymentStatus === 'completed');

    for (const session of completedSessions) {
      const payment = {
        paymentId: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ticketId: session.ticketId,
        amount: session.totalCost,
        paymentMethod: session.paymentMethod,
        status: 'completed',
        processedAt: session.checkOutTime,
        gatewayTransactionId: `GTW-${Math.random().toString(36).substr(2, 12).toUpperCase()}`,
        
        // Payment method specific details
        ...(session.paymentMethod === 'credit_card' && {
          maskedCardNumber: `****-****-****-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
          cardType: ['Visa', 'Mastercard', 'American Express'][Math.floor(Math.random() * 3)],
          authorizationCode: Math.random().toString(36).substr(2, 8).toUpperCase()
        }),
        
        ...(session.paymentMethod === 'mobile_payment' && {
          provider: ['Apple Pay', 'Google Pay', 'Samsung Pay'][Math.floor(Math.random() * 3)],
          deviceId: `DEV-${Math.random().toString(36).substr(2, 8)}`
        })
      };

      this.seededData.payments.push(payment);
    }

    // Add some failed payments for testing
    for (let i = 0; i < 15; i++) {
      const failedPayment = {
        paymentId: `FAIL-${Date.now()}-${i}`,
        ticketId: `FAILED-SESSION-${i}`,
        amount: 10 + Math.random() * 50,
        paymentMethod: 'credit_card',
        status: 'failed',
        failureReason: ['insufficient_funds', 'expired_card', 'declined', 'network_error'][Math.floor(Math.random() * 4)],
        attempts: 1 + Math.floor(Math.random() * 3),
        processedAt: faker.date.recent({ days: 30 }).toISOString()
      };

      this.seededData.payments.push(failedPayment);
    }

    console.log(`Seeded ${this.seededData.payments.length} payment records`);
  }

  /**
   * Helper method to make API requests during seeding
   */
  async makeRequest(method, path, data) {
    const request = require('supertest');
    
    try {
      let response;
      
      switch (method.toLowerCase()) {
        case 'post':
          response = await request(this.app).post(path).send(data);
          break;
        case 'get':
          response = await request(this.app).get(path);
          break;
        case 'put':
          response = await request(this.app).put(path).send(data);
          break;
        case 'delete':
          response = await request(this.app).delete(path);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      if (response.status >= 400) {
        throw new Error(`API request failed: ${response.status} ${response.body?.error || response.text}`);
      }

      return response;
    } catch (error) {
      console.error(`Failed to make ${method} request to ${path}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate realistic license plate
   */
  generateLicensePlate() {
    const formats = [
      () => `${this.randomLetters(3)}-${this.randomNumbers(4)}`, // ABC-1234
      () => `${this.randomNumbers(3)}-${this.randomLetters(3)}`, // 123-ABC
      () => `${this.randomLetters(2)}${this.randomNumbers(4)}`, // AB1234
      () => `${this.randomNumbers(4)}${this.randomLetters(2)}`, // 1234AB
    ];

    const format = formats[Math.floor(Math.random() * formats.length)];
    return format();
  }

  /**
   * Generate VIN
   */
  generateVIN() {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'; // No I, O, Q
    let vin = '';
    for (let i = 0; i < 17; i++) {
      vin += chars[Math.floor(Math.random() * chars.length)];
    }
    return vin;
  }

  /**
   * Get random spot ID from available spots
   */
  getRandomSpotId() {
    const floors = [1, 2, 3];
    const bays = ['A', 'B'];
    const floor = floors[Math.floor(Math.random() * floors.length)];
    const bay = bays[Math.floor(Math.random() * bays.length)];
    
    // Floor 3 only has bay A
    if (floor === 3 && bay === 'B') {
      return this.getRandomSpotId();
    }
    
    const spotNumber = Math.floor(Math.random() * 25) + 1;
    return `F${floor}-${bay}-${String(spotNumber).padStart(3, '0')}`;
  }

  /**
   * Calculate estimated cost for active session
   */
  calculateEstimatedCost(minutesParked, vehicleType) {
    const hourlyRates = {
      standard: 5.00,
      compact: 4.00,
      oversized: 7.00,
      electric: 6.00
    };
    
    const hours = Math.ceil(minutesParked / 60);
    const baseCost = hours * hourlyRates[vehicleType];
    const taxes = baseCost * 0.08;
    
    return parseFloat((baseCost + taxes).toFixed(2));
  }

  /**
   * Generate random letters
   */
  randomLetters(count) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < count; i++) {
      result += letters[Math.floor(Math.random() * letters.length)];
    }
    return result;
  }

  /**
   * Generate random numbers
   */
  randomNumbers(count) {
    let result = '';
    for (let i = 0; i < count; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  /**
   * Clear specific data types
   */
  async clearUsers() {
    for (const user of this.seededData.users) {
      try {
        await this.makeRequest('DELETE', `/api/admin/users/${user.id}`);
      } catch (error) {
        // User may already be deleted
      }
    }
    this.seededData.users = [];
  }

  async clearVehicles() {
    this.seededData.vehicles = [];
  }

  async clearSessions() {
    this.seededData.sessions = [];
  }

  async clearPayments() {
    this.seededData.payments = [];
  }

  async clearSpots() {
    this.seededData.spots = [];
  }

  /**
   * Get seeded data summary
   */
  getSummary() {
    return {
      users: this.seededData.users.length,
      vehicles: this.seededData.vehicles.length,
      sessions: this.seededData.sessions.length,
      payments: this.seededData.payments.length,
      spots: this.seededData.spots.length,
      activeSessions: this.seededData.sessions.filter(s => s.status === 'active').length,
      completedSessions: this.seededData.sessions.filter(s => s.status === 'completed').length,
      successfulPayments: this.seededData.payments.filter(p => p.status === 'completed').length,
      failedPayments: this.seededData.payments.filter(p => p.status === 'failed').length
    };
  }
}

module.exports = TestDataSeeder;
/**
 * Enhanced Database Seed Script
 * 
 * This script generates comprehensive, realistic seed data for development, testing, and analytics.
 * It creates realistic parking garage data with proper temporal patterns, user relationships,
 * and business intelligence metrics.
 * 
 * Features:
 * - Realistic time-based patterns (hourly, daily, seasonal)
 * - Comprehensive user management and authentication data
 * - Advanced analytics and reporting data
 * - Security audit logs and session tracking
 * - Multi-garage scenarios with varying characteristics
 * - Historical data generation for trend analysis
 * 
 * Usage:
 *   npm run db:seed
 *   npm run db:seed -- --env=production --size=analytics
 *   npm run db:seed -- --size=extra-large --historical-months=12
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import crypto from 'crypto';

interface SeedOptions {
  env?: 'development' | 'staging' | 'production' | 'test';
  size?: 'small' | 'medium' | 'large' | 'extra-large' | 'analytics';
  clearExisting?: boolean;
  generateSessions?: boolean;
  generatePayments?: boolean;
  generateUsers?: boolean;
  generateHistorical?: boolean;
  historicalMonths?: number;
  generateAuditData?: boolean;
}

interface SeedStats {
  users: number;
  garages: number;
  floors: number;
  spots: number;
  vehicles: number;
  sessions: number;
  tickets: number;
  payments: number;
  auditLogs: number;
  userSessions: number;
  loginHistory: number;
  transactions: number;
}

class DatabaseSeeder {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Main seed function with enhanced data generation
   */
  async seed(options: SeedOptions = {}): Promise<SeedStats> {
    const defaultOptions: SeedOptions = {
      env: 'development',
      size: 'medium',
      clearExisting: false,
      generateSessions: true,
      generatePayments: true,
      generateUsers: true,
      generateHistorical: false,
      historicalMonths: 6,
      generateAuditData: true,
      ...options
    };

    console.log('🌱 Starting enhanced database seed...');
    console.log(`Environment: ${defaultOptions.env}`);
    console.log(`Size: ${defaultOptions.size}`);
    if (defaultOptions.generateHistorical) {
      console.log(`Historical data: ${defaultOptions.historicalMonths} months`);
    }

    const stats: SeedStats = {
      users: 0,
      garages: 0,
      floors: 0,
      spots: 0,
      vehicles: 0,
      sessions: 0,
      tickets: 0,
      payments: 0,
      auditLogs: 0,
      userSessions: 0,
      loginHistory: 0,
      transactions: 0
    };

    try {
      // Clear existing data if requested
      if (defaultOptions.clearExisting) {
        await this.clearDatabase();
      }

      // Get size parameters
      const sizeConfig = this.getSizeConfig(defaultOptions.size!);
      
      // Seed users first if requested
      let users: any[] = [];
      if (defaultOptions.generateUsers) {
        users = await this.seedUsers(sizeConfig.users);
        stats.users = users.length;
        console.log(`✅ Created ${stats.users} users`);
        
        // Generate user devices first
        const userDevices = await this.seedUserDevices(users, Math.floor(sizeConfig.userSessions * 0.7));
        console.log(`✅ Created ${userDevices.length} user devices`);
        
        // Generate user sessions and audit data
        if (defaultOptions.generateAuditData) {
          const userSessions = await this.seedUserSessions(users, userDevices, sizeConfig.userSessions);
          stats.userSessions = userSessions.length;
          console.log(`✅ Created ${stats.userSessions} user sessions`);
          
          const loginHistory = await this.seedLoginHistory(users, userDevices, sizeConfig.loginHistory);
          stats.loginHistory = loginHistory.length;
          console.log(`✅ Created ${stats.loginHistory} login history records`);
          
          const auditLogs = await this.seedAuditLogs(users, sizeConfig.auditLogs);
          stats.auditLogs = auditLogs.length;
          console.log(`✅ Created ${stats.auditLogs} audit log entries`);
        }
      }

      // Seed garages and floors
      const garages = await this.seedGarages(sizeConfig.garages);
      stats.garages = garages.length;
      console.log(`✅ Created ${stats.garages} garages`);

      const floors = await this.seedFloors(garages, sizeConfig.floorsPerGarage);
      stats.floors = floors.length;
      console.log(`✅ Created ${stats.floors} floors`);

      // Seed spots
      const spots = await this.seedSpots(garages, floors, sizeConfig.spotsPerFloor);
      stats.spots = spots.length;
      console.log(`✅ Created ${stats.spots} parking spots`);

      // Seed vehicles with user relationships
      const vehicles = await this.seedVehicles(sizeConfig.vehicles, users);
      stats.vehicles = vehicles.length;
      console.log(`✅ Created ${stats.vehicles} vehicles`);

      // Seed sessions with realistic patterns
      if (defaultOptions.generateSessions) {
        const sessions = await this.seedParkingSessions(
          garages,
          spots,
          vehicles,
          sizeConfig.sessions,
          defaultOptions.generateHistorical ? sizeConfig.historicalDays : 30
        );
        stats.sessions = sessions.length;
        console.log(`✅ Created ${stats.sessions} parking sessions`);

        // Seed tickets and payments
        const tickets = await this.seedTickets(garages, vehicles, sessions, sizeConfig.tickets);
        stats.tickets = tickets.length;
        console.log(`✅ Created ${stats.tickets} tickets`);

        if (defaultOptions.generatePayments) {
          const payments = await this.seedPayments(garages, vehicles, sessions, tickets, sizeConfig.payments);
          stats.payments = payments.length;
          console.log(`✅ Created ${stats.payments} payments`);
        }
        
        // Seed transactions
        const transactions = await this.seedTransactions(garages, tickets, sizeConfig.transactions);
        stats.transactions = transactions.length;
        console.log(`✅ Created ${stats.transactions} transactions`);
      }

      console.log('\n🎉 Database seeding completed!');
      this.printSeedSummary(stats);

      return stats;

    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Get size configuration with enhanced options
   */
  private getSizeConfig(size: string) {
    const configs = {
      small: {
        garages: 1,
        floorsPerGarage: 3,
        spotsPerFloor: 50,
        vehicles: 30,
        sessions: 100,
        tickets: 8,
        payments: 108,
        users: 25,
        historicalDays: 30,
        auditLogs: 50,
        userSessions: 40,
        loginHistory: 100,
        transactions: 120
      },
      medium: {
        garages: 3,
        floorsPerGarage: 5,
        spotsPerFloor: 100,
        vehicles: 500,
        sessions: 2000,
        tickets: 50,
        payments: 2050,
        users: 200,
        historicalDays: 90,
        auditLogs: 500,
        userSessions: 300,
        loginHistory: 1000,
        transactions: 2100
      },
      large: {
        garages: 5,
        floorsPerGarage: 8,
        spotsPerFloor: 150,
        vehicles: 3000,
        sessions: 15000,
        tickets: 200,
        payments: 15200,
        users: 1500,
        historicalDays: 180,
        auditLogs: 3000,
        userSessions: 2000,
        loginHistory: 8000,
        transactions: 15400
      },
      'extra-large': {
        garages: 10,
        floorsPerGarage: 12,
        spotsPerFloor: 200,
        vehicles: 15000,
        sessions: 100000,
        tickets: 1500,
        payments: 101500,
        users: 8000,
        historicalDays: 365,
        auditLogs: 25000,
        userSessions: 12000,
        loginHistory: 50000,
        transactions: 103000
      },
      analytics: {
        garages: 15,
        floorsPerGarage: 15,
        spotsPerFloor: 250,
        vehicles: 50000,
        sessions: 500000,
        tickets: 8000,
        payments: 508000,
        users: 25000,
        historicalDays: 730, // 2 years
        auditLogs: 100000,
        userSessions: 50000,
        loginHistory: 200000,
        transactions: 516000
      }
    };

    return configs[size as keyof typeof configs] || configs.medium;
  }

  /**
   * Clear existing database
   */
  private async clearDatabase(): Promise<void> {
    console.log('🗑️ Clearing existing data...');
    
    // Clear in dependency order
    await this.prisma.transaction.deleteMany();
    await this.prisma.payment.deleteMany();
    await this.prisma.ticket.deleteMany();
    await this.prisma.parkingSession.deleteMany();
    await this.prisma.vehicle.deleteMany();
    await this.prisma.parkingSpot.deleteMany();
    await this.prisma.floor.deleteMany();
    await this.prisma.garage.deleteMany();
    
    // Clear user-related data
    await this.prisma.securityAuditLog.deleteMany();
    await this.prisma.loginHistory.deleteMany();
    await this.prisma.userSession.deleteMany();
    await this.prisma.userDevice.deleteMany();
    await this.prisma.user.deleteMany();
    
    // Clear configuration tables if needed
    await this.prisma.emailTemplate.deleteMany();
    await this.prisma.securitySettings.deleteMany();
    
    console.log('✅ Database cleared');
  }

  /**
   * Seed users with authentication data
   */
  private async seedUsers(count: number): Promise<any[]> {
    const users = [];
    const roles = ['USER', 'ADMIN', 'MANAGER', 'OPERATOR'];
    const languages = ['en', 'es', 'fr', 'de', 'zh'];
    const timezones = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'];
    
    for (let i = 0; i < count; i++) {
      const firstName = this.generateRandomFirstName();
      const lastName = this.generateRandomLastName();
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 0 ? i : ''}@example.com`;
      
      // Determine role with realistic distribution
      let role = 'USER';
      if (i === 0) role = 'ADMIN'; // First user is admin
      else if (i < 3) role = 'MANAGER';
      else if (i < 8) role = 'OPERATOR';
      
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: await hash('password123', 10), // Default password for testing
          firstName,
          lastName,
          role,
          isActive: Math.random() > 0.05, // 95% active
          isEmailVerified: Math.random() > 0.1, // 90% verified
          emailVerificationToken: Math.random() > 0.1 ? null : crypto.randomBytes(32).toString('hex'),
          lastPasswordChange: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
          preferredLanguage: languages[Math.floor(Math.random() * languages.length)],
          timezone: timezones[Math.floor(Math.random() * timezones.length)],
          phoneNumber: Math.random() > 0.3 ? this.generateRandomPhone() : null,
          isPhoneVerified: Math.random() > 0.2,
          isTwoFactorEnabled: Math.random() > 0.8, // 20% use 2FA
          lastLoginAt: Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null
        }
      });
      
      users.push(user);
    }
    
    return users;
  }
  
  /**
   * Seed user devices
   */
  private async seedUserDevices(users: any[], count: number): Promise<any[]> {
    const devices = [];
    const deviceTypes = ['DESKTOP', 'MOBILE', 'TABLET'];
    const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Opera'];
    const operatingSystems = ['Windows 10', 'macOS', 'iOS', 'Android', 'Linux'];
    
    for (let i = 0; i < count; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)] || 'DESKTOP';
      
      const device = await this.prisma.userDevice.create({
        data: {
          userId: user.id,
          fingerprint: crypto.createHash('sha256').update(`${user.id}-${i}-${deviceType}`).digest('hex'),
          name: `${user.firstName}'s ${deviceType}`,
          deviceType,
          browser: browsers[Math.floor(Math.random() * browsers.length)],
          operatingSystem: operatingSystems[Math.floor(Math.random() * operatingSystems.length)],
          ipAddress: this.generateRandomIP(),
          geoLocation: this.generateRandomLocation(),
          isTrusted: Math.random() > 0.3, // 70% trusted
          lastSeenAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          firstSeenAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        }
      });
      
      devices.push(device);
    }
    
    return devices;
  }
  
  /**
   * Seed user sessions
   */
  private async seedUserSessions(users: any[], devices: any[], count: number): Promise<any[]> {
    const sessions = [];
    const sessionTypes = ['WEB', 'MOBILE', 'API'];
    
    for (let i = 0; i < count; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const sessionType = sessionTypes[Math.floor(Math.random() * sessionTypes.length)];
      const device = devices.length > 0 ? devices[Math.floor(Math.random() * devices.length)] : null;
      
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(createdAt.getTime() + (sessionType === 'WEB' ? 24 : 7 * 24) * 60 * 60 * 1000);
      
      const session = await this.prisma.userSession.create({
        data: {
          userId: user.id,
          token: crypto.randomBytes(32).toString('hex'),
          refreshToken: Math.random() > 0.3 ? crypto.randomBytes(32).toString('hex') : null,
          expiresAt,
          refreshExpiresAt: new Date(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000),
          isRevoked: Math.random() > 0.85, // 15% revoked
          deviceInfo: device ? `${device.browser}/${device.operatingSystem}` : 'Unknown Device',
          deviceFingerprint: device?.fingerprint || crypto.createHash('sha256').update(`${user.id}-${i}-${sessionType}`).digest('hex'),
          ipAddress: device?.ipAddress || this.generateRandomIP(),
          geoLocation: device?.geoLocation || this.generateRandomLocation(),
          lastActivityAt: new Date(createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime())),
          sessionType,
          isSecure: Math.random() > 0.1, // 90% secure
          createdAt
        }
      });
      
      sessions.push(session);
    }
    
    return sessions;
  }
  
  /**
   * Seed login history
   */
  private async seedLoginHistory(users: any[], devices: any[], count: number): Promise<any[]> {
    const history = [];
    const attemptTypes = ['SUCCESS', 'FAILED_PASSWORD', 'FAILED_2FA', 'BLOCKED'];
    const failureReasons = ['INVALID_PASSWORD', 'ACCOUNT_LOCKED', '2FA_REQUIRED', 'SUSPICIOUS_ACTIVITY'];
    
    for (let i = 0; i < count; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const attemptType = attemptTypes[Math.floor(Math.random() * attemptTypes.length)] || 'SUCCESS';
      
      const record = await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          attemptType,
          ipAddress: this.generateRandomIP(),
          geoLocation: this.generateRandomLocation(),
          userAgent: this.generateRandomUserAgent(),
          failureReason: attemptType !== 'SUCCESS' ? failureReasons[Math.floor(Math.random() * failureReasons.length)] : null,
          isSuspicious: Math.random() > 0.95, // 5% suspicious
          riskScore: attemptType === 'SUCCESS' ? Math.random() * 0.3 : 0.3 + Math.random() * 0.7,
          createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000)
        }
      });
      
      history.push(record);
    }
    
    return history;
  }
  
  /**
   * Seed security audit logs
   */
  private async seedAuditLogs(users: any[], count: number): Promise<any[]> {
    const logs = [];
    const actions = ['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', '2FA_ENABLE', '2FA_DISABLE', 'PROFILE_UPDATE', 'VEHICLE_ADD', 'PAYMENT_MADE'];
    const categories = ['AUTH', 'ACCOUNT', 'SECURITY', 'DATA_ACCESS', 'PARKING', 'PAYMENT'];
    const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    
    for (let i = 0; i < count; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const action = actions[Math.floor(Math.random() * actions.length)] || 'LOGIN';
      const category = categories[Math.floor(Math.random() * categories.length)] || 'AUTH';
      const severity = severities[Math.floor(Math.random() * severities.length)] || 'LOW';
      
      const log = await this.prisma.securityAuditLog.create({
        data: {
          userId: user.id,
          action,
          category,
          severity,
          description: `User ${action?.toLowerCase().replace('_', ' ') || 'unknown action'} - ${category}`,
          ipAddress: this.generateRandomIP(),
          userAgent: this.generateRandomUserAgent(),
          riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
          isAnomaly: Math.random() > 0.92, // 8% anomalies
          metadata: JSON.stringify({
            sessionId: crypto.randomBytes(16).toString('hex'),
            timestamp: new Date().toISOString(),
            additionalInfo: `Generated audit log for ${action}`
          }),
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        }
      });
      
      logs.push(log);
    }
    
    return logs;
  }

  /**
   * Seed garages
   */
  private async seedGarages(count: number): Promise<any[]> {
    const garageNames = [
      'Downtown Central Parking',
      'Airport Long-term Garage',
      'Shopping Mall Parking',
      'Medical Center Garage',
      'University Student Parking'
    ];

    const garages = [];
    for (let i = 0; i < count; i++) {
      const garage = await this.prisma.garage.create({
        data: {
          name: garageNames[i] || `Parking Garage ${i + 1}`,
          description: `Multi-level parking facility with premium amenities`,
          totalFloors: 3 + (i * 2), // Varying floor counts
          totalSpots: 300 + (i * 100),
          isActive: true,
          operatingHours: JSON.stringify({
            open: '06:00',
            close: '23:00',
            timezone: 'UTC'
          })
        }
      });
      garages.push(garage);
    }

    return garages;
  }

  /**
   * Seed floors
   */
  private async seedFloors(garages: any[], floorsPerGarage: number): Promise<any[]> {
    const floors = [];
    
    for (const garage of garages) {
      for (let floorNum = 1; floorNum <= floorsPerGarage; floorNum++) {
        const floor = await this.prisma.floor.create({
          data: {
            garageId: garage.id,
            floorNumber: floorNum,
            description: floorNum === 1 ? 'Ground Floor' : `Level ${floorNum}`,
            totalSpots: Math.floor(100 + Math.random() * 150), // 100-250 spots per floor
            isActive: Math.random() > 0.02 // 98% active
          }
        });
        floors.push(floor);
      }
    }

    return floors;
  }

  /**
   * Seed parking spots
   */
  private async seedSpots(garages: any[], floors: any[], spotsPerFloor: number): Promise<any[]> {
    const spotTypes = ['STANDARD', 'COMPACT', 'OVERSIZED', 'ELECTRIC', 'HANDICAP', 'MOTORCYCLE'];
    const spotStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'OUT_OF_ORDER'];

    const spots = [];
    
    for (const floor of floors) {
      for (let spotNum = 1; spotNum <= spotsPerFloor; spotNum++) {
        const section = String.fromCharCode(65 + Math.floor((spotNum - 1) / 50)); // A, B, C, etc.
        const spotInSection = ((spotNum - 1) % 50) + 1;
        
        // Determine spot type with realistic distribution
        let spotType = 'STANDARD';
        const rand = Math.random();
        if (rand < 0.05) spotType = 'HANDICAP'; // 5%
        else if (rand < 0.15) spotType = 'ELECTRIC'; // 10%
        else if (rand < 0.35) spotType = 'COMPACT'; // 20%
        else if (rand < 0.40) spotType = 'OVERSIZED'; // 5%
        else if (rand < 0.43) spotType = 'MOTORCYCLE'; // 3%
        // else STANDARD (57%)
        
        // Determine status with realistic distribution
        let status = 'AVAILABLE';
        const statusRand = Math.random();
        if (statusRand < 0.65) status = 'AVAILABLE'; // 65%
        else if (statusRand < 0.90) status = 'OCCUPIED'; // 25%
        else if (statusRand < 0.95) status = 'RESERVED'; // 5%
        else if (statusRand < 0.98) status = 'MAINTENANCE'; // 3%
        else status = 'OUT_OF_ORDER'; // 2%

        const spot = await this.prisma.parkingSpot.create({
          data: {
            spotNumber: `${floor.id.slice(-4)}-${section}${spotInSection.toString().padStart(2, '0')}`,
            floorId: floor.id,
            level: floor.floorNumber,
            section,
            spotType: spotType as any,
            status: status as any,
            isActive: Math.random() > 0.02, // 98% active
            width: spotType === 'COMPACT' ? 2.2 + Math.random() * 0.3 : 
                   spotType === 'OVERSIZED' ? 3.0 + Math.random() * 0.5 : 
                   2.5 + Math.random() * 0.3,
            length: spotType === 'MOTORCYCLE' ? 3.0 + Math.random() * 0.5 :
                    spotType === 'OVERSIZED' ? 6.0 + Math.random() * 1.0 :
                    5.0 + Math.random() * 0.5,
            height: spotType === 'OVERSIZED' ? 2.8 + Math.random() * 0.5 : 2.1 + Math.random() * 0.3
          }
        });
        spots.push(spot);
      }
    }

    return spots;
  }

  /**
   * Seed vehicles with user relationships
   */
  private async seedVehicles(count: number, users: any[] = []): Promise<any[]> {
    const makes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes', 'Audi', 'Nissan', 'Hyundai', 'Volkswagen', 'Tesla', 'Lexus', 'Acura', 'Infiniti', 'Mazda'];
    const modelsByMake = {
      'Toyota': ['Camry', 'Corolla', 'Prius', 'RAV4', 'Highlander'],
      'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Fit'],
      'Ford': ['F-150', 'Explorer', 'Escape', 'Focus', 'Mustang'],
      'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Cruze', 'Tahoe'],
      'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'i3'],
      'Mercedes': ['C-Class', 'E-Class', 'GLE', 'A-Class', 'S-Class'],
      'Audi': ['A4', 'Q5', 'A6', 'Q7', 'A3'],
      'Nissan': ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Leaf'],
      'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'],
      'Lexus': ['ES', 'RX', 'NX', 'GX', 'LS']
    };
    const colors = ['Black', 'White', 'Silver', 'Blue', 'Red', 'Gray', 'Green', 'Brown', 'Yellow', 'Orange', 'Pearl White', 'Metallic Blue', 'Deep Red'];
    const vehicleTypes = ['STANDARD', 'COMPACT', 'OVERSIZED', 'MOTORCYCLE', 'ELECTRIC'];
    const vehicleStatuses = ['PARKED', 'DEPARTED', 'ACTIVE', 'INACTIVE'];
    const rateTypes = ['HOURLY', 'DAILY', 'MONTHLY', 'SPECIAL'];

    const vehicles = [];
    
    for (let i = 0; i < count; i++) {
      const licensePlate = this.generateLicensePlate();
      const make = makes[Math.floor(Math.random() * makes.length)];
      const models = modelsByMake[make as keyof typeof modelsByMake] || ['Unknown Model'];
      const model = models[Math.floor(Math.random() * models.length)];
      
      // Assign user ownership for 60% of vehicles
      const hasOwner = users.length > 0 && Math.random() > 0.4;
      const owner = hasOwner ? users[Math.floor(Math.random() * users.length)] : null;
      
      // Determine vehicle type based on make/model
      let vehicleType = 'STANDARD';
      if (make === 'Tesla' || model?.includes('Prius') || model?.includes('Leaf')) vehicleType = 'ELECTRIC';
      else if (model?.includes('Civic') || model?.includes('Corolla') || model?.includes('Fit')) vehicleType = 'COMPACT';
      else if (model?.includes('F-150') || model?.includes('Silverado') || model?.includes('Tahoe')) vehicleType = 'OVERSIZED';
      else if (Math.random() < 0.02) vehicleType = 'MOTORCYCLE';
      
      const vehicle = await this.prisma.vehicle.create({
        data: {
          licensePlate,
          vehicleType: vehicleType as any,
          rateType: rateTypes[Math.floor(Math.random() * rateTypes.length)] as any,
          status: vehicleStatuses[Math.floor(Math.random() * vehicleStatuses.length)] as any,
          ownerId: owner?.id || null,
          ownerName: owner ? `${owner.firstName} ${owner.lastName}` : this.generateRandomName(),
          ownerEmail: owner?.email || this.generateRandomEmail(),
          ownerPhone: owner?.phoneNumber || this.generateRandomPhone(),
          make,
          model,
          color: colors[Math.floor(Math.random() * colors.length)],
          year: 2010 + Math.floor(Math.random() * 14), // 2010-2023
          checkInTime: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : new Date(),
          checkOutTime: Math.random() > 0.7 ? new Date(Date.now() + Math.random() * 4 * 60 * 60 * 1000) : null,
          isPaid: Math.random() > 0.2, // 80% paid
          hourlyRate: 2 + Math.random() * 8, // $2-10 per hour
          totalAmount: Math.random() * 50, // $0-50
          amountPaid: Math.random() > 0.3 ? Math.random() * 45 : 0,
          notes: Math.random() > 0.8 ? 'Generated test vehicle' : null
        }
      });
      vehicles.push(vehicle);
    }

    return vehicles;
  }

  /**
   * Seed parking sessions with realistic patterns
   */
  private async seedParkingSessions(
    garages: any[],
    spots: any[],
    vehicles: any[],
    count: number,
    historicalDays: number = 30
  ): Promise<any[]> {
    const sessions = [];
    const statuses = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
    const paymentMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAY', 'APP_PAYMENT'];
    
    // Create a mix of occupied spots across all categories
    const availableSpots = spots.filter(s => s.status === 'AVAILABLE');
    const occupiedSpotIds = new Set();
    
    // Ensure we have occupied spots across all spot types
    const spotsByType = {
      'STANDARD': spots.filter(s => s.spotType === 'STANDARD'),
      'COMPACT': spots.filter(s => s.spotType === 'COMPACT'),
      'OVERSIZED': spots.filter(s => s.spotType === 'OVERSIZED'),
      'ELECTRIC': spots.filter(s => s.spotType === 'ELECTRIC'),
      'HANDICAP': spots.filter(s => s.spotType === 'HANDICAP'),
      'MOTORCYCLE': spots.filter(s => s.spotType === 'MOTORCYCLE')
    };

    for (let i = 0; i < count; i++) {
      // Realistic time distribution - more activity during business hours and weekdays
      const daysBack = Math.floor(Math.random() * historicalDays);
      const baseDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      
      // Adjust probability based on day of week (more weekday parking)
      const dayOfWeek = baseDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Skip some weekend sessions to make it more realistic
      if (isWeekend && Math.random() < 0.4) continue;
      
      // Business hours bias (7 AM to 7 PM peak)
      const hour = Math.random() < 0.8 ? 
        7 + Math.floor(Math.random() * 12) : // 80% during business hours
        Math.floor(Math.random() * 24); // 20% other times
      
      const startTime = new Date(baseDate);
      startTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      
      // Select vehicle and match with appropriate spot type
      const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      let eligibleSpots = [];
      
      // Match vehicle type to spot type for more realistic assignments
      if (vehicle.vehicleType === 'COMPACT') {
        eligibleSpots = [...spotsByType['COMPACT'], ...spotsByType['STANDARD']];
      } else if (vehicle.vehicleType === 'OVERSIZED') {
        eligibleSpots = spotsByType['OVERSIZED'];
      } else if (vehicle.vehicleType === 'ELECTRIC') {
        eligibleSpots = [...spotsByType['ELECTRIC'], ...spotsByType['STANDARD']];
      } else if (vehicle.vehicleType === 'MOTORCYCLE') {
        eligibleSpots = [...spotsByType['MOTORCYCLE'], ...spotsByType['COMPACT'], ...spotsByType['STANDARD']];
      } else {
        eligibleSpots = [...spotsByType['STANDARD'], ...spotsByType['OVERSIZED']];
      }
      
      // Filter out already occupied spots for active sessions
      const availableEligibleSpots = eligibleSpots.filter(s => !occupiedSpotIds.has(s.id));
      if (availableEligibleSpots.length === 0) continue;
      
      const spot = availableEligibleSpots[Math.floor(Math.random() * availableEligibleSpots.length)];
      
      // Determine session status and duration based on realistic patterns
      let status = 'COMPLETED';
      const statusRand = Math.random();
      
      if (daysBack === 0 && statusRand < 0.25) status = 'ACTIVE'; // 25% of today's sessions are active
      else if (statusRand < 0.85) status = 'COMPLETED'; // 85% completed
      else if (statusRand < 0.95) status = 'EXPIRED'; // 10% expired
      else status = 'CANCELLED'; // 5% cancelled
      
      // Duration based on realistic patterns
      let durationMinutes;
      if (vehicle.rateType === 'MONTHLY') {
        durationMinutes = null; // Monthly passes don't have specific duration
      } else if (vehicle.rateType === 'DAILY') {
        durationMinutes = 480 + Math.floor(Math.random() * 240); // 8-12 hours
      } else {
        // Hourly parking - realistic distribution
        const durationRand = Math.random();
        if (durationRand < 0.3) durationMinutes = 30 + Math.floor(Math.random() * 90); // 30min-2hr (short visits)
        else if (durationRand < 0.7) durationMinutes = 120 + Math.floor(Math.random() * 240); // 2-6hr (business visits)
        else durationMinutes = 360 + Math.floor(Math.random() * 300); // 6-11hr (full day)
      }
      
      let endTime = null;
      if (status !== 'ACTIVE' && durationMinutes) {
        endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
      }
      
      // Calculate costs
      const garageForSpot = garages.find(g => g.floors?.some((f: any) => f.id === spot.floorId)) || garages[0];
      const hourlyRate = this.calculateHourlyRate(spot.spotType, garageForSpot.name);
      let totalAmount = 0;
      
      if (vehicle.rateType === 'MONTHLY') {
        totalAmount = 150 + Math.random() * 100; // $150-250 monthly
      } else if (vehicle.rateType === 'DAILY') {
        totalAmount = 15 + Math.random() * 25; // $15-40 daily
      } else if (durationMinutes) {
        totalAmount = Math.max(2, (durationMinutes / 60) * hourlyRate); // Minimum $2
      }
      
      const amountPaid = status === 'COMPLETED' ? totalAmount : (Math.random() < 0.8 ? totalAmount : totalAmount * Math.random());
      
      const session = await this.prisma.parkingSession.create({
        data: {
          vehicleId: vehicle.id,
          spotId: spot.id,
          startTime,
          endTime,
          duration: durationMinutes,
          hourlyRate,
          totalAmount,
          amountPaid,
          isPaid: status === 'COMPLETED' && amountPaid >= totalAmount,
          paymentMethod: amountPaid > 0 ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)] : null,
          paymentTime: amountPaid > 0 ? new Date(startTime.getTime() + Math.random() * (durationMinutes || 60) * 60 * 1000) : null,
          status: status as any,
          notes: Math.random() > 0.9 ? this.generateSessionNotes() : null
        }
      });
      
      // Mark spot as occupied for active sessions
      if (status === 'ACTIVE') {
        occupiedSpotIds.add(spot.id);
        // Update spot status to occupied
        await this.prisma.parkingSpot.update({
          where: { id: spot.id },
          data: { status: 'OCCUPIED' }
        });
        
        // Update vehicle current spot
        await this.prisma.vehicle.update({
          where: { id: vehicle.id },
          data: { 
            currentSpotId: spot.id,
            status: 'PARKED',
            checkInTime: startTime
          }
        });
      }
      
      sessions.push(session);
    }

    return sessions;
  }

  /**
   * Seed tickets
   */
  private async seedTickets(
    garages: any[],
    vehicles: any[],
    sessions: any[],
    count: number
  ): Promise<any[]> {
    const ticketTypes = ['OVERSTAY', 'NO_PAYMENT', 'EXPIRED_METER', 'INVALID_SPOT'];
    const ticketStatuses = ['ISSUED', 'PAID', 'DISPUTED', 'OVERDUE'];

    const tickets = [];
    
    for (let i = 0; i < count; i++) {
      const garage = garages[Math.floor(Math.random() * garages.length)];
      const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      const session = sessions[Math.floor(Math.random() * sessions.length)];
      
      const ticketType = ticketTypes[Math.floor(Math.random() * ticketTypes.length)];
      const status = ticketStatuses[Math.floor(Math.random() * ticketStatuses.length)];
      
      const fineAmount = ticketType === 'HANDICAP_VIOLATION' ? 200 : 25 + Math.random() * 75;
      const violationTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

      const ticket = await this.prisma.ticket.create({
        data: {
          garageId: garage.id,
          vehiclePlate: vehicle.licensePlate,
          spotNumber: Math.random() > 0.5 ? `${Math.floor(Math.random() * 5) + 1}A${String(Math.floor(Math.random() * 50) + 1).padStart(2, '0')}` : null,
          ticketNumber: `TK${Date.now()}${i.toString().padStart(3, '0')}`,
          entryTime: violationTime,
          exitTime: Math.random() > 0.3 ? new Date(violationTime.getTime() + Math.random() * 8 * 60 * 60 * 1000) : null,
          duration: Math.random() > 0.3 ? Math.floor(Math.random() * 480) + 30 : null,
          baseAmount: 5 + Math.random() * 20,
          additionalFees: Math.random() > 0.7 ? Math.random() * 10 : 0,
          totalAmount: 5 + Math.random() * 30,
          paidAmount: status === 'PAID' ? 5 + Math.random() * 30 : 0,
          status: Math.random() > 0.8 ? 'LOST' : status === 'PAID' ? 'PAID' : 'ACTIVE',
          paymentStatus: status === 'PAID' ? 'PAID' : 'UNPAID',
          isLostTicket: Math.random() > 0.95,
          qrCode: `QR${crypto.randomBytes(8).toString('hex')}`,
          notes: Math.random() > 0.8 ? `${ticketType?.toLowerCase().replace('_', ' ') || 'parking'} ticket` : null
        }
      });
      tickets.push(ticket);
    }

    return tickets;
  }

  /**
   * Calculate hourly rate based on spot type and garage
   */
  private calculateHourlyRate(spotType: string, garageName: string): number {
    let baseRate = 5.0; // Default hourly rate
    
    // Adjust based on spot type
    switch (spotType) {
      case 'ELECTRIC':
        baseRate = 8.0;
        break;
      case 'HANDICAP':
        baseRate = 3.0; // Discounted
        break;
      case 'OVERSIZED':
        baseRate = 7.0;
        break;
      case 'COMPACT':
        baseRate = 4.0;
        break;
      case 'MOTORCYCLE':
        baseRate = 3.0;
        break;
    }
    
    // Adjust based on garage (premium locations cost more)
    if (garageName.includes('Airport') || garageName.includes('Downtown')) {
      baseRate *= 1.5;
    } else if (garageName.includes('Medical') || garageName.includes('University')) {
      baseRate *= 1.2;
    }
    
    return Math.round(baseRate * 100) / 100; // Round to 2 decimal places
  }
  
  /**
   * Generate session notes
   */
  private generateSessionNotes(): string {
    const notes = [
      'Visitor parking',
      'Monthly pass holder',
      'Reserved for meeting',
      'Long-term parking',
      'Employee parking',
      'Guest parking',
      'VIP parking',
      'Temporary permit',
      'Conference attendee',
      'Medical appointment'
    ];
    return notes[Math.floor(Math.random() * notes.length)] || 'Generated session';
  }
  
  /**
   * Seed transactions
   */
  private async seedTransactions(garages: any[], tickets: any[], count: number): Promise<any[]> {
    const transactions = [];
    const transactionTypes = ['PARKING_FEE', 'PENALTY', 'REFUND', 'MONTHLY_PASS', 'LOST_TICKET'];
    const statuses = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'];
    const paymentMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAY', 'APP_PAYMENT'];
    
    for (let i = 0; i < count; i++) {
      const garage = garages[Math.floor(Math.random() * garages.length)];
      const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)] || 'PARKING_FEE';
      const status = statuses[Math.floor(Math.random() * statuses.length)] || 'COMPLETED';
      
      let amount = 0;
      let ticketId = null;
      
      if (transactionType === 'PENALTY' && tickets.length > 0) {
        const ticket = tickets[Math.floor(Math.random() * tickets.length)];
        ticketId = ticket.id;
        amount = ticket.fineAmount || (25 + Math.random() * 75);
      } else if (transactionType === 'REFUND') {
        amount = -(5 + Math.random() * 50); // Negative for refund
      } else if (transactionType === 'MONTHLY_PASS') {
        amount = 150 + Math.random() * 100;
      } else if (transactionType === 'LOST_TICKET') {
        amount = 25 + Math.random() * 25;
      } else {
        amount = 2 + Math.random() * 48; // Parking fees
      }
      
      const transaction = await this.prisma.transaction.create({
        data: {
          garageId: garage.id,
          ticketId,
          transactionType,
          amount,
          currency: 'USD',
          status,
          paymentMethod: status === 'COMPLETED' ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)] : null,
          paymentReference: status === 'COMPLETED' ? `txn_${crypto.randomBytes(8).toString('hex')}` : null,
          description: `${transactionType?.replace('_', ' ').toLowerCase() || 'unknown'} transaction`,
          metadata: JSON.stringify({
            generated: true,
            timestamp: new Date().toISOString(),
            method: 'seed_script'
          }),
          processedAt: status === 'COMPLETED' ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        }
      });
      
      transactions.push(transaction);
    }
    
    return transactions;
  }

  /**
   * Seed payments
   */
  private async seedPayments(
    garages: any[],
    vehicles: any[],
    sessions: any[],
    tickets: any[],
    count: number
  ): Promise<any[]> {
    const paymentTypes = ['PARKING', 'PENALTY'];
    const paymentMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAY', 'APP_PAYMENT'];
    const paymentStatuses = ['COMPLETED', 'PENDING', 'FAILED'];

    const payments = [];
    
    for (let i = 0; i < count; i++) {
      const garage = garages[Math.floor(Math.random() * garages.length)];
      const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      
      const paymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const status = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
      
      let sessionId = null;
      let ticketId = null;
      let amount = 0;
      
      if (paymentType === 'PARKING') {
        const session = sessions[Math.floor(Math.random() * sessions.length)];
        sessionId = session.id;
        amount = session.totalAmount || 10 + Math.random() * 20;
      } else {
        const ticket = tickets[Math.floor(Math.random() * tickets.length)];
        amount = ticket.totalAmount || 25 + Math.random() * 75;
      }

      const paymentDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

      const payment = await this.prisma.payment.create({
        data: {
          vehicleId: vehicle.id,
          sessionId,
          paymentNumber: `PAY${Date.now()}${i.toString().padStart(4, '0')}`,
          paymentType: paymentType as any,
          paymentMethod: method as any,
          status: status as any,
          amount,
          currency: 'USD',
          paymentDate,
          processedAt: status === 'COMPLETED' ? paymentDate : null,
          transactionId: status === 'COMPLETED' ? `txn_${Math.random().toString(36).substr(2, 10)}` : null
        }
      });
      payments.push(payment);
    }

    return payments;
  }

  /**
   * Generate random license plate
   */
  private generateLicensePlate(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    // Format: ABC1234
    return [
      letters[Math.floor(Math.random() * letters.length)],
      letters[Math.floor(Math.random() * letters.length)],
      letters[Math.floor(Math.random() * letters.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      numbers[Math.floor(Math.random() * numbers.length)]
    ].join('');
  }

  /**
   * Generate random first name
   */
  private generateRandomFirstName(): string {
    const names = [
      'John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Amanda',
      'Michael', 'Jessica', 'William', 'Ashley', 'Richard', 'Brittany', 'Joseph', 'Samantha',
      'Thomas', 'Elizabeth', 'Christopher', 'Taylor', 'Daniel', 'Hannah', 'Paul', 'Alexis',
      'Mark', 'Rachel', 'Donald', 'Lauren', 'Steven', 'Megan', 'Kenneth', 'Kayla', 'Joshua',
      'Jennifer', 'Kevin', 'Nicole', 'Brian', 'Stephanie', 'George', 'Maria', 'Timothy',
      'Katherine', 'Ronald', 'Emma', 'Jason', 'Madison', 'Edward', 'Olivia', 'Jeffrey',
      'Sophia', 'Ryan', 'Abigail', 'Jacob', 'Isabella', 'Gary', 'Grace', 'Nicholas', 'Natalie'
    ];
    return names[Math.floor(Math.random() * names.length)] || 'John';
  }
  
  /**
   * Generate random last name
   */
  private generateRandomLastName(): string {
    const names = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
      'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
      'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
      'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
      'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
      'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
      'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
      'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy'
    ];
    return names[Math.floor(Math.random() * names.length)] || 'Smith';
  }
  
  /**
   * Generate random name
   */
  private generateRandomName(): string {
    return `${this.generateRandomFirstName()} ${this.generateRandomLastName()}`;
  }
  
  /**
   * Generate random IP address
   */
  private generateRandomIP(): string {
    return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }
  
  /**
   * Generate random location
   */
  private generateRandomLocation(): string {
    const locations = [
      'New York, NY, USA',
      'Los Angeles, CA, USA',
      'Chicago, IL, USA',
      'Houston, TX, USA',
      'Phoenix, AZ, USA',
      'Philadelphia, PA, USA',
      'San Antonio, TX, USA',
      'San Diego, CA, USA',
      'Dallas, TX, USA',
      'San Jose, CA, USA',
      'Austin, TX, USA',
      'Jacksonville, FL, USA',
      'Fort Worth, TX, USA',
      'Columbus, OH, USA',
      'Charlotte, NC, USA',
      'San Francisco, CA, USA',
      'Indianapolis, IN, USA',
      'Seattle, WA, USA',
      'Denver, CO, USA',
      'Washington, DC, USA',
      'Boston, MA, USA',
      'El Paso, TX, USA',
      'Nashville, TN, USA',
      'Detroit, MI, USA',
      'Oklahoma City, OK, USA',
      'Portland, OR, USA',
      'Las Vegas, NV, USA',
      'Memphis, TN, USA',
      'Louisville, KY, USA',
      'Baltimore, MD, USA'
    ];
    return locations[Math.floor(Math.random() * locations.length)] || 'Unknown Location';
  }
  
  /**
   * Generate random user agent
   */
  private generateRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
      'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)] || 'Mozilla/5.0 (Unknown) Safari/537.36';
  }

  /**
   * Generate random email
   */
  private generateRandomEmail(): string {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'example.com'];
    const name = this.generateRandomName().toLowerCase().replace(' ', '.');
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    return `${name}@${domain}`;
  }

  /**
   * Generate random phone
   */
  private generateRandomPhone(): string {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const exchange = Math.floor(Math.random() * 900) + 100;
    const number = Math.floor(Math.random() * 9000) + 1000;
    
    return `(${areaCode}) ${exchange}-${number}`;
  }

  /**
   * Print seed summary
   */
  private printSeedSummary(stats: SeedStats): void {
    console.log('\n📈 Enhanced Seed Summary:');
    console.log(`   Users: ${stats.users}`);
    console.log(`   User Sessions: ${stats.userSessions}`);
    console.log(`   Login History: ${stats.loginHistory}`);
    console.log(`   Audit Logs: ${stats.auditLogs}`);
    console.log('\n   Parking Infrastructure:');
    console.log(`   Garages: ${stats.garages}`);
    console.log(`   Floors: ${stats.floors}`);
    console.log(`   Spots: ${stats.spots}`);
    console.log(`   Vehicles: ${stats.vehicles}`);
    console.log('\n   Business Operations:');
    console.log(`   Parking Sessions: ${stats.sessions}`);
    console.log(`   Tickets: ${stats.tickets}`);
    console.log(`   Payments: ${stats.payments}`);
    console.log(`   Transactions: ${stats.transactions}`);
    console.log(`\n   Total records: ${Object.values(stats).reduce((sum, count) => sum + count, 0)}`);
    
    // Analytics insights
    const occupancyRate = stats.sessions > 0 ? Math.round((stats.sessions / (stats.spots * 10)) * 100) : 0;
    const avgSessionsPerSpot = stats.spots > 0 ? Math.round((stats.sessions / stats.spots) * 100) / 100 : 0;
    const avgPaymentsPerSession = stats.sessions > 0 ? Math.round((stats.payments / stats.sessions) * 100) / 100 : 0;
    
    console.log('\n   Analytics Insights:');
    console.log(`   Estimated occupancy rate: ${occupancyRate}%`);
    console.log(`   Avg sessions per spot: ${avgSessionsPerSpot}`);
    console.log(`   Payment rate: ${avgPaymentsPerSession}`);
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    env: (args.find(arg => arg.startsWith('--env='))?.split('=')[1] as any) || 'development',
    size: (args.find(arg => arg.startsWith('--size='))?.split('=')[1] as any) || 'medium',
    clearExisting: args.includes('--clear'),
    generateSessions: !args.includes('--no-sessions'),
    generatePayments: !args.includes('--no-payments'),
    generateUsers: !args.includes('--no-users'),
    generateHistorical: args.includes('--historical'),
    historicalMonths: parseInt(args.find(arg => arg.startsWith('--historical-months='))?.split('=')[1] || '6'),
    generateAuditData: !args.includes('--no-audit')
  };

  const seeder = new DatabaseSeeder();
  
  try {
    await seeder.seed(options);
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DatabaseSeeder };
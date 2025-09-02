/**
 * Database Seed Script
 * 
 * This script generates comprehensive seed data for development and testing.
 * It creates realistic parking garage data including garages, floors, spots,
 * vehicles, sessions, tickets, and payments.
 * 
 * Usage:
 *   npm run db:seed
 *   npm run db:seed -- --env=production --size=large
 */

import { PrismaClient } from '../src/generated/prisma';

interface SeedOptions {
  env?: 'development' | 'staging' | 'production' | 'test';
  size?: 'small' | 'medium' | 'large';
  clearExisting?: boolean;
  generateSessions?: boolean;
  generatePayments?: boolean;
}

interface SeedStats {
  garages: number;
  floors: number;
  spots: number;
  vehicles: number;
  sessions: number;
  tickets: number;
  payments: number;
}

class DatabaseSeeder {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Main seed function
   */
  async seed(options: SeedOptions = {}): Promise<SeedStats> {
    const defaultOptions: SeedOptions = {
      env: 'development',
      size: 'medium',
      clearExisting: false,
      generateSessions: true,
      generatePayments: true,
      ...options
    };

    console.log('🌱 Starting database seed...');
    console.log(`Environment: ${defaultOptions.env}`);
    console.log(`Size: ${defaultOptions.size}`);

    const stats: SeedStats = {
      garages: 0,
      floors: 0,
      spots: 0,
      vehicles: 0,
      sessions: 0,
      tickets: 0,
      payments: 0
    };

    try {
      // Clear existing data if requested
      if (defaultOptions.clearExisting) {
        await this.clearDatabase();
      }

      // Get size parameters
      const sizeConfig = this.getSizeConfig(defaultOptions.size!);

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

      // Seed vehicles
      const vehicles = await this.seedVehicles(sizeConfig.vehicles);
      stats.vehicles = vehicles.length;
      console.log(`✅ Created ${stats.vehicles} vehicles`);

      // Seed sessions if requested
      if (defaultOptions.generateSessions) {
        const sessions = await this.seedParkingSessions(
          garages,
          spots,
          vehicles,
          sizeConfig.sessions
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
   * Get size configuration
   */
  private getSizeConfig(size: string) {
    const configs = {
      small: {
        garages: 1,
        floorsPerGarage: 3,
        spotsPerFloor: 50,
        vehicles: 30,
        sessions: 20,
        tickets: 5,
        payments: 25
      },
      medium: {
        garages: 2,
        floorsPerGarage: 5,
        spotsPerFloor: 100,
        vehicles: 200,
        sessions: 150,
        tickets: 15,
        payments: 165
      },
      large: {
        garages: 5,
        floorsPerGarage: 8,
        spotsPerFloor: 200,
        vehicles: 2000,
        sessions: 1500,
        tickets: 75,
        payments: 1575
      }
    };

    return configs[size as keyof typeof configs] || configs.medium;
  }

  /**
   * Clear existing database
   */
  private async clearDatabase(): Promise<void> {
    console.log('🗑️ Clearing existing data...');
    
    await this.prisma.payment.deleteMany();
    await this.prisma.ticket.deleteMany();
    await this.prisma.parkingSession.deleteMany();
    await this.prisma.vehicle.deleteMany();
    await this.prisma.spot.deleteMany();
    await this.prisma.floor.deleteMany();
    await this.prisma.garage.deleteMany();
    
    console.log('✅ Database cleared');
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
            number: floorNum,
            name: floorNum === 1 ? 'Ground Floor' : `Level ${floorNum}`,
            bays: 4,
            spotsPerBay: 25,
            isActive: true
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
    const spotTypes = ['STANDARD', 'COMPACT', 'OVERSIZED', 'HANDICAP', 'ELECTRIC'];
    const features = [
      ['covered'],
      ['ev_charging'],
      ['handicap_accessible'],
      ['wide_space'],
      ['security_camera'],
      []
    ];

    const spots = [];
    
    for (const floor of floors) {
      const garage = garages.find(g => g.id === floor.garageId);
      
      for (let spotNum = 1; spotNum <= spotsPerFloor; spotNum++) {
        const bay = Math.ceil(spotNum / 25);
        const spotInBay = spotNum % 25 || 25;
        
        // Determine spot type with realistic distribution
        let spotType = 'STANDARD';
        if (spotNum <= 5) spotType = 'HANDICAP';
        else if (spotNum <= 15) spotType = 'ELECTRIC';
        else if (spotNum <= 25) spotType = 'COMPACT';
        else if (spotNum % 20 === 0) spotType = 'OVERSIZED';

        const spot = await this.prisma.spot.create({
          data: {
            garageId: garage.id,
            floorId: floor.id,
            floor: floor.number,
            bay: bay,
            spotNumber: `${String.fromCharCode(64 + bay)}${spotInBay.toString().padStart(2, '0')}`,
            type: spotType as any,
            status: Math.random() > 0.7 ? 'OCCUPIED' : 'AVAILABLE',
            features: JSON.stringify(features[Math.floor(Math.random() * features.length)])
          }
        });
        spots.push(spot);
      }
    }

    return spots;
  }

  /**
   * Seed vehicles
   */
  private async seedVehicles(count: number): Promise<any[]> {
    const makes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes', 'Audi', 'Nissan', 'Hyundai', 'Volkswagen'];
    const models = ['Camry', 'Civic', 'F-150', 'Silverado', '3 Series', 'C-Class', 'A4', 'Altima', 'Elantra', 'Jetta'];
    const colors = ['Black', 'White', 'Silver', 'Blue', 'Red', 'Gray', 'Green', 'Brown', 'Yellow', 'Orange'];
    const vehicleTypes = ['STANDARD', 'COMPACT', 'OVERSIZED', 'MOTORCYCLE'];

    const vehicles = [];
    
    for (let i = 0; i < count; i++) {
      const licensePlate = this.generateLicensePlate();
      
      const vehicle = await this.prisma.vehicle.create({
        data: {
          licensePlate,
          vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)] as any,
          make: makes[Math.floor(Math.random() * makes.length)],
          model: models[Math.floor(Math.random() * models.length)],
          color: colors[Math.floor(Math.random() * colors.length)],
          year: 2015 + Math.floor(Math.random() * 9), // 2015-2023
          ownerName: this.generateRandomName(),
          ownerEmail: this.generateRandomEmail(),
          ownerPhone: this.generateRandomPhone(),
          status: Math.random() > 0.95 ? 'BLOCKED' : 'ACTIVE'
        }
      });
      vehicles.push(vehicle);
    }

    return vehicles;
  }

  /**
   * Seed parking sessions
   */
  private async seedParkingSessions(
    garages: any[],
    spots: any[],
    vehicles: any[],
    count: number
  ): Promise<any[]> {
    const sessions = [];
    const rateTypes = ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'];
    const statuses = ['ACTIVE', 'COMPLETED', 'EXPIRED'];

    for (let i = 0; i < count; i++) {
      const garage = garages[Math.floor(Math.random() * garages.length)];
      const garageSpots = spots.filter(s => s.garageId === garage.id);
      const spot = garageSpots[Math.floor(Math.random() * garageSpots.length)];
      const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];

      const checkInTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const rateType = rateTypes[Math.floor(Math.random() * rateTypes.length)];
      
      let checkOutTime = null;
      let durationMinutes = null;
      
      if (status !== 'ACTIVE') {
        checkOutTime = new Date(checkInTime.getTime() + Math.random() * 8 * 60 * 60 * 1000); // Up to 8 hours
        durationMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60));
      }

      const hourlyRate = 2 + Math.random() * 8; // $2-10 per hour
      const totalAmount = durationMinutes ? (durationMinutes / 60) * hourlyRate : 0;

      const session = await this.prisma.parkingSession.create({
        data: {
          garageId: garage.id,
          spotId: spot.id,
          vehicleId: vehicle.id,
          status: status as any,
          rateType: rateType as any,
          checkInTime,
          checkOutTime,
          durationMinutes,
          hourlyRate,
          totalAmount,
          isPaid: status === 'COMPLETED' ? Math.random() > 0.1 : false,
          notes: Math.random() > 0.7 ? 'Generated by seed script' : null
        }
      });
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
          vehicleId: vehicle.id,
          sessionId: Math.random() > 0.5 ? session.id : null,
          ticketNumber: `TK${Date.now()}${i.toString().padStart(3, '0')}`,
          type: ticketType as any,
          status: status as any,
          description: `${ticketType.toLowerCase().replace('_', ' ')} violation`,
          violationTime,
          fineAmount,
          isPaid: status === 'PAID',
          paymentDueDate: new Date(violationTime.getTime() + 30 * 24 * 60 * 60 * 1000),
          issuedBy: Math.random() > 0.5 ? 'SYSTEM_AUTO' : 'OFFICER_001'
        }
      });
      tickets.push(ticket);
    }

    return tickets;
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
    const paymentTypes = ['PARKING', 'FINE'];
    const paymentMethods = ['CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAYMENT', 'CASH'];
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
        ticketId = ticket.id;
        amount = ticket.fineAmount;
      }

      const paymentDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

      const payment = await this.prisma.payment.create({
        data: {
          garageId: garage.id,
          vehicleId: vehicle.id,
          sessionId,
          ticketId,
          paymentNumber: `PAY${Date.now()}${i.toString().padStart(4, '0')}`,
          type: paymentType as any,
          method: method as any,
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
   * Generate random name
   */
  private generateRandomName(): string {
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Amanda'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
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
    console.log('\n📊 Seed Summary:');
    console.log(`   Garages: ${stats.garages}`);
    console.log(`   Floors: ${stats.floors}`);
    console.log(`   Spots: ${stats.spots}`);
    console.log(`   Vehicles: ${stats.vehicles}`);
    console.log(`   Sessions: ${stats.sessions}`);
    console.log(`   Tickets: ${stats.tickets}`);
    console.log(`   Payments: ${stats.payments}`);
    console.log(`   Total records: ${Object.values(stats).reduce((sum, count) => sum + count, 0)}`);
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
    generatePayments: !args.includes('--no-payments')
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
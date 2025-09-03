import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.payment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.parkingSession.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.parkingSpot.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.garage.deleteMany();
  await prisma.user.deleteMany();

  // Create a test garage
  const garage = await prisma.garage.create({
    data: {
      name: 'Main Parking Garage',
      description: 'Premium downtown parking facility at 123 Main St, San Francisco, CA 94101',
      totalFloors: 3,
      totalSpots: 300,
      isActive: true,
      operatingHours: JSON.stringify({
        open: '06:00',
        close: '22:00',
        timezone: 'America/Los_Angeles'
      }),
    },
  });
  console.log(`✅ Created garage: ${garage.name}`);

  // Create floors
  const floors = [];
  for (let i = 1; i <= 3; i++) {
    const floor = await prisma.floor.create({
      data: {
        garageId: garage.id,
        floorNumber: i,
        description: i === 1 ? 'Ground Floor' : `Floor ${i}`,
        totalSpots: 100,
        isActive: true,
      },
    });
    floors.push(floor);
  }
  console.log(`✅ Created ${floors.length} floors`);

  // Create parking spots
  const spotTypes = ['STANDARD', 'COMPACT', 'OVERSIZED', 'ELECTRIC', 'HANDICAP', 'MOTORCYCLE'];
  const spots = [];
  
  for (const floor of floors) {
    for (let spotNum = 1; spotNum <= 100; spotNum++) {
      const section = String.fromCharCode(65 + Math.floor((spotNum - 1) / 10)); // A, B, C, etc.
      const spotNumber = `${floor.floorNumber}${section}${String(spotNum % 10 || 10).padStart(2, '0')}`;
      
      // Determine spot type
      let spotType = 'STANDARD';
      if (spotNum <= 5) spotType = 'HANDICAP';
      else if (spotNum <= 15) spotType = 'ELECTRIC';
      else if (spotNum <= 30) spotType = 'COMPACT';
      else if (spotNum > 90) spotType = 'OVERSIZED';
      else if (spotNum % 20 === 0) spotType = 'MOTORCYCLE';
      
      const spot = await prisma.parkingSpot.create({
        data: {
          spotNumber,
          floorId: floor.id,
          level: floor.floorNumber,
          section,
          spotType: spotType as any,
          status: 'AVAILABLE',
          isActive: true,
        },
      });
      spots.push(spot);
    }
  }
  console.log(`✅ Created ${spots.length} parking spots`);

  // Create test users
  const users = [];
  const userEmails = ['admin@example.com', 'manager@example.com', 'operator@example.com', 'user1@example.com', 'user2@example.com'];
  const roles = ['ADMIN', 'MANAGER', 'OPERATOR', 'USER', 'USER'];
  
  for (let i = 0; i < userEmails.length; i++) {
    const user = await prisma.user.create({
      data: {
        email: userEmails[i],
        passwordHash: '$2a$10$XxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx', // Placeholder hash
        firstName: `Test${i + 1}`,
        lastName: 'User',
        role: roles[i],
        isActive: true,
        isEmailVerified: true,
      },
    });
    users.push(user);
  }
  console.log(`✅ Created ${users.length} users`);

  // Create vehicles
  const vehicles = [];
  const vehicleTypes = ['STANDARD', 'COMPACT', 'OVERSIZED', 'MOTORCYCLE', 'ELECTRIC'];
  const makes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes', 'Tesla'];
  const models = ['Camry', 'Civic', 'F-150', 'Silverado', 'X5', 'C-Class', 'Model 3'];
  const colors = ['Black', 'White', 'Silver', 'Blue', 'Red', 'Gray', 'Green'];
  
  for (let i = 0; i < 50; i++) {
    const vehicle = await prisma.vehicle.create({
      data: {
        licensePlate: `ABC${String(1000 + i).padStart(4, '0')}`,
        vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)] as any,
        rateType: 'HOURLY',
        status: i < 25 ? 'PARKED' : 'DEPARTED',
        make: makes[Math.floor(Math.random() * makes.length)],
        model: models[Math.floor(Math.random() * models.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        year: 2015 + Math.floor(Math.random() * 9),
        ownerName: `Owner ${i + 1}`,
        ownerEmail: `owner${i + 1}@example.com`,
        ownerPhone: `555-${String(1000 + i).padStart(4, '0')}`,
        checkInTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
      },
    });
    vehicles.push(vehicle);
  }
  console.log(`✅ Created ${vehicles.length} vehicles`);

  // Create active parking sessions for some vehicles
  const activeSessions = [];
  const availableSpots = spots.filter(s => s.status === 'AVAILABLE');
  
  for (let i = 0; i < Math.min(25, vehicles.length, availableSpots.length); i++) {
    const vehicle = vehicles[i];
    const spot = availableSpots[i];
    
    // Update spot to occupied
    await prisma.parkingSpot.update({
      where: { id: spot.id },
      data: { status: 'OCCUPIED' },
    });
    
    // Update vehicle with spot
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { 
        currentSpotId: spot.id,
        spotId: spot.id,
      },
    });
    
    const session = await prisma.parkingSession.create({
      data: {
        vehicleId: vehicle.id,
        spotId: spot.id,
        startTime: vehicle.checkInTime,
        status: 'ACTIVE',
        hourlyRate: 5.0,
      },
    });
    activeSessions.push(session);
  }
  console.log(`✅ Created ${activeSessions.length} active parking sessions`);

  // Create some completed sessions with payments
  const completedSessions = [];
  const paymentMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAY'];
  
  for (let i = 25; i < Math.min(40, vehicles.length); i++) {
    const vehicle = vehicles[i];
    const spot = spots[Math.floor(Math.random() * spots.length)];
    const startTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const duration = Math.floor(Math.random() * 8 * 60) + 30; // 30 min to 8 hours
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    const totalAmount = Math.ceil(duration / 60) * 5.0;
    
    const session = await prisma.parkingSession.create({
      data: {
        vehicleId: vehicle.id,
        spotId: spot.id,
        startTime,
        endTime,
        duration,
        status: 'COMPLETED',
        hourlyRate: 5.0,
        totalAmount,
        amountPaid: totalAmount,
        isPaid: true,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        paymentTime: endTime,
      },
    });
    
    // Create payment record
    await prisma.payment.create({
      data: {
        sessionId: session.id,
        vehicleId: vehicle.id,
        amount: totalAmount,
        paymentType: 'PARKING',
        paymentMethod: session.paymentMethod as any,
        status: 'COMPLETED',
        transactionId: `TXN${Date.now()}${i}`,
        paymentDate: endTime,
        processedAt: endTime,
      },
    });
    
    completedSessions.push(session);
  }
  console.log(`✅ Created ${completedSessions.length} completed sessions with payments`);

  // Create some tickets
  const tickets = [];
  for (let i = 0; i < 20; i++) {
    const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
    const session = [...activeSessions, ...completedSessions][Math.floor(Math.random() * (activeSessions.length + completedSessions.length))];
    
    const ticket = await prisma.ticket.create({
      data: {
        garageId: garage.id,
        ticketNumber: `TCKT${String(1000 + i).padStart(6, '0')}`,
        vehiclePlate: vehicle.licensePlate,
        spotNumber: session.spotId,
        entryTime: session.startTime,
        exitTime: session.endTime,
        duration: session.duration,
        totalAmount: session.totalAmount || 0,
        paidAmount: session.isPaid ? session.totalAmount || 0 : 0,
        status: session.status === 'COMPLETED' ? 'PAID' : 'ACTIVE',
        paymentStatus: session.isPaid ? 'PAID' : 'UNPAID',
      },
    });
    tickets.push(ticket);
  }
  console.log(`✅ Created ${tickets.length} tickets`);

  console.log('✨ Database seeding completed successfully!');
  console.log(`
📊 Summary:
- Garages: 1
- Floors: ${floors.length}
- Parking Spots: ${spots.length}
- Users: ${users.length}
- Vehicles: ${vehicles.length}
- Active Sessions: ${activeSessions.length}
- Completed Sessions: ${completedSessions.length}
- Payments: ${completedSessions.length}
- Tickets: ${tickets.length}
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
// Load test environment configuration first
require('./testEnv');

const { PrismaClient } = require('@prisma/client');
const { DatabaseService } = require('../../services/DatabaseService');

// Global test setup
beforeAll(async () => {
  // Set NODE_ENV to test if not already set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }
  
  // Set default test database URL if not provided
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./test.db';
  }

  // Initialize Prisma client for tests
  global.prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Initialize Database Service for tests
  const dbService = DatabaseService.getInstance();
  await dbService.initialize();
  global.dbService = dbService;

  // Push database schema to ensure tables exist
  try {
    const { execSync } = require('child_process');
    execSync('npx prisma db push --force-reset --accept-data-loss', { 
      cwd: process.cwd(),
      stdio: 'pipe' 
    });
  } catch (error) {
    console.warn('Could not push database schema:', error.message);
  }

  // Clear database before tests
  try {
    await global.prisma.$executeRaw`DELETE FROM Vehicle WHERE 1=1`;
    await global.prisma.$executeRaw`DELETE FROM ParkingSession WHERE 1=1`;
    await global.prisma.$executeRaw`DELETE FROM ParkingSpot WHERE 1=1`;
    await global.prisma.$executeRaw`DELETE FROM Floor WHERE 1=1`;
    await global.prisma.$executeRaw`DELETE FROM Garage WHERE 1=1`;
    await global.prisma.$executeRaw`DELETE FROM User WHERE 1=1`;
  } catch (error) {
    console.warn('Could not clear test database:', error.message);
  }
});

afterAll(async () => {
  // Clean up
  if (global.prisma) {
    await global.prisma.$disconnect();
  }
});

// Reset database before each test
beforeEach(async () => {
  if (global.prisma) {
    try {
      await global.prisma.$executeRaw`DELETE FROM Vehicle WHERE 1=1`;
      await global.prisma.$executeRaw`DELETE FROM ParkingSession WHERE 1=1`;
      await global.prisma.$executeRaw`DELETE FROM ParkingSpot WHERE 1=1`;
      await global.prisma.$executeRaw`DELETE FROM Floor WHERE 1=1`;
      await global.prisma.$executeRaw`DELETE FROM Garage WHERE 1=1`;
      await global.prisma.$executeRaw`DELETE FROM User WHERE 1=1`;
    } catch (error) {
      // Silently fail if tables don't exist yet
    }
  }
});
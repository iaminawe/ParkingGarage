/**
 * Database test setup helper
 * Handles database connections, migrations, and cleanup for integration tests
 */

const path = require('path');
const fs = require('fs');

let prisma = null;
let testDbInitialized = false;

/**
 * Initialize Prisma client for testing
 * @returns {Object} Prisma client instance
 */
async function initializePrismaClient() {
  if (prisma) {
    return prisma;
  }

  try {
    // Check if @prisma/client is available
    const { PrismaClient } = require('@prisma/client');
    
    const testDbPath = path.join(process.cwd(), 'tests', 'data', 'test.db');
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${testDbPath}`
        }
      }
    });

    // Connect to the database
    await prisma.$connect();
    
    console.log('Prisma client connected to test database');
    return prisma;
  } catch (error) {
    console.warn('Prisma client not available:', error.message);
    return null;
  }
}

/**
 * Reset test database to clean state
 */
async function resetTestDatabase() {
  if (!prisma) {
    return;
  }

  try {
    // In SQLite, we need to delete records in the correct order due to foreign keys
    // This will be updated based on the actual schema when Prisma is set up
    
    // For now, we'll implement a generic cleanup that works with the expected schema
    const tables = ['Payment', 'Session', 'Vehicle', 'Spot', 'Garage'];
    
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
      } catch (error) {
        // Table might not exist yet - ignore error
        console.warn(`Could not reset table ${table}:`, error.message);
      }
    }

    console.log('Test database reset complete');
  } catch (error) {
    console.error('Error resetting test database:', error);
    throw error;
  }
}

/**
 * Seed test database with minimal required data
 */
async function seedTestDatabase() {
  if (!prisma) {
    return;
  }

  try {
    // This will be implemented once we have the Prisma schema
    // For now, just ensure the database is accessible
    await prisma.$queryRaw`SELECT 1`;
    console.log('Test database seeding complete');
  } catch (error) {
    console.warn('Could not seed test database:', error.message);
  }
}

/**
 * Close database connections
 */
async function cleanup() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

// Setup and teardown hooks for Jest
beforeEach(async () => {
  if (!testDbInitialized) {
    prisma = await initializePrismaClient();
    testDbInitialized = true;
  }
  
  if (prisma) {
    await resetTestDatabase();
    await seedTestDatabase();
  }
});

afterAll(async () => {
  await cleanup();
});

// Export utilities for use in tests
global.testDb = {
  getPrisma: () => prisma,
  reset: resetTestDatabase,
  seed: seedTestDatabase,
  cleanup
};

module.exports = {
  initializePrismaClient,
  resetTestDatabase,
  seedTestDatabase,
  cleanup
};
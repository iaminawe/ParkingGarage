/**
 * Global test setup - runs once before all tests
 * Sets up the test database and any global test configuration
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = async () => {
  console.log('Setting up test environment...');

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test.db';

  try {
    // Ensure test database directory exists
    const testDbDir = path.join(process.cwd(), 'tests', 'data');
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }

    // Set test database path
    const testDbPath = path.join(testDbDir, 'test.db');
    process.env.DATABASE_URL = `file:${testDbPath}`;

    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // When Prisma is available, initialize the test database
    const prismaSchemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    if (fs.existsSync(prismaSchemaPath)) {
      console.log('Initializing test database with Prisma...');
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: `file:${testDbPath}` }
      });
    } else {
      console.log('Prisma schema not found - will use legacy database setup');
    }

    console.log('Test environment setup complete');
  } catch (error) {
    console.error('Error setting up test environment:', error.message);
    // Don't fail setup if Prisma is not ready yet
    if (!error.message.includes('prisma')) {
      throw error;
    }
  }
};
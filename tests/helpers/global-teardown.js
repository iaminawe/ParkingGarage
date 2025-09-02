/**
 * Global test teardown - runs once after all tests
 * Cleans up test databases and any global test resources
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('Cleaning up test environment...');

  try {
    // Clean up test database files
    const testDbPath = path.join(process.cwd(), 'tests', 'data', 'test.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      console.log('Test database cleaned up');
    }

    // Clean up any SQLite journal files
    const journalPath = `${testDbPath}-journal`;
    if (fs.existsSync(journalPath)) {
      fs.unlinkSync(journalPath);
    }

    // Clean up any SQLite WAL files
    const walPath = `${testDbPath}-wal`;
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }

    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }

    console.log('Test environment cleanup complete');
  } catch (error) {
    console.error('Error during test cleanup:', error.message);
    // Don't fail teardown - just log the error
  }
};
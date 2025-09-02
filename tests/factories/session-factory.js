/**
 * Session Factory for Test Data Generation
 * Creates test parking session instances for database testing
 */

const { faker } = require('@faker-js/faker');

/**
 * Session statuses
 */
const SESSION_STATUSES = ['active', 'completed', 'cancelled', 'expired'];

/**
 * Create session data for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Session data object
 */
function createSessionData(overrides = {}) {
  const startTime = overrides.startTime || faker.date.recent({ days: 1 });
  const endTime = overrides.endTime || 
    (overrides.status === 'active' ? null : faker.date.between({ from: startTime, to: new Date() }));
  
  return {
    id: overrides.id || faker.string.uuid(),
    vehicleId: overrides.vehicleId || faker.string.uuid(),
    spotId: overrides.spotId || faker.string.uuid(),
    garageId: overrides.garageId || faker.string.uuid(),
    startTime: startTime.toISOString(),
    endTime: endTime ? endTime.toISOString() : null,
    status: overrides.status || faker.helpers.arrayElement(SESSION_STATUSES),
    hourlyRate: overrides.hourlyRate || parseFloat(faker.finance.amount(3, 10, 2)),
    totalAmount: overrides.totalAmount || null,
    paymentStatus: overrides.paymentStatus || 'pending',
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create session instance with Prisma (if available)
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created session
 */
async function createSession(overrides = {}) {
  const data = createSessionData(overrides);
  
  const prisma = global.testDb?.getPrisma?.();
  if (prisma && prisma.session) {
    try {
      return await prisma.session.create({
        data: {
          vehicleId: data.vehicleId,
          spotId: data.spotId,
          garageId: data.garageId,
          startTime: new Date(data.startTime),
          endTime: data.endTime ? new Date(data.endTime) : null,
          status: data.status,
          hourlyRate: data.hourlyRate,
          totalAmount: data.totalAmount,
          paymentStatus: data.paymentStatus
        }
      });
    } catch (error) {
      console.warn('Could not create session with Prisma:', error.message);
      return data;
    }
  }
  
  return data;
}

/**
 * Create active session (currently parking)
 * @param {string} vehicleId - Vehicle ID
 * @param {string} spotId - Spot ID
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created active session
 */
async function createActiveSession(vehicleId, spotId, overrides = {}) {
  return createSession({
    vehicleId,
    spotId,
    status: 'active',
    endTime: null,
    totalAmount: null,
    paymentStatus: 'pending',
    ...overrides
  });
}

/**
 * Create completed session with payment
 * @param {string} vehicleId - Vehicle ID
 * @param {string} spotId - Spot ID
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created completed session
 */
async function createCompletedSession(vehicleId, spotId, overrides = {}) {
  const startTime = faker.date.recent({ days: 2 });
  const endTime = faker.date.between({ 
    from: new Date(startTime.getTime() + 30 * 60 * 1000), // At least 30 minutes
    to: new Date(startTime.getTime() + 8 * 60 * 60 * 1000) // At most 8 hours
  });
  
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours
  const hourlyRate = overrides.hourlyRate || 5.00;
  const totalAmount = Math.ceil(duration) * hourlyRate;
  
  return createSession({
    vehicleId,
    spotId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    status: 'completed',
    hourlyRate,
    totalAmount,
    paymentStatus: faker.helpers.arrayElement(['paid', 'pending', 'failed']),
    ...overrides
  });
}

/**
 * Create multiple sessions
 * @param {number} count - Number of sessions to create
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Array>} Array of session objects
 */
async function createSessions(count = 3, overrides = {}) {
  const sessions = [];
  for (let i = 0; i < count; i++) {
    sessions.push(await createSession(overrides));
  }
  return sessions;
}

/**
 * Create sessions for a specific vehicle
 * @param {string} vehicleId - Vehicle ID
 * @param {number} count - Number of sessions to create
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Array>} Array of sessions
 */
async function createSessionsForVehicle(vehicleId, count = 3, overrides = {}) {
  const sessions = [];
  for (let i = 0; i < count; i++) {
    const isActive = i === count - 1; // Last session is active
    sessions.push(await createSession({
      vehicleId,
      status: isActive ? 'active' : 'completed',
      endTime: isActive ? null : faker.date.recent().toISOString(),
      ...overrides
    }));
  }
  return sessions;
}

/**
 * Create session with specific duration
 * @param {string} vehicleId - Vehicle ID
 * @param {string} spotId - Spot ID
 * @param {number} hours - Duration in hours
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created session
 */
async function createSessionWithDuration(vehicleId, spotId, hours, overrides = {}) {
  const startTime = faker.date.recent({ days: 1 });
  const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
  const hourlyRate = overrides.hourlyRate || 5.00;
  const totalAmount = Math.ceil(hours) * hourlyRate;
  
  return createSession({
    vehicleId,
    spotId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    status: 'completed',
    hourlyRate,
    totalAmount,
    paymentStatus: 'paid',
    ...overrides
  });
}

/**
 * Calculate total amount for a session
 * @param {Date} startTime - Session start time
 * @param {Date} endTime - Session end time
 * @param {number} hourlyRate - Hourly parking rate
 * @returns {number} Total amount due
 */
function calculateSessionAmount(startTime, endTime, hourlyRate = 5.00) {
  if (!endTime) return 0;
  
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  return Math.ceil(duration) * hourlyRate;
}

module.exports = {
  SESSION_STATUSES,
  createSessionData,
  createSession,
  createActiveSession,
  createCompletedSession,
  createSessions,
  createSessionsForVehicle,
  createSessionWithDuration,
  calculateSessionAmount
};
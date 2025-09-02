/**
 * Garage Factory for Test Data Generation
 * Creates test garage instances for database testing
 */

const { faker } = require('@faker-js/faker');

/**
 * Default garage data template
 */
const DEFAULT_GARAGE_DATA = {
  name: 'Test Parking Garage',
  address: '123 Test Street, Test City, TC 12345',
  totalSpots: 100,
  hourlyRate: 5.00,
  dailyRate: 25.00,
  status: 'active'
};

/**
 * Create garage data for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Garage data object
 */
function createGarageData(overrides = {}) {
  return {
    id: overrides.id || faker.string.uuid(),
    name: overrides.name || faker.company.name() + ' Parking',
    address: overrides.address || `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`,
    totalSpots: overrides.totalSpots || faker.number.int({ min: 50, max: 500 }),
    hourlyRate: overrides.hourlyRate || parseFloat(faker.finance.amount(2, 10, 2)),
    dailyRate: overrides.dailyRate || parseFloat(faker.finance.amount(20, 50, 2)),
    status: overrides.status || faker.helpers.arrayElement(['active', 'maintenance', 'closed']),
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create garage instance with Prisma (if available)
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created garage
 */
async function createGarage(overrides = {}) {
  const data = createGarageData(overrides);
  
  const prisma = global.testDb?.getPrisma?.();
  if (prisma && prisma.garage) {
    try {
      return await prisma.garage.create({
        data: {
          name: data.name,
          address: data.address,
          totalSpots: data.totalSpots,
          hourlyRate: data.hourlyRate,
          dailyRate: data.dailyRate,
          status: data.status
        }
      });
    } catch (error) {
      console.warn('Could not create garage with Prisma:', error.message);
      return data;
    }
  }
  
  return data;
}

/**
 * Create multiple garages
 * @param {number} count - Number of garages to create
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Array>} Array of garage objects
 */
async function createGarages(count = 3, overrides = {}) {
  const garages = [];
  for (let i = 0; i < count; i++) {
    garages.push(await createGarage({
      name: `Test Garage ${i + 1}`,
      ...overrides
    }));
  }
  return garages;
}

/**
 * Create garage with specific configuration
 * @param {string} config - Configuration type (small, medium, large)
 * @returns {Promise<Object>} Created garage
 */
async function createGarageWithConfig(config = 'medium') {
  const configs = {
    small: { totalSpots: 25, hourlyRate: 3.00, dailyRate: 15.00 },
    medium: { totalSpots: 100, hourlyRate: 5.00, dailyRate: 25.00 },
    large: { totalSpots: 300, hourlyRate: 8.00, dailyRate: 40.00 }
  };
  
  return createGarage(configs[config] || configs.medium);
}

module.exports = {
  DEFAULT_GARAGE_DATA,
  createGarageData,
  createGarage,
  createGarages,
  createGarageWithConfig
};
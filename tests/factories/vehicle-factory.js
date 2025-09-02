/**
 * Vehicle Factory for Test Data Generation
 * Creates test vehicle instances for database testing
 */

const { faker } = require('@faker-js/faker');

/**
 * Vehicle types and their size classifications
 */
const VEHICLE_TYPES = {
  motorcycle: { size: 'small', spotTypes: ['motorcycle', 'compact', 'standard'] },
  compact: { size: 'compact', spotTypes: ['compact', 'standard', 'oversized'] },
  sedan: { size: 'standard', spotTypes: ['standard', 'oversized'] },
  suv: { size: 'standard', spotTypes: ['standard', 'oversized'] },
  truck: { size: 'oversized', spotTypes: ['oversized'] },
  van: { size: 'oversized', spotTypes: ['oversized'] }
};

const VEHICLE_MAKES = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes',
  'Audi', 'Volkswagen', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Lexus'
];

const COLORS = [
  'black', 'white', 'silver', 'gray', 'red', 'blue', 'green', 'yellow', 'orange', 'brown'
];

/**
 * Generate realistic license plate
 * @param {string} state - State abbreviation
 * @returns {string} License plate number
 */
function generateLicensePlate(state = 'CA') {
  const patterns = {
    CA: () => faker.string.numeric(1) + faker.string.alpha({ length: 3, casing: 'upper' }) + faker.string.numeric(3),
    NY: () => faker.string.alpha({ length: 3, casing: 'upper' }) + faker.string.numeric(4),
    TX: () => faker.string.alpha({ length: 3, casing: 'upper' }) + faker.string.numeric(3),
    FL: () => faker.string.alpha({ length: 3, casing: 'upper' }) + faker.string.numeric(2) + faker.string.alpha({ length: 1, casing: 'upper' })
  };
  
  const generator = patterns[state] || patterns.CA;
  return generator();
}

/**
 * Create vehicle data for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Vehicle data object
 */
function createVehicleData(overrides = {}) {
  const type = overrides.type || faker.helpers.arrayElement(Object.keys(VEHICLE_TYPES));
  const make = overrides.make || faker.helpers.arrayElement(VEHICLE_MAKES);
  const year = overrides.year || faker.date.recent({ days: 365 * 10 }).getFullYear();
  
  return {
    id: overrides.id || faker.string.uuid(),
    licensePlate: overrides.licensePlate || generateLicensePlate(),
    make,
    model: overrides.model || faker.vehicle.model(),
    year,
    color: overrides.color || faker.helpers.arrayElement(COLORS),
    type,
    size: overrides.size || VEHICLE_TYPES[type].size,
    owner: overrides.owner || faker.person.fullName(),
    phone: overrides.phone || faker.phone.number(),
    email: overrides.email || faker.internet.email(),
    isElectric: overrides.isElectric || faker.datatype.boolean(0.2),
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create vehicle instance with Prisma (if available)
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created vehicle
 */
async function createVehicle(overrides = {}) {
  const data = createVehicleData(overrides);
  
  const prisma = global.testDb?.getPrisma?.();
  if (prisma && prisma.vehicle) {
    try {
      return await prisma.vehicle.create({
        data: {
          licensePlate: data.licensePlate,
          make: data.make,
          model: data.model,
          year: data.year,
          color: data.color,
          type: data.type,
          size: data.size,
          owner: data.owner,
          phone: data.phone,
          email: data.email,
          isElectric: data.isElectric
        }
      });
    } catch (error) {
      console.warn('Could not create vehicle with Prisma:', error.message);
      return data;
    }
  }
  
  return data;
}

/**
 * Create multiple vehicles
 * @param {number} count - Number of vehicles to create
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Array>} Array of vehicle objects
 */
async function createVehicles(count = 5, overrides = {}) {
  const vehicles = [];
  for (let i = 0; i < count; i++) {
    vehicles.push(await createVehicle(overrides));
  }
  return vehicles;
}

/**
 * Create vehicle with specific configuration
 * @param {string} config - Configuration type (compact, electric, oversized)
 * @returns {Promise<Object>} Created vehicle
 */
async function createVehicleWithConfig(config = 'standard') {
  const configs = {
    compact: { 
      type: 'compact',
      make: faker.helpers.arrayElement(['Honda', 'Toyota', 'Nissan']),
      size: 'compact'
    },
    electric: { 
      type: 'sedan',
      make: faker.helpers.arrayElement(['Tesla', 'Nissan', 'BMW']),
      model: faker.helpers.arrayElement(['Model 3', 'Leaf', 'i3']),
      isElectric: true,
      size: 'standard'
    },
    oversized: { 
      type: 'truck',
      make: faker.helpers.arrayElement(['Ford', 'Chevrolet', 'Ram']),
      size: 'oversized'
    },
    motorcycle: {
      type: 'motorcycle',
      make: faker.helpers.arrayElement(['Harley-Davidson', 'Yamaha', 'Honda']),
      size: 'small'
    }
  };
  
  return createVehicle(configs[config] || {});
}

/**
 * Create vehicle suitable for a specific spot type
 * @param {string} spotType - Type of parking spot
 * @returns {Promise<Object>} Created vehicle
 */
async function createVehicleForSpotType(spotType) {
  const compatibleTypes = Object.entries(VEHICLE_TYPES)
    .filter(([, config]) => config.spotTypes.includes(spotType))
    .map(([type]) => type);
  
  if (compatibleTypes.length === 0) {
    throw new Error(`No vehicle types compatible with spot type: ${spotType}`);
  }
  
  const vehicleType = faker.helpers.arrayElement(compatibleTypes);
  return createVehicle({ 
    type: vehicleType,
    size: VEHICLE_TYPES[vehicleType].size 
  });
}

module.exports = {
  VEHICLE_TYPES,
  VEHICLE_MAKES,
  COLORS,
  generateLicensePlate,
  createVehicleData,
  createVehicle,
  createVehicles,
  createVehicleWithConfig,
  createVehicleForSpotType
};
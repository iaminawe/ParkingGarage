/**
 * Spot Factory for Test Data Generation
 * Creates test parking spot instances for database testing
 */

const { faker } = require('@faker-js/faker');

/**
 * Spot types and their properties
 */
const SPOT_TYPES = {
  compact: { width: 7.5, length: 15 },
  standard: { width: 8.5, length: 18 },
  oversized: { width: 9.5, length: 20 },
  handicap: { width: 12, length: 18 },
  motorcycle: { width: 4, length: 8 }
};

const SPOT_FEATURES = [
  'ev_charging',
  'handicap',
  'covered',
  'premium',
  'valet',
  'reserved'
];

/**
 * Generate spot ID in format F{floor}-B{bay}-S{spotNumber}
 */
function generateSpotId(floor, bay, spotNumber) {
  return `F${floor}-B${bay}-S${String(spotNumber).padStart(3, '0')}`;
}

/**
 * Create spot data for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Spot data object
 */
function createSpotData(overrides = {}) {
  const floor = overrides.floor || faker.number.int({ min: 1, max: 5 });
  const bay = overrides.bay || faker.number.int({ min: 1, max: 10 });
  const spotNumber = overrides.spotNumber || faker.number.int({ min: 1, max: 50 });
  const type = overrides.type || faker.helpers.arrayElement(Object.keys(SPOT_TYPES));
  const features = overrides.features || faker.helpers.arrayElements(SPOT_FEATURES, { min: 0, max: 2 });

  return {
    id: overrides.id || generateSpotId(floor, bay, spotNumber),
    floor,
    bay,
    spotNumber,
    type,
    features,
    status: overrides.status || 'available',
    currentVehicle: overrides.currentVehicle || null,
    garageId: overrides.garageId || null,
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create spot instance with Prisma (if available)
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created spot
 */
async function createSpot(overrides = {}) {
  const data = createSpotData(overrides);
  
  const prisma = global.testDb?.getPrisma?.();
  if (prisma && prisma.spot) {
    try {
      return await prisma.spot.create({
        data: {
          floor: data.floor,
          bay: data.bay,
          spotNumber: data.spotNumber,
          type: data.type,
          features: data.features,
          status: data.status,
          currentVehicle: data.currentVehicle,
          garageId: data.garageId
        }
      });
    } catch (error) {
      console.warn('Could not create spot with Prisma:', error.message);
      return data;
    }
  }
  
  return data;
}

/**
 * Create multiple spots for a garage
 * @param {string} garageId - Garage ID
 * @param {number} count - Number of spots to create
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Array>} Array of spot objects
 */
async function createSpotsForGarage(garageId, count = 10, overrides = {}) {
  const spots = [];
  const floor = overrides.floor || 1;
  const bay = overrides.bay || 1;
  
  for (let i = 0; i < count; i++) {
    spots.push(await createSpot({
      garageId,
      floor,
      bay,
      spotNumber: i + 1,
      ...overrides
    }));
  }
  
  return spots;
}

/**
 * Create spots with specific configuration
 * @param {string} config - Configuration type (standard, premium, mixed)
 * @param {string} garageId - Garage ID
 * @returns {Promise<Array>} Array of spots
 */
async function createSpotsWithConfig(config = 'standard', garageId) {
  const configs = {
    standard: {
      count: 10,
      types: ['standard'],
      features: []
    },
    premium: {
      count: 5,
      types: ['standard', 'oversized'],
      features: ['covered', 'premium']
    },
    mixed: {
      count: 15,
      types: ['compact', 'standard', 'oversized', 'handicap'],
      features: ['ev_charging', 'handicap', 'covered']
    },
    accessible: {
      count: 3,
      types: ['handicap'],
      features: ['handicap']
    }
  };
  
  const configData = configs[config] || configs.standard;
  const spots = [];
  
  for (let i = 0; i < configData.count; i++) {
    const type = faker.helpers.arrayElement(configData.types);
    const features = type === 'handicap' 
      ? ['handicap'] 
      : faker.helpers.arrayElements(configData.features, { min: 0, max: 2 });
    
    spots.push(await createSpot({
      garageId,
      floor: 1,
      bay: 1,
      spotNumber: i + 1,
      type,
      features
    }));
  }
  
  return spots;
}

/**
 * Create occupied spot with vehicle
 * @param {string} vehicleId - Vehicle ID occupying the spot
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created occupied spot
 */
async function createOccupiedSpot(vehicleId, overrides = {}) {
  return createSpot({
    status: 'occupied',
    currentVehicle: vehicleId,
    ...overrides
  });
}

module.exports = {
  SPOT_TYPES,
  SPOT_FEATURES,
  generateSpotId,
  createSpotData,
  createSpot,
  createSpotsForGarage,
  createSpotsWithConfig,
  createOccupiedSpot
};
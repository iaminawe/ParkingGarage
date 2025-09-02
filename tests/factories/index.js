/**
 * Test Factories Index
 * Exports all test data factories for easy importing
 */

const GarageFactory = require('./garage-factory');
const SpotFactory = require('./spot-factory');
const VehicleFactory = require('./vehicle-factory');
const SessionFactory = require('./session-factory');
const PaymentFactory = require('./payment-factory');

// Add faker to global scope for tests
if (!global.faker) {
  try {
    global.faker = require('@faker-js/faker').faker;
  } catch (error) {
    console.warn('Faker.js not available - install @faker-js/faker for enhanced test data generation');
  }
}

/**
 * Create a complete parking scenario with all related entities
 * @param {Object} config - Configuration for the scenario
 * @returns {Promise<Object>} Complete scenario data
 */
async function createParkingScenario(config = {}) {
  const scenario = {
    garage: null,
    spots: [],
    vehicles: [],
    sessions: [],
    payments: []
  };

  try {
    // Create garage
    scenario.garage = await GarageFactory.createGarage(config.garage);
    
    // Create spots in the garage
    const spotCount = config.spotCount || 10;
    scenario.spots = await SpotFactory.createSpotsForGarage(
      scenario.garage.id, 
      spotCount, 
      config.spots
    );
    
    // Create vehicles
    const vehicleCount = config.vehicleCount || 5;
    scenario.vehicles = await VehicleFactory.createVehicles(vehicleCount, config.vehicles);
    
    // Create active sessions (some vehicles parked)
    const activeSessionCount = Math.min(config.activeSessionCount || 2, scenario.vehicles.length, scenario.spots.length);
    for (let i = 0; i < activeSessionCount; i++) {
      const session = await SessionFactory.createActiveSession(
        scenario.vehicles[i].id,
        scenario.spots[i].id,
        { garageId: scenario.garage.id, ...config.sessions }
      );
      scenario.sessions.push(session);
    }
    
    // Create completed sessions with payments
    const completedSessionCount = config.completedSessionCount || 3;
    for (let i = activeSessionCount; i < Math.min(activeSessionCount + completedSessionCount, scenario.vehicles.length); i++) {
      const spotIndex = i % scenario.spots.length;
      const session = await SessionFactory.createCompletedSession(
        scenario.vehicles[i].id,
        scenario.spots[spotIndex].id,
        { garageId: scenario.garage.id, ...config.sessions }
      );
      scenario.sessions.push(session);
      
      // Create payment for completed session
      if (session.totalAmount) {
        const payment = await PaymentFactory.createSuccessfulPayment(
          session.id,
          session.totalAmount,
          config.payments
        );
        scenario.payments.push(payment);
      }
    }
    
    return scenario;
  } catch (error) {
    console.warn('Could not create complete parking scenario:', error.message);
    return scenario;
  }
}

/**
 * Create a minimal test scenario with just basic entities
 * @returns {Promise<Object>} Minimal scenario data
 */
async function createMinimalScenario() {
  return createParkingScenario({
    spotCount: 3,
    vehicleCount: 2,
    activeSessionCount: 1,
    completedSessionCount: 1
  });
}

/**
 * Create a complex test scenario with multiple garages and many entities
 * @returns {Promise<Object>} Complex scenario data
 */
async function createComplexScenario() {
  const scenarios = [];
  
  for (let i = 0; i < 2; i++) {
    scenarios.push(await createParkingScenario({
      garage: { name: `Test Garage ${i + 1}` },
      spotCount: 20,
      vehicleCount: 15,
      activeSessionCount: 8,
      completedSessionCount: 12
    }));
  }
  
  return scenarios;
}

module.exports = {
  // Individual factories
  GarageFactory,
  SpotFactory,
  VehicleFactory,
  SessionFactory,
  PaymentFactory,
  
  // Scenario builders
  createParkingScenario,
  createMinimalScenario,
  createComplexScenario,
  
  // Convenience exports
  ...GarageFactory,
  ...SpotFactory,
  ...VehicleFactory,
  ...SessionFactory,
  ...PaymentFactory
};
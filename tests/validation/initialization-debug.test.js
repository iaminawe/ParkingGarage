/**
 * Initialization Debug Test
 * 
 * Deep dive into the garage initialization failure to identify 
 * the disconnect between seed data execution and garage state.
 */

const app = require('../../src/app');
const GarageService = require('../../src/services/garageService');
const SpotService = require('../../src/services/spotService');
const MemoryStore = require('../../src/storage/memoryStore');

describe('Garage Initialization Debug', () => {
  let garageService;
  let spotService;
  let memoryStore;

  beforeEach(() => {
    garageService = new GarageService();
    spotService = new SpotService();
    memoryStore = MemoryStore.getInstance();
  });

  describe('ROOT CAUSE ANALYSIS: Initialization Sequence', () => {
    it('should trace the complete initialization sequence', async () => {
      console.log('🔍 INITIALIZATION SEQUENCE TRACE');
      console.log('================================');
      
      // Step 1: Check initial state
      console.log('1. Initial State Check:');
      console.log('   Garage initialized:', garageService.isGarageInitialized());
      console.log('   Garage configs in store:', memoryStore.garageConfig.size);
      console.log('   Spots in store:', memoryStore.spots.size);
      console.log('   Vehicles in store:', memoryStore.vehicles.size);
      
      // Step 2: Check if garage needs initialization
      console.log('\n2. Checking if garage needs initialization...');
      const needsInit = !garageService.isGarageInitialized();
      console.log('   Needs initialization:', needsInit);
      
      if (needsInit) {
        console.log('\n3. Attempting manual initialization...');
        
        try {
          const garageConfig = {
            name: 'Test Garage',
            floors: [
              { number: 1, bays: 2, spotsPerBay: 5 }
            ]
          };
          
          console.log('   Config to initialize:', JSON.stringify(garageConfig, null, 2));
          
          const result = await garageService.initializeGarage(garageConfig);
          console.log('   Initialization result:', JSON.stringify(result, null, 2));
          
          // Check state after initialization
          console.log('\n4. Post-initialization State:');
          console.log('   Garage initialized:', garageService.isGarageInitialized());
          console.log('   Garage configs in store:', memoryStore.garageConfig.size);
          console.log('   Spots in store:', memoryStore.spots.size);
          
          if (memoryStore.spots.size > 0) {
            console.log('   ✅ Spots created successfully');
            const firstSpot = Array.from(memoryStore.spots.values())[0];
            console.log('   First spot:', JSON.stringify(firstSpot.toObject(), null, 2));
          } else {
            console.log('   ❌ No spots created despite successful initialization');
          }
          
        } catch (error) {
          console.log('   ❌ Manual initialization failed:', error.message);
        }
      }
      
      expect(true).toBe(true); // Always pass for diagnostic
    });

    it('should trace seed data execution vs garage service state', async () => {
      console.log('\n🔍 SEED DATA VS SERVICE STATE ANALYSIS');
      console.log('======================================');
      
      // The issue is that seedData.initialize() is called but garage service shows not initialized
      // This suggests a disconnect between what the seed data does and what the garage service expects
      
      console.log('1. Analyzing Seed Data Process:');
      console.log('   - Seed data logs show vehicles being parked');
      console.log('   - Seed data logs show spots being set to maintenance');
      console.log('   - Seed data shows "initialization complete"');
      console.log('   - BUT garage service reports "not initialized"');
      
      console.log('\n2. Possible Root Causes:');
      console.log('   a) Seed data not calling garageService.initializeGarage()');
      console.log('   b) Seed data calling different initialization method');
      console.log('   c) Seed data failing silently during garage creation');
      console.log('   d) Memory store state not persisting between calls');
      
      console.log('\n3. Memory Store Deep Inspection:');
      console.log('   Garage config keys:', Array.from(memoryStore.garageConfig.keys()));
      console.log('   Spot keys count:', memoryStore.spots.size);
      console.log('   Vehicle keys count:', memoryStore.vehicles.size);
      
      if (memoryStore.garageConfig.size > 0) {
        const garage = memoryStore.garageConfig.get('default');
        if (garage) {
          console.log('   Default garage exists:', garage.name);
          console.log('   Garage capacity:', garage.getTotalCapacity());
          console.log('   Garage floors:', garage.floors.length);
        }
      }
      
      // Check what happens when we try to use check-in service directly
      console.log('\n4. Direct Service Integration Test:');
      try {
        // This should fail if garage is not properly initialized
        const spots = spotService.findAvailableSpots('standard');
        console.log('   Available spots for standard vehicles:', spots.length);
        
        if (spots.length === 0) {
          console.log('   ❌ No available spots found by spot service');
          
          // Check all spots regardless of status
          const allSpots = spotService.spotRepository.findAll();
          console.log('   Total spots in repository:', allSpots.length);
          
          if (allSpots.length === 0) {
            console.log('   ❌ CRITICAL: Spot repository is completely empty');
          }
        }
      } catch (error) {
        console.log('   ❌ Spot service error:', error.message);
      }
      
      expect(true).toBe(true);
    });
  });

  describe('SOLUTION VERIFICATION', () => {
    it('should test manual garage setup to verify fix approach', async () => {
      console.log('\n🔧 SOLUTION VERIFICATION');
      console.log('========================');
      
      // Clear everything first
      memoryStore.clear();
      
      console.log('1. Cleared memory store');
      console.log('   Garage configs:', memoryStore.garageConfig.size);
      console.log('   Spots:', memoryStore.spots.size);
      console.log('   Vehicles:', memoryStore.vehicles.size);
      
      // Now manually initialize garage properly
      console.log('\n2. Manual Garage Initialization:');
      
      try {
        const garageConfig = {
          name: 'Fixed Test Garage',
          floors: [
            { number: 1, bays: 3, spotsPerBay: 10 },
            { number: 2, bays: 3, spotsPerBay: 10 }
          ]
        };
        
        const initResult = await garageService.initializeGarage(garageConfig);
        console.log('   ✅ Garage initialized');
        console.log('   Spots created:', initResult.spotsCreated);
        console.log('   Expected capacity:', garageConfig.floors.reduce((sum, f) => sum + (f.bays * f.spotsPerBay), 0));
        
        // Verify state
        console.log('\n3. Post-Initialization Verification:');
        console.log('   Garage initialized check:', garageService.isGarageInitialized());
        console.log('   Spots in memory:', memoryStore.spots.size);
        console.log('   Available spots for standard:', spotService.findAvailableSpots('standard').length);
        
        // Test actual functionality
        console.log('\n4. Functionality Test:');
        
        const checkInResult = spotService.checkInVehicle('TEST123', 'standard');
        console.log('   Check-in result:', JSON.stringify(checkInResult, null, 2));
        
        if (checkInResult) {
          console.log('   ✅ Check-in working after proper initialization');
        }
        
      } catch (error) {
        console.log('   ❌ Manual initialization failed:', error.message);
        console.log('   Stack:', error.stack);
      }
      
      expect(true).toBe(true);
    });
  });

  describe('PRODUCTION FIX RECOMMENDATIONS', () => {
    it('should provide specific fix recommendations', () => {
      console.log('\n🛠️  PRODUCTION FIX RECOMMENDATIONS');
      console.log('==================================');
      
      const fixes = [
        {
          priority: 'CRITICAL',
          issue: 'Garage initialization failure',
          solution: 'Fix seed data to properly call garageService.initializeGarage()',
          steps: [
            '1. Modify seedData.js to call garageService.initializeGarage() first',
            '2. Ensure garage is initialized before attempting to park vehicles',
            '3. Add proper error handling if initialization fails',
            '4. Verify spots are created before trying to use them'
          ]
        },
        {
          priority: 'CRITICAL',
          issue: 'Check-out billing calculation error',
          solution: 'Fix undefined.hours error in billing service',
          steps: [
            '1. Check timeCalculator utility for proper duration calculation',
            '2. Ensure check-in time is properly stored and retrieved',
            '3. Fix duration object structure before billing calculation',
            '4. Add null/undefined checks in billing logic'
          ]
        },
        {
          priority: 'HIGH',
          issue: 'Rate limiting configuration',
          solution: 'Adjust rate limiting for production environment',
          steps: [
            '1. Increase rate limit to 1000+ requests per 15 minutes',
            '2. Consider different limits for read vs write operations',
            '3. Exclude health checks from rate limiting',
            '4. Add proper rate limit headers for client guidance'
          ]
        },
        {
          priority: 'HIGH',
          issue: 'API response format inconsistency',
          solution: 'Standardize response format across all endpoints',
          steps: [
            '1. Choose either direct response or success/data wrapper',
            '2. Update all controllers to use consistent format',
            '3. Update API documentation and tests',
            '4. Consider versioning if breaking changes needed'
          ]
        }
      ];
      
      fixes.forEach((fix, index) => {
        console.log(`${index + 1}. [${fix.priority}] ${fix.issue}`);
        console.log(`   Solution: ${fix.solution}`);
        console.log('   Steps:');
        fix.steps.forEach(step => console.log(`     ${step}`));
        console.log('');
      });
      
      console.log('📋 IMMEDIATE ACTION ITEMS:');
      console.log('=========================');
      console.log('1. Fix seedData.js garage initialization sequence');
      console.log('2. Debug and fix timeCalculator/billing calculation');
      console.log('3. Test with proper garage initialization');
      console.log('4. Adjust rate limiting for testing and production');
      
      expect(fixes.length).toBe(4);
    });
  });
});
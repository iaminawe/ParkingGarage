/**
 * Vehicle API Demo Script
 * 
 * This script demonstrates the vehicle management API endpoints
 * with examples of all CRUD operations and validation.
 * 
 * Run with: node examples/vehicle-api-demo.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Sample vehicle data
const sampleVehicles = [
  {
    licensePlate: 'ABC123',
    vehicleType: 'standard',
    make: 'Toyota',
    model: 'Camry',
    color: 'Blue',
    year: 2020,
    ownerName: 'John Doe',
    ownerEmail: 'john@example.com',
    ownerPhone: '555-0123',
    notes: 'Regular customer'
  },
  {
    licensePlate: 'XYZ789',
    vehicleType: 'compact',
    make: 'Honda',
    model: 'Civic',
    color: 'Red',
    year: 2019,
    ownerName: 'Jane Smith',
    ownerEmail: 'jane@example.com',
    ownerPhone: '555-0456'
  },
  {
    licensePlate: 'TRUCK01',
    vehicleType: 'oversized',
    make: 'Ford',
    model: 'F-150',
    color: 'Black',
    year: 2021,
    ownerName: 'Bob Johnson',
    ownerEmail: 'bob@example.com',
    ownerPhone: '555-0789'
  }
];

async function demonstrateVehicleAPI() {
  console.log('🚗 Vehicle Management API Demo\n');

  try {
    // 1. Create vehicles
    console.log('1️⃣ Creating sample vehicles...');
    const createdVehicles = [];
    
    for (const vehicleData of sampleVehicles) {
      try {
        const response = await axios.post(`${API_BASE}/vehicles`, vehicleData);
        createdVehicles.push(response.data.data);
        console.log(`   ✅ Created vehicle: ${vehicleData.licensePlate}`);
      } catch (error) {
        console.log(`   ❌ Failed to create ${vehicleData.licensePlate}: ${error.response?.data?.message || error.message}`);
      }
    }
    console.log();

    // 2. Get all vehicles
    console.log('2️⃣ Fetching all vehicles...');
    try {
      const response = await axios.get(`${API_BASE}/vehicles`);
      console.log(`   ✅ Found ${response.data.data.length} vehicles`);
      console.log(`   📊 Pagination: Page ${response.data.pagination.currentPage} of ${response.data.pagination.totalPages}`);
    } catch (error) {
      console.log(`   ❌ Failed to fetch vehicles: ${error.response?.data?.message || error.message}`);
    }
    console.log();

    // 3. Get specific vehicle
    console.log('3️⃣ Fetching specific vehicle...');
    try {
      const response = await axios.get(`${API_BASE}/vehicles/ABC123`);
      console.log(`   ✅ Found vehicle: ${response.data.data.licensePlate} (${response.data.data.make} ${response.data.data.model})`);
    } catch (error) {
      console.log(`   ❌ Failed to fetch vehicle: ${error.response?.data?.message || error.message}`);
    }
    console.log();

    // 4. Update vehicle
    console.log('4️⃣ Updating vehicle information...');
    try {
      const updateData = {
        color: 'Silver',
        ownerPhone: '555-9999',
        notes: 'Updated contact info'
      };
      const response = await axios.put(`${API_BASE}/vehicles/ABC123`, updateData);
      console.log(`   ✅ Updated vehicle: ${response.data.data.licensePlate}`);
      console.log(`   📝 New color: ${response.data.data.color}`);
    } catch (error) {
      console.log(`   ❌ Failed to update vehicle: ${error.response?.data?.message || error.message}`);
    }
    console.log();

    // 5. Search vehicles
    console.log('5️⃣ Searching vehicles...');
    try {
      const response = await axios.get(`${API_BASE}/vehicles?search=Honda`);
      console.log(`   ✅ Search for "Honda" found ${response.data.data.length} results`);
      response.data.data.forEach(vehicle => {
        console.log(`      🔍 ${vehicle.licensePlate}: ${vehicle.make} ${vehicle.model}`);
      });
    } catch (error) {
      console.log(`   ❌ Search failed: ${error.response?.data?.message || error.message}`);
    }
    console.log();

    // 6. Filter by vehicle type
    console.log('6️⃣ Filtering by vehicle type...');
    try {
      const response = await axios.get(`${API_BASE}/vehicles?vehicleType=compact`);
      console.log(`   ✅ Found ${response.data.data.length} compact vehicles`);
    } catch (error) {
      console.log(`   ❌ Filter failed: ${error.response?.data?.message || error.message}`);
    }
    console.log();

    // 7. Get vehicle metrics
    console.log('7️⃣ Getting vehicle metrics...');
    try {
      const response = await axios.get(`${API_BASE}/vehicles/metrics`);
      console.log(`   ✅ Vehicle Statistics:`);
      console.log(`      📊 Total: ${response.data.data.total}`);
      console.log(`      🚗 By Type: Compact(${response.data.data.byType.compact}), Standard(${response.data.data.byType.standard}), Oversized(${response.data.data.byType.oversized})`);
      console.log(`      📈 Active: ${response.data.data.byStatus.active}, Inactive: ${response.data.data.byStatus.inactive}`);
    } catch (error) {
      console.log(`   ❌ Metrics failed: ${error.response?.data?.message || error.message}`);
    }
    console.log();

    // 8. Test validation errors
    console.log('8️⃣ Testing validation (should fail)...');
    try {
      await axios.post(`${API_BASE}/vehicles`, {
        licensePlate: 'X', // Too short
        vehicleType: 'invalid', // Invalid type
        ownerEmail: 'not-an-email' // Invalid email
      });
      console.log('   ❌ Validation should have failed!');
    } catch (error) {
      console.log('   ✅ Validation correctly rejected invalid data:');
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => console.log(`      • ${err}`));
      }
    }
    console.log();

    // 9. Test duplicate detection
    console.log('9️⃣ Testing duplicate detection...');
    try {
      await axios.post(`${API_BASE}/vehicles`, {
        licensePlate: 'ABC123', // Duplicate
        vehicleType: 'standard'
      });
      console.log('   ❌ Should have detected duplicate!');
    } catch (error) {
      console.log(`   ✅ Duplicate correctly detected: ${error.response?.data?.message}`);
    }
    console.log();

    // 10. Bulk delete (cleanup)
    console.log('🔟 Cleaning up with bulk delete...');
    try {
      const vehicleIds = createdVehicles.map(v => v.licensePlate);
      const response = await axios.post(`${API_BASE}/vehicles/bulk-delete`, { vehicleIds });
      console.log(`   ✅ Bulk delete: ${response.data.data.successful} successful, ${response.data.data.failed} failed`);
    } catch (error) {
      console.log(`   ❌ Bulk delete failed: ${error.response?.data?.message || error.message}`);
    }

    console.log('\n🎉 Demo completed successfully!');
    console.log('\n📚 Available Endpoints:');
    console.log('   GET    /api/vehicles              - List all vehicles');
    console.log('   POST   /api/vehicles              - Create new vehicle');
    console.log('   GET    /api/vehicles/:id          - Get specific vehicle');
    console.log('   PUT    /api/vehicles/:id          - Update vehicle');
    console.log('   DELETE /api/vehicles/:id          - Delete vehicle');
    console.log('   POST   /api/vehicles/bulk-delete  - Bulk delete vehicles');
    console.log('   GET    /api/vehicles/metrics      - Get vehicle statistics');
    console.log('   GET    /api/vehicles/search       - Search vehicles (legacy)');

  } catch (error) {
    console.error('Demo failed:', error.message);
  }
}

// Run demo if server is available
async function checkServer() {
  try {
    await axios.get(`${API_BASE}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function runDemo() {
  console.log('Checking if server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running on http://localhost:3001');
    console.log('💡 Start the server with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  await demonstrateVehicleAPI();
}

if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { demonstrateVehicleAPI };
/**
 * Test script for Sessions Management API
 * 
 * This script tests the complete sessions management functionality
 * including creating sessions via check-in, listing sessions, and ending sessions.
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testSessionsManagement() {
    console.log('🧪 Testing Sessions Management API...\n');

    try {
        // Test 1: Check if server is running
        console.log('1. Testing server health...');
        const healthResponse = await axios.get('http://localhost:3000/health');
        console.log('✅ Server is running\n');

        // Test 2: Check-in a vehicle (this should create a session)
        console.log('2. Testing vehicle check-in (should create session)...');
        const checkinData = {
            licensePlate: 'TEST-001',
            vehicleType: 'compact'
        };
        
        const checkinResponse = await axios.post(`${API_BASE}/checkin`, checkinData);
        console.log('✅ Vehicle checked in successfully');
        console.log('   License Plate:', checkinResponse.data.vehicle?.licensePlate);
        console.log('   Spot:', checkinResponse.data.spot?.id);
        console.log('   Session:', checkinResponse.data.session?.id);
        console.log('');

        // Test 3: List all sessions
        console.log('3. Testing sessions listing...');
        const sessionsResponse = await axios.get(`${API_BASE}/sessions`);
        console.log('✅ Sessions retrieved successfully');
        console.log('   Total sessions:', sessionsResponse.data.data?.length || 0);
        console.log('   Active sessions:', sessionsResponse.data.data?.filter(s => s.status === 'active').length || 0);
        console.log('');

        // Test 4: Get session statistics
        console.log('4. Testing session statistics...');
        const statsResponse = await axios.get(`${API_BASE}/sessions/stats`);
        console.log('✅ Session statistics retrieved successfully');
        console.log('   Stats:', JSON.stringify(statsResponse.data.data, null, 2));
        console.log('');

        // Test 5: End a session
        if (sessionsResponse.data.data?.length > 0) {
            const activeSession = sessionsResponse.data.data.find(s => s.status === 'active');
            if (activeSession) {
                console.log('5. Testing session end...');
                const endResponse = await axios.post(`${API_BASE}/sessions/${activeSession.id}/end`, {
                    reason: 'Test completion'
                });
                console.log('✅ Session ended successfully');
                console.log('   Session ID:', activeSession.id);
                console.log('   Final cost:', endResponse.data.data?.cost || 'Not calculated');
                console.log('');
            }
        }

        // Test 6: Check sessions after ending one
        console.log('6. Testing sessions listing after ending session...');
        const finalSessionsResponse = await axios.get(`${API_BASE}/sessions`);
        console.log('✅ Final sessions check completed');
        console.log('   Total sessions:', finalSessionsResponse.data.data?.length || 0);
        console.log('   Active sessions:', finalSessionsResponse.data.data?.filter(s => s.status === 'active').length || 0);
        console.log('   Completed sessions:', finalSessionsResponse.data.data?.filter(s => s.status === 'completed').length || 0);
        console.log('');

        console.log('🎉 All sessions management tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        console.log('\n💡 Make sure the server is running with: npm start');
    }
}

// Run the test
testSessionsManagement();
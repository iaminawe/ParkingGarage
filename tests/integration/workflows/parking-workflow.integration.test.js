/**
 * Parking Workflow Integration Tests
 * 
 * Tests complete parking workflows from vehicle entry to payment
 */

const request = require('supertest');
const { faker } = require('@faker-js/faker');
const { createMockApp } = require('../../helpers/mockApp');

describe('Parking Workflow Integration Tests', () => {
  let app;
  let api;
  let testSessions = [];

  beforeEach(() => {
    app = createMockApp();
    api = app.locals.api;
    testSessions = [];
    // Reset garage to empty state
    api.reset();
  });

  afterEach(async () => {
    // Cleanup test sessions
    for (const session of testSessions) {
      try {
        if (session.licensePlate) {
          await request(app)
            .post('/api/checkout')
            .send({ licensePlate: session.licensePlate });
        }
      } catch (error) {
        // Session already ended or doesn't exist
      }
    }
  });

  describe('1. Vehicle Entry and Spot Assignment Workflow', () => {
    test('should complete full entry workflow: entry → spot assignment → session creation → receipt', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard',
        driverName: faker.person.fullName(),
        phoneNumber: faker.phone.number()
      };

      // Step 1: Check garage availability
      const availabilityResponse = await request(app)
        .get('/api/spots?status=available')
        .expect(200);

      expect(availabilityResponse.body.count).toBe(125); // Full garage
      const initialAvailable = availabilityResponse.body.count;

      // Step 2: Get next available spot recommendation
      const spotRecommendationResponse = await request(app)
        .get('/api/spots/next-available')
        .query({ vehicleType: vehicleData.vehicleType })
        .expect(200);

      expect(spotRecommendationResponse.body).toHaveProperty('spotId');
      expect(spotRecommendationResponse.body.status).toBe('available');
      const recommendedSpot = spotRecommendationResponse.body.spotId;

      // Step 3: Check in vehicle
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      expect(checkinResponse.body).toMatchObject({
        licensePlate: vehicleData.licensePlate,
        vehicleType: vehicleData.vehicleType,
        spot: recommendedSpot,
        status: 'active'
      });

      expect(checkinResponse.body).toHaveProperty('ticketId');
      expect(checkinResponse.body).toHaveProperty('checkInTime');
      expect(checkinResponse.body).toHaveProperty('floor');
      expect(checkinResponse.body).toHaveProperty('bay');

      testSessions.push({ licensePlate: vehicleData.licensePlate });

      // Step 4: Verify spot is now occupied
      const spotStatusResponse = await request(app)
        .get(`/api/spots/${recommendedSpot}`)
        .expect(200);

      expect(spotStatusResponse.body.status).toBe('occupied');
      expect(spotStatusResponse.body.occupiedBy).toBe(vehicleData.licensePlate);
      expect(spotStatusResponse.body.since).toBeTruthy();

      // Step 5: Verify garage availability decreased
      const updatedAvailabilityResponse = await request(app)
        .get('/api/spots?status=available')
        .expect(200);

      expect(updatedAvailabilityResponse.body.count).toBe(initialAvailable - 1);

      // Step 6: Get parking session details
      const sessionResponse = await request(app)
        .get(`/api/sessions/${checkinResponse.body.ticketId}`)
        .expect(200);

      expect(sessionResponse.body).toMatchObject({
        licensePlate: vehicleData.licensePlate,
        spotId: recommendedSpot,
        status: 'active',
        vehicleType: vehicleData.vehicleType
      });

      expect(sessionResponse.body).toHaveProperty('checkInTime');
      expect(sessionResponse.body).toHaveProperty('estimatedCost');

      // Step 7: Generate parking receipt
      const receiptResponse = await request(app)
        .get(`/api/sessions/${checkinResponse.body.ticketId}/receipt`)
        .expect(200);

      expect(receiptResponse.body).toHaveProperty('ticketId');
      expect(receiptResponse.body).toHaveProperty('checkInTime');
      expect(receiptResponse.body).toHaveProperty('spotLocation');
      expect(receiptResponse.body).toHaveProperty('parkingInstructions');
    });

    test('should handle vehicle type-based spot assignments', async () => {
      const vehicleTypes = [
        { type: 'compact', expectedSpotFeatures: [] },
        { type: 'standard', expectedSpotFeatures: [] },
        { type: 'oversized', expectedSpotFeatures: ['large_space'] },
        { type: 'electric', expectedSpotFeatures: ['ev_charging'] },
        { type: 'handicap', expectedSpotFeatures: ['handicap_accessible'] }
      ];

      for (const vehicleConfig of vehicleTypes) {
        const vehicleData = {
          licensePlate: faker.vehicle.vrm(),
          vehicleType: vehicleConfig.type,
          driverName: faker.person.fullName()
        };

        const checkinResponse = await request(app)
          .post('/api/checkin')
          .send(vehicleData)
          .expect(201);

        testSessions.push({ licensePlate: vehicleData.licensePlate });

        // Verify spot matches vehicle requirements
        const spotResponse = await request(app)
          .get(`/api/spots/${checkinResponse.body.spot}`)
          .expect(200);

        if (vehicleConfig.expectedSpotFeatures.length > 0) {
          expect(spotResponse.body.features).toEqual(
            expect.arrayContaining(vehicleConfig.expectedSpotFeatures)
          );
        }

        // Verify vehicle type is recorded in session
        const sessionResponse = await request(app)
          .get(`/api/sessions/${checkinResponse.body.ticketId}`)
          .expect(200);

        expect(sessionResponse.body.vehicleType).toBe(vehicleConfig.type);
      }
    });

    test('should handle garage capacity and queue management', async () => {
      // Fill garage to 95% capacity (119/125 spots)
      const vehicles = [];
      for (let i = 0; i < 119; i++) {
        const licensePlate = `LOAD-${String(i + 1).padStart(3, '0')}`;
        const response = await request(app)
          .post('/api/checkin')
          .send({ 
            licensePlate,
            vehicleType: 'standard' 
          })
          .expect(201);
        
        vehicles.push({ licensePlate, ticketId: response.body.ticketId });
        testSessions.push({ licensePlate });
      }

      // Check remaining availability
      const availabilityResponse = await request(app)
        .get('/api/garage/status')
        .expect(200);

      expect(availabilityResponse.body.available).toBe(6);
      expect(availabilityResponse.body.occupancyRate).toBeCloseTo(95.2, 1);

      // Fill remaining spots
      for (let i = 0; i < 6; i++) {
        const licensePlate = `FINAL-${i + 1}`;
        await request(app)
          .post('/api/checkin')
          .send({ 
            licensePlate,
            vehicleType: 'standard' 
          })
          .expect(201);
        
        testSessions.push({ licensePlate });
      }

      // Garage should now be full
      const fullGarageResponse = await request(app)
        .get('/api/garage/status')
        .expect(200);

      expect(fullGarageResponse.body.available).toBe(0);
      expect(fullGarageResponse.body.occupancyRate).toBe(100);

      // New check-in should be queued or rejected
      const queueResponse = await request(app)
        .post('/api/checkin')
        .send({ 
          licensePlate: 'QUEUED-001',
          vehicleType: 'standard'
        })
        .expect(503);

      expect(queueResponse.body.error).toBe('No available spots');
      expect(queueResponse.body).toHaveProperty('waitTime');
      expect(queueResponse.body).toHaveProperty('queuePosition');

      // Free up a spot and verify queue processing
      await request(app)
        .post('/api/checkout')
        .send({ licensePlate: vehicles[0].licensePlate })
        .expect(200);

      // Now the queued vehicle should be able to check in
      const queuedCheckinResponse = await request(app)
        .post('/api/checkin')
        .send({ 
          licensePlate: 'QUEUED-001',
          vehicleType: 'standard'
        })
        .expect(201);

      expect(queuedCheckinResponse.body.licensePlate).toBe('QUEUED-001');
      testSessions.push({ licensePlate: 'QUEUED-001' });
    });
  });

  describe('2. Parking Session Management Workflow', () => {
    test('should track session lifecycle with real-time updates', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard',
        driverName: faker.person.fullName()
      };

      // Check in vehicle
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      testSessions.push({ licensePlate: vehicleData.licensePlate });
      const ticketId = checkinResponse.body.ticketId;

      // Initial session state
      let sessionResponse = await request(app)
        .get(`/api/sessions/${ticketId}`)
        .expect(200);

      expect(sessionResponse.body.status).toBe('active');
      expect(sessionResponse.body.duration).toBe(0);
      expect(sessionResponse.body.currentCost).toBe(0);

      // Wait for some time to pass (simulate parking duration)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check updated session with duration
      sessionResponse = await request(app)
        .get(`/api/sessions/${ticketId}`)
        .expect(200);

      expect(sessionResponse.body.duration).toBeGreaterThan(0);
      expect(sessionResponse.body.currentCost).toBeGreaterThan(0);

      // Extend parking session
      const extensionResponse = await request(app)
        .post(`/api/sessions/${ticketId}/extend`)
        .send({ 
          extensionHours: 2,
          paymentMethod: 'credit_card' 
        })
        .expect(200);

      expect(extensionResponse.body.message).toBe('Parking extended successfully');
      expect(extensionResponse.body.newExpiryTime).toBeTruthy();

      // Verify extension recorded in session
      sessionResponse = await request(app)
        .get(`/api/sessions/${ticketId}`)
        .expect(200);

      expect(sessionResponse.body.extensions).toHaveLength(1);
      expect(sessionResponse.body.extensions[0].hours).toBe(2);

      // Add notes to session
      const noteResponse = await request(app)
        .post(`/api/sessions/${ticketId}/notes`)
        .send({ 
          note: 'Customer requested spot close to elevator',
          type: 'customer_request'
        })
        .expect(200);

      expect(noteResponse.body.message).toBe('Note added successfully');

      // Verify note in session
      sessionResponse = await request(app)
        .get(`/api/sessions/${ticketId}`)
        .expect(200);

      expect(sessionResponse.body.notes).toHaveLength(1);
      expect(sessionResponse.body.notes[0].note).toBe('Customer requested spot close to elevator');
    });

    test('should handle session modifications and special requests', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard',
        specialRequests: ['close_to_entrance', 'covered_parking']
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      testSessions.push({ licensePlate: vehicleData.licensePlate });
      const ticketId = checkinResponse.body.ticketId;

      // Request spot change
      const spotChangeResponse = await request(app)
        .post(`/api/sessions/${ticketId}/change-spot`)
        .send({ 
          reason: 'Customer requested ground floor',
          preferredFloor: 1
        })
        .expect(200);

      expect(spotChangeResponse.body.newSpotId).toBeTruthy();
      expect(spotChangeResponse.body.newSpotId).toMatch(/^F1-/); // Ground floor

      // Verify old spot is available and new spot is occupied
      const oldSpotResponse = await request(app)
        .get(`/api/spots/${checkinResponse.body.spot}`)
        .expect(200);
      
      const newSpotResponse = await request(app)
        .get(`/api/spots/${spotChangeResponse.body.newSpotId}`)
        .expect(200);

      expect(oldSpotResponse.body.status).toBe('available');
      expect(newSpotResponse.body.status).toBe('occupied');
      expect(newSpotResponse.body.occupiedBy).toBe(vehicleData.licensePlate);

      // Add vehicle information
      const vehicleInfoResponse = await request(app)
        .put(`/api/sessions/${ticketId}/vehicle-info`)
        .send({
          make: 'Toyota',
          model: 'Camry',
          year: 2022,
          color: 'Blue',
          vin: '1HGBH41JXMN109186'
        })
        .expect(200);

      expect(vehicleInfoResponse.body.message).toBe('Vehicle information updated');

      // Verify updated session contains all modifications
      const finalSessionResponse = await request(app)
        .get(`/api/sessions/${ticketId}`)
        .expect(200);

      expect(finalSessionResponse.body.spotId).toBe(spotChangeResponse.body.newSpotId);
      expect(finalSessionResponse.body.spotHistory).toHaveLength(2);
      expect(finalSessionResponse.body.vehicleInfo).toMatchObject({
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        color: 'Blue'
      });
    });
  });

  describe('3. Checkout and Payment Integration Workflow', () => {
    test('should complete full checkout workflow: duration calculation → payment processing → receipt generation', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard',
        driverName: faker.person.fullName()
      };

      // Check in vehicle
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      testSessions.push({ licensePlate: vehicleData.licensePlate });
      const ticketId = checkinResponse.body.ticketId;

      // Simulate parking duration
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Initiate checkout process
      const checkoutInitResponse = await request(app)
        .post(`/api/checkout/calculate`)
        .send({ 
          licensePlate: vehicleData.licensePlate,
          discountCode: 'WELCOME10' 
        })
        .expect(200);

      expect(checkoutInitResponse.body).toHaveProperty('duration');
      expect(checkoutInitResponse.body).toHaveProperty('baseCost');
      expect(checkoutInitResponse.body).toHaveProperty('discounts');
      expect(checkoutInitResponse.body).toHaveProperty('totalCost');
      expect(checkoutInitResponse.body).toHaveProperty('paymentOptions');

      const calculatedCost = checkoutInitResponse.body.totalCost;

      // Process payment
      const paymentData = {
        licensePlate: vehicleData.licensePlate,
        paymentMethod: 'credit_card',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        amount: calculatedCost
      };

      const paymentResponse = await request(app)
        .post('/api/checkout/payment')
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body.paymentStatus).toBe('completed');
      expect(paymentResponse.body).toHaveProperty('transactionId');
      expect(paymentResponse.body).toHaveProperty('receiptId');

      // Complete checkout
      const checkoutResponse = await request(app)
        .post('/api/checkout')
        .send({ 
          licensePlate: vehicleData.licensePlate,
          paymentTransactionId: paymentResponse.body.transactionId
        })
        .expect(200);

      expect(checkoutResponse.body).toMatchObject({
        licensePlate: vehicleData.licensePlate,
        status: 'completed',
        totalCost: calculatedCost
      });

      expect(checkoutResponse.body).toHaveProperty('checkOutTime');
      expect(checkoutResponse.body).toHaveProperty('duration');
      expect(checkoutResponse.body).toHaveProperty('receiptUrl');

      // Verify spot is now available
      const spotResponse = await request(app)
        .get(`/api/spots/${checkinResponse.body.spot}`)
        .expect(200);

      expect(spotResponse.body.status).toBe('available');
      expect(spotResponse.body.occupiedBy).toBeNull();

      // Get final receipt
      const receiptResponse = await request(app)
        .get(`/api/receipts/${paymentResponse.body.receiptId}`)
        .expect(200);

      expect(receiptResponse.body).toMatchObject({
        ticketId,
        licensePlate: vehicleData.licensePlate,
        totalAmount: calculatedCost,
        paymentMethod: 'credit_card',
        status: 'paid'
      });

      expect(receiptResponse.body).toHaveProperty('checkInTime');
      expect(receiptResponse.body).toHaveProperty('checkOutTime');
      expect(receiptResponse.body).toHaveProperty('parkingDuration');
      expect(receiptResponse.body).toHaveProperty('itemizedCharges');

      // Remove from test sessions since checkout is complete
      testSessions = testSessions.filter(s => s.licensePlate !== vehicleData.licensePlate);
    });

    test('should handle different payment methods and validation', async () => {
      const paymentMethods = [
        {
          method: 'credit_card',
          data: {
            cardNumber: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123',
            holderName: 'John Doe'
          }
        },
        {
          method: 'debit_card',
          data: {
            cardNumber: '4000056655665556',
            expiryMonth: '06',
            expiryYear: '2024',
            cvv: '456',
            pin: '1234'
          }
        },
        {
          method: 'mobile_payment',
          data: {
            provider: 'apple_pay',
            token: 'ap_mock_token_123'
          }
        },
        {
          method: 'cash',
          data: {
            amountTendered: 15.00
          }
        }
      ];

      for (const paymentConfig of paymentMethods) {
        const vehicleData = {
          licensePlate: faker.vehicle.vrm(),
          vehicleType: 'standard'
        };

        // Check in
        const checkinResponse = await request(app)
          .post('/api/checkin')
          .send(vehicleData)
          .expect(201);

        testSessions.push({ licensePlate: vehicleData.licensePlate });

        // Simulate parking time
        await new Promise(resolve => setTimeout(resolve, 500));

        // Calculate cost
        const costResponse = await request(app)
          .post('/api/checkout/calculate')
          .send({ licensePlate: vehicleData.licensePlate })
          .expect(200);

        // Process payment with specific method
        const paymentData = {
          licensePlate: vehicleData.licensePlate,
          paymentMethod: paymentConfig.method,
          amount: costResponse.body.totalCost,
          ...paymentConfig.data
        };

        const paymentResponse = await request(app)
          .post('/api/checkout/payment')
          .send(paymentData)
          .expect(200);

        expect(paymentResponse.body.paymentStatus).toBe('completed');
        expect(paymentResponse.body.paymentMethod).toBe(paymentConfig.method);

        // Complete checkout
        await request(app)
          .post('/api/checkout')
          .send({ 
            licensePlate: vehicleData.licensePlate,
            paymentTransactionId: paymentResponse.body.transactionId
          })
          .expect(200);

        // Remove from test sessions
        testSessions = testSessions.filter(s => s.licensePlate !== vehicleData.licensePlate);
      }
    });

    test('should handle payment failures and retry logic', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard'
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      testSessions.push({ licensePlate: vehicleData.licensePlate });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try payment with invalid card
      const invalidPaymentData = {
        licensePlate: vehicleData.licensePlate,
        paymentMethod: 'credit_card',
        cardNumber: '4000000000000002', // Declined card
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        amount: 10.00
      };

      const failedPaymentResponse = await request(app)
        .post('/api/checkout/payment')
        .send(invalidPaymentData)
        .expect(402);

      expect(failedPaymentResponse.body.paymentStatus).toBe('failed');
      expect(failedPaymentResponse.body.error).toContain('declined');

      // Retry with valid payment
      const validPaymentData = {
        ...invalidPaymentData,
        cardNumber: '4111111111111111'
      };

      const successPaymentResponse = await request(app)
        .post('/api/checkout/payment')
        .send(validPaymentData)
        .expect(200);

      expect(successPaymentResponse.body.paymentStatus).toBe('completed');

      // Complete checkout
      await request(app)
        .post('/api/checkout')
        .send({ 
          licensePlate: vehicleData.licensePlate,
          paymentTransactionId: successPaymentResponse.body.transactionId
        })
        .expect(200);

      testSessions = testSessions.filter(s => s.licensePlate !== vehicleData.licensePlate);
    });
  });

  describe('4. Membership and Benefits Workflow', () => {
    test('should apply membership benefits throughout parking workflow', async () => {
      // Create premium member
      const memberData = {
        email: faker.internet.email(),
        membershipType: 'premium',
        membershipId: 'PREM-' + faker.string.alphanumeric(6).toUpperCase()
      };

      const memberResponse = await request(app)
        .post('/api/members/register')
        .send(memberData)
        .expect(201);

      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard',
        membershipId: memberData.membershipId
      };

      // Check in with membership benefits
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      testSessions.push({ licensePlate: vehicleData.licensePlate });

      // Verify premium spot assignment
      expect(checkinResponse.body.benefits).toContain('premium_spot');
      expect(checkinResponse.body.spot).toMatch(/^F1-A-/); // Premium spots on ground floor

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Calculate cost with member discount
      const costResponse = await request(app)
        .post('/api/checkout/calculate')
        .send({ 
          licensePlate: vehicleData.licensePlate,
          membershipId: memberData.membershipId
        })
        .expect(200);

      expect(costResponse.body.discounts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'membership',
            description: 'Premium member 20% discount',
            amount: expect.any(Number)
          })
        ])
      );

      // Member should get special benefits
      expect(costResponse.body.benefits).toEqual(
        expect.arrayContaining([
          'discounted_rates',
          'priority_spots',
          'extended_time_limits'
        ])
      );

      // Complete payment and checkout
      const paymentResponse = await request(app)
        .post('/api/checkout/payment')
        .send({
          licensePlate: vehicleData.licensePlate,
          paymentMethod: 'membership_credit',
          amount: costResponse.body.totalCost
        })
        .expect(200);

      await request(app)
        .post('/api/checkout')
        .send({ 
          licensePlate: vehicleData.licensePlate,
          paymentTransactionId: paymentResponse.body.transactionId
        })
        .expect(200);

      testSessions = testSessions.filter(s => s.licensePlate !== vehicleData.licensePlate);
    });
  });

  describe('5. Real-time Updates and Notifications', () => {
    test('should provide real-time updates throughout parking workflow', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard',
        phoneNumber: faker.phone.number(),
        notificationPreferences: ['sms', 'push']
      };

      // Check in with notification preferences
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      testSessions.push({ licensePlate: vehicleData.licensePlate });
      const ticketId = checkinResponse.body.ticketId;

      // Verify check-in notification was sent
      const notificationsResponse = await request(app)
        .get(`/api/notifications?ticketId=${ticketId}`)
        .expect(200);

      expect(notificationsResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'checkin_confirmation',
            method: 'sms',
            status: 'sent'
          })
        ])
      );

      // Simulate time passing to trigger time-based notifications
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check for parking reminder notification (typically sent after 2 hours)
      const reminderResponse = await request(app)
        .post(`/api/sessions/${ticketId}/send-reminder`)
        .send({ type: 'parking_expiry_warning' })
        .expect(200);

      expect(reminderResponse.body.message).toBe('Reminder sent successfully');

      // Get updated notifications
      const updatedNotificationsResponse = await request(app)
        .get(`/api/notifications?ticketId=${ticketId}`)
        .expect(200);

      expect(updatedNotificationsResponse.body.length).toBeGreaterThan(1);

      // Complete checkout
      await request(app)
        .post('/api/checkout')
        .send({ licensePlate: vehicleData.licensePlate })
        .expect(200);

      testSessions = testSessions.filter(s => s.licensePlate !== vehicleData.licensePlate);
    });
  });
});
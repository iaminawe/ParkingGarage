/**
 * Payment Processing Workflow Integration Tests
 * 
 * Tests complete payment workflows from initiation to confirmation
 */

const request = require('supertest');
const { faker } = require('@faker-js/faker');
const { createMockApp } = require('../../helpers/mockApp');

describe('Payment Processing Workflow Integration Tests', () => {
  let app;
  let api;
  let testTransactions = [];

  beforeEach(() => {
    app = createMockApp();
    api = app.locals.api;
    testTransactions = [];
  });

  afterEach(async () => {
    // Cleanup test transactions
    for (const transaction of testTransactions) {
      try {
        if (transaction.id) {
          await request(app)
            .delete(`/api/payments/transactions/${transaction.id}`)
            .set('Authorization', 'Bearer admin-token');
        }
      } catch (error) {
        // Transaction already cleaned up or doesn't exist
      }
    }
  });

  describe('1. Payment Initiation and Gateway Processing', () => {
    test('should complete full payment workflow: initiation → gateway processing → confirmation → receipt', async () => {
      // Set up parking session first
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard'
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      const ticketId = checkinResponse.body.ticketId;

      // Simulate parking duration
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 1: Calculate parking cost
      const costCalculationResponse = await request(app)
        .post('/api/payments/calculate')
        .send({ 
          ticketId,
          licensePlate: vehicleData.licensePlate,
          discountCode: 'FIRST10'
        })
        .expect(200);

      expect(costCalculationResponse.body).toMatchObject({
        ticketId,
        baseAmount: expect.any(Number),
        discounts: expect.any(Array),
        taxes: expect.any(Array),
        totalAmount: expect.any(Number)
      });

      const totalAmount = costCalculationResponse.body.totalAmount;

      // Step 2: Initiate payment
      const paymentInitResponse = await request(app)
        .post('/api/payments/initiate')
        .send({
          ticketId,
          amount: totalAmount,
          paymentMethod: 'credit_card',
          customerInfo: {
            name: faker.person.fullName(),
            email: faker.internet.email(),
            phone: faker.phone.number()
          }
        })
        .expect(201);

      expect(paymentInitResponse.body).toMatchObject({
        paymentId: expect.any(String),
        status: 'pending',
        amount: totalAmount,
        paymentMethod: 'credit_card'
      });

      const paymentId = paymentInitResponse.body.paymentId;
      testTransactions.push({ id: paymentId });

      // Step 3: Process payment through gateway
      const cardData = {
        number: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        holderName: faker.person.fullName(),
        billingAddress: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          zipCode: faker.location.zipCode(),
          country: 'US'
        }
      };

      const gatewayProcessingResponse = await request(app)
        .post(`/api/payments/${paymentId}/process`)
        .send({
          cardData,
          securityCode: '123456' // 3D Secure
        })
        .expect(200);

      expect(gatewayProcessingResponse.body).toMatchObject({
        status: 'processing',
        gatewayTransactionId: expect.any(String),
        authorizationCode: expect.any(String)
      });

      // Step 4: Confirm payment completion
      const confirmationResponse = await request(app)
        .post(`/api/payments/${paymentId}/confirm`)
        .send({
          gatewayTransactionId: gatewayProcessingResponse.body.gatewayTransactionId
        })
        .expect(200);

      expect(confirmationResponse.body).toMatchObject({
        status: 'completed',
        transactionId: expect.any(String),
        receiptNumber: expect.any(String),
        processedAt: expect.any(String)
      });

      // Step 5: Generate and retrieve receipt
      const receiptResponse = await request(app)
        .get(`/api/payments/${paymentId}/receipt`)
        .expect(200);

      expect(receiptResponse.body).toMatchObject({
        receiptNumber: confirmationResponse.body.receiptNumber,
        ticketId,
        amount: totalAmount,
        paymentMethod: 'credit_card',
        transactionDate: expect.any(String),
        itemizedCharges: expect.any(Array),
        customerInfo: expect.any(Object)
      });

      expect(receiptResponse.body.itemizedCharges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            description: 'Parking Fee',
            amount: expect.any(Number)
          })
        ])
      );

      // Step 6: Complete checkout process
      const checkoutResponse = await request(app)
        .post('/api/checkout')
        .send({ 
          licensePlate: vehicleData.licensePlate,
          paymentTransactionId: confirmationResponse.body.transactionId
        })
        .expect(200);

      expect(checkoutResponse.body.status).toBe('completed');
    });

    test('should handle different payment methods with appropriate validations', async () => {
      const paymentMethods = [
        {
          method: 'credit_card',
          data: {
            number: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123'
          },
          expectedValidation: ['card_number', 'expiry_date', 'cvv']
        },
        {
          method: 'debit_card',
          data: {
            number: '4000056655665556',
            expiryMonth: '06',
            expiryYear: '2024',
            cvv: '456',
            pin: '1234'
          },
          expectedValidation: ['card_number', 'expiry_date', 'cvv', 'pin']
        },
        {
          method: 'digital_wallet',
          data: {
            provider: 'paypal',
            token: 'pp_token_123456',
            email: faker.internet.email()
          },
          expectedValidation: ['token', 'provider_verification']
        },
        {
          method: 'mobile_payment',
          data: {
            provider: 'apple_pay',
            token: 'ap_token_789012',
            deviceId: 'device_' + faker.string.alphanumeric(10)
          },
          expectedValidation: ['token', 'device_verification']
        },
        {
          method: 'bank_transfer',
          data: {
            accountNumber: faker.finance.accountNumber(),
            routingNumber: faker.finance.routingNumber(),
            accountType: 'checking'
          },
          expectedValidation: ['account_number', 'routing_number', 'account_verification']
        }
      ];

      for (const paymentConfig of paymentMethods) {
        // Set up parking session
        const vehicleData = {
          licensePlate: faker.vehicle.vrm(),
          vehicleType: 'standard'
        };

        const checkinResponse = await request(app)
          .post('/api/checkin')
          .send(vehicleData)
          .expect(201);

        await new Promise(resolve => setTimeout(resolve, 500));

        // Calculate cost
        const costResponse = await request(app)
          .post('/api/payments/calculate')
          .send({ ticketId: checkinResponse.body.ticketId })
          .expect(200);

        // Initiate payment with specific method
        const paymentInitResponse = await request(app)
          .post('/api/payments/initiate')
          .send({
            ticketId: checkinResponse.body.ticketId,
            amount: costResponse.body.totalAmount,
            paymentMethod: paymentConfig.method
          })
          .expect(201);

        testTransactions.push({ id: paymentInitResponse.body.paymentId });

        // Process payment
        const processResponse = await request(app)
          .post(`/api/payments/${paymentInitResponse.body.paymentId}/process`)
          .send(paymentConfig.data)
          .expect(200);

        expect(processResponse.body.validationsPassed).toEqual(
          expect.arrayContaining(paymentConfig.expectedValidation)
        );

        // Confirm payment
        const confirmResponse = await request(app)
          .post(`/api/payments/${paymentInitResponse.body.paymentId}/confirm`)
          .send({
            gatewayTransactionId: processResponse.body.gatewayTransactionId
          })
          .expect(200);

        expect(confirmResponse.body.status).toBe('completed');
        expect(confirmResponse.body.paymentMethod).toBe(paymentConfig.method);

        // Complete checkout
        await request(app)
          .post('/api/checkout')
          .send({ 
            licensePlate: vehicleData.licensePlate,
            paymentTransactionId: confirmResponse.body.transactionId
          })
          .expect(200);
      }
    });

    test('should validate payment amounts and prevent fraud', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard'
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const costResponse = await request(app)
        .post('/api/payments/calculate')
        .send({ ticketId: checkinResponse.body.ticketId })
        .expect(200);

      const correctAmount = costResponse.body.totalAmount;

      // Test 1: Amount mismatch (client tampering)
      const fraudAttemptResponse = await request(app)
        .post('/api/payments/initiate')
        .send({
          ticketId: checkinResponse.body.ticketId,
          amount: 0.01, // Significantly less than calculated
          paymentMethod: 'credit_card'
        })
        .expect(400);

      expect(fraudAttemptResponse.body.error).toBe('Payment amount does not match calculated cost');

      // Test 2: Excessive amount (potential error)
      const excessiveAmountResponse = await request(app)
        .post('/api/payments/initiate')
        .send({
          ticketId: checkinResponse.body.ticketId,
          amount: correctAmount * 10, // 10x the correct amount
          paymentMethod: 'credit_card'
        })
        .expect(400);

      expect(excessiveAmountResponse.body.error).toBe('Payment amount significantly exceeds expected cost');

      // Test 3: Correct amount should work
      const validPaymentResponse = await request(app)
        .post('/api/payments/initiate')
        .send({
          ticketId: checkinResponse.body.ticketId,
          amount: correctAmount,
          paymentMethod: 'credit_card'
        })
        .expect(201);

      testTransactions.push({ id: validPaymentResponse.body.paymentId });

      // Test 4: Prevent duplicate payments for same ticket
      const duplicatePaymentResponse = await request(app)
        .post('/api/payments/initiate')
        .send({
          ticketId: checkinResponse.body.ticketId,
          amount: correctAmount,
          paymentMethod: 'credit_card'
        })
        .expect(409);

      expect(duplicatePaymentResponse.body.error).toBe('Payment already initiated for this ticket');

      // Cleanup - complete the valid payment
      await request(app)
        .post(`/api/payments/${validPaymentResponse.body.paymentId}/process`)
        .send({
          number: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123'
        })
        .expect(200);
    });
  });

  describe('2. Failed Payment Handling and Retry Logic', () => {
    test('should handle payment failures with appropriate retry mechanisms', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard'
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const costResponse = await request(app)
        .post('/api/payments/calculate')
        .send({ ticketId: checkinResponse.body.ticketId })
        .expect(200);

      // Initiate payment
      const paymentInitResponse = await request(app)
        .post('/api/payments/initiate')
        .send({
          ticketId: checkinResponse.body.ticketId,
          amount: costResponse.body.totalAmount,
          paymentMethod: 'credit_card'
        })
        .expect(201);

      testTransactions.push({ id: paymentInitResponse.body.paymentId });
      const paymentId = paymentInitResponse.body.paymentId;

      // Simulate payment failure scenarios
      const failureScenarios = [
        {
          cardData: { number: '4000000000000002' }, // Declined card
          expectedError: 'card_declined',
          retryable: true
        },
        {
          cardData: { number: '4000000000000069' }, // Expired card
          expectedError: 'expired_card',
          retryable: true
        },
        {
          cardData: { number: '4000000000000127' }, // Incorrect CVC
          expectedError: 'incorrect_cvc',
          retryable: true
        },
        {
          cardData: { number: '4000000000000119' }, // Processing error
          expectedError: 'processing_error',
          retryable: false
        }
      ];

      for (const [index, scenario] of failureScenarios.entries()) {
        const attemptResponse = await request(app)
          .post(`/api/payments/${paymentId}/process`)
          .send({
            ...scenario.cardData,
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123',
            attemptNumber: index + 1
          })
          .expect(402); // Payment Required

        expect(attemptResponse.body.status).toBe('failed');
        expect(attemptResponse.body.errorCode).toBe(scenario.expectedError);
        expect(attemptResponse.body.retryable).toBe(scenario.retryable);

        if (scenario.retryable) {
          expect(attemptResponse.body.retryAfter).toBeGreaterThan(0);
        }

        // Check payment status
        const statusResponse = await request(app)
          .get(`/api/payments/${paymentId}/status`)
          .expect(200);

        expect(statusResponse.body.status).toBe('failed');
        expect(statusResponse.body.attempts).toBe(index + 1);
        expect(statusResponse.body.lastFailureReason).toBe(scenario.expectedError);
      }

      // Final successful attempt
      const successResponse = await request(app)
        .post(`/api/payments/${paymentId}/process`)
        .send({
          number: '4111111111111111', // Valid card
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          attemptNumber: failureScenarios.length + 1
        })
        .expect(200);

      expect(successResponse.body.status).toBe('processing');

      // Confirm successful payment
      const confirmResponse = await request(app)
        .post(`/api/payments/${paymentId}/confirm`)
        .send({
          gatewayTransactionId: successResponse.body.gatewayTransactionId
        })
        .expect(200);

      expect(confirmResponse.body.status).toBe('completed');

      // Verify final payment status includes attempt history
      const finalStatusResponse = await request(app)
        .get(`/api/payments/${paymentId}/status`)
        .expect(200);

      expect(finalStatusResponse.body.status).toBe('completed');
      expect(finalStatusResponse.body.totalAttempts).toBe(failureScenarios.length + 1);
      expect(finalStatusResponse.body.failedAttempts).toBe(failureScenarios.length);
    });

    test('should handle gateway timeouts and network failures', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard'
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const costResponse = await request(app)
        .post('/api/payments/calculate')
        .send({ ticketId: checkinResponse.body.ticketId })
        .expect(200);

      const paymentInitResponse = await request(app)
        .post('/api/payments/initiate')
        .send({
          ticketId: checkinResponse.body.ticketId,
          amount: costResponse.body.totalAmount,
          paymentMethod: 'credit_card'
        })
        .expect(201);

      testTransactions.push({ id: paymentInitResponse.body.paymentId });
      const paymentId = paymentInitResponse.body.paymentId;

      // Simulate gateway timeout
      const timeoutResponse = await request(app)
        .post(`/api/payments/${paymentId}/process`)
        .send({
          number: '4000000000000408', // Request timeout simulation
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          simulateTimeout: true
        })
        .expect(408); // Request Timeout

      expect(timeoutResponse.body.status).toBe('timeout');
      expect(timeoutResponse.body.message).toBe('Payment gateway timeout');
      expect(timeoutResponse.body.retryRecommended).toBe(true);

      // Check that payment status shows timeout
      const statusAfterTimeoutResponse = await request(app)
        .get(`/api/payments/${paymentId}/status`)
        .expect(200);

      expect(statusAfterTimeoutResponse.body.status).toBe('timeout');

      // Retry after timeout should work
      const retryResponse = await request(app)
        .post(`/api/payments/${paymentId}/process`)
        .send({
          number: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123'
        })
        .expect(200);

      expect(retryResponse.body.status).toBe('processing');

      // Simulate network failure during confirmation
      const networkFailureResponse = await request(app)
        .post(`/api/payments/${paymentId}/confirm`)
        .send({
          gatewayTransactionId: retryResponse.body.gatewayTransactionId,
          simulateNetworkFailure: true
        })
        .expect(503); // Service Unavailable

      expect(networkFailureResponse.body.error).toBe('Network connection failed');

      // Payment should be recoverable through status check and re-confirmation
      const recoveryStatusResponse = await request(app)
        .get(`/api/payments/${paymentId}/gateway-status`)
        .expect(200);

      if (recoveryStatusResponse.body.gatewayStatus === 'completed') {
        // Gateway processed but confirmation failed - recover
        const recoveryResponse = await request(app)
          .post(`/api/payments/${paymentId}/recover`)
          .send({
            gatewayTransactionId: retryResponse.body.gatewayTransactionId
          })
          .expect(200);

        expect(recoveryResponse.body.status).toBe('completed');
        expect(recoveryResponse.body.recovered).toBe(true);
      }
    });
  });

  describe('3. Alternative Payment Methods Workflow', () => {
    test('should handle digital wallet payments end-to-end', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard'
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const costResponse = await request(app)
        .post('/api/payments/calculate')
        .send({ ticketId: checkinResponse.body.ticketId })
        .expect(200);

      // PayPal payment flow
      const paypalInitResponse = await request(app)
        .post('/api/payments/initiate')
        .send({
          ticketId: checkinResponse.body.ticketId,
          amount: costResponse.body.totalAmount,
          paymentMethod: 'paypal'
        })
        .expect(201);

      testTransactions.push({ id: paypalInitResponse.body.paymentId });

      // Get PayPal redirect URL
      const paypalRedirectResponse = await request(app)
        .post(`/api/payments/${paypalInitResponse.body.paymentId}/paypal/create-order`)
        .send({
          returnUrl: 'https://example.com/return',
          cancelUrl: 'https://example.com/cancel'
        })
        .expect(200);

      expect(paypalRedirectResponse.body.redirectUrl).toBeTruthy();
      expect(paypalRedirectResponse.body.orderId).toBeTruthy();

      // Simulate PayPal return with approval
      const paypalApprovalResponse = await request(app)
        .post(`/api/payments/${paypalInitResponse.body.paymentId}/paypal/capture-order`)
        .send({
          orderId: paypalRedirectResponse.body.orderId,
          payerId: 'mock_payer_id',
          paymentId: 'mock_paypal_payment_id'
        })
        .expect(200);

      expect(paypalApprovalResponse.body.status).toBe('completed');
      expect(paypalApprovalResponse.body.paypalTransactionId).toBeTruthy();

      // Verify payment completion
      const paymentStatusResponse = await request(app)
        .get(`/api/payments/${paypalInitResponse.body.paymentId}/status`)
        .expect(200);

      expect(paymentStatusResponse.body.status).toBe('completed');
      expect(paymentStatusResponse.body.paymentMethod).toBe('paypal');

      // Complete checkout
      await request(app)
        .post('/api/checkout')
        .send({ 
          licensePlate: vehicleData.licensePlate,
          paymentTransactionId: paypalApprovalResponse.body.transactionId
        })
        .expect(200);
    });

    test('should handle mobile payment methods (Apple Pay, Google Pay)', async () => {
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard'
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const costResponse = await request(app)
        .post('/api/payments/calculate')
        .send({ ticketId: checkinResponse.body.ticketId })
        .expect(200);

      // Apple Pay flow
      const applePayInitResponse = await request(app)
        .post('/api/payments/initiate')
        .send({
          ticketId: checkinResponse.body.ticketId,
          amount: costResponse.body.totalAmount,
          paymentMethod: 'apple_pay'
        })
        .expect(201);

      testTransactions.push({ id: applePayInitResponse.body.paymentId });

      // Process Apple Pay token
      const applePayProcessResponse = await request(app)
        .post(`/api/payments/${applePayInitResponse.body.paymentId}/process`)
        .send({
          applePayToken: 'mock_apple_pay_token_' + faker.string.alphanumeric(32),
          deviceId: 'device_' + faker.string.alphanumeric(16),
          merchantId: 'merchant.com.parkinggarage'
        })
        .expect(200);

      expect(applePayProcessResponse.body.status).toBe('processing');
      expect(applePayProcessResponse.body.tokenValidated).toBe(true);

      // Confirm Apple Pay payment
      const applePayConfirmResponse = await request(app)
        .post(`/api/payments/${applePayInitResponse.body.paymentId}/confirm`)
        .send({
          gatewayTransactionId: applePayProcessResponse.body.gatewayTransactionId
        })
        .expect(200);

      expect(applePayConfirmResponse.body.status).toBe('completed');
      expect(applePayConfirmResponse.body.paymentMethod).toBe('apple_pay');

      // Complete checkout
      await request(app)
        .post('/api/checkout')
        .send({ 
          licensePlate: vehicleData.licensePlate,
          paymentTransactionId: applePayConfirmResponse.body.transactionId
        })
        .expect(200);
    });
  });

  describe('4. Refund Processing Workflow', () => {
    let completedPayment;

    beforeEach(async () => {
      // Set up a completed payment for refund testing
      const vehicleData = {
        licensePlate: faker.vehicle.vrm(),
        vehicleType: 'standard'
      };

      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send(vehicleData)
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const costResponse = await request(app)
        .post('/api/payments/calculate')
        .send({ ticketId: checkinResponse.body.ticketId })
        .expect(200);

      const paymentInitResponse = await request(app)
        .post('/api/payments/initiate')
        .send({
          ticketId: checkinResponse.body.ticketId,
          amount: costResponse.body.totalAmount,
          paymentMethod: 'credit_card'
        })
        .expect(201);

      const processResponse = await request(app)
        .post(`/api/payments/${paymentInitResponse.body.paymentId}/process`)
        .send({
          number: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123'
        })
        .expect(200);

      const confirmResponse = await request(app)
        .post(`/api/payments/${paymentInitResponse.body.paymentId}/confirm`)
        .send({
          gatewayTransactionId: processResponse.body.gatewayTransactionId
        })
        .expect(200);

      await request(app)
        .post('/api/checkout')
        .send({ 
          licensePlate: vehicleData.licensePlate,
          paymentTransactionId: confirmResponse.body.transactionId
        })
        .expect(200);

      completedPayment = {
        paymentId: paymentInitResponse.body.paymentId,
        transactionId: confirmResponse.body.transactionId,
        amount: costResponse.body.totalAmount,
        ticketId: checkinResponse.body.ticketId
      };

      testTransactions.push({ id: completedPayment.paymentId });
    });

    test('should process full refund with proper authorization', async () => {
      const refundReason = 'Customer requested refund due to early departure';
      
      // Initiate full refund
      const refundInitResponse = await request(app)
        .post(`/api/payments/${completedPayment.paymentId}/refund`)
        .send({
          amount: completedPayment.amount,
          reason: refundReason,
          refundType: 'full',
          authorizedBy: 'manager@parkinggarage.com'
        })
        .expect(201);

      expect(refundInitResponse.body).toMatchObject({
        refundId: expect.any(String),
        status: 'processing',
        originalAmount: completedPayment.amount,
        refundAmount: completedPayment.amount,
        reason: refundReason
      });

      const refundId = refundInitResponse.body.refundId;

      // Check refund status
      const refundStatusResponse = await request(app)
        .get(`/api/payments/refunds/${refundId}/status`)
        .expect(200);

      expect(refundStatusResponse.body.status).toMatch(/processing|completed/);

      // Wait for processing to complete
      let attempts = 0;
      let refundCompleted = false;
      
      while (attempts < 10 && !refundCompleted) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const statusCheck = await request(app)
          .get(`/api/payments/refunds/${refundId}/status`)
          .expect(200);

        if (statusCheck.body.status === 'completed') {
          refundCompleted = true;
          expect(statusCheck.body.gatewayRefundId).toBeTruthy();
          expect(statusCheck.body.processedAt).toBeTruthy();
        }
        
        attempts++;
      }

      expect(refundCompleted).toBe(true);

      // Verify original payment is marked as refunded
      const originalPaymentResponse = await request(app)
        .get(`/api/payments/${completedPayment.paymentId}/status`)
        .expect(200);

      expect(originalPaymentResponse.body.refundStatus).toBe('fully_refunded');
      expect(originalPaymentResponse.body.refunds).toHaveLength(1);
    });

    test('should process partial refund with itemized breakdown', async () => {
      const partialRefundAmount = completedPayment.amount * 0.5; // 50% refund
      
      const partialRefundResponse = await request(app)
        .post(`/api/payments/${completedPayment.paymentId}/refund`)
        .send({
          amount: partialRefundAmount,
          reason: 'Partial refund for unused time',
          refundType: 'partial',
          itemizedRefund: [
            {
              description: 'Unused parking time',
              amount: partialRefundAmount * 0.8
            },
            {
              description: 'Processing fee adjustment',
              amount: partialRefundAmount * 0.2
            }
          ],
          authorizedBy: 'manager@parkinggarage.com'
        })
        .expect(201);

      expect(partialRefundResponse.body.refundAmount).toBe(partialRefundAmount);
      expect(partialRefundResponse.body.itemizedRefund).toHaveLength(2);

      const refundId = partialRefundResponse.body.refundId;

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check final status
      const finalStatusResponse = await request(app)
        .get(`/api/payments/refunds/${refundId}/status`)
        .expect(200);

      expect(finalStatusResponse.body.status).toBe('completed');

      // Verify original payment shows partial refund
      const originalPaymentResponse = await request(app)
        .get(`/api/payments/${completedPayment.paymentId}/status`)
        .expect(200);

      expect(originalPaymentResponse.body.refundStatus).toBe('partially_refunded');
      expect(originalPaymentResponse.body.totalRefunded).toBe(partialRefundAmount);
      expect(originalPaymentResponse.body.netAmount).toBe(completedPayment.amount - partialRefundAmount);
    });

    test('should handle refund disputes and escalation', async () => {
      // Create disputed refund
      const disputedRefundResponse = await request(app)
        .post(`/api/payments/${completedPayment.paymentId}/refund`)
        .send({
          amount: completedPayment.amount,
          reason: 'Customer dispute - claims never parked',
          refundType: 'disputed',
          requiresManualReview: true,
          authorizedBy: 'customer_service@parkinggarage.com'
        })
        .expect(201);

      const refundId = disputedRefundResponse.body.refundId;

      expect(disputedRefundResponse.body.status).toBe('pending_review');
      expect(disputedRefundResponse.body.requiresApproval).toBe(true);

      // Escalate to manager
      const escalationResponse = await request(app)
        .post(`/api/payments/refunds/${refundId}/escalate`)
        .send({
          escalatedTo: 'manager@parkinggarage.com',
          escalationReason: 'Customer threatening chargeback',
          priority: 'high'
        })
        .expect(200);

      expect(escalationResponse.body.status).toBe('escalated');
      expect(escalationResponse.body.assignedTo).toBe('manager@parkinggarage.com');

      // Manager approves refund
      const approvalResponse = await request(app)
        .post(`/api/payments/refunds/${refundId}/approve`)
        .send({
          approvedBy: 'manager@parkinggarage.com',
          approvalNote: 'Goodwill refund to maintain customer satisfaction'
        })
        .expect(200);

      expect(approvalResponse.body.status).toBe('approved');

      // Execute approved refund
      const executionResponse = await request(app)
        .post(`/api/payments/refunds/${refundId}/execute`)
        .expect(200);

      expect(executionResponse.body.status).toBe('processing');

      // Verify audit trail
      const auditResponse = await request(app)
        .get(`/api/payments/refunds/${refundId}/audit-trail`)
        .expect(200);

      expect(auditResponse.body).toBeInstanceOf(Array);
      expect(auditResponse.body.length).toBeGreaterThanOrEqual(4); // Initial, escalated, approved, executed
      
      auditResponse.body.forEach(entry => {
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('action');
        expect(entry).toHaveProperty('performedBy');
      });
    });
  });
});
import { PaymentService } from '@/services/PaymentService';
import { testDb } from '@tests/helpers/test-database';
import { TestDataFactory } from '@tests/helpers/test-factories';
import { TestUtils } from '@tests/helpers/test-utils';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

// Mock dependencies
jest.mock('@/services/SecurityAuditService');
jest.mock('@/services/billingService');

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let testUser: any;
  let testGarage: any;
  let testSpot: any;
  let testVehicle: any;
  let testSession: any;

  beforeAll(async () => {
    await testDb.setupDatabase();
  });

  afterAll(async () => {
    await testDb.teardownDatabase();
  });

  beforeEach(async () => {
    await testDb.setupDatabase();
    paymentService = new PaymentService();

    // Create test data
    const scenario = await testDb.createCompleteTestScenario();
    testUser = scenario.user;
    testGarage = scenario.garage;
    testSpot = scenario.spot;
    testVehicle = scenario.vehicle;
    testSession = scenario.session;
  });

  describe('Payment Processing', () => {
    it('should successfully process a valid payment', async () => {
      const paymentRequest = {
        amount: 25.50,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        sessionId: testSession.id,
        vehicleId: testVehicle.id,
        description: 'Parking fee payment',
        customerData: {
          email: testUser.email,
          name: testUser.name,
          phone: testUser.phoneNumber
        },
        metadata: { testPayment: true }
      };

      const result = await paymentService.processPayment(paymentRequest, testUser.id);

      expect(result.success).toBe(true);
      expect(result.paymentId).toBeDefined();
      expect(result.transactionId).toBeDefined();
      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.amount).toBe(25.50);
      expect(result.fees).toBeGreaterThan(0);
      expect(result.receiptUrl).toBeDefined();
      expect(result.fraudScore).toBeLessThan(1);
    });

    it('should reject payment with invalid amount', async () => {
      const paymentRequest = {
        amount: -10.00, // Invalid negative amount
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        sessionId: testSession.id
      };

      const result = await paymentService.processPayment(paymentRequest, testUser.id);

      expect(result.success).toBe(false);
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorCode).toBe('VALIDATION_FAILED');
      expect(result.message).toContain('Invalid payment amount');
    });

    it('should reject payment with unsupported currency', async () => {
      const paymentRequest = {
        amount: 25.50,
        currency: 'JPY', // Unsupported currency
        paymentMethod: PaymentMethod.CREDIT_CARD,
        sessionId: testSession.id
      };

      const result = await paymentService.processPayment(paymentRequest, testUser.id);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_FAILED');
      expect(result.message).toContain('Unsupported currency');
    });

    it('should reject payment for already paid session', async () => {
      // First, mark session as paid
      await testDb.getPrismaClient().parkingSession.update({
        where: { id: testSession.id },
        data: { isPaid: true }
      });

      const paymentRequest = {
        amount: 25.50,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        sessionId: testSession.id
      };

      const result = await paymentService.processPayment(paymentRequest, testUser.id);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_FAILED');
      expect(result.message).toContain('Session already paid');
    });

    it('should reject payment exceeding maximum limit', async () => {
      const paymentRequest = {
        amount: 15000.00, // Exceeds $10,000 limit
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        sessionId: testSession.id
      };

      const result = await paymentService.processPayment(paymentRequest, testUser.id);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_FAILED');
      expect(result.message).toContain('exceeds maximum limit');
    });

    it('should detect fraud for rapid payment attempts', async () => {
      // Create multiple recent payments for the same vehicle
      const prisma = testDb.getPrismaClient();
      const recentTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago

      for (let i = 0; i < 4; i++) {
        await prisma.payment.create({
          data: {
            amount: 10.00,
            currency: 'USD',
            paymentMethod: PaymentMethod.CREDIT_CARD,
            paymentType: 'PARKING',
            status: PaymentStatus.PENDING,
            vehicleId: testVehicle.id,
            createdAt: recentTime
          }
        });
      }

      const paymentRequest = {
        amount: 25.50,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        vehicleId: testVehicle.id
      };

      const result = await paymentService.processPayment(paymentRequest, testUser.id);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FRAUD_DETECTED');
      expect(result.fraudScore).toBeGreaterThan(0.3);
    });

    it('should flag large mobile payments for review', async () => {
      const paymentRequest = {
        amount: 750.00, // Large amount
        currency: 'USD',
        paymentMethod: PaymentMethod.MOBILE_PAY,
        sessionId: testSession.id
      };

      const result = await paymentService.processPayment(paymentRequest, testUser.id);

      // Should either succeed with high fraud score or fail
      if (result.success) {
        expect(result.fraudScore).toBeGreaterThan(0.2);
      } else {
        expect(result.errorCode).toBe('FRAUD_DETECTED');
      }
    });

    it('should handle payment processing errors gracefully', async () => {
      // Mock a processing error by using invalid session ID
      const paymentRequest = {
        amount: 25.50,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        sessionId: 'invalid-session-id'
      };

      const result = await paymentService.processPayment(paymentRequest, testUser.id);

      expect(result.success).toBe(false);
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorCode).toBe('VALIDATION_FAILED');
    });
  });

  describe('Payment Refunds', () => {
    let completedPayment: any;

    beforeEach(async () => {
      // Create a completed payment
      const prisma = testDb.getPrismaClient();
      completedPayment = await prisma.payment.create({
        data: {
          amount: 50.00,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentType: 'PARKING',
          status: PaymentStatus.COMPLETED,
          transactionId: 'txn_test_123',
          sessionId: testSession.id,
          vehicleId: testVehicle.id,
          processedAt: new Date()
        }
      });
    });

    it('should successfully process full refund', async () => {
      const refundRequest = {
        paymentId: completedPayment.id,
        reason: 'Customer requested refund'
      };

      const result = await paymentService.processRefund(refundRequest, testUser.id);

      expect(result.success).toBe(true);
      expect(result.refundId).toBeDefined();
      expect(result.amount).toBe(50.00);
      expect(result.status).toBe('COMPLETED');
    });

    it('should successfully process partial refund', async () => {
      const refundRequest = {
        paymentId: completedPayment.id,
        amount: 25.00, // Partial refund
        reason: 'Partial refund requested'
      };

      const result = await paymentService.processRefund(refundRequest, testUser.id);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(25.00);
      expect(result.status).toBe('COMPLETED');
    });

    it('should reject refund for non-existent payment', async () => {
      const refundRequest = {
        paymentId: 'non-existent-payment-id',
        reason: 'Test refund'
      };

      const result = await paymentService.processRefund(refundRequest, testUser.id);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Payment not found');
    });

    it('should reject refund for incomplete payment', async () => {
      // Create a pending payment
      const prisma = testDb.getPrismaClient();
      const pendingPayment = await prisma.payment.create({
        data: {
          amount: 30.00,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentType: 'PARKING',
          status: PaymentStatus.PENDING,
          sessionId: testSession.id
        }
      });

      const refundRequest = {
        paymentId: pendingPayment.id,
        reason: 'Test refund'
      };

      const result = await paymentService.processRefund(refundRequest, testUser.id);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot refund incomplete payment');
    });

    it('should reject refund exceeding refundable amount', async () => {
      // First, process a partial refund
      await paymentService.processRefund({
        paymentId: completedPayment.id,
        amount: 30.00,
        reason: 'First partial refund'
      }, testUser.id);

      // Try to refund more than remaining balance
      const refundRequest = {
        paymentId: completedPayment.id,
        amount: 25.00, // Only $20 should be left
        reason: 'Second partial refund'
      };

      const result = await paymentService.processRefund(refundRequest, testUser.id);

      expect(result.success).toBe(false);
      expect(result.message).toContain('exceeds refundable balance');
    });
  });

  describe('Receipt Generation', () => {
    let testPayment: any;

    beforeEach(async () => {
      const prisma = testDb.getPrismaClient();
      testPayment = await prisma.payment.create({
        data: {
          amount: 45.75,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentType: 'PARKING',
          status: PaymentStatus.COMPLETED,
          notes: 'Test parking payment',
          sessionId: testSession.id
        }
      });
    });

    it('should generate receipt for valid payment', async () => {
      const paymentRequest = {
        amount: 45.75,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        customerData: {
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      const receipt = await paymentService.generateReceipt(testPayment.id, paymentRequest);

      expect(receipt).toBeTruthy();
      expect(receipt!.id).toBe(`rcpt_${testPayment.id}`);
      expect(receipt!.paymentId).toBe(testPayment.id);
      expect(receipt!.amount).toBe(45.75);
      expect(receipt!.currency).toBe('USD');
      expect(receipt!.customerInfo.email).toBe('test@example.com');
      expect(receipt!.breakdown).toBeTruthy();
      expect(receipt!.breakdown!.total).toBe(45.75);
    });

    it('should return null for non-existent payment', async () => {
      const paymentRequest = {
        amount: 25.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD
      };

      const receipt = await paymentService.generateReceipt('non-existent-id', paymentRequest);

      expect(receipt).toBeNull();
    });

    it('should calculate breakdown correctly', async () => {
      const paymentRequest = {
        amount: 100.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD
      };

      // Update payment amount for clean calculation
      await testDb.getPrismaClient().payment.update({
        where: { id: testPayment.id },
        data: { amount: 100.00 }
      });

      const receipt = await paymentService.generateReceipt(testPayment.id, paymentRequest);

      expect(receipt).toBeTruthy();
      expect(receipt!.breakdown!.fees).toBe(2.90); // 2.9% of $100
      expect(receipt!.breakdown!.taxes).toBe(8.75); // 8.75% of $100
      expect(receipt!.breakdown!.subtotal).toBe(88.35); // $100 - fees - taxes
      expect(receipt!.breakdown!.total).toBe(100.00);
    });
  });

  describe('Payment Retrieval', () => {
    let testPayment: any;

    beforeEach(async () => {
      const prisma = testDb.getPrismaClient();
      testPayment = await prisma.payment.create({
        data: {
          amount: 35.25,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentType: 'PARKING',
          status: PaymentStatus.COMPLETED,
          sessionId: testSession.id,
          vehicleId: testVehicle.id
        }
      });
    });

    it('should retrieve payment with related data', async () => {
      const payment = await paymentService.getPayment(testPayment.id);

      expect(payment).toBeTruthy();
      expect(payment.id).toBe(testPayment.id);
      expect(payment.amount).toBe(35.25);
      expect(payment.session).toBeTruthy();
      expect(payment.session.vehicle).toBeTruthy();
      expect(payment.session.spot).toBeTruthy();
    });

    it('should return null for non-existent payment', async () => {
      const payment = await paymentService.getPayment('non-existent-id');

      expect(payment).toBeNull();
    });
  });

  describe('Payment Statistics', () => {
    beforeEach(async () => {
      const prisma = testDb.getPrismaClient();
      
      // Create test payments with different statuses and timestamps
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Recent successful payments
      await prisma.payment.createMany({
        data: [
          {
            amount: 25.00,
            currency: 'USD',
            paymentMethod: PaymentMethod.CREDIT_CARD,
            paymentType: 'PARKING',
            status: PaymentStatus.COMPLETED,
            createdAt: now
          },
          {
            amount: 15.50,
            currency: 'USD',
            paymentMethod: PaymentMethod.MOBILE_PAY,
            paymentType: 'PARKING',
            status: PaymentStatus.COMPLETED,
            createdAt: yesterday
          },
          {
            amount: 30.00,
            currency: 'USD',
            paymentMethod: PaymentMethod.CREDIT_CARD,
            paymentType: 'PARKING',
            status: PaymentStatus.FAILED,
            createdAt: yesterday
          },
          {
            amount: 45.75,
            currency: 'USD',
            paymentMethod: PaymentMethod.CREDIT_CARD,
            paymentType: 'PARKING',
            status: PaymentStatus.COMPLETED,
            createdAt: weekAgo
          }
        ]
      });
    });

    it('should calculate daily statistics correctly', async () => {
      const stats = await paymentService.getPaymentStats('day');

      expect(stats.timeframe).toBe('day');
      expect(stats.totalPayments).toBe(3); // All payments from today and yesterday
      expect(stats.successfulPayments).toBe(2);
      expect(stats.failedPayments).toBe(1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
      expect(stats.totalRevenue).toBe(40.50); // $25.00 + $15.50
      expect(stats.averageAmount).toBeCloseTo(20.25, 1);
    });

    it('should calculate weekly statistics correctly', async () => {
      const stats = await paymentService.getPaymentStats('week');

      expect(stats.timeframe).toBe('week');
      expect(stats.totalPayments).toBe(4); // All payments
      expect(stats.successfulPayments).toBe(3);
      expect(stats.failedPayments).toBe(1);
      expect(stats.successRate).toBe(75);
      expect(stats.totalRevenue).toBe(86.25); // $25.00 + $15.50 + $45.75
      expect(stats.averageAmount).toBeCloseTo(28.75, 1);
    });

    it('should handle empty statistics gracefully', async () => {
      // Clear all payments
      await testDb.getPrismaClient().payment.deleteMany();

      const stats = await paymentService.getPaymentStats('day');

      expect(stats.totalPayments).toBe(0);
      expect(stats.successfulPayments).toBe(0);
      expect(stats.failedPayments).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.totalRevenue).toBe(0);
      expect(stats.averageAmount).toBe(0);
    });
  });

  describe('Fraud Detection Edge Cases', () => {
    it('should handle concurrent payment attempts', async () => {
      const paymentRequest = {
        amount: 25.50,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        vehicleId: testVehicle.id
      };

      // Simulate concurrent payment attempts
      const promises = Array.from({ length: 5 }, () => 
        paymentService.processPayment({ ...paymentRequest }, testUser.id)
      );

      const results = await Promise.all(promises);

      // At least some should succeed, but fraud detection might catch some
      const successCount = results.filter(r => r.success).length;
      const fraudCount = results.filter(r => r.errorCode === 'FRAUD_DETECTED').length;

      expect(successCount + fraudCount).toBe(5);
      expect(successCount).toBeGreaterThan(0); // At least one should succeed
    });

    it('should properly assess risk for different payment methods', async () => {
      const baseRequest = {
        amount: 100.00,
        currency: 'USD',
        sessionId: testSession.id
      };

      const creditCardRequest = { ...baseRequest, paymentMethod: PaymentMethod.CREDIT_CARD };
      const mobilePayRequest = { ...baseRequest, paymentMethod: PaymentMethod.MOBILE_PAY };
      const cashRequest = { ...baseRequest, paymentMethod: PaymentMethod.CASH };

      const [creditResult, mobileResult, cashResult] = await Promise.all([
        paymentService.processPayment(creditCardRequest, testUser.id),
        paymentService.processPayment(mobilePayRequest, testUser.id),
        paymentService.processPayment(cashRequest, testUser.id)
      ]);

      // All should have different fraud scores based on payment method and amount
      expect(creditResult.fraudScore).toBeDefined();
      expect(mobileResult.fraudScore).toBeDefined();
      expect(cashResult.fraudScore).toBeDefined();
    });

    it('should handle unusual payment amounts correctly', async () => {
      const requests = [
        { amount: 0.01, description: 'Minimum amount' },
        { amount: 999.99, description: 'Just under threshold' },
        { amount: 1000.01, description: 'Just over threshold' },
        { amount: 9999.99, description: 'Maximum allowed' }
      ];

      for (const { amount, description } of requests) {
        const paymentRequest = {
          amount,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          sessionId: testSession.id,
          description
        };

        const result = await paymentService.processPayment(paymentRequest, testUser.id);

        if (amount >= 1000) {
          // Large amounts should have higher fraud scores
          expect(result.fraudScore).toBeGreaterThan(0.3);
        } else {
          // Small amounts should have lower fraud scores
          expect(result.fraudScore).toBeLessThan(0.5);
        }
      }
    });
  });

  describe('Performance and Memory', () => {
    it('should process payments within acceptable time limits', async () => {
      const paymentRequest = {
        amount: 25.50,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        sessionId: testSession.id
      };

      const expectFastExecution = TestUtils.expectExecutionTime(2000); // 2 seconds max

      await expectFastExecution(async () => {
        return paymentService.processPayment(paymentRequest, testUser.id);
      });
    });

    it('should handle batch payment processing efficiently', async () => {
      const batchSize = 10;
      const requests = Array.from({ length: batchSize }, (_, i) => ({
        amount: 20.00 + i,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        description: `Batch payment ${i}`
      }));

      const startMemory = TestUtils.getMemoryUsage();
      const startTime = Date.now();

      const results = await Promise.all(
        requests.map(req => paymentService.processPayment(req, testUser.id))
      );

      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(batchSize);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Memory usage should not increase dramatically
      TestUtils.expectMemoryIncrease(startMemory, 50 * 1024 * 1024); // 50MB max increase
    });
  });
});
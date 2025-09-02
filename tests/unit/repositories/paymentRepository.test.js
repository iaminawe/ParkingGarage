/**
 * Unit Tests for PaymentRepository (Prisma Integration)
 * 
 * Tests all data access methods in PaymentRepository with Prisma ORM.
 * Tests payment processing and financial record management.
 */

const PaymentRepository = require('../../../src/repositories/paymentRepository');
const { PaymentFactory, SessionFactory, VehicleFactory, SpotFactory, GarageFactory } = require('../../factories');

describe('PaymentRepository (Prisma)', () => {
  let paymentRepository;
  let testSession;
  let testGarage;

  beforeEach(async () => {
    paymentRepository = new PaymentRepository();
    
    // Create test entities for payments
    testGarage = await GarageFactory.createGarage({ name: 'Test Garage' });
    const testVehicle = await VehicleFactory.createVehicle({ licensePlate: 'PAY001' });
    const testSpot = await SpotFactory.createSpot({ garageId: testGarage.id });
    
    testSession = await SessionFactory.createCompletedSession(
      testVehicle.id,
      testSpot.id,
      {
        garageId: testGarage.id,
        totalAmount: 15.00,
        paymentStatus: 'pending'
      }
    );
  });

  describe('create', () => {
    test('should create payment with valid data', async () => {
      const paymentData = {
        sessionId: testSession.id,
        amount: 15.00,
        method: 'credit_card',
        cardLast4: '1234'
      };
      
      const payment = await paymentRepository.create(paymentData);
      
      expect(payment).toEqual(expect.objectContaining({
        sessionId: testSession.id,
        amount: 15.00,
        method: 'credit_card',
        status: 'pending',
        cardLast4: '1234'
      }));
      
      expect(payment.id).toBeDefined();
      expect(payment.transactionId).toBeDefined();
      expect(payment.createdAt).toBeDefined();
      expect(payment.processedAt).toBeNull();
    });

    test('should generate unique transaction ID', async () => {
      const payment1 = await paymentRepository.create({
        sessionId: testSession.id,
        amount: 10.00,
        method: 'credit_card'
      });
      
      // Create another session for second payment
      const vehicle2 = await VehicleFactory.createVehicle({ licensePlate: 'PAY002' });
      const session2 = await SessionFactory.createCompletedSession(
        vehicle2.id,
        testSession.spotId,
        { garageId: testGarage.id, totalAmount: 20.00 }
      );
      
      const payment2 = await paymentRepository.create({
        sessionId: session2.id,
        amount: 20.00,
        method: 'debit_card'
      });
      
      expect(payment1.transactionId).not.toBe(payment2.transactionId);
      expect(payment1.transactionId).toMatch(/^[A-Z0-9]{8,}$/);
      expect(payment2.transactionId).toMatch(/^[A-Z0-9]{8,}$/);
    });

    test('should validate required fields', async () => {
      // Test missing session ID
      await expect(paymentRepository.create({
        amount: 15.00,
        method: 'credit_card'
      })).rejects.toThrow(/required|session/i);
      
      // Test invalid amount
      await expect(paymentRepository.create({
        sessionId: testSession.id,
        amount: -5.00,
        method: 'credit_card'
      })).rejects.toThrow(/amount|positive/i);
    });

    test('should validate payment method', async () => {
      await expect(paymentRepository.create({
        sessionId: testSession.id,
        amount: 15.00,
        method: 'invalid_method'
      })).rejects.toThrow(/payment method|invalid/i);
    });
  });

  describe('findById', () => {
    test('should find existing payment by ID', async () => {
      const createdPayment = await PaymentFactory.createPayment({
        sessionId: testSession.id,
        amount: 15.00
      });
      
      const foundPayment = await paymentRepository.findById(createdPayment.id);
      
      expect(foundPayment).toEqual(createdPayment);
    });

    test('should return null for non-existent payment', async () => {
      const payment = await paymentRepository.findById('00000000-0000-0000-0000-000000000000');
      expect(payment).toBeNull();
    });

    test('should include session relation when requested', async () => {
      const createdPayment = await PaymentFactory.createPayment({
        sessionId: testSession.id,
        amount: 15.00
      });
      
      const paymentWithSession = await paymentRepository.findById(createdPayment.id, {
        include: { session: true }
      });
      
      expect(paymentWithSession.session).toBeDefined();
      expect(paymentWithSession.session.id).toBe(testSession.id);
    });
  });

  describe('findBySession', () => {
    test('should find all payments for a session', async () => {
      // Create multiple payment attempts for the same session
      const payment1 = await PaymentFactory.createFailedPayment(
        testSession.id,
        15.00,
        'card_declined'
      );
      
      const payment2 = await PaymentFactory.createSuccessfulPayment(
        testSession.id,
        15.00
      );
      
      const payments = await paymentRepository.findBySession(testSession.id);
      
      expect(payments).toHaveLength(2);
      expect(payments.map(p => p.id)).toEqual(
        expect.arrayContaining([payment1.id, payment2.id])
      );
      expect(payments.every(p => p.sessionId === testSession.id)).toBe(true);
    });

    test('should order payments by creation time', async () => {
      // Create payments with delays to ensure different timestamps
      const payment1 = await PaymentFactory.createPayment({
        sessionId: testSession.id,
        amount: 15.00
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const payment2 = await PaymentFactory.createPayment({
        sessionId: testSession.id,
        amount: 15.00
      });
      
      const payments = await paymentRepository.findBySession(testSession.id);
      
      expect(payments).toHaveLength(2);
      expect(new Date(payments[0].createdAt)).toBeAfter(new Date(payments[1].createdAt));
    });
  });

  describe('findByStatus', () => {
    test('should find payments by status', async () => {
      // Create payments with different statuses
      const pendingPayment = await PaymentFactory.createPendingPayment(
        testSession.id,
        15.00
      );
      
      const vehicle2 = await VehicleFactory.createVehicle({ licensePlate: 'PAY003' });
      const session2 = await SessionFactory.createCompletedSession(
        vehicle2.id,
        testSession.spotId,
        { garageId: testGarage.id, totalAmount: 25.00 }
      );
      
      const completedPayment = await PaymentFactory.createSuccessfulPayment(
        session2.id,
        25.00
      );
      
      const failedPayment = await PaymentFactory.createFailedPayment(
        session2.id,
        25.00,
        'insufficient_funds'
      );
      
      const pendingPayments = await paymentRepository.findByStatus('pending');
      const completedPayments = await paymentRepository.findByStatus('completed');
      const failedPayments = await paymentRepository.findByStatus('failed');
      
      expect(pendingPayments).toHaveLength(1);
      expect(completedPayments).toHaveLength(1);
      expect(failedPayments).toHaveLength(1);
      
      expect(pendingPayments[0].id).toBe(pendingPayment.id);
      expect(completedPayments[0].id).toBe(completedPayment.id);
      expect(failedPayments[0].id).toBe(failedPayment.id);
    });
  });

  describe('findByMethod', () => {
    test('should find payments by payment method', async () => {
      const cardPayment = await PaymentFactory.createPaymentWithMethod(
        'credit_card',
        testSession.id,
        15.00
      );
      
      const vehicle2 = await VehicleFactory.createVehicle({ licensePlate: 'PAY004' });
      const session2 = await SessionFactory.createCompletedSession(
        vehicle2.id,
        testSession.spotId,
        { garageId: testGarage.id, totalAmount: 20.00 }
      );
      
      const cashPayment = await PaymentFactory.createPaymentWithMethod(
        'cash',
        session2.id,
        20.00
      );
      
      const cardPayments = await paymentRepository.findByMethod('credit_card');
      const cashPayments = await paymentRepository.findByMethod('cash');
      
      expect(cardPayments).toHaveLength(1);
      expect(cashPayments).toHaveLength(1);
      
      expect(cardPayments[0].id).toBe(cardPayment.id);
      expect(cashPayments[0].id).toBe(cashPayment.id);
    });
  });

  describe('findByDateRange', () => {
    test('should find payments within date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Create payments with different dates
      const oldPayment = await PaymentFactory.createPayment({
        sessionId: testSession.id,
        amount: 10.00,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 2 days ago
      });
      
      const recentPayment = await PaymentFactory.createPayment({
        sessionId: testSession.id,
        amount: 15.00,
        createdAt: today.toISOString()
      });
      
      const payments = await paymentRepository.findByDateRange(yesterday, tomorrow);
      
      expect(payments).toHaveLength(1);
      expect(payments[0].id).toBe(recentPayment.id);
    });
  });

  describe('processPayment', () => {
    test('should successfully process pending payment', async () => {
      const pendingPayment = await PaymentFactory.createPendingPayment(
        testSession.id,
        15.00
      );
      
      const processedPayment = await paymentRepository.processPayment(
        pendingPayment.id,
        { status: 'completed' }
      );
      
      expect(processedPayment.status).toBe('completed');
      expect(processedPayment.processedAt).toBeDefined();
      expect(processedPayment.failureReason).toBeNull();
    });

    test('should handle payment failure', async () => {
      const pendingPayment = await PaymentFactory.createPendingPayment(
        testSession.id,
        15.00
      );
      
      const failedPayment = await paymentRepository.processPayment(
        pendingPayment.id,
        {
          status: 'failed',
          failureReason: 'insufficient_funds'
        }
      );
      
      expect(failedPayment.status).toBe('failed');
      expect(failedPayment.failureReason).toBe('insufficient_funds');
      expect(failedPayment.processedAt).toBeDefined();
    });

    test('should prevent reprocessing completed payments', async () => {
      const completedPayment = await PaymentFactory.createSuccessfulPayment(
        testSession.id,
        15.00
      );
      
      await expect(paymentRepository.processPayment(completedPayment.id, {
        status: 'failed'
      })).rejects.toThrow(/already processed|completed/i);
    });
  });

  describe('refundPayment', () => {
    test('should create full refund for completed payment', async () => {
      const completedPayment = await PaymentFactory.createSuccessfulPayment(
        testSession.id,
        15.00
      );
      
      const refundedPayment = await paymentRepository.refundPayment(
        completedPayment.id,
        { reason: 'customer_request' }
      );
      
      expect(refundedPayment.status).toBe('refunded');
      expect(refundedPayment.refundAmount).toBe(15.00);
      expect(refundedPayment.refundReason).toBe('customer_request');
    });

    test('should create partial refund', async () => {
      const completedPayment = await PaymentFactory.createSuccessfulPayment(
        testSession.id,
        20.00
      );
      
      const refundedPayment = await paymentRepository.refundPayment(
        completedPayment.id,
        {
          amount: 10.00,
          reason: 'partial_cancellation'
        }
      );
      
      expect(refundedPayment.status).toBe('refunded');
      expect(refundedPayment.refundAmount).toBe(10.00);
      expect(refundedPayment.refundReason).toBe('partial_cancellation');
    });

    test('should prevent refunding non-completed payments', async () => {
      const pendingPayment = await PaymentFactory.createPendingPayment(
        testSession.id,
        15.00
      );
      
      await expect(paymentRepository.refundPayment(pendingPayment.id))
        .rejects.toThrow(/not completed|cannot refund/i);
    });

    test('should prevent over-refunding', async () => {
      const completedPayment = await PaymentFactory.createSuccessfulPayment(
        testSession.id,
        15.00
      );
      
      await expect(paymentRepository.refundPayment(completedPayment.id, {
        amount: 25.00 // More than original payment
      })).rejects.toThrow(/refund amount|exceeds/i);
    });
  });

  describe('getPaymentStatistics', () => {
    test('should return comprehensive payment statistics', async () => {
      // Create various payments
      await PaymentFactory.createSuccessfulPayment(testSession.id, 15.00);
      
      const vehicle2 = await VehicleFactory.createVehicle({ licensePlate: 'STAT01' });
      const session2 = await SessionFactory.createCompletedSession(
        vehicle2.id,
        testSession.spotId,
        { garageId: testGarage.id, totalAmount: 25.00 }
      );
      
      await PaymentFactory.createSuccessfulPayment(session2.id, 25.00);
      await PaymentFactory.createFailedPayment(session2.id, 25.00, 'card_declined');
      await PaymentFactory.createPendingPayment(session2.id, 25.00);
      
      const stats = await paymentRepository.getPaymentStatistics();
      
      expect(stats).toEqual(expect.objectContaining({
        totalPayments: 4,
        completedPayments: 2,
        failedPayments: 1,
        pendingPayments: 1,
        totalRevenue: 40.00,
        averagePayment: 20.00,
        successRate: 50 // 2 out of 4 successful
      }));
    });

    test('should filter statistics by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();
      
      // Create old payment
      await PaymentFactory.createPayment({
        sessionId: testSession.id,
        amount: 100.00,
        status: 'completed',
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      });
      
      // Create recent payment
      await PaymentFactory.createSuccessfulPayment(testSession.id, 15.00);
      
      const recentStats = await paymentRepository.getPaymentStatistics({
        startDate: yesterday,
        endDate: today
      });
      
      expect(recentStats.totalPayments).toBe(1);
      expect(recentStats.totalRevenue).toBe(15.00);
    });
  });

  describe('getRevenueReport', () => {
    test('should generate revenue report by period', async () => {
      // Create payments across different days
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      await PaymentFactory.createPayment({
        sessionId: testSession.id,
        amount: 10.00,
        status: 'completed',
        createdAt: threeDaysAgo.toISOString()
      });
      
      const vehicle2 = await VehicleFactory.createVehicle({ licensePlate: 'REV001' });
      const session2 = await SessionFactory.createCompletedSession(
        vehicle2.id,
        testSession.spotId,
        { garageId: testGarage.id }
      );
      
      await PaymentFactory.createPayment({
        sessionId: session2.id,
        amount: 20.00,
        status: 'completed',
        createdAt: yesterday.toISOString()
      });
      
      const report = await paymentRepository.getRevenueReport({
        startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        groupBy: 'day'
      });
      
      expect(report).toBeInstanceOf(Array);
      expect(report.length).toBeGreaterThan(0);
      expect(report[0]).toHaveProperty('date');
      expect(report[0]).toHaveProperty('revenue');
      expect(report[0]).toHaveProperty('paymentCount');
    });
  });

  describe('Database Integration', () => {
    test('should maintain referential integrity with sessions', async () => {
      const payment = await PaymentFactory.createPayment({
        sessionId: testSession.id,
        amount: 15.00
      });
      
      expect(payment.sessionId).toBe(testSession.id);
      
      // Attempt to create payment with invalid session ID should fail
      await expect(PaymentFactory.createPayment({
        sessionId: '00000000-0000-0000-0000-000000000000',
        amount: 15.00
      })).rejects.toThrow(/foreign key|session not found/i);
    });

    test('should handle payment transactions atomically', async () => {
      const prisma = global.testDb?.getPrisma?.();
      if (prisma && prisma.$transaction) {
        try {
          await prisma.$transaction(async (tx) => {
            // Create payment
            await paymentRepository.create({
              sessionId: testSession.id,
              amount: 15.00,
              method: 'credit_card'
            });
            
            // Force rollback
            throw new Error('Test rollback');
          });
        } catch (error) {
          expect(error.message).toBe('Test rollback');
        }
        
        // Verify rollback worked
        const payments = await paymentRepository.findBySession(testSession.id);
        expect(payments).toHaveLength(0);
      }
    });

    test('should handle concurrent payment processing', async () => {
      // Create multiple pending payments
      const payments = [];
      for (let i = 0; i < 3; i++) {
        const vehicle = await VehicleFactory.createVehicle({ 
          licensePlate: `CONC${String(i).padStart(3, '0')}` 
        });
        const session = await SessionFactory.createCompletedSession(
          vehicle.id,
          testSession.spotId,
          { garageId: testGarage.id, totalAmount: 10.00 }
        );
        
        payments.push(await PaymentFactory.createPendingPayment(session.id, 10.00));
      }
      
      // Process payments concurrently
      const processPromises = payments.map(payment =>
        paymentRepository.processPayment(payment.id, { status: 'completed' })
      );
      
      const results = await Promise.all(processPromises);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'completed')).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should handle large payment queries efficiently', async () => {
      // Create many payments
      const payments = [];
      for (let i = 0; i < 50; i++) {
        const vehicle = await VehicleFactory.createVehicle({ 
          licensePlate: `PERF${String(i).padStart(3, '0')}` 
        });
        const session = await SessionFactory.createCompletedSession(
          vehicle.id,
          testSession.spotId,
          { garageId: testGarage.id, totalAmount: 15.00 }
        );
        
        payments.push(await PaymentFactory.createSuccessfulPayment(session.id, 15.00));
      }
      
      const startTime = Date.now();
      
      // Query operations
      const allPayments = await paymentRepository.findByStatus('completed');
      const stats = await paymentRepository.getPaymentStatistics();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(allPayments).toHaveLength(50);
      expect(stats.totalRevenue).toBe(750.00); // 50 * 15.00
      expect(duration).toBeLessThan(3000); // 3 seconds
    });
  });

  describe('Data Validation', () => {
    test('should validate card information for card payments', async () => {
      // Valid card payment
      const cardPayment = await paymentRepository.create({
        sessionId: testSession.id,
        amount: 15.00,
        method: 'credit_card',
        cardLast4: '1234'
      });
      
      expect(cardPayment.cardLast4).toBe('1234');
      
      // Card payment without card info should fail
      await expect(paymentRepository.create({
        sessionId: testSession.id,
        amount: 15.00,
        method: 'credit_card'
      })).rejects.toThrow(/card information required/i);
    });

    test('should validate amount precision', async () => {
      // Valid amounts
      const payment1 = await paymentRepository.create({
        sessionId: testSession.id,
        amount: 15.99,
        method: 'cash'
      });
      
      expect(payment1.amount).toBe(15.99);
      
      // Too many decimal places should be rounded or rejected
      const payment2 = await paymentRepository.create({
        sessionId: testSession.id,
        amount: 15.999,
        method: 'cash'
      });
      
      expect(payment2.amount).toBe(16.00); // Rounded up
    });
  });
});
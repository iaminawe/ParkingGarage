/**
 * PaymentService Tests
 * 
 * Tests for payment processing, fraud detection, refund processing,
 * and receipt generation functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PaymentService } from '../../src/services/PaymentService';
import type { PaymentRequest, RefundRequest } from '../../src/services/PaymentService';
import { prisma } from '../../src/config/database';

// Mock Prisma
jest.mock('../../src/config/database', () => ({
  prisma: {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn()
    },
    parkingSession: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

// Mock SecurityAuditService
jest.mock('../../src/services/SecurityAuditService', () => ({
  SecurityAuditService: jest.fn().mockImplementation(() => ({
    logSecurityEvent: jest.fn().mockResolvedValue(true)
  }))
}));

describe('PaymentService', () => {
  let paymentService: PaymentService;
  
  beforeEach(() => {
    paymentService = new PaymentService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('processPayment', () => {
    const validPaymentRequest: PaymentRequest = {
      amount: 25.00,
      currency: 'USD',
      paymentMethod: 'CREDIT_CARD',
      sessionId: 'session_123',
      vehicleId: 'vehicle_123',
      description: 'Parking fee payment',
      customerData: {
        email: 'test@example.com',
        name: 'John Doe'
      }
    };

    it('should successfully process a valid payment', async () => {
      // Mock database responses
      (prisma.parkingSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'session_123',
        isPaid: false,
        totalAmount: 25.00
      });

      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment_123',
        amount: 25.00,
        currency: 'USD',
        paymentMethod: 'CREDIT_CARD',
        status: 'COMPLETED',
        createdAt: new Date()
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      const result = await paymentService.processPayment(validPaymentRequest, 'user_123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('COMPLETED');
      expect(result.amount).toBe(25.00);
      expect(result.paymentId).toBeDefined();
      expect(result.fraudScore).toBeDefined();
      expect(result.fraudScore).toBeLessThan(0.7);
    });

    it('should reject payment with invalid amount', async () => {
      const invalidRequest = { ...validPaymentRequest, amount: -10 };

      const result = await paymentService.processPayment(invalidRequest, 'user_123');

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('VALIDATION_FAILED');
      expect(result.message).toContain('Invalid payment amount');
    });

    it('should reject payment with unsupported currency', async () => {
      const invalidRequest = { ...validPaymentRequest, currency: 'XYZ' };

      const result = await paymentService.processPayment(invalidRequest, 'user_123');

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('VALIDATION_FAILED');
      expect(result.message).toContain('Unsupported currency');
    });

    it('should reject payment for already paid session', async () => {
      (prisma.parkingSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'session_123',
        isPaid: true,
        totalAmount: 25.00
      });

      const result = await paymentService.processPayment(validPaymentRequest, 'user_123');

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('VALIDATION_FAILED');
      expect(result.message).toContain('Session already paid');
    });

    it('should detect and reject fraudulent payments', async () => {
      // Mock high-risk payment (very large amount with suspicious patterns)
      const suspiciousRequest = {
        ...validPaymentRequest,\n        amount: 5000.50, // Large amount with odd cents\n        vehicleId: 'vehicle_suspicious'\n      };\n\n      // Mock recent payments for fraud detection\n      (prisma.payment.count as jest.Mock).mockResolvedValue(5); // Multiple recent attempts\n\n      const result = await paymentService.processPayment(suspiciousRequest, 'user_123');\n\n      expect(result.success).toBe(false);\n      expect(result.status).toBe('FAILED');\n      expect(result.errorCode).toBe('FRAUD_DETECTED');\n      expect(result.fraudScore).toBeGreaterThan(0.7);\n    });\n\n    it('should handle payment gateway failures gracefully', async () => {\n      // Mock gateway failure by making transaction creation fail\n      (prisma.payment.create as jest.Mock).mockRejectedValue(new Error('Gateway error'));\n\n      const result = await paymentService.processPayment(validPaymentRequest, 'user_123');\n\n      expect(result.success).toBe(false);\n      expect(result.status).toBe('FAILED');\n      expect(result.errorCode).toBe('PROCESSING_ERROR');\n    });\n\n    it('should generate receipt for successful payment', async () => {\n      (prisma.parkingSession.findUnique as jest.Mock).mockResolvedValue({\n        id: 'session_123',\n        isPaid: false,\n        totalAmount: 25.00\n      });\n\n      (prisma.payment.create as jest.Mock).mockResolvedValue({\n        id: 'payment_123',\n        amount: 25.00,\n        currency: 'USD',\n        paymentMethod: 'CREDIT_CARD',\n        status: 'COMPLETED',\n        createdAt: new Date()\n      });\n\n      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {\n        return await callback(prisma);\n      });\n\n      const result = await paymentService.processPayment(validPaymentRequest, 'user_123');\n\n      expect(result.success).toBe(true);\n      expect(result.receiptUrl).toBeDefined();\n      expect(result.receiptUrl).toContain('/receipts/');\n    });\n  });\n\n  describe('processRefund', () => {\n    const validRefundRequest: RefundRequest = {\n      paymentId: 'payment_123',\n      amount: 25.00,\n      reason: 'Customer request'\n    };\n\n    it('should successfully process a full refund', async () => {\n      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({\n        id: 'payment_123',\n        amount: 25.00,\n        status: 'COMPLETED',\n        refundAmount: 0,\n        session: { id: 'session_123' },\n        vehicle: { id: 'vehicle_123' }\n      });\n\n      (prisma.payment.update as jest.Mock).mockResolvedValue({\n        id: 'payment_123',\n        refundAmount: 25.00,\n        status: 'REFUNDED'\n      });\n\n      const result = await paymentService.processRefund(validRefundRequest, 'user_123');\n\n      expect(result.success).toBe(true);\n      expect(result.amount).toBe(25.00);\n      expect(result.status).toBe('COMPLETED');\n      expect(result.refundId).toBeDefined();\n    });\n\n    it('should successfully process a partial refund', async () => {\n      const partialRefundRequest = { ...validRefundRequest, amount: 15.00 };\n\n      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({\n        id: 'payment_123',\n        amount: 25.00,\n        status: 'COMPLETED',\n        refundAmount: 0,\n        session: { id: 'session_123' },\n        vehicle: { id: 'vehicle_123' }\n      });\n\n      (prisma.payment.update as jest.Mock).mockResolvedValue({\n        id: 'payment_123',\n        refundAmount: 15.00,\n        status: 'COMPLETED'\n      });\n\n      const result = await paymentService.processRefund(partialRefundRequest, 'user_123');\n\n      expect(result.success).toBe(true);\n      expect(result.amount).toBe(15.00);\n      expect(result.status).toBe('COMPLETED');\n    });\n\n    it('should reject refund for non-existent payment', async () => {\n      (prisma.payment.findUnique as jest.Mock).mockResolvedValue(null);\n\n      const result = await paymentService.processRefund(validRefundRequest, 'user_123');\n\n      expect(result.success).toBe(false);\n      expect(result.message).toBe('Payment not found');\n    });\n\n    it('should reject refund for incomplete payment', async () => {\n      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({\n        id: 'payment_123',\n        amount: 25.00,\n        status: 'PENDING',\n        refundAmount: 0\n      });\n\n      const result = await paymentService.processRefund(validRefundRequest, 'user_123');\n\n      expect(result.success).toBe(false);\n      expect(result.message).toBe('Cannot refund incomplete payment');\n    });\n\n    it('should reject refund exceeding available balance', async () => {\n      const excessiveRefundRequest = { ...validRefundRequest, amount: 50.00 };\n\n      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({\n        id: 'payment_123',\n        amount: 25.00,\n        status: 'COMPLETED',\n        refundAmount: 0\n      });\n\n      const result = await paymentService.processRefund(excessiveRefundRequest, 'user_123');\n\n      expect(result.success).toBe(false);\n      expect(result.message).toContain('exceeds refundable balance');\n    });\n  });\n\n  describe('generateReceipt', () => {\n    it('should generate receipt with correct breakdown', async () => {\n      const paymentRequest: PaymentRequest = {\n        amount: 25.00,\n        currency: 'USD',\n        paymentMethod: 'CREDIT_CARD',\n        customerData: {\n          email: 'test@example.com',\n          name: 'John Doe'\n        }\n      };\n\n      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({\n        id: 'payment_123',\n        amount: 25.00,\n        currency: 'USD',\n        paymentMethod: 'CREDIT_CARD',\n        createdAt: new Date(),\n        notes: 'Parking fee payment',\n        session: {\n          vehicle: { licensePlate: 'ABC123' },\n          spot: { spotNumber: 'A-101' }\n        }\n      });\n\n      const receipt = await paymentService.generateReceipt('payment_123', paymentRequest);\n\n      expect(receipt).toBeDefined();\n      expect(receipt!.id).toBe('rcpt_payment_123');\n      expect(receipt!.amount).toBe(25.00);\n      expect(receipt!.currency).toBe('USD');\n      expect(receipt!.paymentMethod).toBe('CREDIT_CARD');\n      expect(receipt!.customerInfo?.email).toBe('test@example.com');\n      expect(receipt!.breakdown).toBeDefined();\n      expect(receipt!.breakdown!.total).toBe(25.00);\n      expect(receipt!.breakdown!.fees).toBeGreaterThan(0);\n      expect(receipt!.breakdown!.taxes).toBeGreaterThan(0);\n    });\n\n    it('should return null for non-existent payment', async () => {\n      (prisma.payment.findUnique as jest.Mock).mockResolvedValue(null);\n\n      const receipt = await paymentService.generateReceipt('payment_nonexistent', {} as PaymentRequest);\n\n      expect(receipt).toBeNull();\n    });\n  });\n\n  describe('getPaymentStats', () => {\n    it('should calculate payment statistics correctly', async () => {\n      const now = new Date();\n      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);\n\n      // Mock payment counts and aggregations\n      (prisma.payment.count as jest.Mock)\n        .mockResolvedValueOnce(100) // total payments\n        .mockResolvedValueOnce(95);  // successful payments\n\n      (prisma.payment.aggregate as jest.Mock)\n        .mockResolvedValueOnce({ _sum: { amount: 2500.00 } }) // total revenue\n        .mockResolvedValueOnce({ _avg: { amount: 26.32 } });   // average amount\n\n      const stats = await paymentService.getPaymentStats('day');\n\n      expect(stats.totalPayments).toBe(100);\n      expect(stats.successfulPayments).toBe(95);\n      expect(stats.failedPayments).toBe(5);\n      expect(stats.successRate).toBe(95);\n      expect(stats.totalRevenue).toBe(2500.00);\n      expect(stats.averageAmount).toBe(26.32);\n      expect(stats.timeframe).toBe('day');\n    });\n\n    it('should handle zero payments gracefully', async () => {\n      (prisma.payment.count as jest.Mock)\n        .mockResolvedValueOnce(0)\n        .mockResolvedValueOnce(0);\n\n      (prisma.payment.aggregate as jest.Mock)\n        .mockResolvedValueOnce({ _sum: { amount: null } })\n        .mockResolvedValueOnce({ _avg: { amount: null } });\n\n      const stats = await paymentService.getPaymentStats('day');\n\n      expect(stats.totalPayments).toBe(0);\n      expect(stats.successfulPayments).toBe(0);\n      expect(stats.successRate).toBe(0);\n      expect(stats.totalRevenue).toBe(0);\n      expect(stats.averageAmount).toBe(0);\n    });\n  });\n\n  describe('getPayment', () => {\n    it('should retrieve payment with related data', async () => {\n      const mockPayment = {\n        id: 'payment_123',\n        amount: 25.00,\n        currency: 'USD',\n        status: 'COMPLETED',\n        session: {\n          id: 'session_123',\n          vehicle: { licensePlate: 'ABC123' },\n          spot: { spotNumber: 'A-101' }\n        }\n      };\n\n      (prisma.payment.findUnique as jest.Mock).mockResolvedValue(mockPayment);\n\n      const payment = await paymentService.getPayment('payment_123');\n\n      expect(payment).toEqual(mockPayment);\n      expect(prisma.payment.findUnique).toHaveBeenCalledWith({\n        where: { id: 'payment_123' },\n        include: {\n          session: {\n            include: {\n              vehicle: true,\n              spot: true\n            }\n          }\n        }\n      });\n    });\n\n    it('should return null for non-existent payment', async () => {\n      (prisma.payment.findUnique as jest.Mock).mockResolvedValue(null);\n\n      const payment = await paymentService.getPayment('payment_nonexistent');\n\n      expect(payment).toBeNull();\n    });\n  });\n\n  describe('fraud detection', () => {\n    it('should detect rapid repeated payments', async () => {\n      const request: PaymentRequest = {\n        amount: 25.00,\n        currency: 'USD',\n        paymentMethod: 'CREDIT_CARD',\n        vehicleId: 'vehicle_rapid_payments'\n      };\n\n      // Mock 5 recent payments (above threshold of 3)\n      (prisma.payment.count as jest.Mock).mockResolvedValue(5);\n\n      const result = await paymentService.processPayment(request, 'user_123');\n\n      expect(result.success).toBe(false);\n      expect(result.errorCode).toBe('FRAUD_DETECTED');\n      expect(result.fraudScore).toBeGreaterThan(0.7);\n    });\n\n    it('should flag large mobile payments for review', async () => {\n      const request: PaymentRequest = {\n        amount: 600.00,\n        currency: 'USD',\n        paymentMethod: 'MOBILE_PAY'\n      };\n\n      (prisma.payment.count as jest.Mock).mockResolvedValue(0); // No previous payments\n\n      const result = await paymentService.processPayment(request, 'user_123');\n\n      // Should succeed but with elevated fraud score\n      expect(result.fraudScore).toBeGreaterThan(0.2);\n    });\n  });\n\n  describe('error handling', () => {\n    it('should handle database connection errors gracefully', async () => {\n      (prisma.payment.create as jest.Mock).mockRejectedValue(new Error('Database connection failed'));\n\n      const result = await paymentService.processPayment(validPaymentRequest, 'user_123');\n\n      expect(result.success).toBe(false);\n      expect(result.status).toBe('FAILED');\n      expect(result.errorCode).toBe('PROCESSING_ERROR');\n    });\n\n    it('should handle malformed payment data', async () => {\n      const malformedRequest = {\n        amount: 'invalid',\n        currency: 123,\n        paymentMethod: null\n      } as any;\n\n      const result = await paymentService.processPayment(malformedRequest, 'user_123');\n\n      expect(result.success).toBe(false);\n      expect(result.status).toBe('FAILED');\n    });\n  });\n});
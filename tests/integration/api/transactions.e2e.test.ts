/**
 * Transactions API End-to-End Tests
 * 
 * Comprehensive test suite for all transaction management endpoints including:
 * - GET /api/transactions - List transactions
 * - POST /api/transactions - Create transaction
 * - GET /api/transactions/:id - Get transaction details
 * - PUT /api/transactions/:id/status - Update transaction status
 */

import request from 'supertest';
import { Application } from 'express';
import { faker } from '@faker-js/faker';
import {
  createAPITestContext,
  APITestContext,
  generateTestTransaction,
  validateAPIResponse,
  testRateLimit,
  testInputValidation,
  ValidationTestCase,
  createAuthenticatedRequest
} from '../../helpers/api-test-helpers';
import { createTestApp } from '../../helpers/app-helpers';
import { setupTestDatabase, teardownTestDatabase, TestDatabase } from '../../setup/test-db-setup';

describe('Transactions API E2E Tests', () => {
  let app: Application;
  let testDb: TestDatabase;
  let context: APITestContext;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    app = await createTestApp(testDb.getService());
    context = await createAPITestContext(app, testDb.getService());
  });

  afterAll(async () => {
    await teardownTestDatabase(testDb);
  });

  beforeEach(async () => {
    if (testDb) {
      await testDb.reset();
    }
  });

  describe('GET /api/transactions (List Transactions)', () => {
    const transactionsEndpoint = '/api/transactions';

    describe('Admin/Manager Access', () => {
      it('should return paginated list of all transactions for admin', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', transactionsEndpoint, context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        expect(response.body.data).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('totalCount');
        expect(response.body.data).toHaveProperty('page');
        expect(response.body.data).toHaveProperty('limit');
        expect(Array.isArray(response.body.data.data)).toBe(true);

        // Verify transaction data structure
        if (response.body.data.data.length > 0) {
          const transaction = response.body.data.data[0];
          expect(transaction).toHaveProperty('id');
          expect(transaction).toHaveProperty('type');
          expect(transaction).toHaveProperty('amount');
          expect(transaction).toHaveProperty('status');
          expect(transaction).toHaveProperty('description');
          expect(transaction).toHaveProperty('userId');
          expect(transaction).toHaveProperty('createdAt');
          expect(transaction).toHaveProperty('processedAt');
        }
      });

      it('should support pagination parameters', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${transactionsEndpoint}?page=1&limit=2`, context.adminToken
        ).expect(200);

        expect(response.body.data.page).toBe(1);
        expect(response.body.data.limit).toBe(2);
        expect(response.body.data.data.length).toBeLessThanOrEqual(2);
      });

      it('should support sorting by amount', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${transactionsEndpoint}?sortBy=amount&sortOrder=desc`, context.adminToken
        ).expect(200);

        const transactions = response.body.data.data;
        if (transactions.length > 1) {
          expect(transactions[0].amount).toBeGreaterThanOrEqual(transactions[1].amount);
        }
      });

      it('should support filtering by transaction type', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${transactionsEndpoint}?type=PAYMENT`, context.adminToken
        ).expect(200);

        const transactions = response.body.data.data;
        transactions.forEach((transaction: any) => {
          expect(transaction.type).toBe('PAYMENT');
        });
      });

      it('should support filtering by status', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${transactionsEndpoint}?status=COMPLETED`, context.adminToken
        ).expect(200);

        const transactions = response.body.data.data;
        transactions.forEach((transaction: any) => {
          expect(transaction.status).toBe('COMPLETED');
        });
      });

      it('should support filtering by user ID', async () => {
        const userId = 'customer-1-id';
        const response = await createAuthenticatedRequest(
          app, 'get', `${transactionsEndpoint}?userId=${userId}`, context.adminToken
        ).expect(200);

        const transactions = response.body.data.data;
        transactions.forEach((transaction: any) => {
          expect(transaction.userId).toBe(userId);
        });
      });

      it('should support date range filtering', async () => {
        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');

        const response = await createAuthenticatedRequest(
          app, 'get', 
          `${transactionsEndpoint}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, 
          context.adminToken
        ).expect(200);

        const transactions = response.body.data.data;
        transactions.forEach((transaction: any) => {
          const transactionDate = new Date(transaction.createdAt);
          expect(transactionDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          expect(transactionDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
        });
      });

      it('should support amount range filtering', async () => {
        const minAmount = 5.00;
        const maxAmount = 50.00;

        const response = await createAuthenticatedRequest(
          app, 'get', `${transactionsEndpoint}?minAmount=${minAmount}&maxAmount=${maxAmount}`, context.adminToken
        ).expect(200);

        const transactions = response.body.data.data;
        transactions.forEach((transaction: any) => {
          expect(Math.abs(transaction.amount)).toBeGreaterThanOrEqual(minAmount);
          expect(Math.abs(transaction.amount)).toBeLessThanOrEqual(maxAmount);
        });
      });

      it('should include related data (reservation, payment)', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${transactionsEndpoint}?include=reservation,payment`, context.adminToken
        ).expect(200);

        const transactions = response.body.data.data;
        transactions.forEach((transaction: any) => {
          if (transaction.reservationId) {
            expect(transaction).toHaveProperty('reservation');
            expect(transaction.reservation).toHaveProperty('id');
          }
          if (transaction.paymentId) {
            expect(transaction).toHaveProperty('payment');
            expect(transaction.payment).toHaveProperty('id');
          }
        });
      });
    });

    describe('Customer Access', () => {
      it('should return only customer\'s own transactions', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', transactionsEndpoint, context.customerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        const transactions = response.body.data.data;
        
        // All transactions should belong to the authenticated customer
        transactions.forEach((transaction: any) => {
          expect(transaction.userId).toBe('customer-1-id');
        });
      });

      it('should include transaction categories for customer view', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', transactionsEndpoint, context.customerToken
        ).expect(200);

        const transactions = response.body.data.data;
        transactions.forEach((transaction: any) => {
          expect(transaction).toHaveProperty('category');
          expect(['parking', 'penalty', 'refund', 'fee'].includes(transaction.category)).toBe(true);
        });
      });
    });

    describe('Authorization', () => {
      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .get(transactionsEndpoint)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('POST /api/transactions (Create Transaction)', () => {
    const transactionsEndpoint = '/api/transactions';

    describe('Admin Transaction Creation', () => {
      it('should create transaction for admin', async () => {
        const transactionData = {
          type: 'FEE',
          amount: 5.00,
          description: 'Processing fee',
          userId: 'customer-1-id',
          metadata: {
            reason: 'Processing fee for premium reservation',
            category: 'service_fee'
          }
        };

        const response = await createAuthenticatedRequest(
          app, 'post', transactionsEndpoint, context.adminToken
        )
          .send(transactionData)
          .expect(201);

        const validation = validateAPIResponse(response, 201);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const transaction = response.body.data;
        expect(transaction.type).toBe(transactionData.type);
        expect(transaction.amount).toBe(transactionData.amount);
        expect(transaction.description).toBe(transactionData.description);
        expect(transaction.userId).toBe(transactionData.userId);
        expect(transaction.status).toBe('PENDING');
        expect(transaction).toHaveProperty('id');
        expect(transaction).toHaveProperty('createdAt');
        expect(transaction).toHaveProperty('metadata');
      });

      it('should handle different transaction types', async () => {
        const transactionTypes = ['PAYMENT', 'REFUND', 'FEE', 'PENALTY'];
        
        for (let i = 0; i < transactionTypes.length; i++) {
          const transactionData = {
            type: transactionTypes[i],
            amount: 10.00 * (i + 1),
            description: `Test ${transactionTypes[i].toLowerCase()}`,
            userId: 'customer-1-id'
          };

          const response = await createAuthenticatedRequest(
            app, 'post', transactionsEndpoint, context.adminToken
          )
            .send(transactionData)
            .expect(201);

          expect(response.body.data.type).toBe(transactionTypes[i]);
        }
      });

      it('should handle negative amounts for refunds', async () => {
        const transactionData = {
          type: 'REFUND',
          amount: -15.00,
          description: 'Parking refund',
          userId: 'customer-1-id',
          reservationId: 'reservation-1-id'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', transactionsEndpoint, context.adminToken
        )
          .send(transactionData)
          .expect(201);

        expect(response.body.data.amount).toBe(-15.00);
        expect(response.body.data.type).toBe('REFUND');
      });

      it('should link transaction to reservation and payment', async () => {
        const transactionData = {
          type: 'PAYMENT',
          amount: 10.00,
          description: 'Parking payment',
          userId: 'customer-1-id',
          reservationId: 'reservation-1-id',
          paymentId: 'payment-1-id'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', transactionsEndpoint, context.adminToken
        )
          .send(transactionData)
          .expect(201);

        const transaction = response.body.data;
        expect(transaction.reservationId).toBe(transactionData.reservationId);
        expect(transaction.paymentId).toBe(transactionData.paymentId);
      });
    });

    describe('System-Generated Transactions', () => {
      it('should create transaction automatically for payment processing', async () => {
        // This would be called by the payment service
        const transactionData = {
          type: 'PAYMENT',
          amount: 20.00,
          description: 'Parking fee payment',
          userId: 'customer-1-id',
          reservationId: 'reservation-1-id',
          paymentId: 'payment-1-id',
          systemGenerated: true
        };

        const response = await createAuthenticatedRequest(
          app, 'post', transactionsEndpoint, context.adminToken
        )
          .send(transactionData)
          .expect(201);

        expect(response.body.data.systemGenerated).toBe(true);
        expect(response.body.data.status).toBe('COMPLETED'); // System transactions might be auto-completed
      });

      it('should create penalty transaction for violations', async () => {
        const transactionData = {
          type: 'PENALTY',
          amount: 25.00,
          description: 'Overstay penalty - exceeded reservation by 2 hours',
          userId: 'customer-1-id',
          reservationId: 'reservation-1-id',
          metadata: {
            violationType: 'overstay',
            excessHours: 2,
            penaltyRate: 12.50
          }
        };

        const response = await createAuthenticatedRequest(
          app, 'post', transactionsEndpoint, context.adminToken
        )
          .send(transactionData)
          .expect(201);

        expect(response.body.data.type).toBe('PENALTY');
        expect(response.body.data.metadata.violationType).toBe('overstay');
      });
    });

    describe('Input Validation', () => {
      const transactionValidationCases: ValidationTestCase[] = [
        {
          name: 'missing type',
          input: {
            amount: 10.00,
            description: 'Test transaction',
            userId: 'customer-1-id'
          },
          expectedStatus: 400
        },
        {
          name: 'missing amount',
          input: {
            type: 'PAYMENT',
            description: 'Test transaction',
            userId: 'customer-1-id'
          },
          expectedStatus: 400
        },
        {
          name: 'missing description',
          input: {
            type: 'PAYMENT',
            amount: 10.00,
            userId: 'customer-1-id'
          },
          expectedStatus: 400
        },
        {
          name: 'missing user ID',
          input: {
            type: 'PAYMENT',
            amount: 10.00,
            description: 'Test transaction'
          },
          expectedStatus: 400
        },
        {
          name: 'invalid transaction type',
          input: {
            type: 'INVALID_TYPE',
            amount: 10.00,
            description: 'Test transaction',
            userId: 'customer-1-id'
          },
          expectedStatus: 400
        },
        {
          name: 'zero amount (invalid for most types)',
          input: {
            type: 'PAYMENT',
            amount: 0,
            description: 'Test transaction',
            userId: 'customer-1-id'
          },
          expectedStatus: 400
        },
        {
          name: 'amount too large',
          input: {
            type: 'PAYMENT',
            amount: 10000.00,
            description: 'Test transaction',
            userId: 'customer-1-id'
          },
          expectedStatus: 400
        },
        {
          name: 'positive amount for refund',
          input: {
            type: 'REFUND',
            amount: 10.00, // Should be negative
            description: 'Test refund',
            userId: 'customer-1-id'
          },
          expectedStatus: 400
        },
        {
          name: 'empty description',
          input: {
            type: 'PAYMENT',
            amount: 10.00,
            description: '',
            userId: 'customer-1-id'
          },
          expectedStatus: 400
        }
      ];

      it('should validate transaction creation input', async () => {
        const results = await testInputValidation(
          app,
          'post',
          transactionsEndpoint,
          transactionValidationCases,
          context.adminToken
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });

      it('should prevent transaction for non-existent user', async () => {
        const transactionData = {
          type: 'PAYMENT',
          amount: 10.00,
          description: 'Test transaction',
          userId: 'non-existent-user'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', transactionsEndpoint, context.adminToken
        )
          .send(transactionData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('user');
      });

      it('should prevent transaction for non-existent reservation', async () => {
        const transactionData = {
          type: 'PAYMENT',
          amount: 10.00,
          description: 'Test transaction',
          userId: 'customer-1-id',
          reservationId: 'non-existent-reservation'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', transactionsEndpoint, context.adminToken
        )
          .send(transactionData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('reservation');
      });
    });

    describe('Authorization', () => {
      it('should require authentication', async () => {
        const transactionData = {
          type: 'PAYMENT',
          amount: 10.00,
          description: 'Test transaction',
          userId: 'customer-1-id'
        };

        const response = await request(app)
          .post(transactionsEndpoint)
          .send(transactionData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should allow only admin/manager to create transactions', async () => {
        const transactionData = {
          type: 'FEE',
          amount: 5.00,
          description: 'Service fee',
          userId: 'customer-1-id'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', transactionsEndpoint, context.customerToken
        )
          .send(transactionData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });

      it('should allow manager to create certain types of transactions', async () => {
        const transactionData = {
          type: 'FEE',
          amount: 5.00,
          description: 'Processing fee',
          userId: 'customer-1-id'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', transactionsEndpoint, context.managerToken
        )
          .send(transactionData)
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should prevent manager from creating high-value transactions', async () => {
        const transactionData = {
          type: 'PENALTY',
          amount: 500.00, // High value transaction
          description: 'Large penalty',
          userId: 'customer-1-id'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', transactionsEndpoint, context.managerToken
        )
          .send(transactionData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('authorization');
      });
    });
  });

  describe('GET /api/transactions/:id (Get Transaction Details)', () => {
    const testTransactionId = 'transaction-1-id';

    describe('Valid Access', () => {
      it('should allow admin to get any transaction details', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/transactions/${testTransactionId}`, context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const transaction = response.body.data;
        expect(transaction.id).toBe(testTransactionId);
        expect(transaction).toHaveProperty('type');
        expect(transaction).toHaveProperty('amount');
        expect(transaction).toHaveProperty('status');
        expect(transaction).toHaveProperty('description');
        expect(transaction).toHaveProperty('userId');
        expect(transaction).toHaveProperty('createdAt');
      });

      it('should allow manager to get transaction details', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/transactions/${testTransactionId}`, context.managerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testTransactionId);
      });

      it('should allow customer to get their own transaction details', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/transactions/${testTransactionId}`, context.customerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        const transaction = response.body.data;
        expect(transaction.userId).toBe('customer-1-id');
      });

      it('should include related data for admin view', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/transactions/${testTransactionId}?include=reservation,payment,user`, context.adminToken
        ).expect(200);

        const transaction = response.body.data;
        if (transaction.reservationId) {
          expect(transaction).toHaveProperty('reservation');
          expect(transaction.reservation).toHaveProperty('id');
        }
        if (transaction.paymentId) {
          expect(transaction).toHaveProperty('payment');
          expect(transaction.payment).toHaveProperty('id');
        }
        expect(transaction).toHaveProperty('user');
        expect(transaction.user).toHaveProperty('firstName');
      });

      it('should show transaction history and audit trail for admin', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/transactions/${testTransactionId}?includeAuditTrail=true`, context.adminToken
        ).expect(200);

        const transaction = response.body.data;
        if (transaction.auditTrail) {
          expect(Array.isArray(transaction.auditTrail)).toBe(true);
          transaction.auditTrail.forEach((entry: any) => {
            expect(entry).toHaveProperty('action');
            expect(entry).toHaveProperty('timestamp');
            expect(entry).toHaveProperty('userId');
          });
        }
      });
    });

    describe('Authorization Restrictions', () => {
      it('should prevent customer from accessing other customers\' transactions', async () => {
        const otherTransactionId = 'transaction-2-id'; // Different customer's transaction
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/transactions/${otherTransactionId}`, context.customerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });

      it('should limit sensitive data for customer view', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/transactions/${testTransactionId}`, context.customerToken
        ).expect(200);

        const transaction = response.body.data;
        // Administrative metadata should be hidden
        expect(transaction).not.toHaveProperty('internalNotes');
        expect(transaction).not.toHaveProperty('processedBy');
        
        // Sensitive payment details should be redacted
        if (transaction.payment && transaction.payment.paymentIntentId) {
          expect(transaction.payment.paymentIntentId).toMatch(/^\*+/);
        }
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for non-existent transaction', async () => {
        const nonExistentId = 'non-existent-transaction';
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/transactions/${nonExistentId}`, context.adminToken
        ).expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('not found');
      });

      it('should validate transaction ID format', async () => {
        const invalidId = 'invalid-transaction-format';
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/transactions/${invalidId}`, context.adminToken
        ).expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('PUT /api/transactions/:id/status (Update Transaction Status)', () => {
    const testTransactionId = 'transaction-1-id';
    const statusEndpoint = `/api/transactions/${testTransactionId}/status`;

    describe('Valid Status Updates', () => {
      it('should allow admin to update transaction status', async () => {
        const statusData = {
          status: 'COMPLETED',
          notes: 'Manually processed by admin'
        };

        const response = await createAuthenticatedRequest(
          app, 'put', statusEndpoint, context.adminToken
        )
          .send(statusData)
          .expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const transaction = response.body.data;
        expect(transaction.status).toBe(statusData.status);
        expect(transaction).toHaveProperty('processedAt');
        expect(transaction).toHaveProperty('updatedAt');
        expect(transaction.notes).toBe(statusData.notes);
      });

      it('should allow manager to update certain transaction statuses', async () => {
        const statusData = {
          status: 'COMPLETED',
          notes: 'Processed by manager'
        };

        const response = await createAuthenticatedRequest(
          app, 'put', statusEndpoint, context.managerToken
        )
          .send(statusData)
          .expect(200);

        expect(response.body.data.status).toBe(statusData.status);
      });

      it('should handle different valid status transitions', async () => {
        const validTransitions = [
          { from: 'PENDING', to: 'COMPLETED' },
          { from: 'PENDING', to: 'FAILED' },
          { from: 'PENDING', to: 'CANCELLED' },
          { from: 'FAILED', to: 'PENDING' } // Retry
        ];

        for (const transition of validTransitions) {
          // Set up transaction in initial status
          await createAuthenticatedRequest(
            app, 'put', statusEndpoint, context.adminToken
          )
            .send({ status: transition.from })
            .expect(200);

          // Attempt transition
          const response = await createAuthenticatedRequest(
            app, 'put', statusEndpoint, context.adminToken
          )
            .send({ status: transition.to })
            .expect(200);

          expect(response.body.data.status).toBe(transition.to);
        }
      });

      it('should set processedAt timestamp for completed transactions', async () => {
        const statusData = { status: 'COMPLETED' };

        const response = await createAuthenticatedRequest(
          app, 'put', statusEndpoint, context.adminToken
        )
          .send(statusData)
          .expect(200);

        expect(response.body.data.processedAt).toBeDefined();
        expect(new Date(response.body.data.processedAt)).toBeInstanceOf(Date);
      });

      it('should clear processedAt for non-completed statuses', async () => {
        // First set to completed
        await createAuthenticatedRequest(
          app, 'put', statusEndpoint, context.adminToken
        )
          .send({ status: 'COMPLETED' })
          .expect(200);

        // Then set to pending
        const response = await createAuthenticatedRequest(
          app, 'put', statusEndpoint, context.adminToken
        )
          .send({ status: 'PENDING' })
          .expect(200);

        expect(response.body.data.processedAt).toBeNull();
      });
    });

    describe('Business Logic Restrictions', () => {
      it('should prevent invalid status transitions', async () => {
        // Set transaction to completed
        await createAuthenticatedRequest(
          app, 'put', statusEndpoint, context.adminToken
        )
          .send({ status: 'COMPLETED' })
          .expect(200);

        // Try to set to failed (invalid transition)
        const response = await createAuthenticatedRequest(
          app, 'put', statusEndpoint, context.adminToken
        )
          .send({ status: 'FAILED' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('transition');
      });

      it('should require approval for high-value transaction completions', async () => {
        // This test assumes high-value transactions need approval
        const highValueTransactionId = 'high-value-transaction-id';
        const statusData = {
          status: 'COMPLETED',
          approvalCode: 'missing-approval'
        };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/transactions/${highValueTransactionId}/status`, context.managerToken
        )
          .send(statusData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('approval');
      });

      it('should validate status change reasons for certain transitions', async () => {
        const statusData = {
          status: 'FAILED',
          // Missing reason for failure
        };

        const response = await createAuthenticatedRequest(
          app, 'put', statusEndpoint, context.adminToken
        )
          .send(statusData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('reason');
      });

      it('should update related entities on status change', async () => {
        // When transaction is completed, related payment/reservation should be updated
        const statusData = { status: 'COMPLETED' };

        const response = await createAuthenticatedRequest(
          app, 'put', statusEndpoint, context.adminToken
        )
          .send(statusData)
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // Verify related entities are updated (would check payment/reservation status)
        if (response.body.data.relatedUpdates) {
          expect(response.body.data.relatedUpdates).toContain('payment');
        }
      });
    });

    describe('Input Validation', () => {
      const statusValidationCases: ValidationTestCase[] = [
        {
          name: 'missing status',
          input: { notes: 'Test update' },
          expectedStatus: 400
        },
        {
          name: 'invalid status value',
          input: { status: 'INVALID_STATUS' },
          expectedStatus: 400
        },
        {
          name: 'empty status',
          input: { status: '' },
          expectedStatus: 400
        },
        {
          name: 'notes too long',
          input: { 
            status: 'COMPLETED',
            notes: 'A'.repeat(2000) // Very long notes
          },
          expectedStatus: 400
        }
      ];

      it('should validate status update input', async () => {
        const results = await testInputValidation(
          app,
          'put',
          statusEndpoint,
          statusValidationCases,
          context.adminToken
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });
    });

    describe('Authorization', () => {
      it('should require authentication', async () => {
        const statusData = { status: 'COMPLETED' };

        const response = await request(app)
          .put(statusEndpoint)
          .send(statusData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should prevent customer from updating transaction status', async () => {
        const statusData = { status: 'COMPLETED' };

        const response = await createAuthenticatedRequest(
          app, 'put', statusEndpoint, context.customerToken
        )
          .send(statusData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });

      it('should prevent manager from certain high-privilege status changes', async () => {
        const statusData = {
          status: 'CANCELLED',
          forceOverride: true // Admin-only flag
        };

        const response = await createAuthenticatedRequest(
          app, 'put', statusEndpoint, context.managerToken
        )
          .send(statusData)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Audit Trail', () => {
      it('should log status changes for audit purposes', async () => {
        const statusData = {
          status: 'COMPLETED',
          notes: 'Test completion for audit'
        };

        const response = await createAuthenticatedRequest(
          app, 'put', statusEndpoint, context.adminToken
        )
          .send(statusData)
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // Verify audit trail entry was created
        const auditResponse = await createAuthenticatedRequest(
          app, 'get', `/api/transactions/${testTransactionId}?includeAuditTrail=true`, context.adminToken
        ).expect(200);

        const auditTrail = auditResponse.body.data.auditTrail;
        if (auditTrail && auditTrail.length > 0) {
          const latestEntry = auditTrail[auditTrail.length - 1];
          expect(latestEntry.action).toContain('status');
          expect(latestEntry.newValue).toBe('COMPLETED');
        }
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for non-existent transaction', async () => {
        const nonExistentEndpoint = '/api/transactions/non-existent-transaction/status';
        const statusData = { status: 'COMPLETED' };

        const response = await createAuthenticatedRequest(
          app, 'put', nonExistentEndpoint, context.adminToken
        )
          .send(statusData)
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should handle concurrent status updates gracefully', async () => {
        const statusData = { status: 'COMPLETED' };

        // Send concurrent status updates
        const promises = Array.from({ length: 3 }, () =>
          createAuthenticatedRequest(app, 'put', statusEndpoint, context.adminToken)
            .send(statusData)
        );

        const responses = await Promise.all(promises);

        // First should succeed, others might conflict or succeed idempotently
        const successfulResponses = responses.filter(r => r.status === 200);
        const conflictResponses = responses.filter(r => r.status === 409);

        expect(successfulResponses.length).toBeGreaterThan(0);
        // Either all succeed (idempotent) or some conflict
        expect(successfulResponses.length + conflictResponses.length).toBe(3);
      });
    });
  });

  describe('Security and Error Handling', () => {
    it('should sanitize transaction input to prevent injection attacks', async () => {
      const maliciousInput = {
        type: 'PAYMENT',
        amount: 10.00,
        description: '<script>alert("xss")</script>',
        userId: 'customer-1-id',
        metadata: {
          notes: 'DROP TABLE transactions;',
          category: '"; DELETE FROM users; --'
        }
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/transactions', context.adminToken
      )
        .send(maliciousInput);

      if (response.status === 201) {
        // Values should be sanitized
        expect(response.body.data.description).not.toContain('<script>');
        expect(response.body.data.metadata.notes).not.toContain('DROP TABLE');
      }
    });

    it('should handle database errors gracefully', async () => {
      // Simulate database error scenarios
      const transactionData = {
        type: 'PAYMENT',
        amount: 10.00,
        description: 'Database error test',
        userId: 'customer-1-id',
        simulateDatabaseError: true // Test parameter
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/transactions', context.adminToken
      )
        .send(transactionData);

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(response.status).toBeLessThan(600);
      expect(response.body.success).toBe(false);
    });

    it('should enforce rate limiting for transaction operations', async () => {
      const results = await testRateLimit(
        app,
        '/api/transactions',
        'post',
        5, // Very low limit for transaction creation
        60000,
        context.adminToken
      );

      expect(results.firstRateLimitHit).toBeLessThan(10);
      expect(results.rateLimitedRequests).toBeGreaterThan(0);
    });

    it('should maintain transaction consistency across concurrent operations', async () => {
      const transactionData = {
        type: 'FEE',
        amount: 5.00,
        description: 'Concurrent processing fee',
        userId: 'customer-1-id'
      };

      // Create multiple concurrent transactions
      const promises = Array.from({ length: 3 }, (_, i) =>
        createAuthenticatedRequest(app, 'post', '/api/transactions', context.adminToken)
          .send({
            ...transactionData,
            description: `${transactionData.description} ${i}`
          })
      );

      const responses = await Promise.all(promises);

      // All should succeed with unique IDs
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
      });

      // Each should have unique transaction IDs
      const transactionIds = responses.map(r => r.body.data.id);
      const uniqueIds = new Set(transactionIds);
      expect(uniqueIds.size).toBe(transactionIds.length);
    });

    it('should log transaction actions for compliance audit', async () => {
      const transactionData = {
        type: 'PENALTY',
        amount: 50.00,
        description: 'Parking violation penalty',
        userId: 'customer-1-id',
        metadata: {
          violationType: 'unauthorized_parking',
          location: 'Zone A, Spot 15'
        }
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/transactions', context.adminToken
      )
        .send(transactionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // In a real scenario, you'd check compliance audit logs here
      expect(response.body.data.auditCompliant).toBe(true);
    });

    it('should handle timezone issues in transaction timestamps', async () => {
      const transactionData = {
        type: 'PAYMENT',
        amount: 10.00,
        description: 'Timezone test transaction',
        userId: 'customer-1-id'
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/transactions', context.adminToken
      )
        .send(transactionData)
        .expect(201);

      const transaction = response.body.data;
      
      // Timestamps should be in ISO format with timezone
      expect(transaction.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z?$/);
      expect(new Date(transaction.createdAt)).toBeInstanceOf(Date);
      expect(new Date(transaction.createdAt).getTime()).not.toBeNaN();
    });

    it('should validate transaction amount precision', async () => {
      const transactionData = {
        type: 'PAYMENT',
        amount: 10.999, // Too many decimal places
        description: 'Precision test',
        userId: 'customer-1-id'
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/transactions', context.adminToken
      )
        .send(transactionData);

      if (response.status === 201) {
        // Amount should be rounded to 2 decimal places
        expect(response.body.data.amount).toBe(11.00);
      } else {
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('precision');
      }
    });
  });
});
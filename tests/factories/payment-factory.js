/**
 * Payment Factory for Test Data Generation
 * Creates test payment instances for database testing
 */

const { faker } = require('@faker-js/faker');

/**
 * Payment statuses
 */
const PAYMENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'];

/**
 * Payment methods
 */
const PAYMENT_METHODS = ['credit_card', 'debit_card', 'cash', 'mobile_payment', 'contactless'];

/**
 * Create payment data for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Payment data object
 */
function createPaymentData(overrides = {}) {
  const amount = overrides.amount || parseFloat(faker.finance.amount(5, 50, 2));
  
  return {
    id: overrides.id || faker.string.uuid(),
    sessionId: overrides.sessionId || faker.string.uuid(),
    amount,
    method: overrides.method || faker.helpers.arrayElement(PAYMENT_METHODS),
    status: overrides.status || faker.helpers.arrayElement(PAYMENT_STATUSES),
    transactionId: overrides.transactionId || faker.string.alphanumeric(12).toUpperCase(),
    cardLast4: overrides.cardLast4 || (overrides.method?.includes('card') ? faker.finance.creditCardNumber().slice(-4) : null),
    processedAt: overrides.processedAt || (overrides.status === 'completed' ? new Date().toISOString() : null),
    failureReason: overrides.failureReason || (overrides.status === 'failed' ? faker.helpers.arrayElement([
      'insufficient_funds',
      'card_declined',
      'expired_card',
      'invalid_card',
      'processing_error'
    ]) : null),
    refundAmount: overrides.refundAmount || (overrides.status === 'refunded' ? amount : null),
    refundReason: overrides.refundReason || (overrides.status === 'refunded' ? 'customer_request' : null),
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create payment instance with Prisma (if available)
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created payment
 */
async function createPayment(overrides = {}) {
  const data = createPaymentData(overrides);
  
  const prisma = global.testDb?.getPrisma?.();
  if (prisma && prisma.payment) {
    try {
      return await prisma.payment.create({
        data: {
          sessionId: data.sessionId,
          amount: data.amount,
          method: data.method,
          status: data.status,
          transactionId: data.transactionId,
          cardLast4: data.cardLast4,
          processedAt: data.processedAt ? new Date(data.processedAt) : null,
          failureReason: data.failureReason,
          refundAmount: data.refundAmount,
          refundReason: data.refundReason
        }
      });
    } catch (error) {
      console.warn('Could not create payment with Prisma:', error.message);
      return data;
    }
  }
  
  return data;
}

/**
 * Create successful payment
 * @param {string} sessionId - Session ID
 * @param {number} amount - Payment amount
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created successful payment
 */
async function createSuccessfulPayment(sessionId, amount, overrides = {}) {
  return createPayment({
    sessionId,
    amount,
    status: 'completed',
    processedAt: new Date().toISOString(),
    transactionId: faker.string.alphanumeric(12).toUpperCase(),
    ...overrides
  });
}

/**
 * Create failed payment
 * @param {string} sessionId - Session ID
 * @param {number} amount - Payment amount
 * @param {string} reason - Failure reason
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created failed payment
 */
async function createFailedPayment(sessionId, amount, reason = 'card_declined', overrides = {}) {
  return createPayment({
    sessionId,
    amount,
    status: 'failed',
    failureReason: reason,
    processedAt: new Date().toISOString(),
    ...overrides
  });
}

/**
 * Create pending payment
 * @param {string} sessionId - Session ID
 * @param {number} amount - Payment amount
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created pending payment
 */
async function createPendingPayment(sessionId, amount, overrides = {}) {
  return createPayment({
    sessionId,
    amount,
    status: 'pending',
    processedAt: null,
    ...overrides
  });
}

/**
 * Create refunded payment
 * @param {string} sessionId - Session ID
 * @param {number} amount - Original payment amount
 * @param {number} refundAmount - Refund amount (defaults to full amount)
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created refunded payment
 */
async function createRefundedPayment(sessionId, amount, refundAmount = null, overrides = {}) {
  return createPayment({
    sessionId,
    amount,
    status: 'refunded',
    processedAt: faker.date.recent().toISOString(),
    refundAmount: refundAmount || amount,
    refundReason: 'customer_request',
    ...overrides
  });
}

/**
 * Create multiple payments
 * @param {number} count - Number of payments to create
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Array>} Array of payment objects
 */
async function createPayments(count = 3, overrides = {}) {
  const payments = [];
  for (let i = 0; i < count; i++) {
    payments.push(await createPayment(overrides));
  }
  return payments;
}

/**
 * Create payments for a specific session
 * @param {string} sessionId - Session ID
 * @param {number} amount - Payment amount
 * @param {number} count - Number of payment attempts (defaults to 1)
 * @returns {Promise<Array>} Array of payments (latest is usually successful)
 */
async function createPaymentsForSession(sessionId, amount, count = 1) {
  const payments = [];
  
  for (let i = 0; i < count; i++) {
    const isLastAttempt = i === count - 1;
    const status = isLastAttempt 
      ? faker.helpers.arrayElement(['completed', 'pending'])
      : faker.helpers.arrayElement(['failed', 'cancelled']);
    
    payments.push(await createPayment({
      sessionId,
      amount,
      status,
      processedAt: status === 'completed' ? new Date().toISOString() : null,
      failureReason: status === 'failed' ? 'card_declined' : null
    }));
  }
  
  return payments;
}

/**
 * Create payment with specific method
 * @param {string} method - Payment method
 * @param {string} sessionId - Session ID
 * @param {number} amount - Payment amount
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created payment
 */
async function createPaymentWithMethod(method, sessionId, amount, overrides = {}) {
  const methodSpecificData = {};
  
  if (method.includes('card')) {
    methodSpecificData.cardLast4 = faker.finance.creditCardNumber().slice(-4);
  }
  
  return createPayment({
    sessionId,
    amount,
    method,
    ...methodSpecificData,
    ...overrides
  });
}

module.exports = {
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  createPaymentData,
  createPayment,
  createSuccessfulPayment,
  createFailedPayment,
  createPendingPayment,
  createRefundedPayment,
  createPayments,
  createPaymentsForSession,
  createPaymentWithMethod
};
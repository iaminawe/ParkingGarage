/**
 * Payment repository for data access operations using Prisma
 * 
 * This module provides data access methods for payments and transactions
 * using the PrismaAdapter pattern. It handles payment CRUD operations,
 * transaction tracking, and financial reporting.
 * 
 * @module PaymentRepository
 */

import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { Payment, Prisma, PaymentType, PaymentMethod, PaymentStatus } from '../generated/prisma';
import type { 
  QueryOptions,
  PaginatedResult,
  IAdapterLogger
} from '../adapters/interfaces/BaseAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { createLogger } from '../utils/logger';

/**
 * Payment creation data interface
 */
export interface CreatePaymentData {
  garageId: string;
  vehicleId?: string;
  sessionId?: string;
  ticketId?: string;
  paymentNumber?: string;
  type: PaymentType;
  method: PaymentMethod;
  status?: PaymentStatus;
  amount: number;
  currency?: string;
  transactionId?: string;
  gatewayResponse?: string;
  paymentDate?: Date;
}

/**
 * Payment update data interface
 */
export interface UpdatePaymentData {
  garageId?: string;
  vehicleId?: string;
  sessionId?: string;
  ticketId?: string;
  paymentNumber?: string;
  type?: PaymentType;
  method?: PaymentMethod;
  status?: PaymentStatus;
  amount?: number;
  currency?: string;
  transactionId?: string;
  gatewayResponse?: string;
  paymentDate?: Date;
  processedAt?: Date;
  refundAmount?: number;
  refundDate?: Date;
  refundReason?: string;
}

/**
 * Payment search criteria interface
 */
export interface PaymentSearchCriteria {
  garageId?: string;
  vehicleId?: string;
  sessionId?: string;
  ticketId?: string;
  licensePlate?: string;
  type?: PaymentType;
  method?: PaymentMethod;
  status?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  transactionId?: string;
  paymentNumber?: string;
}

/**
 * Payment statistics interface
 */
export interface PaymentStats {
  total: number;
  totalAmount: number;
  byStatus: {
    pending: { count: number; amount: number };
    completed: { count: number; amount: number };
    failed: { count: number; amount: number };
    cancelled: { count: number; amount: number };
    refunded: { count: number; amount: number };
    disputed: { count: number; amount: number };
  };
  byType: Record<PaymentType, { count: number; amount: number }>;
  byMethod: Record<PaymentMethod, { count: number; amount: number }>;
  totalRefunded: number;
  averageAmount: number;
}

/**
 * Repository for managing payments using Prisma
 */
export class PaymentRepository extends PrismaAdapter<Payment, CreatePaymentData, UpdatePaymentData> {
  protected readonly modelName = 'payment';
  protected readonly delegate: Prisma.PaymentDelegate;

  constructor(
    databaseService?: DatabaseService,
    logger?: IAdapterLogger
  ) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prismaClient = dbService.getClient();
    
    super(prismaClient, logger || createLogger('PaymentRepository'));
    this.delegate = prismaClient.payment;
  }

  /**
   * Find payment by payment number
   * @param paymentNumber - Unique payment number
   * @param options - Query options
   * @returns Found payment or null
   */
  async findByPaymentNumber(
    paymentNumber: string,
    options?: QueryOptions
  ): Promise<Payment | null> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findFirst({
        where: {
          paymentNumber,
          deletedAt: null
        },
        include: {
          garage: true,
          vehicle: true,
          session: true,
          ticket: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found payment by payment number', {
        paymentNumber,
        found: !!result
      });
      
      return result;
    }, `find payment by number: ${paymentNumber}`);
  }

  /**
   * Find payment by transaction ID
   * @param transactionId - External transaction ID
   * @param options - Query options
   * @returns Found payment or null
   */
  async findByTransactionId(
    transactionId: string,
    options?: QueryOptions
  ): Promise<Payment | null> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findFirst({
        where: {
          transactionId,
          deletedAt: null
        },
        include: {
          garage: true,
          vehicle: true,
          session: true,
          ticket: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found payment by transaction ID', {
        transactionId,
        found: !!result
      });
      
      return result;
    }, `find payment by transaction ID: ${transactionId}`);
  }

  /**
   * Find payments by status
   * @param status - Payment status to filter by
   * @param options - Query options
   * @returns Array of payments matching the status
   */
  async findByStatus(
    status: PaymentStatus,
    options?: QueryOptions
  ): Promise<Payment[]> {
    return this.findMany({ status }, options);
  }

  /**
   * Find payments by type
   * @param type - Payment type to filter by
   * @param options - Query options
   * @returns Array of payments matching the type
   */
  async findByType(
    type: PaymentType,
    options?: QueryOptions
  ): Promise<Payment[]> {
    return this.findMany({ type }, options);
  }

  /**
   * Find payments by method
   * @param method - Payment method to filter by
   * @param options - Query options
   * @returns Array of payments matching the method
   */
  async findByMethod(
    method: PaymentMethod,
    options?: QueryOptions
  ): Promise<Payment[]> {
    return this.findMany({ method }, options);
  }

  /**
   * Find payments by vehicle ID
   * @param vehicleId - Vehicle ID
   * @param options - Query options
   * @returns Array of payments for the vehicle
   */
  async findByVehicleId(
    vehicleId: string,
    options?: QueryOptions
  ): Promise<Payment[]> {
    return this.findMany({ vehicleId }, options);
  }

  /**
   * Find payments by license plate
   * @param licensePlate - Vehicle license plate
   * @param options - Query options
   * @returns Array of payments for the vehicle
   */
  async findByLicensePlate(
    licensePlate: string,
    options?: QueryOptions
  ): Promise<Payment[]> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findMany({
        where: {
          vehicle: {
            licensePlate: licensePlate.toUpperCase(),
            deletedAt: null
          },
          deletedAt: null
        },
        include: {
          garage: true,
          vehicle: true,
          session: true,
          ticket: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found payments by license plate', {
        licensePlate,
        count: result.length
      });
      
      return result;
    }, `find payments by license plate: ${licensePlate}`);
  }

  /**
   * Find payments by session ID
   * @param sessionId - Session ID
   * @param options - Query options
   * @returns Array of payments for the session
   */
  async findBySessionId(
    sessionId: string,
    options?: QueryOptions
  ): Promise<Payment[]> {
    return this.findMany({ sessionId }, options);
  }

  /**
   * Find payments by ticket ID
   * @param ticketId - Ticket ID
   * @param options - Query options
   * @returns Array of payments for the ticket
   */
  async findByTicketId(
    ticketId: string,
    options?: QueryOptions
  ): Promise<Payment[]> {
    return this.findMany({ ticketId }, options);
  }

  /**
   * Find payments by garage ID
   * @param garageId - Garage ID
   * @param options - Query options
   * @returns Array of payments for the garage
   */
  async findByGarageId(
    garageId: string,
    options?: QueryOptions
  ): Promise<Payment[]> {
    return this.findMany({ garageId }, options);
  }

  /**
   * Find pending payments
   * @param options - Query options
   * @returns Array of pending payments
   */
  async findPending(options?: QueryOptions): Promise<Payment[]> {
    return this.findByStatus('PENDING', options);
  }

  /**
   * Find completed payments
   * @param options - Query options
   * @returns Array of completed payments
   */
  async findCompleted(options?: QueryOptions): Promise<Payment[]> {
    return this.findByStatus('COMPLETED', options);
  }

  /**
   * Find failed payments
   * @param options - Query options
   * @returns Array of failed payments
   */
  async findFailed(options?: QueryOptions): Promise<Payment[]> {
    return this.findByStatus('FAILED', options);
  }

  /**
   * Find refunded payments
   * @param options - Query options
   * @returns Array of refunded payments
   */
  async findRefunded(options?: QueryOptions): Promise<Payment[]> {
    return this.findByStatus('REFUNDED', options);
  }

  /**
   * Search payments with multiple criteria
   * @param criteria - Search criteria
   * @param options - Query options
   * @returns Array of payments matching all criteria
   */
  async search(
    criteria: PaymentSearchCriteria,
    options?: QueryOptions
  ): Promise<Payment[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.PaymentWhereInput = {
        deletedAt: null
      };

      // Direct field matches
      if (criteria.garageId) {
        whereClause.garageId = criteria.garageId;
      }

      if (criteria.vehicleId) {
        whereClause.vehicleId = criteria.vehicleId;
      }

      if (criteria.sessionId) {
        whereClause.sessionId = criteria.sessionId;
      }

      if (criteria.ticketId) {
        whereClause.ticketId = criteria.ticketId;
      }

      if (criteria.type) {
        whereClause.type = criteria.type;
      }

      if (criteria.method) {
        whereClause.method = criteria.method;
      }

      if (criteria.status) {
        whereClause.status = criteria.status;
      }

      if (criteria.paymentNumber) {
        whereClause.paymentNumber = {
          contains: criteria.paymentNumber,
          mode: 'insensitive'
        };
      }

      if (criteria.transactionId) {
        whereClause.transactionId = {
          contains: criteria.transactionId,
          mode: 'insensitive'
        };
      }

      // Date range search
      if (criteria.startDate || criteria.endDate) {
        whereClause.paymentDate = {};
        if (criteria.startDate) {
          whereClause.paymentDate.gte = criteria.startDate;
        }
        if (criteria.endDate) {
          whereClause.paymentDate.lte = criteria.endDate;
        }
      }

      // Amount range search
      if (criteria.minAmount || criteria.maxAmount) {
        whereClause.amount = {};
        if (criteria.minAmount) {
          whereClause.amount.gte = criteria.minAmount;
        }
        if (criteria.maxAmount) {
          whereClause.amount.lte = criteria.maxAmount;
        }
      }

      // License plate search
      if (criteria.licensePlate) {
        whereClause.vehicle = {
          licensePlate: {
            contains: criteria.licensePlate.toUpperCase(),
            mode: 'insensitive'
          },
          deletedAt: null
        };
      }

      const result = await this.delegate.findMany({
        where: whereClause,
        include: {
          garage: true,
          vehicle: true,
          session: true,
          ticket: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Payment search completed', {
        criteria,
        count: result.length
      });
      
      return result;
    }, 'search payments');
  }

  /**
   * Create a new payment with auto-generated payment number
   * @param paymentData - Payment creation data
   * @returns Created payment
   */
  async createPayment(paymentData: CreatePaymentData): Promise<Payment> {
    return this.executeWithRetry(async () => {
      // Generate payment number if not provided
      let paymentNumber = paymentData.paymentNumber;
      if (!paymentNumber) {
        paymentNumber = await this.generatePaymentNumber();
      }

      // Set default values
      const createData = {
        ...paymentData,
        paymentNumber,
        status: paymentData.status || 'PENDING',
        currency: paymentData.currency || 'USD',
        paymentDate: paymentData.paymentDate || new Date(),
        refundAmount: 0.0
      };

      const payment = await this.create(createData);

      this.logger.info('Payment created', {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        type: payment.type,
        method: payment.method,
        amount: payment.amount
      });

      return payment;
    }, 'create payment');
  }

  /**
   * Process a payment (mark as completed)
   * @param paymentId - Payment ID
   * @param transactionId - External transaction ID
   * @param gatewayResponse - Gateway response data
   * @returns Updated payment
   */
  async processPayment(
    paymentId: string,
    transactionId: string,
    gatewayResponse?: string
  ): Promise<Payment> {
    return this.executeWithRetry(async () => {
      const payment = await this.delegate.findFirst({
        where: {
          id: paymentId,
          status: 'PENDING',
          deletedAt: null
        }
      });

      if (!payment) {
        throw new Error(`Pending payment with ID ${paymentId} not found`);
      }

      const updatedPayment = await this.update(paymentId, {
        status: 'COMPLETED',
        transactionId,
        gatewayResponse,
        processedAt: new Date()
      });

      this.logger.info('Payment processed successfully', {
        paymentId,
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
        transactionId
      });

      return updatedPayment;
    }, `process payment: ${paymentId}`);
  }

  /**
   * Fail a payment
   * @param paymentId - Payment ID
   * @param reason - Failure reason
   * @returns Updated payment
   */
  async failPayment(paymentId: string, reason: string): Promise<Payment> {
    return this.executeWithRetry(async () => {
      const payment = await this.delegate.findFirst({
        where: {
          id: paymentId,
          status: 'PENDING',
          deletedAt: null
        }
      });

      if (!payment) {
        throw new Error(`Pending payment with ID ${paymentId} not found`);
      }

      const updatedPayment = await this.update(paymentId, {
        status: 'FAILED',
        gatewayResponse: reason,
        processedAt: new Date()
      });

      this.logger.info('Payment failed', {
        paymentId,
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
        reason
      });

      return updatedPayment;
    }, `fail payment: ${paymentId}`);
  }

  /**
   * Refund a payment
   * @param paymentId - Payment ID
   * @param refundAmount - Amount to refund
   * @param refundReason - Reason for refund
   * @returns Updated payment
   */
  async refundPayment(
    paymentId: string,
    refundAmount: number,
    refundReason: string
  ): Promise<Payment> {
    return this.executeWithRetry(async () => {
      const payment = await this.delegate.findFirst({
        where: {
          id: paymentId,
          status: 'COMPLETED',
          deletedAt: null
        }
      });

      if (!payment) {
        throw new Error(`Completed payment with ID ${paymentId} not found`);
      }

      if (refundAmount > payment.amount) {
        throw new Error(
          `Refund amount ($${refundAmount}) cannot exceed payment amount ($${payment.amount})`
        );
      }

      const updatedPayment = await this.update(paymentId, {
        status: 'REFUNDED',
        refundAmount,
        refundDate: new Date(),
        refundReason
      });

      this.logger.info('Payment refunded', {
        paymentId,
        paymentNumber: payment.paymentNumber,
        originalAmount: payment.amount,
        refundAmount,
        refundReason
      });

      return updatedPayment;
    }, `refund payment: ${paymentId}`);
  }

  /**
   * Get payment statistics
   * @param garageId - Optional garage ID to filter statistics
   * @returns Payment statistics
   */
  async getStats(garageId?: string): Promise<PaymentStats> {
    return this.executeWithRetry(async () => {
      const whereClause = garageId ? { garageId } : {};
      
      // Get total count and amount
      const totalCount = await this.count(whereClause);
      const totalAmountResult = await this.prisma.$queryRaw<
        Array<{ totalAmount: number | null }>
      >`
        SELECT SUM(amount) as totalAmount
        FROM payments
        WHERE deletedAt IS NULL ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
      `;

      // Count by status with amounts
      const statusStats = await this.prisma.$queryRaw<
        Array<{ status: PaymentStatus; count: bigint; amount: number }>
      >`
        SELECT status, COUNT(*) as count, SUM(amount) as amount
        FROM payments
        WHERE deletedAt IS NULL ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY status
      `;

      // Count by type with amounts
      const typeStats = await this.prisma.$queryRaw<
        Array<{ type: PaymentType; count: bigint; amount: number }>
      >`
        SELECT type, COUNT(*) as count, SUM(amount) as amount
        FROM payments
        WHERE deletedAt IS NULL ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY type
      `;

      // Count by method with amounts
      const methodStats = await this.prisma.$queryRaw<
        Array<{ method: PaymentMethod; count: bigint; amount: number }>
      >`
        SELECT method, COUNT(*) as count, SUM(amount) as amount
        FROM payments
        WHERE deletedAt IS NULL ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY method
      `;

      // Total refunded amount
      const refundedResult = await this.prisma.$queryRaw<
        Array<{ totalRefunded: number | null }>
      >`
        SELECT SUM(refundAmount) as totalRefunded
        FROM payments
        WHERE deletedAt IS NULL 
          AND status = 'REFUNDED'
          ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
      `;

      const totalAmount = totalAmountResult[0]?.totalAmount || 0;

      // Build result
      const stats: PaymentStats = {
        total: totalCount,
        totalAmount,
        byStatus: {
          pending: { count: 0, amount: 0 },
          completed: { count: 0, amount: 0 },
          failed: { count: 0, amount: 0 },
          cancelled: { count: 0, amount: 0 },
          refunded: { count: 0, amount: 0 },
          disputed: { count: 0, amount: 0 }
        },
        byType: {} as Record<PaymentType, { count: number; amount: number }>,
        byMethod: {} as Record<PaymentMethod, { count: number; amount: number }>,
        totalRefunded: refundedResult[0]?.totalRefunded || 0,
        averageAmount: totalCount > 0 ? Math.round((totalAmount / totalCount) * 100) / 100 : 0
      };

      // Process status stats
      statusStats.forEach(({ status, count, amount }) => {
        const countNum = Number(count);
        const amountNum = Number(amount) || 0;
        
        switch (status) {
          case 'PENDING':
            stats.byStatus.pending = { count: countNum, amount: amountNum };
            break;
          case 'COMPLETED':
            stats.byStatus.completed = { count: countNum, amount: amountNum };
            break;
          case 'FAILED':
            stats.byStatus.failed = { count: countNum, amount: amountNum };
            break;
          case 'CANCELLED':
            stats.byStatus.cancelled = { count: countNum, amount: amountNum };
            break;
          case 'REFUNDED':
            stats.byStatus.refunded = { count: countNum, amount: amountNum };
            break;
          case 'DISPUTED':
            stats.byStatus.disputed = { count: countNum, amount: amountNum };
            break;
        }
      });

      // Process type stats
      typeStats.forEach(({ type, count, amount }) => {
        stats.byType[type] = {
          count: Number(count),
          amount: Number(amount) || 0
        };
      });

      // Process method stats
      methodStats.forEach(({ method, count, amount }) => {
        stats.byMethod[method] = {
          count: Number(count),
          amount: Number(amount) || 0
        };
      });

      this.logger.debug('Payment statistics calculated', {
        garageId,
        stats
      });
      
      return stats;
    }, 'get payment statistics');
  }

  /**
   * Get daily revenue for a date range
   * @param startDate - Start date
   * @param endDate - End date
   * @param garageId - Optional garage ID filter
   * @returns Daily revenue data
   */
  async getDailyRevenue(
    startDate: Date,
    endDate: Date,
    garageId?: string
  ): Promise<Array<{ date: string; revenue: number; count: number }>> {
    return this.executeWithRetry(async () => {
      const result = await this.prisma.$queryRaw<
        Array<{ date: string; revenue: number; count: bigint }>
      >`
        SELECT 
          DATE(paymentDate) as date,
          SUM(amount) as revenue,
          COUNT(*) as count
        FROM payments
        WHERE deletedAt IS NULL
          AND status = 'COMPLETED'
          AND paymentDate >= ${startDate}
          AND paymentDate <= ${endDate}
          ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY DATE(paymentDate)
        ORDER BY date
      `;

      const dailyRevenue = result.map(({ date, revenue, count }) => ({
        date,
        revenue: Number(revenue) || 0,
        count: Number(count)
      }));

      this.logger.debug('Daily revenue calculated', {
        startDate,
        endDate,
        garageId,
        daysCount: dailyRevenue.length
      });

      return dailyRevenue;
    }, 'get daily revenue');
  }

  /**
   * Generate a unique payment number
   * @returns Generated payment number
   */
  private async generatePaymentNumber(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const paymentNumber = `PAY-${timestamp}-${random}`;
    
    // Ensure uniqueness
    const existing = await this.delegate.findFirst({
      where: { paymentNumber }
    });
    
    if (existing) {
      // If collision (very rare), try again
      return this.generatePaymentNumber();
    }
    
    return paymentNumber;
  }
}

export default PaymentRepository;
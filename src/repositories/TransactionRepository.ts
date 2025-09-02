/**
 * Transaction repository for financial transaction management using Prisma
 * 
 * This module provides data access methods for financial transactions
 * using the PrismaAdapter pattern. It handles transaction CRUD operations,
 * financial reporting, and transaction tracking.
 * 
 * @module TransactionRepository
 */

import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { Transaction, Prisma } from '@prisma/client';
import type { 
  QueryOptions,
  PaginatedResult,
  IAdapterLogger
} from '../adapters/interfaces/BaseAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { createLogger } from '../utils/logger';

/**
 * Transaction creation data interface
 */
export interface CreateTransactionData {
  garageId: string;
  ticketId?: string;
  transactionType: string;
  amount: number;
  currency?: string;
  status?: string;
  paymentMethod?: string;
  paymentReference?: string;
  description?: string;
  metadata?: string;
  processedAt?: Date;
}

/**
 * Transaction update data interface
 */
export interface UpdateTransactionData {
  garageId?: string;
  ticketId?: string;
  transactionType?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paymentMethod?: string;
  paymentReference?: string;
  description?: string;
  metadata?: string;
  processedAt?: Date;
}

/**
 * Transaction search criteria interface
 */
export interface TransactionSearchCriteria {
  garageId?: string;
  ticketId?: string;
  transactionType?: string;
  status?: string;
  paymentMethod?: string;
  paymentReference?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
}

/**
 * Transaction statistics interface
 */
export interface TransactionStats {
  total: number;
  totalAmount: number;
  byStatus: Record<string, { count: number; amount: number }>;
  byType: Record<string, { count: number; amount: number }>;
  byMethod: Record<string, { count: number; amount: number }>;
  byCurrency: Record<string, { count: number; amount: number }>;
  averageAmount: number;
  pendingAmount: number;
  completedAmount: number;
  failedAmount: number;
}

/**
 * Repository for managing financial transactions using Prisma
 */
export class TransactionRepository extends PrismaAdapter<Transaction, CreateTransactionData, UpdateTransactionData> {
  protected readonly modelName = 'transaction';
  protected readonly delegate: Prisma.TransactionDelegate;

  constructor(
    databaseService?: DatabaseService,
    logger?: IAdapterLogger
  ) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prismaClient = dbService.getClient();
    
    super(prismaClient, logger || createLogger('TransactionRepository'));
    this.delegate = prismaClient.transaction;
  }

  /**
   * Find transactions by garage ID
   * @param garageId - Garage ID
   * @param options - Query options
   * @returns Array of transactions for the garage
   */
  async findByGarageId(
    garageId: string,
    options?: QueryOptions
  ): Promise<Transaction[]> {
    return this.findMany({ garageId }, options);
  }

  /**
   * Find transactions by ticket ID
   * @param ticketId - Ticket ID
   * @param options - Query options
   * @returns Array of transactions for the ticket
   */
  async findByTicketId(
    ticketId: string,
    options?: QueryOptions
  ): Promise<Transaction[]> {
    return this.findMany({ ticketId }, options);
  }

  /**
   * Find transactions by type
   * @param transactionType - Transaction type
   * @param options - Query options
   * @returns Array of transactions of the specified type
   */
  async findByType(
    transactionType: string,
    options?: QueryOptions
  ): Promise<Transaction[]> {
    return this.findMany({ transactionType }, options);
  }

  /**
   * Find transactions by status
   * @param status - Transaction status
   * @param options - Query options
   * @returns Array of transactions with the specified status
   */
  async findByStatus(
    status: string,
    options?: QueryOptions
  ): Promise<Transaction[]> {
    return this.findMany({ status }, options);
  }

  /**
   * Find transactions by payment method
   * @param paymentMethod - Payment method
   * @param options - Query options
   * @returns Array of transactions using the payment method
   */
  async findByPaymentMethod(
    paymentMethod: string,
    options?: QueryOptions
  ): Promise<Transaction[]> {
    return this.findMany({ paymentMethod }, options);
  }

  /**
   * Find transactions by payment reference
   * @param paymentReference - Payment reference
   * @param options - Query options
   * @returns Found transaction or null
   */
  async findByPaymentReference(
    paymentReference: string,
    options?: QueryOptions
  ): Promise<Transaction | null> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findFirst({
        where: {
          paymentReference,
          deletedAt: null
        },
        include: {
          garage: true,
          ticket: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found transaction by payment reference', {
        paymentReference,
        found: !!result
      });
      
      return result;
    }, `find transaction by payment reference: ${paymentReference}`);
  }

  /**
   * Find pending transactions
   * @param options - Query options
   * @returns Array of pending transactions
   */
  async findPending(options?: QueryOptions): Promise<Transaction[]> {
    return this.findByStatus('PENDING', options);
  }

  /**
   * Find completed transactions
   * @param options - Query options
   * @returns Array of completed transactions
   */
  async findCompleted(options?: QueryOptions): Promise<Transaction[]> {
    return this.findByStatus('COMPLETED', options);
  }

  /**
   * Find failed transactions
   * @param options - Query options
   * @returns Array of failed transactions
   */
  async findFailed(options?: QueryOptions): Promise<Transaction[]> {
    return this.findByStatus('FAILED', options);
  }

  /**
   * Search transactions with multiple criteria
   * @param criteria - Search criteria
   * @param options - Query options
   * @returns Array of transactions matching all criteria
   */
  async search(
    criteria: TransactionSearchCriteria,
    options?: QueryOptions
  ): Promise<Transaction[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.TransactionWhereInput = {
        deletedAt: null
      };

      // Direct field matches
      if (criteria.garageId) {
        whereClause.garageId = criteria.garageId;
      }

      if (criteria.ticketId) {
        whereClause.ticketId = criteria.ticketId;
      }

      if (criteria.transactionType) {
        whereClause.transactionType = criteria.transactionType;
      }

      if (criteria.status) {
        whereClause.status = criteria.status;
      }

      if (criteria.paymentMethod) {
        whereClause.paymentMethod = criteria.paymentMethod;
      }

      if (criteria.currency) {
        whereClause.currency = criteria.currency;
      }

      // Text searches
      if (criteria.paymentReference) {
        whereClause.paymentReference = {
          contains: criteria.paymentReference
        };
      }

      // Date range search
      if (criteria.startDate || criteria.endDate) {
        whereClause.createdAt = {};
        if (criteria.startDate) {
          whereClause.createdAt.gte = criteria.startDate;
        }
        if (criteria.endDate) {
          whereClause.createdAt.lte = criteria.endDate;
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

      const result = await this.delegate.findMany({
        where: whereClause,
        include: {
          garage: true,
          ticket: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Transaction search completed', {
        criteria,
        count: result.length
      });
      
      return result;
    }, 'search transactions');
  }

  /**
   * Create a new transaction with auto-generated reference
   * @param transactionData - Transaction creation data
   * @returns Created transaction
   */
  async createTransaction(transactionData: CreateTransactionData): Promise<Transaction> {
    return this.executeWithRetry(async () => {
      // Generate payment reference if not provided
      let paymentReference = transactionData.paymentReference;
      if (!paymentReference) {
        paymentReference = await this.generatePaymentReference();
      }

      // Set default values
      const createData = {
        ...transactionData,
        paymentReference,
        status: transactionData.status || 'PENDING',
        currency: transactionData.currency || 'USD'
      };

      const transaction = await this.create(createData);

      this.logger.info('Transaction created', {
        transactionId: transaction.id,
        paymentReference: transaction.paymentReference,
        type: transaction.transactionType,
        amount: transaction.amount,
        garageId: transaction.garageId
      });

      return transaction;
    }, 'create transaction');
  }

  /**
   * Process a transaction (mark as completed)
   * @param transactionId - Transaction ID
   * @param paymentReference - External payment reference
   * @param metadata - Additional transaction metadata
   * @returns Updated transaction
   */
  async processTransaction(
    transactionId: string,
    paymentReference?: string,
    metadata?: string
  ): Promise<Transaction> {
    return this.executeWithRetry(async () => {
      const transaction = await this.delegate.findFirst({
        where: {
          id: transactionId,
          status: 'PENDING',
          deletedAt: null
        }
      });

      if (!transaction) {
        throw new Error(`Pending transaction with ID ${transactionId} not found`);
      }

      const updateData: UpdateTransactionData = {
        status: 'COMPLETED',
        processedAt: new Date()
      };

      if (paymentReference) {
        updateData.paymentReference = paymentReference;
      }

      if (metadata) {
        updateData.metadata = metadata;
      }

      const updatedTransaction = await this.update(transactionId, updateData);

      this.logger.info('Transaction processed successfully', {
        transactionId,
        type: transaction.transactionType,
        amount: transaction.amount,
        paymentReference
      });

      return updatedTransaction;
    }, `process transaction: ${transactionId}`);
  }

  /**
   * Fail a transaction
   * @param transactionId - Transaction ID
   * @param reason - Failure reason
   * @returns Updated transaction
   */
  async failTransaction(transactionId: string, reason: string): Promise<Transaction> {
    return this.executeWithRetry(async () => {
      const transaction = await this.delegate.findFirst({
        where: {
          id: transactionId,
          status: 'PENDING',
          deletedAt: null
        }
      });

      if (!transaction) {
        throw new Error(`Pending transaction with ID ${transactionId} not found`);
      }

      const updatedTransaction = await this.update(transactionId, {
        status: 'FAILED',
        description: reason,
        processedAt: new Date()
      });

      this.logger.info('Transaction failed', {
        transactionId,
        type: transaction.transactionType,
        amount: transaction.amount,
        reason
      });

      return updatedTransaction;
    }, `fail transaction: ${transactionId}`);
  }

  /**
   * Cancel a transaction
   * @param transactionId - Transaction ID
   * @param reason - Cancellation reason
   * @returns Updated transaction
   */
  async cancelTransaction(transactionId: string, reason: string): Promise<Transaction> {
    return this.executeWithRetry(async () => {
      const transaction = await this.delegate.findFirst({
        where: {
          id: transactionId,
          status: 'PENDING',
          deletedAt: null
        }
      });

      if (!transaction) {
        throw new Error(`Pending transaction with ID ${transactionId} not found`);
      }

      const updatedTransaction = await this.update(transactionId, {
        status: 'CANCELLED',
        description: reason,
        processedAt: new Date()
      });

      this.logger.info('Transaction cancelled', {
        transactionId,
        type: transaction.transactionType,
        amount: transaction.amount,
        reason
      });

      return updatedTransaction;
    }, `cancel transaction: ${transactionId}`);
  }

  /**
   * Get transaction statistics
   * @param garageId - Optional garage ID to filter statistics
   * @returns Transaction statistics
   */
  async getStats(garageId?: string): Promise<TransactionStats> {
    return this.executeWithRetry(async () => {
      const whereClause = garageId ? { garageId, deletedAt: null } : { deletedAt: null };
      
      // Get total count and amount
      const totalCount = await this.count(whereClause);
      const totalAmountResult = await this.aggregate({
        _sum: { amount: true }
      }, whereClause);

      // Count by status with amounts
      const statusStats = await this.groupBy(['status'], whereClause, {
        _count: { status: true },
        _sum: { amount: true }
      });

      // Count by type with amounts
      const typeStats = await this.groupBy(['transactionType'], whereClause, {
        _count: { transactionType: true },
        _sum: { amount: true }
      });

      // Count by method with amounts
      const methodStats = await this.groupBy(['paymentMethod'], whereClause, {
        _count: { paymentMethod: true },
        _sum: { amount: true }
      });

      // Count by currency with amounts
      const currencyStats = await this.groupBy(['currency'], whereClause, {
        _count: { currency: true },
        _sum: { amount: true }
      });

      const totalAmount = totalAmountResult._sum.amount || 0;

      // Build result
      const stats: TransactionStats = {
        total: totalCount,
        totalAmount,
        byStatus: {},
        byType: {},
        byMethod: {},
        byCurrency: {},
        averageAmount: totalCount > 0 ? Math.round((totalAmount / totalCount) * 100) / 100 : 0,
        pendingAmount: 0,
        completedAmount: 0,
        failedAmount: 0
      };

      // Process status stats
      statusStats.forEach((item: any) => {
        const count = item._count.status;
        const amount = item._sum.amount || 0;
        stats.byStatus[item.status] = { count, amount };
        
        // Track specific amounts
        switch (item.status) {
          case 'PENDING':
            stats.pendingAmount = amount;
            break;
          case 'COMPLETED':
            stats.completedAmount = amount;
            break;
          case 'FAILED':
            stats.failedAmount = amount;
            break;
        }
      });

      // Process type stats
      typeStats.forEach((item: any) => {
        stats.byType[item.transactionType] = {
          count: item._count.transactionType,
          amount: item._sum.amount || 0
        };
      });

      // Process method stats
      methodStats.forEach((item: any) => {
        if (item.paymentMethod) {
          stats.byMethod[item.paymentMethod] = {
            count: item._count.paymentMethod,
            amount: item._sum.amount || 0
          };
        }
      });

      // Process currency stats
      currencyStats.forEach((item: any) => {
        stats.byCurrency[item.currency] = {
          count: item._count.currency,
          amount: item._sum.amount || 0
        };
      });

      this.logger.debug('Transaction statistics calculated', {
        garageId,
        stats
      });
      
      return stats;
    }, 'get transaction statistics');
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
      const whereClause: any = {
        status: 'COMPLETED',
        processedAt: {
          gte: startDate,
          lte: endDate
        },
        deletedAt: null
      };

      if (garageId) {
        whereClause.garageId = garageId;
      }

      // Use Prisma aggregation instead of raw SQL for better type safety
      const result = await this.prisma.$queryRaw<
        Array<{ date: string; revenue: number; count: bigint }>
      >`
        SELECT 
          DATE(processedAt) as date,
          SUM(amount) as revenue,
          COUNT(*) as count
        FROM transactions
        WHERE deletedAt IS NULL
          AND status = 'COMPLETED'
          AND processedAt >= ${startDate}
          AND processedAt <= ${endDate}
          ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY DATE(processedAt)
        ORDER BY date
      `;

      const dailyRevenue = result.map(({ date, revenue, count }) => ({
        date,
        revenue: Number(revenue) || 0,
        count: Number(count)
      }));

      this.logger.debug('Daily transaction revenue calculated', {
        startDate,
        endDate,
        garageId,
        daysCount: dailyRevenue.length
      });

      return dailyRevenue;
    }, 'get daily transaction revenue');
  }

  /**
   * Get transaction volume by hour for a specific date
   * @param date - Date to analyze
   * @param garageId - Optional garage ID filter
   * @returns Hourly transaction volume
   */
  async getHourlyVolume(
    date: Date,
    garageId?: string
  ): Promise<Array<{ hour: number; count: number; amount: number }>> {
    return this.executeWithRetry(async () => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const whereClause: any = {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        deletedAt: null
      };

      if (garageId) {
        whereClause.garageId = garageId;
      }

      const result = await this.prisma.$queryRaw<
        Array<{ hour: number; count: bigint; amount: number }>
      >`
        SELECT 
          CAST(strftime('%H', createdAt) AS INTEGER) as hour,
          COUNT(*) as count,
          SUM(amount) as amount
        FROM transactions
        WHERE deletedAt IS NULL
          AND createdAt >= ${startOfDay}
          AND createdAt <= ${endOfDay}
          ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY CAST(strftime('%H', createdAt) AS INTEGER)
        ORDER BY hour
      `;

      const hourlyVolume = result.map(({ hour, count, amount }) => ({
        hour,
        count: Number(count),
        amount: Number(amount) || 0
      }));

      this.logger.debug('Hourly transaction volume calculated', {
        date: date.toDateString(),
        garageId,
        hoursCount: hourlyVolume.length
      });

      return hourlyVolume;
    }, 'get hourly transaction volume');
  }

  /**
   * Generate a unique payment reference
   * @returns Generated payment reference
   */
  private async generatePaymentReference(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const paymentReference = `TXN-${timestamp}-${random}`;
    
    // Ensure uniqueness
    const existing = await this.delegate.findFirst({
      where: { paymentReference }
    });
    
    if (existing) {
      // If collision (very rare), try again
      return this.generatePaymentReference();
    }
    
    return paymentReference;
  }
}

export default TransactionRepository;
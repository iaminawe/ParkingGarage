/**
 * Transaction repository for data access operations using Prisma
 * 
 * This module provides data access methods for transactions using the PrismaAdapter pattern.
 * It handles transaction CRUD operations, status management, and financial tracking.
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
  description?: string;
}

/**
 * Transaction statistics interface
 */
export interface TransactionStats {
  total: number;
  totalAmount: number;
  byStatus: Record<string, { count: number; amount: number }>;
  byType: Record<string, { count: number; amount: number }>;
  byPaymentMethod: Record<string, { count: number; amount: number }>;
  averageAmount: number;
  pendingAmount: number;
  completedAmount: number;
  failedAmount: number;
}

/**
 * Repository for managing transactions using Prisma
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
   * Find transactions by type
   * @param transactionType - Transaction type
   * @param options - Query options
   * @returns Array of transactions with the specified type
   */
  async findByType(
    transactionType: string,
    options?: QueryOptions
  ): Promise<Transaction[]> {
    return this.findMany({ transactionType }, options);
  }

  /**
   * Find transactions by payment method
   * @param paymentMethod - Payment method
   * @param options - Query options
   * @returns Array of transactions with the specified payment method
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
   * @returns Transaction with the specified payment reference
   */
  async findByPaymentReference(
    paymentReference: string,
    options?: QueryOptions
  ): Promise<Transaction | null> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findFirst({
        where: { paymentReference },
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
   * Find cancelled transactions
   * @param options - Query options
   * @returns Array of cancelled transactions
   */
  async findCancelled(options?: QueryOptions): Promise<Transaction[]> {
    return this.findByStatus('CANCELLED', options);
  }

  /**
   * Search transactions with multiple criteria
   * @param criteria - Search criteria
   * @param options - Query options
   * @returns Array of transactions matching the criteria
   */
  async search(
    criteria: TransactionSearchCriteria,
    options?: QueryOptions
  ): Promise<Transaction[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.TransactionWhereInput = {};

      if (criteria.garageId) {
        whereClause.garageId = criteria.garageId;
      }

      if (criteria.ticketId) {
        whereClause.ticketId = criteria.ticketId;
      }

      if (criteria.transactionType) {
        whereClause.transactionType = {
          contains: criteria.transactionType
        };
      }

      if (criteria.status) {
        whereClause.status = criteria.status;
      }

      if (criteria.paymentMethod) {
        whereClause.paymentMethod = criteria.paymentMethod;
      }

      if (criteria.paymentReference) {
        whereClause.paymentReference = {
          contains: criteria.paymentReference
        };
      }

      if (criteria.description) {
        whereClause.description = {
          contains: criteria.description
        };
      }

      // Date range filters
      if (criteria.startDate || criteria.endDate) {
        whereClause.createdAt = {};
        if (criteria.startDate) {
          whereClause.createdAt.gte = criteria.startDate;
        }
        if (criteria.endDate) {
          whereClause.createdAt.lte = criteria.endDate;
        }
      }

      // Amount range filters
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
   * Create a new transaction
   * @param transactionData - Transaction creation data
   * @param tx - Optional transaction client
   * @returns Created transaction
   */
  async createTransaction(
    transactionData: CreateTransactionData,
    tx?: Prisma.TransactionClient
  ): Promise<Transaction> {
    return this.executeWithRetry(async () => {
      // Set defaults
      const createData = {
        ...transactionData,
        status: transactionData.status || 'PENDING',
        currency: transactionData.currency || 'USD'
      };

      const transaction = await this.create(createData, tx);

      this.logger.info('Transaction created', {
        transactionId: transaction.id,
        garageId: transaction.garageId,
        type: transaction.transactionType,
        amount: transaction.amount,
        status: transaction.status
      });

      return transaction;
    }, 'create transaction');
  }

  /**
   * Process a transaction (mark as completed)
   * @param transactionId - Transaction ID
   * @param paymentReference - Payment reference from gateway
   * @param processedAt - Processing timestamp (defaults to now)
   * @param metadata - Optional additional metadata
   * @param tx - Optional transaction client
   * @returns Updated transaction
   */
  async processTransaction(
    transactionId: string,
    paymentReference?: string,
    processedAt: Date = new Date(),
    metadata?: string,
    tx?: Prisma.TransactionClient
  ): Promise<Transaction> {
    return this.executeWithRetry(async () => {
      const transaction = await this.findById(transactionId);
      if (!transaction) {
        throw new Error(`Transaction with ID ${transactionId} not found`);
      }

      if (transaction.status === 'COMPLETED') {
        throw new Error('Transaction is already completed');
      }

      if (transaction.status === 'CANCELLED') {
        throw new Error('Cannot process a cancelled transaction');
      }

      const updateData: UpdateTransactionData = {
        status: 'COMPLETED',
        processedAt
      };

      if (paymentReference) {
        updateData.paymentReference = paymentReference;
      }

      if (metadata) {
        updateData.metadata = metadata;
      }

      const updatedTransaction = await this.update(transactionId, updateData, undefined, tx);

      this.logger.info('Transaction processed successfully', {
        transactionId,
        amount: transaction.amount,
        paymentReference,
        processedAt
      });

      return updatedTransaction;
    }, `process transaction: ${transactionId}`);
  }

  /**
   * Fail a transaction
   * @param transactionId - Transaction ID
   * @param reason - Failure reason
   * @param tx - Optional transaction client
   * @returns Updated transaction
   */
  async failTransaction(
    transactionId: string,
    reason: string,
    tx?: Prisma.TransactionClient
  ): Promise<Transaction> {
    return this.executeWithRetry(async () => {
      const transaction = await this.findById(transactionId);
      if (!transaction) {
        throw new Error(`Transaction with ID ${transactionId} not found`);
      }

      if (transaction.status === 'COMPLETED') {
        throw new Error('Cannot fail a completed transaction');
      }

      if (transaction.status === 'CANCELLED') {
        throw new Error('Transaction is already cancelled');
      }

      const updatedTransaction = await this.update(
        transactionId,
        {
          status: 'FAILED',
          description: reason,
          processedAt: new Date()
        },
        undefined,
        tx
      );

      this.logger.info('Transaction failed', {
        transactionId,
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
   * @param tx - Optional transaction client
   * @returns Updated transaction
   */
  async cancelTransaction(
    transactionId: string,
    reason: string,
    tx?: Prisma.TransactionClient
  ): Promise<Transaction> {
    return this.executeWithRetry(async () => {
      const transaction = await this.findById(transactionId);
      if (!transaction) {
        throw new Error(`Transaction with ID ${transactionId} not found`);
      }

      if (transaction.status === 'COMPLETED') {
        throw new Error('Cannot cancel a completed transaction');
      }

      const updatedTransaction = await this.update(
        transactionId,
        {
          status: 'CANCELLED',
          description: reason,
          processedAt: new Date()
        },
        undefined,
        tx
      );

      this.logger.info('Transaction cancelled', {
        transactionId,
        amount: transaction.amount,
        reason
      });

      return updatedTransaction;
    }, `cancel transaction: ${transactionId}`);
  }

  /**
   * Get transaction statistics
   * @param garageId - Optional garage ID to filter statistics
   * @param startDate - Optional start date
   * @param endDate - Optional end date
   * @returns Transaction statistics
   */
  async getStats(
    garageId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionStats> {
    return this.executeWithRetry(async () => {
      const whereClause: any = {};
      if (garageId) whereClause.garageId = garageId;
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }
      
      const total = await this.count(whereClause);
      
      // Get total amount
      const totalAmountResult = await this.prisma.$queryRaw<
        Array<{ totalAmount: number | null }>
      >`
        SELECT SUM(amount) as totalAmount
        FROM transactions
        WHERE ${garageId ? Prisma.sql`garageId = ${garageId}` : Prisma.sql`1=1`}
          ${startDate ? Prisma.sql`AND createdAt >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND createdAt <= ${endDate}` : Prisma.empty}
      `;

      // Get stats by status
      const statusStats = await this.prisma.$queryRaw<
        Array<{ status: string; count: bigint; amount: number }>
      >`
        SELECT status, COUNT(*) as count, SUM(amount) as amount
        FROM transactions
        WHERE ${garageId ? Prisma.sql`garageId = ${garageId}` : Prisma.sql`1=1`}
          ${startDate ? Prisma.sql`AND createdAt >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND createdAt <= ${endDate}` : Prisma.empty}
        GROUP BY status
      `;

      // Get stats by type
      const typeStats = await this.prisma.$queryRaw<
        Array<{ transactionType: string; count: bigint; amount: number }>
      >`
        SELECT transactionType, COUNT(*) as count, SUM(amount) as amount
        FROM transactions
        WHERE ${garageId ? Prisma.sql`garageId = ${garageId}` : Prisma.sql`1=1`}
          ${startDate ? Prisma.sql`AND createdAt >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND createdAt <= ${endDate}` : Prisma.empty}
        GROUP BY transactionType
      `;

      // Get stats by payment method
      const methodStats = await this.prisma.$queryRaw<
        Array<{ paymentMethod: string; count: bigint; amount: number }>
      >`
        SELECT paymentMethod, COUNT(*) as count, SUM(amount) as amount
        FROM transactions
        WHERE paymentMethod IS NOT NULL
          ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
          ${startDate ? Prisma.sql`AND createdAt >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND createdAt <= ${endDate}` : Prisma.empty}
        GROUP BY paymentMethod
      `;

      const totalAmount = totalAmountResult[0]?.totalAmount || 0;

      // Build statistics object
      const stats: TransactionStats = {
        total,
        totalAmount,
        byStatus: {},
        byType: {},
        byPaymentMethod: {},
        averageAmount: total > 0 ? totalAmount / total : 0,
        pendingAmount: 0,
        completedAmount: 0,
        failedAmount: 0
      };

      // Process status stats
      statusStats.forEach(({ status, count, amount }) => {
        const countNum = Number(count);
        const amountNum = Number(amount) || 0;
        stats.byStatus[status] = { count: countNum, amount: amountNum };
        
        // Set specific amounts
        switch (status) {
          case 'PENDING':
            stats.pendingAmount = amountNum;
            break;
          case 'COMPLETED':
            stats.completedAmount = amountNum;
            break;
          case 'FAILED':
            stats.failedAmount = amountNum;
            break;
        }
      });

      // Process type stats
      typeStats.forEach(({ transactionType, count, amount }) => {
        stats.byType[transactionType] = {
          count: Number(count),
          amount: Number(amount) || 0
        };
      });

      // Process payment method stats
      methodStats.forEach(({ paymentMethod, count, amount }) => {
        if (paymentMethod) {
          stats.byPaymentMethod[paymentMethod] = {
            count: Number(count),
            amount: Number(amount) || 0
          };
        }
      });

      this.logger.debug('Transaction statistics calculated', {
        garageId,
        startDate,
        endDate,
        stats
      });
      
      return stats;
    }, 'get transaction statistics');
  }

  /**
   * Get daily transaction volume for a date range
   * @param startDate - Start date
   * @param endDate - End date
   * @param garageId - Optional garage ID filter
   * @returns Daily transaction volume data
   */
  async getDailyVolume(
    startDate: Date,
    endDate: Date,
    garageId?: string
  ): Promise<Array<{ date: string; volume: number; count: number }>> {
    return this.executeWithRetry(async () => {
      const result = await this.prisma.$queryRaw<
        Array<{ date: string; volume: number; count: bigint }>
      >`
        SELECT 
          DATE(createdAt) as date,
          SUM(amount) as volume,
          COUNT(*) as count
        FROM transactions
        WHERE createdAt >= ${startDate}
          AND createdAt <= ${endDate}
          ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY DATE(createdAt)
        ORDER BY date
      `;

      const dailyVolume = result.map(({ date, volume, count }) => ({
        date,
        volume: Number(volume) || 0,
        count: Number(count)
      }));

      this.logger.debug('Daily transaction volume calculated', {
        startDate,
        endDate,
        garageId,
        daysCount: dailyVolume.length
      });

      return dailyVolume;
    }, 'get daily transaction volume');
  }
}

export default TransactionRepository;
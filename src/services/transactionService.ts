/**
 * Transaction service for business logic operations
 *
 * This module provides business logic for transaction management operations,
 * including CRUD operations, status management, and financial workflows.
 *
 * @module TransactionService
 */

import TransactionRepository, {
  CreateTransactionData,
  UpdateTransactionData,
  TransactionSearchCriteria,
  TransactionStats,
} from '../repositories/TransactionRepository';
import { Transaction } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { ServiceResponse, PaginatedResult } from '../types/models';

/**
 * Transaction creation request interface
 */
export interface CreateTransactionRequest {
  garageId: string;
  ticketId?: string;
  transactionType: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Transaction update request interface
 */
export interface UpdateTransactionRequest {
  transactionType?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paymentMethod?: string;
  paymentReference?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Transaction filters interface
 */
export interface TransactionFilters {
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
 * Transaction processing request interface
 */
export interface ProcessTransactionRequest {
  paymentReference?: string;
  metadata?: Record<string, any>;
}

/**
 * Service class for transaction management operations
 */
export class TransactionService {
  private readonly transactionRepository: TransactionRepository;
  private readonly logger = createLogger('TransactionService');

  constructor(transactionRepository?: TransactionRepository) {
    this.transactionRepository = transactionRepository || new TransactionRepository();
  }

  /**
   * Get all transactions with pagination and filtering
   * @param filters - Filter criteria
   * @param page - Page number
   * @param limit - Items per page
   * @param sortBy - Sort field
   * @param sortOrder - Sort order
   * @returns Paginated list of transactions
   */
  async getAllTransactions(
    filters?: TransactionFilters,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ServiceResponse<PaginatedResult<Transaction>>> {
    try {
      const offset = (page - 1) * limit;
      const options = {
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          garage: true,
          ticket: true,
        },
      };

      let transactions: Transaction[];
      let totalItems: number;

      if (filters && Object.keys(filters).length > 0) {
        const searchCriteria: TransactionSearchCriteria = filters;
        transactions = await this.transactionRepository.search(searchCriteria, options);
        // For accurate pagination, we'd need a separate count query
        totalItems = transactions.length; // This is a simplification
      } else {
        const result = await this.transactionRepository.findAll(options);
        transactions = result.data;
        totalItems = result.totalCount;
      }

      const totalPages = Math.ceil(totalItems / limit);

      const paginatedResult: PaginatedResult<Transaction> = {
        data: transactions,
        totalItems,
        totalCount: totalItems,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
      };

      this.logger.info('Retrieved transactions list', {
        count: transactions.length,
        totalItems,
        page,
        limit,
        filters,
      });

      return {
        success: true,
        data: paginatedResult,
        message: 'Transactions retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get transactions list', error as Error);
      return {
        success: false,
        message: 'Failed to retrieve transactions',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get transaction by ID
   * @param id - Transaction ID
   * @returns Transaction details
   */
  async getTransactionById(id: string): Promise<ServiceResponse<Transaction | null>> {
    try {
      const transaction = await this.transactionRepository.findById(id, {
        include: {
          garage: true,
          ticket: true,
        },
      });

      if (!transaction) {
        return {
          success: false,
          message: 'Transaction not found',
        };
      }

      this.logger.info('Retrieved transaction by ID', { transactionId: id });

      return {
        success: true,
        data: transaction,
        message: 'Transaction retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get transaction by ID', error as Error, { transactionId: id });
      return {
        success: false,
        message: 'Failed to retrieve transaction',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Create new transaction
   * @param transactionData - Transaction creation data
   * @returns Created transaction
   */
  async createTransaction(
    transactionData: CreateTransactionRequest
  ): Promise<ServiceResponse<Transaction>> {
    try {
      // Validate amount
      if (transactionData.amount <= 0) {
        return {
          success: false,
          message: 'Transaction amount must be greater than zero',
        };
      }

      const createData: CreateTransactionData = {
        ...transactionData,
        status: 'PENDING',
        currency: transactionData.currency || 'USD',
        metadata: transactionData.metadata ? JSON.stringify(transactionData.metadata) : undefined,
      };

      const transaction = await this.transactionRepository.createTransaction(createData);

      this.logger.info('Transaction created successfully', {
        transactionId: transaction.id,
        garageId: transaction.garageId,
        type: transaction.transactionType,
        amount: transaction.amount,
      });

      return {
        success: true,
        data: transaction,
        message: 'Transaction created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create transaction', error as Error, { transactionData });
      return {
        success: false,
        message: 'Failed to create transaction',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Update transaction status
   * @param id - Transaction ID
   * @param status - New status
   * @returns Updated transaction
   */
  async updateTransactionStatus(id: string, status: string): Promise<ServiceResponse<Transaction>> {
    try {
      const existingTransaction = await this.transactionRepository.findById(id);
      if (!existingTransaction) {
        return {
          success: false,
          message: 'Transaction not found',
        };
      }

      // Validate status transitions
      if (existingTransaction.status === 'COMPLETED' && status !== 'COMPLETED') {
        return {
          success: false,
          message: 'Cannot change status of a completed transaction',
        };
      }

      const updateData: UpdateTransactionData = {
        status,
        processedAt: ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status) ? new Date() : undefined,
      };

      const updatedTransaction = await this.transactionRepository.update(id, updateData, {
        include: {
          garage: true,
          ticket: true,
        },
      });

      this.logger.info('Transaction status updated successfully', {
        transactionId: id,
        oldStatus: existingTransaction.status,
        newStatus: status,
      });

      return {
        success: true,
        data: updatedTransaction,
        message: 'Transaction status updated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to update transaction status', error as Error, {
        transactionId: id,
        status,
      });
      return {
        success: false,
        message: 'Failed to update transaction status',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Process transaction (mark as completed)
   * @param id - Transaction ID
   * @param processData - Processing data
   * @returns Processed transaction
   */
  async processTransaction(
    id: string,
    processData: ProcessTransactionRequest
  ): Promise<ServiceResponse<Transaction>> {
    try {
      const transaction = await this.transactionRepository.findById(id);
      if (!transaction) {
        return {
          success: false,
          message: 'Transaction not found',
        };
      }

      if (transaction.status !== 'PENDING') {
        return {
          success: false,
          message: 'Only pending transactions can be processed',
        };
      }

      const metadata = processData.metadata ? JSON.stringify(processData.metadata) : undefined;

      const processedTransaction = await this.transactionRepository.processTransaction(
        id,
        processData.paymentReference,
        new Date(),
        metadata
      );

      this.logger.info('Transaction processed successfully', {
        transactionId: id,
        amount: transaction.amount,
        paymentReference: processData.paymentReference,
      });

      return {
        success: true,
        data: processedTransaction,
        message: 'Transaction processed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to process transaction', error as Error, { transactionId: id });
      return {
        success: false,
        message: 'Failed to process transaction',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Fail transaction
   * @param id - Transaction ID
   * @param reason - Failure reason
   * @returns Failed transaction
   */
  async failTransaction(id: string, reason: string): Promise<ServiceResponse<Transaction>> {
    try {
      const transaction = await this.transactionRepository.findById(id);
      if (!transaction) {
        return {
          success: false,
          message: 'Transaction not found',
        };
      }

      if (transaction.status !== 'PENDING') {
        return {
          success: false,
          message: 'Only pending transactions can be failed',
        };
      }

      const failedTransaction = await this.transactionRepository.failTransaction(id, reason);

      this.logger.info('Transaction failed', {
        transactionId: id,
        amount: transaction.amount,
        reason,
      });

      return {
        success: true,
        data: failedTransaction,
        message: 'Transaction marked as failed',
      };
    } catch (error) {
      this.logger.error('Failed to fail transaction', error as Error, { transactionId: id });
      return {
        success: false,
        message: 'Failed to mark transaction as failed',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Cancel transaction
   * @param id - Transaction ID
   * @param reason - Cancellation reason
   * @returns Cancelled transaction
   */
  async cancelTransaction(id: string, reason: string): Promise<ServiceResponse<Transaction>> {
    try {
      const transaction = await this.transactionRepository.findById(id);
      if (!transaction) {
        return {
          success: false,
          message: 'Transaction not found',
        };
      }

      if (transaction.status === 'COMPLETED') {
        return {
          success: false,
          message: 'Cannot cancel a completed transaction',
        };
      }

      if (transaction.status === 'CANCELLED') {
        return {
          success: false,
          message: 'Transaction is already cancelled',
        };
      }

      const cancelledTransaction = await this.transactionRepository.cancelTransaction(id, reason);

      this.logger.info('Transaction cancelled', {
        transactionId: id,
        amount: transaction.amount,
        reason,
      });

      return {
        success: true,
        data: cancelledTransaction,
        message: 'Transaction cancelled successfully',
      };
    } catch (error) {
      this.logger.error('Failed to cancel transaction', error as Error, { transactionId: id });
      return {
        success: false,
        message: 'Failed to cancel transaction',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get transactions by garage
   * @param garageId - Garage ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated list of transactions for the garage
   */
  async getTransactionsByGarage(
    garageId: string,
    page = 1,
    limit = 20
  ): Promise<ServiceResponse<PaginatedResult<Transaction>>> {
    try {
      const offset = (page - 1) * limit;
      const options = {
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' as const },
        include: {
          garage: true,
          ticket: true,
        },
      };

      const transactions = await this.transactionRepository.findByGarageId(garageId, options);
      const totalItems = await this.transactionRepository.count({ garageId });

      const totalPages = Math.ceil(totalItems / limit);

      const paginatedResult: PaginatedResult<Transaction> = {
        data: transactions,
        totalItems,
        totalCount: totalItems,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
      };

      this.logger.info('Retrieved transactions by garage', {
        garageId,
        count: transactions.length,
        totalItems,
      });

      return {
        success: true,
        data: paginatedResult,
        message: 'Garage transactions retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get transactions by garage', error as Error, { garageId });
      return {
        success: false,
        message: 'Failed to retrieve garage transactions',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get transactions by status
   * @param status - Transaction status
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated list of transactions with the specified status
   */
  async getTransactionsByStatus(
    status: string,
    page = 1,
    limit = 20
  ): Promise<ServiceResponse<PaginatedResult<Transaction>>> {
    try {
      const offset = (page - 1) * limit;
      const options = {
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' as const },
        include: {
          garage: true,
          ticket: true,
        },
      };

      const transactions = await this.transactionRepository.findByStatus(status, options);
      const totalItems = await this.transactionRepository.count({ status });

      const totalPages = Math.ceil(totalItems / limit);

      const paginatedResult: PaginatedResult<Transaction> = {
        data: transactions,
        totalItems,
        totalCount: totalItems,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
      };

      this.logger.info('Retrieved transactions by status', {
        status,
        count: transactions.length,
        totalItems,
      });

      return {
        success: true,
        data: paginatedResult,
        message: `Transactions with status ${status} retrieved successfully`,
      };
    } catch (error) {
      this.logger.error('Failed to get transactions by status', error as Error, { status });
      return {
        success: false,
        message: 'Failed to retrieve transactions by status',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get transaction statistics
   * @param garageId - Optional garage ID to filter statistics
   * @param startDate - Optional start date
   * @param endDate - Optional end date
   * @returns Transaction statistics
   */
  async getTransactionStats(
    garageId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResponse<TransactionStats>> {
    try {
      const stats = await this.transactionRepository.getStats(garageId, startDate, endDate);

      this.logger.info('Retrieved transaction statistics', {
        garageId,
        startDate,
        endDate,
        stats,
      });

      return {
        success: true,
        data: stats,
        message: 'Transaction statistics retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get transaction statistics', error as Error);
      return {
        success: false,
        message: 'Failed to retrieve transaction statistics',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get daily transaction volume
   * @param startDate - Start date
   * @param endDate - End date
   * @param garageId - Optional garage ID filter
   * @returns Daily transaction volume data
   */
  async getDailyVolume(
    startDate: Date,
    endDate: Date,
    garageId?: string
  ): Promise<ServiceResponse<Array<{ date: string; volume: number; count: number }>>> {
    try {
      const dailyVolume = await this.transactionRepository.getDailyVolume(
        startDate,
        endDate,
        garageId
      );

      this.logger.info('Retrieved daily transaction volume', {
        startDate,
        endDate,
        garageId,
        daysCount: dailyVolume.length,
      });

      return {
        success: true,
        data: dailyVolume,
        message: 'Daily transaction volume retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get daily transaction volume', error as Error);
      return {
        success: false,
        message: 'Failed to retrieve daily transaction volume',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Search transactions with multiple criteria
   * @param criteria - Search criteria
   * @param page - Page number
   * @param limit - Items per page
   * @param sortBy - Sort field
   * @param sortOrder - Sort order
   * @returns Paginated search results
   */
  async searchTransactions(
    criteria: TransactionSearchCriteria,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ServiceResponse<PaginatedResult<Transaction>>> {
    try {
      const offset = (page - 1) * limit;
      const options = {
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      };

      const transactions = await this.transactionRepository.search(criteria, options);
      // For accurate pagination, we'd need a separate count method
      const totalItems = transactions.length; // This is a simplification

      const totalPages = Math.ceil(totalItems / limit);

      const paginatedResult: PaginatedResult<Transaction> = {
        data: transactions,
        totalItems,
        totalCount: totalItems,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
      };

      this.logger.info('Transaction search completed', {
        criteria,
        count: transactions.length,
        totalItems,
      });

      return {
        success: true,
        data: paginatedResult,
        message: 'Transaction search completed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to search transactions', error as Error, { criteria });
      return {
        success: false,
        message: 'Failed to search transactions',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get transaction summary for reporting
   * @param garageId - Optional garage ID filter
   * @param startDate - Optional start date
   * @param endDate - Optional end date
   * @returns Transaction summary report
   */
  async getTransactionSummary(
    garageId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<
    ServiceResponse<{
      totalTransactions: number;
      totalAmount: number;
      pendingTransactions: number;
      pendingAmount: number;
      completedTransactions: number;
      completedAmount: number;
      failedTransactions: number;
      failedAmount: number;
      averageTransactionAmount: number;
      topTransactionTypes: Array<{ type: string; count: number; amount: number }>;
    }>
  > {
    try {
      const stats = await this.transactionRepository.getStats(garageId, startDate, endDate);

      // Convert stats to summary format
      const summary = {
        totalTransactions: stats.total,
        totalAmount: stats.totalAmount,
        pendingTransactions: stats.byStatus['PENDING']?.count || 0,
        pendingAmount: stats.pendingAmount,
        completedTransactions: stats.byStatus['COMPLETED']?.count || 0,
        completedAmount: stats.completedAmount,
        failedTransactions: stats.byStatus['FAILED']?.count || 0,
        failedAmount: stats.failedAmount,
        averageTransactionAmount: stats.averageAmount,
        topTransactionTypes: Object.entries(stats.byType)
          .map(([type, data]) => ({
            type,
            count: data.count,
            amount: data.amount,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5), // Top 5 types
      };

      this.logger.info('Generated transaction summary', {
        garageId,
        startDate,
        endDate,
        summary,
      });

      return {
        success: true,
        data: summary,
        message: 'Transaction summary generated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to generate transaction summary', error as Error);
      return {
        success: false,
        message: 'Failed to generate transaction summary',
        errors: [(error as Error).message],
      };
    }
  }
}

export default TransactionService;

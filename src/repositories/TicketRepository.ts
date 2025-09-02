/**
 * Ticket repository for data access operations using Prisma
 * 
 * This module provides data access methods for parking tickets and violations
 * using the PrismaAdapter pattern. It handles ticket CRUD operations,
 * violation tracking, and fine management.
 * 
 * @module TicketRepository
 */

import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { Ticket, Prisma, TicketType, TicketStatus } from '../generated/prisma';
import type { 
  QueryOptions,
  PaginatedResult,
  IAdapterLogger
} from '../adapters/interfaces/BaseAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { createLogger } from '../utils/logger';

/**
 * Ticket creation data interface
 */
export interface CreateTicketData {
  garageId: string;
  vehicleId: string;
  sessionId?: string;
  ticketNumber?: string;
  type: TicketType;
  status?: TicketStatus;
  description: string;
  violationTime: Date;
  location?: string;
  fineAmount: number;
  paymentDueDate?: Date;
  issuedBy?: string;
}

/**
 * Ticket update data interface
 */
export interface UpdateTicketData {
  garageId?: string;
  vehicleId?: string;
  sessionId?: string;
  ticketNumber?: string;
  type?: TicketType;
  status?: TicketStatus;
  description?: string;
  violationTime?: Date;
  location?: string;
  fineAmount?: number;
  isPaid?: boolean;
  paymentDueDate?: Date;
  issuedBy?: string;
}

/**
 * Ticket search criteria interface
 */
export interface TicketSearchCriteria {
  garageId?: string;
  vehicleId?: string;
  sessionId?: string;
  licensePlate?: string;
  type?: TicketType;
  status?: TicketStatus;
  startDate?: Date;
  endDate?: Date;
  isPaid?: boolean;
  isOverdue?: boolean;
  issuedBy?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Ticket statistics interface
 */
export interface TicketStats {
  total: number;
  issued: number;
  paid: number;
  disputed: number;
  dismissed: number;
  overdue: number;
  totalFines: number;
  totalPaid: number;
  totalOutstanding: number;
  byType: Record<TicketType, number>;
  byStatus: Record<TicketStatus, number>;
}

/**
 * Repository for managing parking tickets using Prisma
 */
export class TicketRepository extends PrismaAdapter<Ticket, CreateTicketData, UpdateTicketData> {
  protected readonly modelName = 'ticket';
  protected readonly delegate: Prisma.TicketDelegate;

  constructor(
    databaseService?: DatabaseService,
    logger?: IAdapterLogger
  ) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prismaClient = dbService.getClient();
    
    super(prismaClient, logger || createLogger('TicketRepository'));
    this.delegate = prismaClient.ticket;
  }

  /**
   * Find ticket by ticket number
   * @param ticketNumber - Unique ticket number
   * @param options - Query options
   * @returns Found ticket or null
   */
  async findByTicketNumber(
    ticketNumber: string,
    options?: QueryOptions
  ): Promise<Ticket | null> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findFirst({
        where: {
          ticketNumber,
          deletedAt: null
        },
        include: {
          garage: true,
          vehicle: true,
          session: true,
          payments: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found ticket by ticket number', {
        ticketNumber,
        found: !!result
      });
      
      return result;
    }, `find ticket by number: ${ticketNumber}`);
  }

  /**
   * Find tickets by status
   * @param status - Ticket status to filter by
   * @param options - Query options
   * @returns Array of tickets matching the status
   */
  async findByStatus(
    status: TicketStatus,
    options?: QueryOptions
  ): Promise<Ticket[]> {
    return this.findMany({ status }, options);
  }

  /**
   * Find tickets by type
   * @param type - Ticket type to filter by
   * @param options - Query options
   * @returns Array of tickets matching the type
   */
  async findByType(
    type: TicketType,
    options?: QueryOptions
  ): Promise<Ticket[]> {
    return this.findMany({ type }, options);
  }

  /**
   * Find tickets by vehicle ID
   * @param vehicleId - Vehicle ID
   * @param options - Query options
   * @returns Array of tickets for the vehicle
   */
  async findByVehicleId(
    vehicleId: string,
    options?: QueryOptions
  ): Promise<Ticket[]> {
    return this.findMany({ vehicleId }, options);
  }

  /**
   * Find tickets by license plate
   * @param licensePlate - Vehicle license plate
   * @param options - Query options
   * @returns Array of tickets for the vehicle
   */
  async findByLicensePlate(
    licensePlate: string,
    options?: QueryOptions
  ): Promise<Ticket[]> {
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
          payments: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found tickets by license plate', {
        licensePlate,
        count: result.length
      });
      
      return result;
    }, `find tickets by license plate: ${licensePlate}`);
  }

  /**
   * Find tickets by garage ID
   * @param garageId - Garage ID
   * @param options - Query options
   * @returns Array of tickets for the garage
   */
  async findByGarageId(
    garageId: string,
    options?: QueryOptions
  ): Promise<Ticket[]> {
    return this.findMany({ garageId }, options);
  }

  /**
   * Find unpaid tickets
   * @param options - Query options
   * @returns Array of unpaid tickets
   */
  async findUnpaid(options?: QueryOptions): Promise<Ticket[]> {
    return this.findMany({ isPaid: false }, options);
  }

  /**
   * Find overdue tickets
   * @param options - Query options
   * @returns Array of overdue tickets
   */
  async findOverdue(options?: QueryOptions): Promise<Ticket[]> {
    return this.executeWithRetry(async () => {
      const now = new Date();
      
      const result = await this.delegate.findMany({
        where: {
          isPaid: false,
          status: 'ISSUED',
          paymentDueDate: {
            lt: now
          },
          deletedAt: null
        },
        include: {
          garage: true,
          vehicle: true,
          session: true,
          payments: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found overdue tickets', {
        count: result.length,
        currentDate: now
      });
      
      return result;
    }, 'find overdue tickets');
  }

  /**
   * Search tickets with multiple criteria
   * @param criteria - Search criteria
   * @param options - Query options
   * @returns Array of tickets matching all criteria
   */
  async search(
    criteria: TicketSearchCriteria,
    options?: QueryOptions
  ): Promise<Ticket[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.TicketWhereInput = {
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

      if (criteria.type) {
        whereClause.type = criteria.type;
      }

      if (criteria.status) {
        whereClause.status = criteria.status;
      }

      if (criteria.isPaid !== undefined) {
        whereClause.isPaid = criteria.isPaid;
      }

      if (criteria.issuedBy) {
        whereClause.issuedBy = {
          contains: criteria.issuedBy,
          mode: 'insensitive'
        };
      }

      // Date range search
      if (criteria.startDate || criteria.endDate) {
        whereClause.violationTime = {};
        if (criteria.startDate) {
          whereClause.violationTime.gte = criteria.startDate;
        }
        if (criteria.endDate) {
          whereClause.violationTime.lte = criteria.endDate;
        }
      }

      // Amount range search
      if (criteria.minAmount || criteria.maxAmount) {
        whereClause.fineAmount = {};
        if (criteria.minAmount) {
          whereClause.fineAmount.gte = criteria.minAmount;
        }
        if (criteria.maxAmount) {
          whereClause.fineAmount.lte = criteria.maxAmount;
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

      // Overdue filter
      if (criteria.isOverdue) {
        const now = new Date();
        whereClause.AND = [
          { isPaid: false },
          { status: 'ISSUED' },
          { paymentDueDate: { lt: now } }
        ];
      }

      const result = await this.delegate.findMany({
        where: whereClause,
        include: {
          garage: true,
          vehicle: true,
          session: true,
          payments: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Ticket search completed', {
        criteria,
        count: result.length
      });
      
      return result;
    }, 'search tickets');
  }

  /**
   * Create a new ticket with auto-generated ticket number
   * @param ticketData - Ticket creation data
   * @returns Created ticket
   */
  async createTicket(ticketData: CreateTicketData): Promise<Ticket> {
    return this.executeWithRetry(async () => {
      // Generate ticket number if not provided
      let ticketNumber = ticketData.ticketNumber;
      if (!ticketNumber) {
        ticketNumber = await this.generateTicketNumber();
      }

      // Set default values
      const createData = {
        ...ticketData,
        ticketNumber,
        status: ticketData.status || 'ISSUED',
        isPaid: false,
        paymentDueDate: ticketData.paymentDueDate || this.calculateDueDate(ticketData.violationTime)
      };

      const ticket = await this.create(createData);

      this.logger.info('Ticket created', {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        type: ticket.type,
        fineAmount: ticket.fineAmount
      });

      return ticket;
    }, 'create ticket');
  }

  /**
   * Mark a ticket as paid
   * @param ticketId - Ticket ID
   * @param paymentAmount - Amount paid
   * @returns Updated ticket
   */
  async markAsPaid(ticketId: string, paymentAmount: number): Promise<Ticket> {
    return this.executeWithRetry(async () => {
      const ticket = await this.delegate.findFirst({
        where: {
          id: ticketId,
          deletedAt: null
        }
      });

      if (!ticket) {
        throw new Error(`Ticket with ID ${ticketId} not found`);
      }

      if (ticket.isPaid) {
        throw new Error(`Ticket ${ticket.ticketNumber} is already paid`);
      }

      if (paymentAmount < ticket.fineAmount) {
        throw new Error(
          `Insufficient payment. Required: $${ticket.fineAmount}, Provided: $${paymentAmount}`
        );
      }

      const updatedTicket = await this.update(ticketId, {
        isPaid: true,
        status: 'PAID'
      });

      this.logger.info('Ticket marked as paid', {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        fineAmount: ticket.fineAmount,
        paymentAmount
      });

      return updatedTicket;
    }, `mark ticket as paid: ${ticketId}`);
  }

  /**
   * Dispute a ticket
   * @param ticketId - Ticket ID
   * @param disputeReason - Reason for dispute
   * @returns Updated ticket
   */
  async disputeTicket(ticketId: string, disputeReason: string): Promise<Ticket> {
    return this.executeWithRetry(async () => {
      const ticket = await this.delegate.findFirst({
        where: {
          id: ticketId,
          status: 'ISSUED',
          deletedAt: null
        }
      });

      if (!ticket) {
        throw new Error(`Issued ticket with ID ${ticketId} not found`);
      }

      const updatedTicket = await this.update(ticketId, {
        status: 'DISPUTED'
      });

      this.logger.info('Ticket disputed', {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        disputeReason
      });

      return updatedTicket;
    }, `dispute ticket: ${ticketId}`);
  }

  /**
   * Dismiss a ticket
   * @param ticketId - Ticket ID
   * @param dismissalReason - Reason for dismissal
   * @returns Updated ticket
   */
  async dismissTicket(ticketId: string, dismissalReason: string): Promise<Ticket> {
    return this.executeWithRetry(async () => {
      const ticket = await this.delegate.findFirst({
        where: {
          id: ticketId,
          deletedAt: null
        }
      });

      if (!ticket) {
        throw new Error(`Ticket with ID ${ticketId} not found`);
      }

      const updatedTicket = await this.update(ticketId, {
        status: 'DISMISSED'
      });

      this.logger.info('Ticket dismissed', {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        dismissalReason
      });

      return updatedTicket;
    }, `dismiss ticket: ${ticketId}`);
  }

  /**
   * Get ticket statistics
   * @param garageId - Optional garage ID to filter statistics
   * @returns Ticket statistics
   */
  async getStats(garageId?: string): Promise<TicketStats> {
    return this.executeWithRetry(async () => {
      const whereClause = garageId ? { garageId } : {};
      
      // Get total count
      const totalCount = await this.count(whereClause);

      // Count by status
      const statusCounts = await this.prisma.$queryRaw<
        Array<{ status: TicketStatus; count: bigint }>
      >`
        SELECT status, COUNT(*) as count
        FROM tickets
        WHERE deletedAt IS NULL ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY status
      `;

      // Count by type
      const typeCounts = await this.prisma.$queryRaw<
        Array<{ type: TicketType; count: bigint }>
      >`
        SELECT type, COUNT(*) as count
        FROM tickets
        WHERE deletedAt IS NULL ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY type
      `;

      // Financial statistics
      const financialStats = await this.prisma.$queryRaw<
        Array<{
          totalFines: number | null;
          totalPaid: number | null;
          totalOutstanding: number | null;
        }>
      >`
        SELECT 
          SUM(fineAmount) as totalFines,
          SUM(CASE WHEN isPaid = 1 THEN fineAmount ELSE 0 END) as totalPaid,
          SUM(CASE WHEN isPaid = 0 THEN fineAmount ELSE 0 END) as totalOutstanding
        FROM tickets
        WHERE deletedAt IS NULL ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
      `;

      // Count overdue tickets
      const now = new Date();
      const overdueCount = await this.count({
        ...whereClause,
        isPaid: false,
        status: 'ISSUED',
        paymentDueDate: { lt: now }
      });

      // Build result
      const stats: TicketStats = {
        total: totalCount,
        issued: 0,
        paid: 0,
        disputed: 0,
        dismissed: 0,
        overdue: overdueCount,
        totalFines: financialStats[0]?.totalFines || 0,
        totalPaid: financialStats[0]?.totalPaid || 0,
        totalOutstanding: financialStats[0]?.totalOutstanding || 0,
        byType: {} as Record<TicketType, number>,
        byStatus: {} as Record<TicketStatus, number>
      };

      // Process status counts
      statusCounts.forEach(({ status, count }) => {
        const countNum = Number(count);
        stats.byStatus[status] = countNum;
        
        switch (status) {
          case 'ISSUED':
            stats.issued = countNum;
            break;
          case 'PAID':
            stats.paid = countNum;
            break;
          case 'DISPUTED':
            stats.disputed = countNum;
            break;
          case 'DISMISSED':
            stats.dismissed = countNum;
            break;
        }
      });

      // Process type counts
      typeCounts.forEach(({ type, count }) => {
        stats.byType[type] = Number(count);
      });

      this.logger.debug('Ticket statistics calculated', {
        garageId,
        stats
      });
      
      return stats;
    }, 'get ticket statistics');
  }

  /**
   * Generate a unique ticket number
   * @returns Generated ticket number
   */
  private async generateTicketNumber(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const ticketNumber = `TKT-${timestamp}-${random}`;
    
    // Ensure uniqueness
    const existing = await this.delegate.findFirst({
      where: { ticketNumber }
    });
    
    if (existing) {
      // If collision (very rare), try again
      return this.generateTicketNumber();
    }
    
    return ticketNumber;
  }

  /**
   * Calculate payment due date
   * @param violationTime - Time of violation
   * @param daysToAdd - Days to add for due date (default 30)
   * @returns Due date
   */
  private calculateDueDate(violationTime: Date, daysToAdd: number = 30): Date {
    const dueDate = new Date(violationTime);
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    return dueDate;
  }
}

export default TicketRepository;
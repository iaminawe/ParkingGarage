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
import { Ticket, Prisma } from '@prisma/client';
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
  ticketNumber?: string;
  vehiclePlate: string;
  spotNumber?: string;
  entryTime?: Date;
  exitTime?: Date;
  baseAmount?: number;
  additionalFees?: number;
  totalAmount?: number;
  paidAmount?: number;
  status?: string;
  paymentStatus?: string;
  lostTicketFee?: number;
  isLostTicket?: boolean;
  qrCode?: string;
  barcodeData?: string;
  notes?: string;
}

/**
 * Ticket update data interface
 */
export interface UpdateTicketData {
  garageId?: string;
  ticketNumber?: string;
  vehiclePlate?: string;
  spotNumber?: string;
  entryTime?: Date;
  exitTime?: Date;
  duration?: number;
  baseAmount?: number;
  additionalFees?: number;
  totalAmount?: number;
  paidAmount?: number;
  status?: string;
  paymentStatus?: string;
  lostTicketFee?: number;
  isLostTicket?: boolean;
  qrCode?: string;
  barcodeData?: string;
  notes?: string;
}

/**
 * Ticket search criteria interface
 */
export interface TicketSearchCriteria {
  garageId?: string;
  ticketNumber?: string;
  vehiclePlate?: string;
  spotNumber?: string;
  status?: string;
  paymentStatus?: string;
  startDate?: Date;
  endDate?: Date;
  isLostTicket?: boolean;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Ticket statistics interface
 */
export interface TicketStats {
  total: number;
  active: number;
  paid: number;
  lost: number;
  cancelled: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  byStatus: Record<string, number>;
  byPaymentStatus: Record<string, number>;
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
          ticketNumber
        },
        include: {
          garage: true,
          transactions: true
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
    status: string,
    options?: QueryOptions
  ): Promise<Ticket[]> {
    return this.findMany({ status }, options);
  }

  /**
   * Find tickets by payment status
   * @param paymentStatus - Payment status to filter by
   * @param options - Query options
   * @returns Array of tickets matching the payment status
   */
  async findByPaymentStatus(
    paymentStatus: string,
    options?: QueryOptions
  ): Promise<Ticket[]> {
    return this.findMany({ paymentStatus }, options);
  }

  /**
   * Find tickets by vehicle plate
   * @param vehiclePlate - Vehicle license plate
   * @param options - Query options
   * @returns Array of tickets for the vehicle
   */
  async findByVehiclePlate(
    vehiclePlate: string,
    options?: QueryOptions
  ): Promise<Ticket[]> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findMany({
        where: {
          vehiclePlate: vehiclePlate.toUpperCase()
        },
        include: {
          garage: true,
          transactions: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found tickets by vehicle plate', {
        vehiclePlate,
        count: result.length
      });
      
      return result;
    }, `find tickets by vehicle plate: ${vehiclePlate}`);
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
    return this.findMany({ paymentStatus: 'UNPAID' }, options);
  }

  /**
   * Find lost tickets
   * @param options - Query options
   * @returns Array of lost tickets
   */
  async findLostTickets(options?: QueryOptions): Promise<Ticket[]> {
    return this.findMany({ isLostTicket: true }, options);
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

      if (criteria.ticketNumber) {
        whereClause.ticketNumber = criteria.ticketNumber;
      }

      if (criteria.vehiclePlate) {
        whereClause.vehiclePlate = {
          contains: criteria.vehiclePlate.toUpperCase(),
          mode: 'insensitive'
        };
      }

      if (criteria.spotNumber) {
        whereClause.spotNumber = criteria.spotNumber;
      }

      if (criteria.status) {
        whereClause.status = criteria.status;
      }

      if (criteria.paymentStatus) {
        whereClause.paymentStatus = criteria.paymentStatus;
      }

      if (criteria.isLostTicket !== undefined) {
        whereClause.isLostTicket = criteria.isLostTicket;
      }

      // Date range search (using entryTime as the date field)
      if (criteria.startDate || criteria.endDate) {
        whereClause.entryTime = {};
        if (criteria.startDate) {
          whereClause.entryTime.gte = criteria.startDate;
        }
        if (criteria.endDate) {
          whereClause.entryTime.lte = criteria.endDate;
        }
      }

      // Amount range search (using totalAmount)
      if (criteria.minAmount || criteria.maxAmount) {
        whereClause.totalAmount = {};
        if (criteria.minAmount) {
          whereClause.totalAmount.gte = criteria.minAmount;
        }
        if (criteria.maxAmount) {
          whereClause.totalAmount.lte = criteria.maxAmount;
        }
      }

      const result = await this.delegate.findMany({
        where: whereClause,
        include: {
          garage: true,
          transactions: true
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
        status: ticketData.status || 'ACTIVE',
        paymentStatus: ticketData.paymentStatus || 'UNPAID',
        entryTime: ticketData.entryTime || new Date(),
        totalAmount: ticketData.totalAmount || 0,
        paidAmount: ticketData.paidAmount || 0,
        isLostTicket: ticketData.isLostTicket || false
      };

      const ticket = await this.create(createData);

      this.logger.info('Ticket created', {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        vehiclePlate: ticket.vehiclePlate,
        totalAmount: ticket.totalAmount
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
          id: ticketId
        }
      });

      if (!ticket) {
        throw new Error(`Ticket with ID ${ticketId} not found`);
      }

      if (ticket.paymentStatus === 'PAID') {
        throw new Error(`Ticket ${ticket.ticketNumber} is already paid`);
      }

      if (paymentAmount < ticket.totalAmount) {
        throw new Error(
          `Insufficient payment. Required: $${ticket.totalAmount}, Provided: $${paymentAmount}`
        );
      }

      const updatedTicket = await this.update(ticketId, {
        paymentStatus: 'PAID',
        paidAmount: paymentAmount,
        status: 'PAID'
      });

      this.logger.info('Ticket marked as paid', {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        totalAmount: ticket.totalAmount,
        paymentAmount
      });

      return updatedTicket;
    }, `mark ticket as paid: ${ticketId}`);
  }

  /**
   * Cancel a ticket
   * @param ticketId - Ticket ID
   * @param cancellationReason - Reason for cancellation
   * @returns Updated ticket
   */
  async cancelTicket(ticketId: string, cancellationReason: string): Promise<Ticket> {
    return this.executeWithRetry(async () => {
      const ticket = await this.delegate.findFirst({
        where: {
          id: ticketId,
          status: 'ACTIVE'
        }
      });

      if (!ticket) {
        throw new Error(`Active ticket with ID ${ticketId} not found`);
      }

      const updatedTicket = await this.update(ticketId, {
        status: 'CANCELLED',
        notes: cancellationReason
      });

      this.logger.info('Ticket cancelled', {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        cancellationReason
      });

      return updatedTicket;
    }, `cancel ticket: ${ticketId}`);
  }

  /**
   * Report a ticket as lost
   * @param ticketId - Ticket ID
   * @param lostTicketFee - Additional fee for lost ticket
   * @returns Updated ticket
   */
  async reportLostTicket(ticketId: string, lostTicketFee: number): Promise<Ticket> {
    return this.executeWithRetry(async () => {
      const ticket = await this.delegate.findFirst({
        where: {
          id: ticketId
        }
      });

      if (!ticket) {
        throw new Error(`Ticket with ID ${ticketId} not found`);
      }

      const updatedTicket = await this.update(ticketId, {
        status: 'LOST',
        isLostTicket: true,
        lostTicketFee,
        totalAmount: ticket.totalAmount + lostTicketFee
      });

      this.logger.info('Ticket reported as lost', {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        lostTicketFee,
        newTotalAmount: ticket.totalAmount + lostTicketFee
      });

      return updatedTicket;
    }, `report lost ticket: ${ticketId}`);
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
        Array<{ status: string; count: bigint }>
      >`
        SELECT status, COUNT(*) as count
        FROM tickets
        ${garageId ? Prisma.sql`WHERE garageId = ${garageId}` : Prisma.empty}
        GROUP BY status
      `;

      // Count by payment status
      const paymentStatusCounts = await this.prisma.$queryRaw<
        Array<{ paymentStatus: string; count: bigint }>
      >`
        SELECT paymentStatus, COUNT(*) as count
        FROM tickets
        ${garageId ? Prisma.sql`WHERE garageId = ${garageId}` : Prisma.empty}
        GROUP BY paymentStatus
      `;

      // Financial statistics
      const financialStats = await this.prisma.$queryRaw<
        Array<{
          totalAmount: number | null;
          totalPaid: number | null;
          totalOutstanding: number | null;
        }>
      >`
        SELECT 
          SUM(totalAmount) as totalAmount,
          SUM(paidAmount) as totalPaid,
          SUM(totalAmount - paidAmount) as totalOutstanding
        FROM tickets
        ${garageId ? Prisma.sql`WHERE garageId = ${garageId}` : Prisma.empty}
      `;

      // Build result
      const stats: TicketStats = {
        total: totalCount,
        active: 0,
        paid: 0,
        lost: 0,
        cancelled: 0,
        totalAmount: financialStats[0]?.totalAmount || 0,
        totalPaid: financialStats[0]?.totalPaid || 0,
        totalOutstanding: financialStats[0]?.totalOutstanding || 0,
        byStatus: {},
        byPaymentStatus: {}
      };

      // Process status counts
      statusCounts.forEach(({ status, count }) => {
        const countNum = Number(count);
        stats.byStatus[status] = countNum;
        
        switch (status) {
          case 'ACTIVE':
            stats.active = countNum;
            break;
          case 'PAID':
            stats.paid = countNum;
            break;
          case 'LOST':
            stats.lost = countNum;
            break;
          case 'CANCELLED':
            stats.cancelled = countNum;
            break;
        }
      });

      // Process payment status counts
      paymentStatusCounts.forEach(({ paymentStatus, count }) => {
        stats.byPaymentStatus[paymentStatus] = Number(count);
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
   * Calculate exit time based on entry time and duration
   * @param entryTime - Time of entry
   * @param minutes - Duration in minutes
   * @returns Exit time
   */
  private calculateExitTime(entryTime: Date, minutes: number): Date {
    const exitTime = new Date(entryTime);
    exitTime.setMinutes(exitTime.getMinutes() + minutes);
    return exitTime;
  }
}

export default TicketRepository;
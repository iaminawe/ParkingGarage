/**
 * Reservation service for business logic operations
 *
 * This module provides business logic for reservation management operations,
 * including CRUD operations, availability checks, and reservation workflows.
 *
 * @module ReservationService
 */

import ReservationRepository, {
  CreateReservationData,
  UpdateReservationData,
  ReservationSearchCriteria,
  SpotAvailability,
} from '../repositories/ReservationRepository';
import { ParkingSession, SessionStatus } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { ServiceResponse, PaginatedResult } from '../types/models';

/**
 * Reservation creation request interface
 */
export interface CreateReservationRequest {
  vehicleId: string;
  spotId: string;
  startTime: Date;
  endTime?: Date;
  expectedEndTime?: Date;
  notes?: string;
}

/**
 * Reservation update request interface
 */
export interface UpdateReservationRequest {
  spotId?: string;
  startTime?: Date;
  endTime?: Date;
  expectedEndTime?: Date;
  status?: SessionStatus;
  notes?: string;
}

/**
 * Reservation filters interface
 */
export interface ReservationFilters {
  vehicleId?: string;
  spotId?: string;
  licensePlate?: string;
  status?: SessionStatus;
  startAfter?: Date;
  startBefore?: Date;
  endAfter?: Date;
  endBefore?: Date;
  isPaid?: boolean;
  floor?: number;
  spotType?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Availability check request interface
 */
export interface AvailabilityRequest {
  startTime: Date;
  endTime: Date;
  spotType?: string;
  floor?: number;
  excludeReservationId?: string;
}

/**
 * Service class for reservation management operations
 */
export class ReservationService {
  private readonly reservationRepository: ReservationRepository;
  private readonly logger = createLogger('ReservationService');

  constructor(reservationRepository?: ReservationRepository) {
    this.reservationRepository = reservationRepository || new ReservationRepository();
  }

  /**
   * Get all reservations with pagination and filtering
   * @param filters - Filter criteria
   * @param page - Page number
   * @param limit - Items per page
   * @param sortBy - Sort field
   * @param sortOrder - Sort order
   * @returns Paginated list of reservations
   */
  async getAllReservations(
    filters?: ReservationFilters,
    page = 1,
    limit = 20,
    sortBy = 'startTime',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ServiceResponse<PaginatedResult<ParkingSession>>> {
    try {
      const offset = (page - 1) * limit;
      const options = {
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      };

      let reservations: ParkingSession[];
      let totalItems: number;

      if (filters && Object.keys(filters).length > 0) {
        const searchCriteria: ReservationSearchCriteria = filters;
        reservations = await this.reservationRepository.search(searchCriteria, options);
        // Count would need to be implemented in the search method for accurate pagination
        totalItems = reservations.length; // This is a simplification
      } else {
        const result = await this.reservationRepository.findAll(options);
        reservations = result.data;
        totalItems = result.totalCount;
      }

      const totalPages = Math.ceil(totalItems / limit);

      const paginatedResult: PaginatedResult<ParkingSession> = {
        data: reservations,
        totalCount: totalItems,
        totalItems, // For backward compatibility
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        hasPrevPage: page > 1, // For BaseAdapter compatibility
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
      };

      this.logger.info('Retrieved reservations list', {
        count: reservations.length,
        totalItems,
        page,
        limit,
        filters,
      });

      return {
        success: true,
        data: paginatedResult,
        message: 'Reservations retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get reservations list', error as Error);
      return {
        success: false,
        message: 'Failed to retrieve reservations',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get reservation by ID
   * @param id - Reservation ID
   * @returns Reservation details
   */
  async getReservationById(id: string): Promise<ServiceResponse<ParkingSession | null>> {
    try {
      const reservation = await this.reservationRepository.findById(id, {
        include: {
          vehicle: true,
          spot: {
            include: {
              floor: {
                include: {
                  garage: true,
                },
              },
            },
          },
          payments: true,
        },
      });

      if (!reservation) {
        return {
          success: false,
          message: 'Reservation not found',
        };
      }

      this.logger.info('Retrieved reservation by ID', { reservationId: id });

      return {
        success: true,
        data: reservation,
        message: 'Reservation retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get reservation by ID', error as Error, { reservationId: id });
      return {
        success: false,
        message: 'Failed to retrieve reservation',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Create new reservation
   * @param reservationData - Reservation creation data
   * @returns Created reservation
   */
  async createReservation(
    reservationData: CreateReservationRequest
  ): Promise<ServiceResponse<ParkingSession>> {
    try {
      // Check spot availability if end time is provided
      if (reservationData.endTime) {
        const availability = await this.reservationRepository.checkSpotAvailability(
          reservationData.spotId,
          reservationData.startTime,
          reservationData.endTime
        );

        if (!availability.isAvailable) {
          return {
            success: false,
            message: 'Spot is not available for the requested time range',
            errors: ['Spot conflict detected'],
          };
        }
      }

      const createData: CreateReservationData = {
        ...reservationData,
        status: 'ACTIVE',
        hourlyRate: 5.0, // Default rate
        totalAmount: 0.0,
      };

      const reservation = await this.reservationRepository.createReservation(createData);

      this.logger.info('Reservation created successfully', {
        reservationId: reservation.id,
        vehicleId: reservation.vehicleId,
        spotId: reservation.spotId,
      });

      return {
        success: true,
        data: reservation,
        message: 'Reservation created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create reservation', error as Error, { reservationData });
      return {
        success: false,
        message: 'Failed to create reservation',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Update reservation
   * @param id - Reservation ID
   * @param updateData - Update data
   * @returns Updated reservation
   */
  async updateReservation(
    id: string,
    updateData: UpdateReservationRequest
  ): Promise<ServiceResponse<ParkingSession>> {
    try {
      // Check if reservation exists
      const existingReservation = await this.reservationRepository.findById(id);
      if (!existingReservation) {
        return {
          success: false,
          message: 'Reservation not found',
        };
      }

      // If updating time or spot, check availability
      if (updateData.spotId || updateData.startTime || updateData.endTime) {
        const spotId = updateData.spotId || existingReservation.spotId;
        const startTime = updateData.startTime || existingReservation.startTime;
        const endTime = updateData.endTime || existingReservation.endTime;

        if (endTime) {
          const availability = await this.reservationRepository.checkSpotAvailability(
            spotId,
            startTime,
            endTime,
            id // Exclude current reservation from conflict check
          );

          if (!availability.isAvailable) {
            return {
              success: false,
              message: 'Updated time/spot is not available',
              errors: ['Spot conflict detected'],
            };
          }
        }
      }

      const updateReservationData: UpdateReservationData = {
        ...updateData,
      };

      const updatedReservation = await this.reservationRepository.update(
        id,
        updateReservationData,
        {
          include: {
            vehicle: true,
            spot: {
              include: {
                floor: {
                  include: {
                    garage: true,
                  },
                },
              },
            },
            payments: true,
          },
        }
      );

      this.logger.info('Reservation updated successfully', {
        reservationId: id,
        updatedFields: Object.keys(updateData),
      });

      return {
        success: true,
        data: updatedReservation,
        message: 'Reservation updated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to update reservation', error as Error, { reservationId: id });
      return {
        success: false,
        message: 'Failed to update reservation',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Cancel reservation
   * @param id - Reservation ID
   * @param reason - Cancellation reason
   * @returns Success response
   */
  async cancelReservation(id: string, reason?: string): Promise<ServiceResponse<ParkingSession>> {
    try {
      const reservation = await this.reservationRepository.findById(id);
      if (!reservation) {
        return {
          success: false,
          message: 'Reservation not found',
        };
      }

      if (reservation.status === 'COMPLETED') {
        return {
          success: false,
          message: 'Cannot cancel a completed reservation',
        };
      }

      if (reservation.status === 'CANCELLED') {
        return {
          success: false,
          message: 'Reservation is already cancelled',
        };
      }

      const cancelledReservation = await this.reservationRepository.cancelReservation(id, reason);

      this.logger.info('Reservation cancelled successfully', {
        reservationId: id,
        reason,
      });

      return {
        success: true,
        data: cancelledReservation,
        message: 'Reservation cancelled successfully',
      };
    } catch (error) {
      this.logger.error('Failed to cancel reservation', error as Error, { reservationId: id });
      return {
        success: false,
        message: 'Failed to cancel reservation',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Complete reservation (checkout)
   * @param id - Reservation ID
   * @param endTime - End time (defaults to now)
   * @returns Completed reservation with cost calculation
   */
  async completeReservation(id: string, endTime?: Date): Promise<ServiceResponse<ParkingSession>> {
    try {
      const reservation = await this.reservationRepository.findById(id);
      if (!reservation) {
        return {
          success: false,
          message: 'Reservation not found',
        };
      }

      if (reservation.status !== 'ACTIVE') {
        return {
          success: false,
          message: 'Only active reservations can be completed',
        };
      }

      const completionTime = endTime || new Date();
      const completedReservation = await this.reservationRepository.completeReservation(
        id,
        completionTime
      );

      this.logger.info('Reservation completed successfully', {
        reservationId: id,
        duration: completedReservation.duration,
        totalAmount: completedReservation.totalAmount,
        endTime: completionTime,
      });

      return {
        success: true,
        data: completedReservation,
        message: 'Reservation completed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to complete reservation', error as Error, { reservationId: id });
      return {
        success: false,
        message: 'Failed to complete reservation',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Check spot availability
   * @param availabilityRequest - Availability check parameters
   * @returns Availability information
   */
  async checkAvailability(availabilityRequest: AvailabilityRequest): Promise<
    ServiceResponse<{
      availableSpots: string[];
      totalSpots: number;
      availableCount: number;
    }>
  > {
    try {
      const { startTime, endTime, spotType, floor } = availabilityRequest;

      const availableSpots = await this.reservationRepository.findAvailableSpots(
        startTime,
        endTime,
        spotType,
        floor
      );

      // Get total spots count for comparison
      // This would need to be implemented in the repository or fetched from ParkingSpot model
      const totalSpots = availableSpots.length; // Simplified for now

      this.logger.info('Checked spot availability', {
        availableCount: availableSpots.length,
        totalSpots,
        startTime,
        endTime,
        spotType,
        floor,
      });

      return {
        success: true,
        data: {
          availableSpots,
          totalSpots,
          availableCount: availableSpots.length,
        },
        message: 'Availability checked successfully',
      };
    } catch (error) {
      this.logger.error('Failed to check availability', error as Error, { availabilityRequest });
      return {
        success: false,
        message: 'Failed to check availability',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get reservations by vehicle ID
   * @param vehicleId - Vehicle ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated list of reservations for the vehicle
   */
  async getReservationsByVehicle(
    vehicleId: string,
    page = 1,
    limit = 20
  ): Promise<ServiceResponse<PaginatedResult<ParkingSession>>> {
    try {
      const offset = (page - 1) * limit;
      const options = {
        skip: offset,
        take: limit,
        orderBy: { startTime: 'desc' as const },
        include: {
          vehicle: true,
          spot: {
            include: {
              floor: {
                include: {
                  garage: true,
                },
              },
            },
          },
          payments: true,
        },
      };

      const reservations = await this.reservationRepository.findByVehicleId(vehicleId, options);
      const totalItems = await this.reservationRepository.count({ vehicleId });

      const totalPages = Math.ceil(totalItems / limit);

      const paginatedResult: PaginatedResult<ParkingSession> = {
        data: reservations,
        totalCount: totalItems,
        totalItems, // For backward compatibility
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        hasPrevPage: page > 1, // For BaseAdapter compatibility
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
      };

      this.logger.info('Retrieved reservations by vehicle', {
        vehicleId,
        count: reservations.length,
        totalItems,
      });

      return {
        success: true,
        data: paginatedResult,
        message: 'Vehicle reservations retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get reservations by vehicle', error as Error, { vehicleId });
      return {
        success: false,
        message: 'Failed to retrieve vehicle reservations',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get reservations by license plate
   * @param licensePlate - Vehicle license plate
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated list of reservations for the license plate
   */
  async getReservationsByLicensePlate(
    licensePlate: string,
    page = 1,
    limit = 20
  ): Promise<ServiceResponse<PaginatedResult<ParkingSession>>> {
    try {
      const offset = (page - 1) * limit;
      const options = {
        skip: offset,
        take: limit,
        orderBy: { startTime: 'desc' as const },
      };

      const reservations = await this.reservationRepository.findByLicensePlate(
        licensePlate,
        options
      );

      // For pagination, we need to count separately
      const totalItems = reservations.length; // This is a simplification

      const totalPages = Math.ceil(totalItems / limit);

      const paginatedResult: PaginatedResult<ParkingSession> = {
        data: reservations.slice(0, limit), // Apply pagination
        totalCount: totalItems,
        totalItems, // For backward compatibility
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        hasPrevPage: page > 1, // For BaseAdapter compatibility
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
      };

      this.logger.info('Retrieved reservations by license plate', {
        licensePlate,
        count: reservations.length,
      });

      return {
        success: true,
        data: paginatedResult,
        message: 'License plate reservations retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get reservations by license plate', error as Error, {
        licensePlate,
      });
      return {
        success: false,
        message: 'Failed to retrieve license plate reservations',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get reservation statistics
   * @param startDate - Start date for statistics
   * @param endDate - End date for statistics
   * @returns Reservation statistics
   */
  async getReservationStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<
    ServiceResponse<{
      total: number;
      byStatus: Record<SessionStatus, number>;
      totalRevenue: number;
      averageDuration: number;
      occupancyRate: number;
    }>
  > {
    try {
      const stats = await this.reservationRepository.getStats(startDate, endDate);

      this.logger.info('Retrieved reservation statistics', {
        startDate,
        endDate,
        stats,
      });

      return {
        success: true,
        data: stats,
        message: 'Reservation statistics retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get reservation statistics', error as Error);
      return {
        success: false,
        message: 'Failed to retrieve reservation statistics',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Search reservations with multiple criteria
   * @param criteria - Search criteria
   * @param page - Page number
   * @param limit - Items per page
   * @param sortBy - Sort field
   * @param sortOrder - Sort order
   * @returns Paginated search results
   */
  async searchReservations(
    criteria: ReservationSearchCriteria,
    page = 1,
    limit = 20,
    sortBy = 'startTime',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ServiceResponse<PaginatedResult<ParkingSession>>> {
    try {
      const offset = (page - 1) * limit;
      const options = {
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      };

      const reservations = await this.reservationRepository.search(criteria, options);
      // For accurate pagination, we'd need a count method in the search
      const totalItems = reservations.length; // This is a simplification

      const totalPages = Math.ceil(totalItems / limit);

      const paginatedResult: PaginatedResult<ParkingSession> = {
        data: reservations,
        totalCount: totalItems,
        totalItems, // For backward compatibility
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        hasPrevPage: page > 1, // For BaseAdapter compatibility
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
      };

      this.logger.info('Reservation search completed', {
        criteria,
        count: reservations.length,
        totalItems,
      });

      return {
        success: true,
        data: paginatedResult,
        message: 'Reservation search completed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to search reservations', error as Error, { criteria });
      return {
        success: false,
        message: 'Failed to search reservations',
        errors: [(error as Error).message],
      };
    }
  }
}

export default ReservationService;

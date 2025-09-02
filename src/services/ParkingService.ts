/**
 * Parking Service with comprehensive transactional operations
 * 
 * This service handles all complex parking operations with full transaction support,
 * ensuring data consistency across multiple database operations.
 * 
 * @module ParkingService
 */

import { Prisma } from '@prisma/client';
import { TransactionManager } from './TransactionManager';
import { DatabaseService } from './DatabaseService';
import { SpotRepository } from '../repositories/SpotRepository';
import { VehicleRepository } from '../repositories/VehicleRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import {
  ITransactionOptions,
  ITransactionResult,
  ITransactionContext,
  TransactionPriority,
  TransactionError
} from '../types/transaction.types';
import {
  SpotStatus,
  SpotType,
  SessionStatus,
  Vehicle,
  Spot,
  Session,
  Ticket,
  Payment
} from '@prisma/client';
import { createLogger } from '../utils/logger';
import type { IAdapterLogger } from '../adapters/interfaces/BaseAdapter';

/**
 * Parking operation result interface
 */
export interface IParkingOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionId: string;
  duration: number;
}

/**
 * Vehicle parking data
 */
export interface IVehicleParkingData {
  licensePlate: string;
  vehicleType?: string;
  color?: string;
  make?: string;
  model?: string;
  year?: number;
}

/**
 * Parking session data
 */
export interface IParkingSessionData {
  vehicle: IVehicleParkingData;
  spotId: string;
  entryTime?: Date;
  expectedExitTime?: Date;
  metadata?: Record<string, any>;
}

/**
 * Payment processing data
 */
export interface IPaymentData {
  amount: number;
  paymentMethod: string;
  transactionReference?: string;
  metadata?: Record<string, any>;
}

/**
 * Spot transfer data
 */
export interface ISpotTransferData {
  fromSpotId: string;
  toSpotId: string;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Parking Service with transactional operations
 */
export class ParkingService {
  private readonly logger: IAdapterLogger;
  private readonly transactionManager: TransactionManager;
  private readonly spotRepository: SpotRepository;
  private readonly vehicleRepository: VehicleRepository;
  private readonly sessionRepository: SessionRepository;

  constructor(
    databaseService?: DatabaseService,
    logger?: IAdapterLogger
  ) {
    const dbService = databaseService || DatabaseService.getInstance();
    this.logger = logger || createLogger('ParkingService');
    this.transactionManager = TransactionManager.getInstance(dbService);
    this.spotRepository = new SpotRepository(dbService, this.logger);
    this.vehicleRepository = new VehicleRepository(dbService, this.logger);
    this.sessionRepository = new SessionRepository(dbService, this.logger);
  }

  /**
   * Park a vehicle - create session and update spot atomically
   */
  async parkVehicle(
    sessionData: IParkingSessionData,
    options: ITransactionOptions = {}
  ): Promise<IParkingOperationResult<{ session: Session; spot: Spot; vehicle: Vehicle }>> {
    const startTime = Date.now();
    
    const result = await this.transactionManager.executeTransaction(
      async (tx, context) => {
        this.logger.info('Starting vehicle parking transaction', {
          transactionId: context.id,
          spotId: sessionData.spotId,
          licensePlate: sessionData.vehicle.licensePlate
        });
        
        // Step 1: Verify spot is available
        const spot = await this.spotRepository.findById(sessionData.spotId, undefined, tx);
        if (!spot) {
          throw new TransactionError(
            `Spot ${sessionData.spotId} not found`,
            'SPOT_NOT_FOUND',
            context.id,
            context
          );
        }
        
        if (spot.status !== SpotStatus.AVAILABLE) {
          throw new TransactionError(
            `Spot ${sessionData.spotId} is not available (current status: ${spot.status})`,
            'SPOT_NOT_AVAILABLE',
            context.id,
            context
          );
        }
        
        // Step 2: Create or get vehicle
        let vehicle = await this.vehicleRepository.findByLicensePlate(
          sessionData.vehicle.licensePlate,
          undefined,
          tx
        );
        
        if (!vehicle) {
          // Create savepoint for vehicle creation
          const vehicleSavepoint = await this.transactionManager.createSavepoint(
            'vehicle_creation',
            context
          );
          
          try {
            vehicle = await this.vehicleRepository.create({
              licensePlate: sessionData.vehicle.licensePlate.toUpperCase(),
              vehicleType: sessionData.vehicle.vehicleType || 'STANDARD',
              color: sessionData.vehicle.color,
              make: sessionData.vehicle.make,
              model: sessionData.vehicle.model,
              year: sessionData.vehicle.year
            }, tx);
            
            await this.transactionManager.releaseSavepoint(vehicleSavepoint.id, context);
          } catch (error) {
            await this.transactionManager.rollbackToSavepoint(vehicleSavepoint.id, context);
            throw error;
          }
        }
        
        // Step 3: Check if vehicle is already parked
        const existingSession = await this.sessionRepository.findActiveByVehicle(
          vehicle.id,
          undefined,
          tx
        );
        
        if (existingSession) {
          throw new TransactionError(
            `Vehicle ${sessionData.vehicle.licensePlate} is already parked in spot ${existingSession.spotId}`,
            'VEHICLE_ALREADY_PARKED',
            context.id,
            context
          );
        }
        
        // Step 4: Create parking session
        const sessionSavepoint = await this.transactionManager.createSavepoint(
          'session_creation',
          context
        );
        
        let session: Session;
        try {
          session = await this.sessionRepository.create({
            spotId: sessionData.spotId,
            vehicleId: vehicle.id,
            status: SessionStatus.ACTIVE,
            entryTime: sessionData.entryTime || new Date(),
            expectedExitTime: sessionData.expectedExitTime,
            metadata: sessionData.metadata ? JSON.stringify(sessionData.metadata) : undefined
          }, tx);
          
          await this.transactionManager.releaseSavepoint(sessionSavepoint.id, context);
        } catch (error) {
          await this.transactionManager.rollbackToSavepoint(sessionSavepoint.id, context);
          throw error;
        }
        
        // Step 5: Update spot status
        const spotSavepoint = await this.transactionManager.createSavepoint(
          'spot_occupation',
          context
        );
        
        try {
          const updatedSpot = await this.spotRepository.update(
            sessionData.spotId,
            {
              status: SpotStatus.OCCUPIED,
              currentVehicleId: vehicle.id
            },
            undefined,
            tx
          );
          
          await this.transactionManager.releaseSavepoint(spotSavepoint.id, context);
          
          this.logger.info('Vehicle parked successfully', {
            transactionId: context.id,
            sessionId: session.id,
            spotId: sessionData.spotId,
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate
          });
          
          return {
            session,
            spot: updatedSpot,
            vehicle
          };
        } catch (error) {
          await this.transactionManager.rollbackToSavepoint(spotSavepoint.id, context);
          throw error;
        }
      },
      {
        priority: TransactionPriority.HIGH,
        timeout: 15000,
        ...options
      }
    );
    
    return {
      success: result.success,
      data: result.result,
      error: result.error?.message,
      transactionId: result.context.id,
      duration: Date.now() - startTime
    };
  }

  /**
   * Exit vehicle - end session, update spot, and calculate payment
   */
  async exitVehicle(
    licensePlate: string,
    exitTime?: Date,
    options: ITransactionOptions = {}
  ): Promise<IParkingOperationResult<{ session: Session; spot: Spot; payment?: any }>> {
    const startTime = Date.now();
    
    const result = await this.transactionManager.executeTransaction(
      async (tx, context) => {
        this.logger.info('Starting vehicle exit transaction', {
          transactionId: context.id,
          licensePlate
        });
        
        // Step 1: Find vehicle
        const vehicle = await this.vehicleRepository.findByLicensePlate(
          licensePlate,
          undefined,
          tx
        );
        
        if (!vehicle) {
          throw new TransactionError(
            `Vehicle with license plate ${licensePlate} not found`,
            'VEHICLE_NOT_FOUND',
            context.id,
            context
          );
        }
        
        // Step 2: Find active session
        const session = await this.sessionRepository.findActiveByVehicle(
          vehicle.id,
          undefined,
          tx
        );
        
        if (!session) {
          throw new TransactionError(
            `No active parking session found for vehicle ${licensePlate}`,
            'NO_ACTIVE_SESSION',
            context.id,
            context
          );
        }
        
        // Step 3: Calculate parking duration and fee
        const actualExitTime = exitTime || new Date();
        const duration = actualExitTime.getTime() - session.entryTime.getTime();
        const hours = Math.ceil(duration / (1000 * 60 * 60));
        const fee = this.calculateParkingFee(hours);
        
        // Step 4: Update session with exit information
        const sessionSavepoint = await this.transactionManager.createSavepoint(
          'session_completion',
          context
        );
        
        let updatedSession: Session;
        try {
          updatedSession = await this.sessionRepository.update(
            session.id,
            {
              status: SessionStatus.COMPLETED,
              exitTime: actualExitTime,
              duration: Math.floor(duration / 1000), // duration in seconds
              totalFee: fee
            },
            undefined,
            tx
          );
          
          await this.transactionManager.releaseSavepoint(sessionSavepoint.id, context);
        } catch (error) {
          await this.transactionManager.rollbackToSavepoint(sessionSavepoint.id, context);
          throw error;
        }
        
        // Step 5: Update spot status
        const spotSavepoint = await this.transactionManager.createSavepoint(
          'spot_vacation',
          context
        );
        
        let updatedSpot: Spot;
        try {
          updatedSpot = await this.spotRepository.update(
            session.spotId,
            {
              status: SpotStatus.AVAILABLE,
              currentVehicleId: null as any
            },
            undefined,
            tx
          );
          
          await this.transactionManager.releaseSavepoint(spotSavepoint.id, context);
        } catch (error) {
          await this.transactionManager.rollbackToSavepoint(spotSavepoint.id, context);
          throw error;
        }
        
        this.logger.info('Vehicle exit completed successfully', {
          transactionId: context.id,
          sessionId: session.id,
          spotId: session.spotId,
          vehicleId: vehicle.id,
          licensePlate: vehicle.licensePlate,
          duration: Math.floor(duration / 1000),
          fee
        });
        
        return {
          session: updatedSession,
          spot: updatedSpot,
          payment: {
            amount: fee,
            duration: Math.floor(duration / 1000),
            hours
          }
        };
      },
      {
        priority: TransactionPriority.HIGH,
        timeout: 15000,
        ...options
      }
    );
    
    return {
      success: result.success,
      data: result.result,
      error: result.error?.message,
      transactionId: result.context.id,
      duration: Date.now() - startTime
    };
  }

  /**
   * Transfer vehicle between spots
   */
  async transferVehicle(
    transferData: ISpotTransferData,
    options: ITransactionOptions = {}
  ): Promise<IParkingOperationResult<{ session: Session; fromSpot: Spot; toSpot: Spot }>> {
    const startTime = Date.now();
    
    const result = await this.transactionManager.executeTransaction(
      async (tx, context) => {
        this.logger.info('Starting vehicle transfer transaction', {
          transactionId: context.id,
          fromSpotId: transferData.fromSpotId,
          toSpotId: transferData.toSpotId
        });
        
        // Step 1: Validate source spot
        const fromSpot = await this.spotRepository.findById(transferData.fromSpotId, undefined, tx);
        if (!fromSpot || fromSpot.status !== SpotStatus.OCCUPIED) {
          throw new TransactionError(
            `Source spot ${transferData.fromSpotId} is not occupied`,
            'SOURCE_SPOT_NOT_OCCUPIED',
            context.id,
            context
          );
        }
        
        // Step 2: Validate destination spot
        const toSpot = await this.spotRepository.findById(transferData.toSpotId, undefined, tx);
        if (!toSpot || toSpot.status !== SpotStatus.AVAILABLE) {
          throw new TransactionError(
            `Destination spot ${transferData.toSpotId} is not available`,
            'DESTINATION_SPOT_NOT_AVAILABLE',
            context.id,
            context
          );
        }
        
        // Step 3: Find active session
        const session = await this.sessionRepository.findBySpotAndStatus(
          transferData.fromSpotId,
          SessionStatus.ACTIVE,
          undefined,
          tx
        );
        
        if (!session) {
          throw new TransactionError(
            `No active session found for spot ${transferData.fromSpotId}`,
            'NO_ACTIVE_SESSION',
            context.id,
            context
          );
        }
        
        // Step 4: Update session spot
        const sessionSavepoint = await this.transactionManager.createSavepoint(
          'session_transfer',
          context
        );
        
        let updatedSession: Session;
        try {
          updatedSession = await this.sessionRepository.update(
            session.id,
            {
              spotId: transferData.toSpotId,
              metadata: transferData.metadata ? 
                JSON.stringify(transferData.metadata) : session.metadata
            },
            undefined,
            tx
          );
          
          await this.transactionManager.releaseSavepoint(sessionSavepoint.id, context);
        } catch (error) {
          await this.transactionManager.rollbackToSavepoint(sessionSavepoint.id, context);
          throw error;
        }
        
        // Step 5: Update source spot
        const fromSpotSavepoint = await this.transactionManager.createSavepoint(
          'from_spot_update',
          context
        );
        
        let updatedFromSpot: Spot;
        try {
          updatedFromSpot = await this.spotRepository.update(
            transferData.fromSpotId,
            {
              status: SpotStatus.AVAILABLE,
              currentVehicleId: null as any
            },
            undefined,
            tx
          );
          
          await this.transactionManager.releaseSavepoint(fromSpotSavepoint.id, context);
        } catch (error) {
          await this.transactionManager.rollbackToSavepoint(fromSpotSavepoint.id, context);
          throw error;
        }
        
        // Step 6: Update destination spot
        const toSpotSavepoint = await this.transactionManager.createSavepoint(
          'to_spot_update',
          context
        );
        
        let updatedToSpot: Spot;
        try {
          updatedToSpot = await this.spotRepository.update(
            transferData.toSpotId,
            {
              status: SpotStatus.OCCUPIED,
              currentVehicleId: fromSpot.currentVehicleId
            },
            undefined,
            tx
          );
          
          await this.transactionManager.releaseSavepoint(toSpotSavepoint.id, context);
        } catch (error) {
          await this.transactionManager.rollbackToSavepoint(toSpotSavepoint.id, context);
          throw error;
        }
        
        this.logger.info('Vehicle transfer completed successfully', {
          transactionId: context.id,
          sessionId: session.id,
          fromSpotId: transferData.fromSpotId,
          toSpotId: transferData.toSpotId,
          vehicleId: fromSpot.currentVehicleId
        });
        
        return {
          session: updatedSession,
          fromSpot: updatedFromSpot,
          toSpot: updatedToSpot
        };
      },
      {
        priority: TransactionPriority.HIGH,
        timeout: 20000,
        ...options
      }
    );
    
    return {
      success: result.success,
      data: result.result,
      error: result.error?.message,
      transactionId: result.context.id,
      duration: Date.now() - startTime
    };
  }

  /**
   * Bulk update spot statuses
   */
  async bulkUpdateSpotStatus(
    spotIds: string[],
    status: SpotStatus,
    reason?: string,
    options: ITransactionOptions = {}
  ): Promise<IParkingOperationResult<{ updatedCount: number; spots: Spot[] }>> {
    const startTime = Date.now();
    
    const result = await this.transactionManager.executeTransaction(
      async (tx, context) => {
        this.logger.info('Starting bulk spot status update', {
          transactionId: context.id,
          spotCount: spotIds.length,
          targetStatus: status,
          reason
        });
        
        const updatedSpots: Spot[] = [];
        
        // Process in batches to avoid transaction timeout
        const batchSize = 50;
        for (let i = 0; i < spotIds.length; i += batchSize) {
          const batch = spotIds.slice(i, i + batchSize);
          
          const batchSavepoint = await this.transactionManager.createSavepoint(
            `batch_${Math.floor(i / batchSize)}`,
            context
          );
          
          try {
            for (const spotId of batch) {
              const spot = await this.spotRepository.findById(spotId, undefined, tx);
              if (spot) {
                const updatedSpot = await this.spotRepository.update(
                  spotId,
                  { status },
                  undefined,
                  tx
                );
                updatedSpots.push(updatedSpot);
              }
            }
            
            await this.transactionManager.releaseSavepoint(batchSavepoint.id, context);
          } catch (error) {
            await this.transactionManager.rollbackToSavepoint(batchSavepoint.id, context);
            throw error;
          }
        }
        
        this.logger.info('Bulk spot status update completed', {
          transactionId: context.id,
          updatedCount: updatedSpots.length,
          targetStatus: status
        });
        
        return {
          updatedCount: updatedSpots.length,
          spots: updatedSpots
        };
      },
      {
        priority: TransactionPriority.NORMAL,
        timeout: 60000,
        ...options
      }
    );
    
    return {
      success: result.success,
      data: result.result,
      error: result.error?.message,
      transactionId: result.context.id,
      duration: Date.now() - startTime
    };
  }

  /**
   * Calculate parking fee based on hours
   */
  private calculateParkingFee(hours: number): number {
    // Simple fee calculation - $5 for first hour, $3 for each additional hour
    const baseRate = 5;
    const hourlyRate = 3;
    
    if (hours <= 1) {
      return baseRate;
    }
    
    return baseRate + ((hours - 1) * hourlyRate);
  }

  /**
   * Get parking service statistics
   */
  async getServiceStatistics(): Promise<{
    activeTransactions: number;
    totalTransactions: number;
    successRate: number;
    averageDuration: number;
  }> {
    const transactionStats = this.transactionManager.getTransactionStatistics();
    
    return {
      activeTransactions: transactionStats.active,
      totalTransactions: transactionStats.total,
      successRate: transactionStats.total > 0 ? 
        (transactionStats.success / transactionStats.total) * 100 : 0,
      averageDuration: transactionStats.averageDuration
    };
  }
}

export default ParkingService;

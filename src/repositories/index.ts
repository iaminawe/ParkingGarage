/**
 * Repository modules index
 * 
 * This module provides centralized exports for all repository classes
 * in the parking garage system using Prisma ORM. It enables clean imports,
 * consistent access to data access layer components, and provides a factory
 * for managing repository instances with shared database connections.
 * 
 * @module Repositories
 */

<<<<<<< HEAD
// Import and export individual repository classes
import { VehicleRepository } from './VehicleRepository';
import { SpotRepository } from './SpotRepository';
import { SessionRepository } from './SessionRepository';
import { GarageRepository } from './garageRepository';

export { VehicleRepository, SpotRepository, SessionRepository, GarageRepository };
=======
// Modern Prisma-based repositories
export { VehicleRepository } from './VehicleRepository';
export { SpotRepository } from './SpotRepository';
export { SessionRepository } from './SessionRepository';
export { TicketRepository } from './TicketRepository';
export { PaymentRepository } from './PaymentRepository';

// Legacy exports for backward compatibility
export { SessionRepository as SessionsRepository } from './SessionRepository';
>>>>>>> origin/main

// Database service
export { DatabaseService } from '../services/DatabaseService';

// Repository factory for centralized initialization
import { DatabaseService } from '../services/DatabaseService';
import { VehicleRepository } from './VehicleRepository';
import { SpotRepository } from './SpotRepository';
import { SessionRepository } from './SessionRepository';
import { TicketRepository } from './TicketRepository';
import { PaymentRepository } from './PaymentRepository';

/**
 * Repository factory for creating repository instances with shared database service
 */
export class RepositoryFactory {
  private static instance: RepositoryFactory;
  private databaseService: DatabaseService;
  
  // Repository instances
  private vehicleRepo?: VehicleRepository;
  private spotRepo?: SpotRepository;
  private sessionRepo?: SessionRepository;
  private ticketRepo?: TicketRepository;
  private paymentRepo?: PaymentRepository;

  private constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  /**
   * Get singleton instance of repository factory
   */
  static getInstance(databaseService?: DatabaseService): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      if (!databaseService) {
        databaseService = DatabaseService.getInstance();
      }
      RepositoryFactory.instance = new RepositoryFactory(databaseService);
    }
    return RepositoryFactory.instance;
  }

  /**
   * Get VehicleRepository instance
   */
  getVehicleRepository(): VehicleRepository {
    if (!this.vehicleRepo) {
      this.vehicleRepo = new VehicleRepository(this.databaseService);
    }
    return this.vehicleRepo;
  }

  /**
   * Get SpotRepository instance
   */
  getSpotRepository(): SpotRepository {
    if (!this.spotRepo) {
      this.spotRepo = new SpotRepository(this.databaseService);
    }
    return this.spotRepo;
  }

  /**
   * Get SessionRepository instance
   */
  getSessionRepository(): SessionRepository {
    if (!this.sessionRepo) {
      this.sessionRepo = new SessionRepository(this.databaseService);
    }
    return this.sessionRepo;
  }

  /**
   * Get TicketRepository instance
   */
  getTicketRepository(): TicketRepository {
    if (!this.ticketRepo) {
      this.ticketRepo = new TicketRepository(this.databaseService);
    }
    return this.ticketRepo;
  }

  /**
   * Get PaymentRepository instance
   */
  getPaymentRepository(): PaymentRepository {
    if (!this.paymentRepo) {
      this.paymentRepo = new PaymentRepository(this.databaseService);
    }
    return this.paymentRepo;
  }

  /**
   * Get database service instance
   */
  getDatabaseService(): DatabaseService {
    return this.databaseService;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static reset(): void {
    RepositoryFactory.instance = null as any;
  }
}

/**
 * Repository collection interface for dependency injection
 */
export interface IRepositories {
  vehicleRepository: VehicleRepository;
  spotRepository: SpotRepository;
  sessionRepository: SessionRepository;
<<<<<<< HEAD
  garageRepository: GarageRepository;
=======
  ticketRepository: TicketRepository;
  paymentRepository: PaymentRepository;
>>>>>>> origin/main
}

/**
 * Create a new set of repository instances with shared database service
 * @param databaseService - Optional database service instance
 * @returns Object containing all repository instances
 */
export function createRepositories(databaseService?: DatabaseService): IRepositories {
  const factory = RepositoryFactory.getInstance(databaseService);
  
  return {
<<<<<<< HEAD
    vehicleRepository: new VehicleRepository(),
    spotRepository: new SpotRepository(),
    sessionRepository: new SessionRepository(),
    garageRepository: new GarageRepository()
=======
    vehicleRepository: factory.getVehicleRepository(),
    spotRepository: factory.getSpotRepository(),
    sessionRepository: factory.getSessionRepository(),
    ticketRepository: factory.getTicketRepository(),
    paymentRepository: factory.getPaymentRepository()
>>>>>>> origin/main
  };
}

/**
 * Singleton repository instances
 */
let repositoryInstances: IRepositories | null = null;

/**
 * Get singleton repository instances
 * @returns Repository collection
 */
export function getRepositories(): IRepositories {
  if (!repositoryInstances) {
    repositoryInstances = createRepositories();
  }
  return repositoryInstances;
}

/**
 * Clear singleton instances (mainly for testing)
 */
export function clearRepositoryInstances(): void {
  repositoryInstances = null;
  RepositoryFactory.reset();
}

// Re-export types and interfaces
export type {
  CreateVehicleData,
  UpdateVehicleData,
  VehicleSearchCriteria,
  VehicleStats
} from './VehicleRepository';

export type {
  CreateSpotData,
  UpdateSpotData,
  SpotSearchCriteria,
  SpotStats
} from './SpotRepository';

export type {
  CreateSessionData,
  UpdateSessionData,
  SessionSearchCriteria,
  SessionStats
} from './SessionRepository';

export type {
  CreateTicketData,
  UpdateTicketData,
  TicketSearchCriteria,
  TicketStats
} from './TicketRepository';

export type {
  CreatePaymentData,
  UpdatePaymentData,
  PaymentSearchCriteria,
  PaymentStats
} from './PaymentRepository';
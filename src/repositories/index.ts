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

// Modern Prisma-based repositories
export { VehicleRepository } from './VehicleRepository';
export { SpotRepository } from './SpotRepository';
export { SessionRepository } from './SessionRepository';
export { TicketRepository } from './TicketRepository';
export { PaymentRepository } from './PaymentRepository';
export { UserRepository } from './UserRepository';
export { TransactionRepository } from './TransactionRepository';
export { ReservationRepository } from './ReservationRepository';

// Legacy exports for backward compatibility
export { SessionRepository as SessionsRepository } from './SessionRepository';

// Database service
export { DatabaseService } from '../services/DatabaseService';

// Repository factory for centralized initialization
import { DatabaseService } from '../services/DatabaseService';
import { VehicleRepository } from './VehicleRepository';
import { SpotRepository } from './SpotRepository';
import { SessionRepository } from './SessionRepository';
import { TicketRepository } from './TicketRepository';
import { PaymentRepository } from './PaymentRepository';
import { UserRepository } from './UserRepository';
import { TransactionRepository } from './TransactionRepository';
import { ReservationRepository } from './ReservationRepository';

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
  private userRepo?: UserRepository;
  private transactionRepo?: TransactionRepository;
  private reservationRepo?: ReservationRepository;

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
   * Get UserRepository instance
   */
  getUserRepository(): UserRepository {
    if (!this.userRepo) {
      this.userRepo = new UserRepository(this.databaseService);
    }
    return this.userRepo;
  }

  /**
   * Get TransactionRepository instance
   */
  getTransactionRepository(): TransactionRepository {
    if (!this.transactionRepo) {
      this.transactionRepo = new TransactionRepository(this.databaseService);
    }
    return this.transactionRepo;
  }

  /**
   * Get ReservationRepository instance
   */
  getReservationRepository(): ReservationRepository {
    if (!this.reservationRepo) {
      this.reservationRepo = new ReservationRepository(this.databaseService);
    }
    return this.reservationRepo;
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
  ticketRepository: TicketRepository;
  paymentRepository: PaymentRepository;
  userRepository: UserRepository;
  transactionRepository: TransactionRepository;
  reservationRepository: ReservationRepository;
}

/**
 * Create a new set of repository instances with shared database service
 * @param databaseService - Optional database service instance
 * @returns Object containing all repository instances
 */
export function createRepositories(databaseService?: DatabaseService): IRepositories {
  const factory = RepositoryFactory.getInstance(databaseService);
  
  return {
    vehicleRepository: factory.getVehicleRepository(),
    spotRepository: factory.getSpotRepository(),
    sessionRepository: factory.getSessionRepository(),
    ticketRepository: factory.getTicketRepository(),
    paymentRepository: factory.getPaymentRepository(),
    userRepository: factory.getUserRepository(),
    transactionRepository: factory.getTransactionRepository(),
    reservationRepository: factory.getReservationRepository()
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

export type {
  CreateUserData,
  UpdateUserData,
  UserSearchCriteria,
  UserStats
} from './UserRepository';

export type {
  CreateTransactionData,
  UpdateTransactionData,
  TransactionSearchCriteria,
  TransactionStats
} from './TransactionRepository';

export type {
  ReservationData,
  CreateReservationData,
  ReservationSearchCriteria,
  ReservationStats
} from './ReservationRepository';
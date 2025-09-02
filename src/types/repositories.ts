/**
 * Repository interface definitions and data access types
 *
 * These interfaces define the contracts for data access layer classes,
 * including both TypeScript repositories and JavaScript repositories
 * that will be migrated.
 */

import {
  VehicleRecord,
  SpotRecord,
  GarageRecord,
  VehicleType,
  SpotFeature,
  SpotStatus,
  VehicleStatus,
  PaginationOptions,
  FilterOptions,
  SearchCriteria,
  ServiceResponse,
} from './models';

// Base Repository Interface
export interface IBaseRepository<TEntity, TKey = string> {
  findAll(options?: PaginationOptions): TEntity[];
  findById(id: TKey): TEntity | null;
  create(data: Omit<TEntity, 'createdAt' | 'updatedAt'>): TEntity;
  update(id: TKey, updates: Partial<TEntity>): TEntity | null;
  delete(id: TKey): boolean;
  exists(id: TKey): boolean;
  count(): number;
}

// Garage Repository Interface
export interface IGarageRepository extends IBaseRepository<GarageRecord, string> {
  getDefault(): GarageRecord | null;
  findByName(name: string): GarageRecord | null;
  updateRates(
    garageId: string,
    rates: {
      compact?: number;
      standard?: number;
      oversized?: number;
    }
  ): GarageRecord | null;
  getFloorConfiguration(garageId: string): Array<{
    number: number;
    bays: number;
    spotsPerBay: number;
  }> | null;
}

// Spot Repository Interface
export interface ISpotRepository extends IBaseRepository<SpotRecord, string> {
  findAvailable(): SpotRecord[];
  findOccupied(): SpotRecord[];
  findByStatus(status: SpotStatus): SpotRecord[];
  findByFloor(floor: number): SpotRecord[];
  findByBay(floor: number, bay: number): SpotRecord[];
  findByType(type: VehicleType): SpotRecord[];
  findByFeatures(features: SpotFeature[]): SpotRecord[];
  findCompatibleSpots(vehicleType: VehicleType): SpotRecord[];
  findByFilters(filters: FilterOptions): SpotRecord[];
  occupySpot(spotId: string, licensePlate: string): SpotRecord | null;
  vacateSpot(spotId: string): SpotRecord | null;
  addFeatureToSpot(spotId: string, feature: SpotFeature): SpotRecord | null;
  removeFeatureFromSpot(spotId: string, feature: SpotFeature): SpotRecord | null;
  getOccupancyStats(): {
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  };
  getStatsByFloor(): Array<{
    floor: number;
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  }>;
  getStatsByType(): Record<
    VehicleType,
    {
      total: number;
      occupied: number;
      available: number;
      occupancyRate: number;
    }
  >;
}

// Vehicle Repository Interface
export interface IVehicleRepository extends IBaseRepository<VehicleRecord, string> {
  findByLicensePlate(licensePlate: string): VehicleRecord | null;
  findBySpotId(spotId: string): VehicleRecord | null;
  findParked(): VehicleRecord[];
  findCheckedOut(): VehicleRecord[];
  findByStatus(status: VehicleStatus): VehicleRecord[];
  findByVehicleType(type: VehicleType): VehicleRecord[];
  findByDateRange(startDate: string, endDate: string): VehicleRecord[];
  findUnpaidVehicles(): VehicleRecord[];
  searchByLicensePlate(
    query: string,
    options?: {
      exact?: boolean;
      limit?: number;
    }
  ): VehicleRecord[];
  searchByCriteria(criteria: SearchCriteria): VehicleRecord[];
  markAsPaid(licensePlate: string, amountPaid: number): VehicleRecord | null;
  checkOut(licensePlate: string, hourlyRate?: number): VehicleRecord | null;
  getTotalRevenue(dateFrom?: string, dateTo?: string): number;
  getAverageParkingDuration(): number;
  getVehicleMetrics(): {
    total: number;
    parked: number;
    checkedOut: number;
    completed: number;
    totalRevenue: number;
    averageDuration: number;
  };
}

// Session Repository Interface (for parking sessions)
export interface ISessionRepository extends IBaseRepository<any, string> {
  findActiveSessions(): any[];
  findCompletedSessions(): any[];
  findByVehicleId(vehicleId: string): any[];
  findBySpotId(spotId: string): any[];
  startSession(sessionData: any): any;
  endSession(sessionId: string, endData: any): any | null;
  extendSession(sessionId: string, newEndTime: string): any | null;
  getSessionMetrics(): {
    active: number;
    completed: number;
    averageDuration: number;
    totalRevenue: number;
  };
}

// Ticket Repository Interface (for parking tickets/receipts)
export interface ITicketRepository extends IBaseRepository<any, string> {
  findByVehicleId(vehicleId: string): any[];
  findBySessionId(sessionId: string): any[];
  findUnpaidTickets(): any[];
  generateTicket(ticketData: any): any;
  markTicketAsPaid(ticketId: string, paymentData: any): any | null;
  getTicketMetrics(): {
    total: number;
    paid: number;
    unpaid: number;
    totalAmount: number;
  };
}

// Payment Repository Interface
export interface IPaymentRepository extends IBaseRepository<any, string> {
  findByVehicleId(vehicleId: string): any[];
  findBySessionId(sessionId: string): any[];
  findByDateRange(startDate: string, endDate: string): any[];
  processPayment(paymentData: any): any;
  refundPayment(paymentId: string, reason: string): any | null;
  getPaymentMetrics(): {
    totalAmount: number;
    totalTransactions: number;
    averageAmount: number;
    refundedAmount: number;
  };
}

// Repository Factory Interface
export interface IRepositoryFactory {
  createGarageRepository(): IGarageRepository;
  createSpotRepository(): ISpotRepository;
  createVehicleRepository(): IVehicleRepository;
  createSessionRepository(): ISessionRepository;
  createTicketRepository(): ITicketRepository;
  createPaymentRepository(): IPaymentRepository;
}

// Repository Error Types
export interface RepositoryError extends Error {
  code: string;
  details?: unknown;
  repository?: string;
  operation?: string;
}

export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: RepositoryError;
  message?: string;
}

// Repository Configuration
export interface RepositoryConfig {
  enableCaching?: boolean;
  cacheTimeout?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  connectionTimeout?: number;
  retryAttempts?: number;
}

// Data Access Layer Types
export interface DataAccessOptions {
  includeDeleted?: boolean;
  useTransaction?: boolean;
  timeout?: number;
  retries?: number;
}

export interface QueryBuilder<T> {
  where(condition: Partial<T>): QueryBuilder<T>;
  orderBy(field: keyof T, direction?: 'asc' | 'desc'): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  offset(count: number): QueryBuilder<T>;
  include(relations: string[]): QueryBuilder<T>;
  execute(): Promise<T[]>;
  first(): Promise<T | null>;
  count(): Promise<number>;
}

// Transaction Types
export interface ITransactionContext {
  id: string;
  startTime: Date;
  operations: string[];
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

export interface ITransactionManager {
  begin(): Promise<ITransactionContext>;
  withTransaction<T>(operation: (context: ITransactionContext) => Promise<T>): Promise<T>;
}

// Connection Management
export interface IConnectionManager {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionInfo(): {
    host: string;
    database: string;
    connected: boolean;
    connectionTime?: Date;
  };
  testConnection(): Promise<boolean>;
}

// Data Validation Types
export interface IDataValidator<T> {
  validate(data: T): {
    isValid: boolean;
    errors: string[];
  };
  sanitize(data: T): T;
}

// Repository Metrics
export interface RepositoryMetrics {
  queriesExecuted: number;
  averageQueryTime: number;
  cacheHitRate: number;
  errorRate: number;
  lastActivity: Date;
  totalConnections: number;
}

export interface IMetricsCollector {
  recordQuery(repository: string, operation: string, duration: number): void;
  recordError(repository: string, operation: string, error: Error): void;
  recordCacheHit(repository: string, key: string): void;
  recordCacheMiss(repository: string, key: string): void;
  getMetrics(repository?: string): RepositoryMetrics;
  reset(): void;
}

// Memory Store Adapter Interface (for JavaScript memory store)
export interface IMemoryStoreAdapter<T> {
  store: Map<string, T>;
  set(key: string, value: T): void;
  get(key: string): T | null;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  keys(): string[];
  values(): T[];
  size(): number;
  forEach(callback: (value: T, key: string) => void): void;
}

// Cache Interface
export interface IRepositoryCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

/**
 * Repository modules index
 * 
 * This module provides centralized exports for all repository classes
 * in the parking garage system. It enables clean imports and 
 * consistent access to data access layer components.
 * 
 * @module Repositories
 */

// Import and export individual repository classes
import { VehicleRepository } from './VehicleRepository';
import { SpotRepository } from './SpotRepository';
import { SessionRepository } from './SessionRepository';
import { GarageRepository } from './garageRepository';

export { VehicleRepository, SpotRepository, SessionRepository, GarageRepository };


// Re-export types from models for convenience
export type { 
  VehicleData, 
  VehicleRecord, 
  VehicleSummary,
  SpotData, 
  SpotRecord,
  GarageConfig,
  GarageRecord
} from '../types/models';

/**
 * Repository collection interface for dependency injection
 */
export interface IRepositories {
  vehicleRepository: VehicleRepository;
  spotRepository: SpotRepository;
  sessionRepository: SessionRepository;
  garageRepository: GarageRepository;
}

/**
 * Create a new set of repository instances
 * @returns Object containing all repository instances
 */
export function createRepositories(): IRepositories {
  return {
    vehicleRepository: new VehicleRepository(),
    spotRepository: new SpotRepository(),
    sessionRepository: new SessionRepository(),
    garageRepository: new GarageRepository()
  };
}

/**
 * Singleton repository instances (for backward compatibility)
 * Note: Use createRepositories() for better testability
 */
let repositoryInstances: IRepositories | null = null;

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
}
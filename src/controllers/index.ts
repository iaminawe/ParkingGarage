/**
 * Controllers barrel export
 * 
 * This module provides a centralized export point for all controller classes,
 * making it easier to import controllers in other parts of the application.
 * 
 * @module Controllers
 */

export { CheckinController } from './checkinController';
export { CheckoutController } from './checkoutController';
export { GarageController } from './garageController';
export { SpotController } from './spotController';
export { StatsController } from './statsController';
export { VehicleController } from './vehicleController';

// Re-export types for convenience
export type {
  CheckInRequest,
  CheckInResponse,
  CheckOutRequest,
  CheckOutResponse,
  UpdateGarageConfigRequest,
  UpdateSpotRequest,
  SearchVehiclesRequest,
  SearchSpotsRequest,
  ApiResponse,
  PaginatedApiResponse,
  HealthCheckResponse,
  StatsResponse
} from '../types/api';
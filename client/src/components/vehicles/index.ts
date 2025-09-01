/**
 * Vehicle Management Components
 * 
 * This module exports all vehicle-related components for the parking garage management system.
 * It provides a complete suite of components for managing vehicles, their details, parking history,
 * and related operations.
 */

// Main vehicle management components
export { default as VehicleManagement } from './VehicleManagement'
export { default as VehicleList } from './VehicleList'
export { default as VehicleForm } from './VehicleForm'
export { default as VehicleDetails } from './VehicleDetails'
export { default as VehicleHistory } from './VehicleHistory'

// Named exports for convenience
export { VehicleManagement } from './VehicleManagement'
export { VehicleList } from './VehicleList'
export { VehicleForm } from './VehicleForm'
export { VehicleDetails } from './VehicleDetails'
export { VehicleHistory } from './VehicleHistory'

// Component prop types for external use
export type {
  VehicleManagement as VehicleManagementProps
} from './VehicleManagement'

// Re-export commonly used types from API
export type {
  Vehicle,
  VehicleType,
  VehicleStatus,
  VehicleWithParkingInfo,
  VehicleFilters,
  VehicleSearchParams
} from '@/types/api'
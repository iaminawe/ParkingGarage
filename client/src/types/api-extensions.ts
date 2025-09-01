// Extended API types for the frontend components
// These extend the base types from api.ts with additional fields needed by the UI

import type { ParkingGarage as BaseParkingGarage, ParkingSession as BaseParkingSession, ParkingSpot as BaseParkingSpot, Vehicle as BaseVehicle } from './api'

// Extended Vehicle interface with owner information and type
export interface Vehicle extends Omit<BaseVehicle, 'ownerId'> {
  type: 'compact' | 'standard' | 'large' | 'motorcycle' | 'electric'
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  ownerId?: string
}

// Extended ParkingSession with additional fields
export interface ParkingSession extends BaseParkingSession {
  checkInTime?: string
  checkOutTime?: string
  totalAmount?: number
}

// Extended ParkingSpot with additional fields
export interface ParkingSpot extends Omit<BaseParkingSpot, 'type'> {
  type: 'compact' | 'standard' | 'large' | 'motorcycle' | 'electric' | 'handicapped' | 'regular'
  bay: string
  hourlyRate: number
}

// Extended ParkingGarage with full location info
export interface ParkingGarage extends BaseParkingGarage {
  address: string
  city: string
  state: string
  zipCode: string
  phone?: string
  email?: string
  website?: string
  description?: string
  totalFloors: number
  spotsPerFloor: number
}

// Export SystemAnalytics type
export interface SystemAnalytics {
  totalGarages: number
  totalSpots: number
  totalOccupied: number
  totalRevenue: number
  totalSessions: number
  averageOccupancy: number
  topGarages: Array<{
    id: string
    name: string
    revenue: number
    sessions: number
  }>
}

// Re-export other types from base api.ts
export * from './api'
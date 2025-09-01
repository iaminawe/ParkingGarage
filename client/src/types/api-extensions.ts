// Extended API types for the frontend components
// Since base types now include all necessary properties, we directly re-export them
// This eliminates type conflicts and maintains consistency

// Re-export all types from base api.ts
export * from './api'

// Additional types that are specific to the frontend and don't conflict with base types

// Availability data for garage selection
export interface GarageAvailability {
  garageId: string
  garageName: string
  availableSpots: number
  totalSpots: number
  occupancyRate: number
  estimatedWalkingTime: number
  pricePerHour: number
  distance: number
}

// Rate information for pricing displays
export interface RateInfo {
  garageId: string
  baseRate: number
  peakHourRate: number
  hourlyRates: Array<{
    startHour: number
    endHour: number
    rate: number
  }>
  dailyMaxRate: number
  weeklyRate?: number
  monthlyRate?: number
}

// Check-in simulation data
export interface CheckInSimulation {
  estimatedCost: number
  recommendedSpot: {
    spotId: string
    spotNumber: string
    floor: number
    walkingDistance: number
  }
  estimatedDuration: number
  alternatives: Array<{
    spotId: string
    spotNumber: string
    floor: number
    additionalCost: number
  }>
}

// Checkout estimate data
export interface CheckOutEstimate {
  sessionId: string
  duration: number
  baseCost: number
  additionalFees: number
  totalCost: number
  paymentMethods: string[]
  discountApplied?: {
    type: string
    amount: number
    description: string
  }
}

// Legacy types for components that haven't been updated yet
export interface CheckInResult {
  success: boolean
  location: string
  rate: number
}

export interface CheckOutResult {
  success: boolean
  licensePlate: string
  timing: {
    duration: number
    entrytime: string
    exitTime: string
  }
  billing: {
    amount: number
    tax: number
    total: number
  }
}

export interface Availability {
  garageId: string
  availableSpots: number
  totalSpots: number
}

export interface Rates {
  baseRate: number
  peakRate: number
}

export interface SimulationResult {
  estimatedCost: number
  recommendedSpot: string
}

export interface EstimateData {
  baseCost: number
  additionalFees: number
  totalCost: number
}
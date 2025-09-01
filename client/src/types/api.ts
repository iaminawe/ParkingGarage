// API Response Types
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Parking Garage Domain Types
export interface ParkingGarage {
  id: string
  name: string
  location: string
  totalSpots: number
  availableSpots: number
  floors: number
  pricePerHour: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ParkingSpot {
  id: string
  garageId: string
  spotNumber: string
  floor: number
  type: 'regular' | 'handicapped' | 'electric' | 'compact'
  status: 'available' | 'occupied' | 'reserved' | 'maintenance'
  reservedBy?: string
  occupiedBy?: string
  createdAt: string
  updatedAt: string
}

export interface Vehicle {
  id: string
  licensePlate: string
  make: string
  model: string
  color: string
  type: VehicleType
  ownerId: string
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  notes?: string
  status: VehicleStatus
  createdAt: string
  updatedAt: string
}

export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'van' | 'bus'
export type VehicleStatus = 'active' | 'inactive' | 'blocked'

// Extended Vehicle with parking information
export interface VehicleWithParkingInfo extends Vehicle {
  currentSession?: ParkingSession
  totalSessions: number
  totalSpent: number
  averageDuration: number
  lastParked?: string
}

// Vehicle search and filter types
export interface VehicleFilters {
  search?: string
  type?: VehicleType
  status?: VehicleStatus
  ownerId?: string
}

export interface VehicleSearchParams extends VehicleFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'operator' | 'customer'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ParkingSession {
  id: string
  garageId: string
  spotId: string
  vehicleId: string
  userId: string
  entryTime: string
  exitTime?: string
  totalCost?: number
  status: 'active' | 'completed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'failed'
  createdAt: string
  updatedAt: string
  // Extended fields for vehicle history
  garage?: ParkingGarage
  spot?: ParkingSpot
  vehicle?: Vehicle
  duration?: number // in minutes
}

// Analytics Types
export interface GarageAnalytics {
  garageId: string
  totalSessions: number
  totalRevenue: number
  averageSessionDuration: number
  occupancyRate: number
  peakHours: { hour: number; sessions: number }[]
  dailyStats: { date: string; sessions: number; revenue: number }[]
}

// Real-time Update Types
export interface SpotUpdate {
  spotId: string
  status: ParkingSpot['status']
  timestamp: string
}

export interface GarageStatusUpdate {
  garageId: string
  availableSpots: number
  totalSpots: number
  timestamp: string
}
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
  ownerId: string
  createdAt: string
  updatedAt: string
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

export interface AnalyticsDateRange {
  startDate: string
  endDate: string
  period: 'today' | 'week' | 'month' | 'year' | 'custom'
}

export interface OccupancyTrendData {
  timestamp: string
  occupiedSpots: number
  totalSpots: number
  occupancyRate: number
  garageId?: string
}

export interface RevenueData {
  period: string
  revenue: number
  sessions: number
  averageRevenue: number
  garageId?: string
  garageName?: string
}

export interface VehicleTypeData {
  type: string
  count: number
  percentage: number
  color?: string
}

export interface DurationData {
  durationRange: string
  count: number
  percentage: number
  averageDuration: number
}

export interface PeakHoursData {
  hour: number
  dayOfWeek: number
  occupancyRate: number
  sessionCount: number
  dayName: string
}

export interface SpotUtilizationData {
  spotId: string
  spotNumber: string
  floor: number
  bay?: string
  utilizationRate: number
  totalSessions: number
  averageDuration: number
  revenue: number
  efficiency: 'low' | 'medium' | 'high'
}

export interface AnalyticsFilters {
  garageIds?: string[]
  dateRange: AnalyticsDateRange
  vehicleTypes?: string[]
  spotTypes?: string[]
  includeInactive?: boolean
}

export interface SystemAnalytics {
  totalRevenue: number
  totalSessions: number
  averageSessionDuration: number
  averageOccupancyRate: number
  totalUniqueVehicles: number
  revenueGrowth: number
  sessionGrowth: number
  topPerformingGarages: Array<{
    garageId: string
    name: string
    revenue: number
    sessions: number
    occupancyRate: number
  }>
  vehicleTypeDistribution: VehicleTypeData[]
  hourlyTrends: OccupancyTrendData[]
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
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
  address?: string
  city?: string
  state?: string
  zipCode?: string
  phone?: string
  totalSpots: number
  availableSpots: number
  floors: number
  totalFloors?: number
  spotsPerFloor?: number
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
  bay?: string
  type: 'standard' | 'compact' | 'handicap' | 'ev' | 'oversized'
  status: 'available' | 'occupied' | 'reserved' | 'maintenance'
  reservedBy?: string
  occupiedBy?: string
  features?: string[]
  dimensions?: {
    length: number
    width: number
    height?: number
  }
  priceOverride?: number
  maintenanceNotes?: string
  maintenanceSchedule?: MaintenanceSchedule[]
  usageStats?: SpotUsageStats
  currentVehicle?: {
    licensePlate: string
    checkInTime: string
    vehicleType: string
  }
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
export type SpotType = 'standard' | 'compact' | 'handicap' | 'ev' | 'oversized'
export type SpotStatus = 'available' | 'occupied' | 'reserved' | 'maintenance'
export type MaintenanceType = 'cleaning' | 'repair' | 'inspection' | 'upgrade'

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

export interface SystemAnalytics {
  totalSessions: number
  totalRevenue: number
  averageSessionDuration: number
  occupancyRate: number
  peakHours: { hour: number; sessions: number }[]
  dailyStats: { date: string; sessions: number; revenue: number }[]
  totalGarages: number
  totalSpots: number
  activeGarages: number
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
  utilizationPercentage: number
  garageId?: string
}

export interface RevenueData {
  period: string
  revenue: number
  sessions: number
  averageRevenue: number
  comparisonRevenue: number
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
  fullDisplayName: string
}

export interface AnalyticsFilters {
  garageIds?: string[]
  dateRange: AnalyticsDateRange
  vehicleTypes?: string[]
  spotTypes?: string[]
  includeInactive?: boolean
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

// Spot Management Types
export interface MaintenanceSchedule {
  id: string
  spotId: string
  type: 'cleaning' | 'repair' | 'inspection' | 'upgrade'
  scheduledDate: string
  estimatedDuration: number // in minutes
  description: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  completedDate?: string
  notes?: string
  assignedTo?: string
}

export interface SpotUsageStats {
  totalSessions: number
  totalRevenue: number
  averageSessionDuration: number // in minutes
  utilizationRate: number // percentage
  lastOccupied?: string
  dailyStats: {
    date: string
    sessions: number
    revenue: number
    duration: number
  }[]
}

export interface SpotFilters {
  search?: string
  status?: ParkingSpot['status']
  type?: ParkingSpot['type']
  floor?: number
  bay?: string
  hasFeatures?: string[]
  maintenanceStatus?: MaintenanceSchedule['status']
}

export interface SpotSearchParams extends SpotFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface BulkSpotOperation {
  spotIds: string[]
  operation: 'change-status' | 'assign-type' | 'schedule-maintenance' | 'update-features'
  params: {
    status?: ParkingSpot['status']
    type?: ParkingSpot['type']
    features?: string[]
    maintenanceType?: MaintenanceSchedule['type']
    scheduledDate?: string
    description?: string
  }
}

export interface FloorLayout {
  floor: number
  bays: {
    bay: string
    spots: ParkingSpot[]
    maxSpotsPerRow?: number
  }[]
  totalSpots: number
  availableSpots: number
}

// Garage Configuration Types
export interface GarageConfiguration {
  id: string
  garageId: string
  general: GeneralConfig
  pricing: PricingConfig
  layout: LayoutConfig
  integration: IntegrationConfig
  operational: OperationalConfig
  version: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface GeneralConfig {
  name: string
  description?: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  contact: {
    phone: string
    email: string
    website?: string
  }
  operatingHours: {
    weekdays: { open: string; close: string; is24Hours?: boolean }
    weekends: { open: string; close: string; is24Hours?: boolean }
    holidays?: { open: string; close: string; is24Hours?: boolean }
  }
  timezone: string
  business: {
    licenseNumber?: string
    taxId?: string
    insuranceNumber?: string
  }
}

export interface PricingConfig {
  defaultRates: Record<VehicleType, {
    hourly: number
    daily: number
    weekly: number
    monthly: number
  }>
  peakRates?: Record<VehicleType, {
    hourly: number
    daily: number
  }>
  peakHours: { start: string; end: string }[]
  discounts: {
    id: string
    name: string
    type: 'percentage' | 'fixed'
    value: number
    conditions: {
      minDuration?: number // in minutes
      maxDuration?: number // in minutes
      vehicleTypes?: VehicleType[]
      userTypes?: string[]
      dayOfWeek?: number[] // 0-6, 0 = Sunday
    }
    active: boolean
  }[]
  freeParking: {
    enabled: boolean
    duration: number // in minutes
    conditions?: {
      vehicleTypes?: VehicleType[]
      timeSlots?: { start: string; end: string }[]
    }
  }
  overtimeCharges: {
    enabled: boolean
    gracePeriodMinutes: number
    multiplier: number // e.g., 2.0 for double rate
  }
}

export interface LayoutConfig {
  floors: {
    number: number
    name?: string
    totalSpots: number
    spotTypes: Record<SpotType, number>
    bays: string[]
  }[]
  capacity: {
    total: number
    standard: number
    compact: number
    handicap: number
    ev: number
    oversized: number
  }
  navigation: {
    signageEnabled: boolean
    digitalDisplays: boolean
    mobileApp: boolean
  }
  accessibility: {
    handicapSpots: number
    wheelchairAccess: boolean
    elevatorsAvailable: boolean
  }
  features: {
    evChargingStations: number
    securityCameras: boolean
    lightingType: 'led' | 'fluorescent' | 'motion-sensor'
    ventilation: 'natural' | 'mechanical' | 'hvac'
  }
}

export interface IntegrationConfig {
  payments: {
    primary: {
      provider: 'stripe' | 'square' | 'paypal' | 'other'
      apiKey: string
      webhookUrl?: string
      enabled: boolean
    }
    backup?: {
      provider: 'stripe' | 'square' | 'paypal' | 'other'
      apiKey: string
      webhookUrl?: string
      enabled: boolean
    }
  }
  notifications: {
    email: {
      provider: 'sendgrid' | 'mailgun' | 'ses' | 'smtp'
      apiKey: string
      fromAddress: string
      templates: {
        checkin: string
        checkout: string
        receipt: string
        reminder: string
      }
      enabled: boolean
    }
    sms: {
      provider: 'twilio' | 'aws-sns' | 'other'
      apiKey: string
      fromNumber: string
      enabled: boolean
    }
  }
  thirdParty: {
    parkingApps: {
      name: string
      apiEndpoint: string
      apiKey: string
      enabled: boolean
    }[]
  }
  backup: {
    provider: 'aws-s3' | 'google-cloud' | 'azure' | 'local'
    configuration: Record<string, unknown>
    schedule: 'daily' | 'weekly' | 'monthly'
    retention: number // in days
    enabled: boolean
  }
  security: {
    encryption: {
      enabled: boolean
      algorithm: string
    }
    accessControl: {
      ipWhitelist: string[]
      apiRateLimit: number
    }
  }
}

export interface OperationalConfig {
  checkin: {
    requirePhoto: boolean
    requireSignature: boolean
    autoAssignment: boolean
    allowReservations: boolean
  }
  checkout: {
    autoCalculate: boolean
    requireInspection: boolean
    gracePeriodMinutes: number
    overtimeMultiplier: number
  }
  reservations: {
    enabled: boolean
    maxAdvanceDays: number
    cancellationHours: number
    noShowPenalty: number
  }
  maintenance: {
    windows: {
      start: string
      end: string
      daysOfWeek: number[]
    }[]
    autoScheduling: boolean
    notifications: boolean
  }
  staff: {
    shiftHours: {
      start: string
      end: string
      daysOfWeek: number[]
    }[]
    permissions: {
      [role: string]: string[]
    }
  }
  security: {
    cameraRecording: boolean
    accessCards: boolean
    securityGuard: boolean
    emergencyContacts: {
      name: string
      phone: string
      role: string
    }[]
  }
}

export interface ConfigurationBackup {
  id: string
  garageId: string
  configuration: GarageConfiguration
  timestamp: string
  createdBy: string
  description?: string
  size: number
}

// Authentication Types
export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'operator' | 'customer'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  role?: 'admin' | 'operator' | 'customer'
}

export interface AuthResponse {
  user: AuthUser
  token: string
  refreshToken?: string
}

export interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  signup: (credentials: SignupCredentials) => Promise<void>
  logout: () => void
  refreshAuth: () => Promise<void>
}
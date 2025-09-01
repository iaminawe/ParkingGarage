import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import type {
  ApiResponse,
  PaginatedResponse,
  ParkingGarage,
  ParkingSpot,
  Vehicle,
  User,
  ParkingSession,
  GarageAnalytics,
  SystemAnalytics,
  OccupancyTrendData,
  RevenueData,
  VehicleTypeData,
  DurationData,
  PeakHoursData,
  SpotUtilizationData,
  AnalyticsFilters,
} from '@/types/api'

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      config => {
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      error => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      error => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // Generic request methods
  private async get<T>(url: string): Promise<T> {
    const response = await this.api.get<T>(url)
    return response.data
  }

  private async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.api.post<T>(url, data)
    return response.data
  }

  private async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.api.put<T>(url, data)
    return response.data
  }

  private async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete<T>(url)
    return response.data
  }

  // Garage API methods
  async getGarages(): Promise<ApiResponse<ParkingGarage[]>> {
    return this.get<ApiResponse<ParkingGarage[]>>('/garage')
  }

  async getGarageById(id: string): Promise<ApiResponse<ParkingGarage>> {
    return this.get<ApiResponse<ParkingGarage>>(`/garage`)
  }

  async createGarage(garage: Partial<ParkingGarage>): Promise<ApiResponse<ParkingGarage>> {
    return this.post<ApiResponse<ParkingGarage>>('/garage/initialize', garage)
  }

  async updateGarage(id: string, garage: Partial<ParkingGarage>): Promise<ApiResponse<ParkingGarage>> {
    return this.put<ApiResponse<ParkingGarage>>(`/garage/config`, garage)
  }

  async deleteGarage(id: string): Promise<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`/garage/reset`)
  }

  // Spot API methods
  async getSpots(garageId?: string): Promise<ApiResponse<ParkingSpot[]>> {
    const url = garageId ? `/spots?garageId=${garageId}` : '/spots'
    return this.get<ApiResponse<ParkingSpot[]>>(url)
  }

  async getSpotById(id: string): Promise<ApiResponse<ParkingSpot>> {
    return this.get<ApiResponse<ParkingSpot>>(`/spots/${id}`)
  }

  async updateSpotStatus(id: string, status: ParkingSpot['status']): Promise<ApiResponse<ParkingSpot>> {
    return this.put<ApiResponse<ParkingSpot>>(`/spots/${id}/status`, { status })
  }

  // Vehicle API methods
  async getVehicles(params?: {
    page?: number
    limit?: number
    search?: string
    type?: string
    status?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<Vehicle>> {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value))
        }
      })
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.get<PaginatedResponse<Vehicle>>(`/vehicles${query}`)
  }

  async getVehicleById(id: string): Promise<ApiResponse<Vehicle>> {
    return this.get<ApiResponse<Vehicle>>(`/vehicles/${id}`)
  }

  async getVehicleWithStats(id: string): Promise<ApiResponse<any>> {
    return this.get<ApiResponse<any>>(`/vehicles/${id}/stats`)
  }

  async createVehicle(vehicle: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    return this.post<ApiResponse<Vehicle>>('/vehicles', vehicle)
  }

  async updateVehicle(id: string, vehicle: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    return this.put<ApiResponse<Vehicle>>(`/vehicles/${id}`, vehicle)
  }

  async deleteVehicle(id: string): Promise<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`/vehicles/${id}`)
  }

  async bulkDeleteVehicles(vehicleIds: string[]): Promise<ApiResponse<void>> {
    return this.post<ApiResponse<void>>('/vehicles/bulk-delete', { vehicleIds })
  }

  async getVehicleMetrics(): Promise<ApiResponse<{
    totalVehicles: number
    activeVehicles: number
    currentlyParked: number
    totalSessions: number
    recentlyAdded: Vehicle[]
  }>> {
    return this.get<ApiResponse<{
      totalVehicles: number
      activeVehicles: number
      currentlyParked: number
      totalSessions: number
      recentlyAdded: Vehicle[]
    }>>('/vehicles/metrics')
  }

  async exportVehicles(params?: {
    format?: 'csv' | 'json' | 'excel'
    search?: string
    type?: string
    status?: string
  }): Promise<Blob> {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value))
        }
      })
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    const response = await this.api.get(`/vehicles/export${query}`, {
      responseType: 'blob'
    })
    
    return response.data
  }

  // User API methods
  async getUsers(page = 1, limit = 10): Promise<PaginatedResponse<User>> {
    return this.get<PaginatedResponse<User>>(`/users?page=${page}&limit=${limit}`)
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    return this.get<ApiResponse<User>>(`/users/${id}`)
  }

  async updateUser(id: string, user: Partial<User>): Promise<ApiResponse<User>> {
    return this.put<ApiResponse<User>>(`/users/${id}`, user)
  }

  // Session API methods
  async getSessions(garageId?: string): Promise<ApiResponse<ParkingSession[]>> {
    const url = garageId ? `/sessions?garageId=${garageId}` : '/sessions'
    return this.get<ApiResponse<ParkingSession[]>>(url)
  }

  async getSessionById(id: string): Promise<ApiResponse<ParkingSession>> {
    return this.get<ApiResponse<ParkingSession>>(`/sessions/${id}`)
  }

  async startSession(data: {
    garageId: string
    vehicleId: string
    spotId?: string
  }): Promise<ApiResponse<ParkingSession>> {
    return this.post<ApiResponse<ParkingSession>>('/sessions/start', data)
  }

  async endSession(sessionId: string): Promise<ApiResponse<ParkingSession>> {
    return this.post<ApiResponse<ParkingSession>>(`/sessions/${sessionId}/end`)
  }

  // Analytics API methods
  async getGarageAnalytics(
    garageId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<GarageAnalytics>> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    
    return this.get<ApiResponse<GarageAnalytics>>(`/analytics/garages/${garageId}${query}`)
  }

  async getSystemAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<SystemAnalytics>> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    
    return this.get<ApiResponse<SystemAnalytics>>(`/analytics/system${query}`)
  }

  async getOccupancyTrends(
    filters: AnalyticsFilters,
    period: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<ApiResponse<OccupancyTrendData[]>> {
    const params = new URLSearchParams()
    params.append('startDate', filters.dateRange.startDate)
    params.append('endDate', filters.dateRange.endDate)
    params.append('period', period)
    
    if (filters.garageIds?.length) {
      params.append('garageIds', filters.garageIds.join(','))
    }
    
    return this.get<ApiResponse<OccupancyTrendData[]>>(`/analytics/occupancy-trends?${params.toString()}`)
  }

  async getRevenueData(
    filters: AnalyticsFilters,
    groupBy: 'day' | 'week' | 'month' | 'garage' = 'day'
  ): Promise<ApiResponse<RevenueData[]>> {
    const params = new URLSearchParams()
    params.append('startDate', filters.dateRange.startDate)
    params.append('endDate', filters.dateRange.endDate)
    params.append('groupBy', groupBy)
    
    if (filters.garageIds?.length) {
      params.append('garageIds', filters.garageIds.join(','))
    }
    
    return this.get<ApiResponse<RevenueData[]>>(`/analytics/revenue?${params.toString()}`)
  }

  async getVehicleTypeDistribution(
    filters: AnalyticsFilters
  ): Promise<ApiResponse<VehicleTypeData[]>> {
    const params = new URLSearchParams()
    params.append('startDate', filters.dateRange.startDate)
    params.append('endDate', filters.dateRange.endDate)
    
    if (filters.garageIds?.length) {
      params.append('garageIds', filters.garageIds.join(','))
    }
    
    return this.get<ApiResponse<VehicleTypeData[]>>(`/analytics/vehicle-types?${params.toString()}`)
  }

  async getDurationDistribution(
    filters: AnalyticsFilters
  ): Promise<ApiResponse<DurationData[]>> {
    const params = new URLSearchParams()
    params.append('startDate', filters.dateRange.startDate)
    params.append('endDate', filters.dateRange.endDate)
    
    if (filters.garageIds?.length) {
      params.append('garageIds', filters.garageIds.join(','))
    }
    
    return this.get<ApiResponse<DurationData[]>>(`/analytics/durations?${params.toString()}`)
  }

  async getPeakHoursData(
    filters: AnalyticsFilters
  ): Promise<ApiResponse<PeakHoursData[]>> {
    const params = new URLSearchParams()
    params.append('startDate', filters.dateRange.startDate)
    params.append('endDate', filters.dateRange.endDate)
    
    if (filters.garageIds?.length) {
      params.append('garageIds', filters.garageIds.join(','))
    }
    
    return this.get<ApiResponse<PeakHoursData[]>>(`/analytics/peak-hours?${params.toString()}`)
  }

  async getSpotUtilization(
    filters: AnalyticsFilters
  ): Promise<ApiResponse<SpotUtilizationData[]>> {
    const params = new URLSearchParams()
    params.append('startDate', filters.dateRange.startDate)
    params.append('endDate', filters.dateRange.endDate)
    
    if (filters.garageIds?.length) {
      params.append('garageIds', filters.garageIds.join(','))
    }
    
    if (filters.spotTypes?.length) {
      params.append('spotTypes', filters.spotTypes.join(','))
    }
    
    return this.get<ApiResponse<SpotUtilizationData[]>>(`/analytics/spot-utilization?${params.toString()}`)
  }

  async exportAnalyticsReport(
    filters: AnalyticsFilters,
    format: 'csv' | 'pdf' | 'excel' = 'csv'
  ): Promise<Blob> {
    const params = new URLSearchParams()
    params.append('startDate', filters.dateRange.startDate)
    params.append('endDate', filters.dateRange.endDate)
    params.append('format', format)
    
    if (filters.garageIds?.length) {
      params.append('garageIds', filters.garageIds.join(','))
    }
    
    const response = await this.api.get(`/analytics/export?${params.toString()}`, {
      responseType: 'blob'
    })
    
    return response.data
  }

  // Search API methods
  async searchVehicles(query: string): Promise<ApiResponse<Vehicle[]>> {
    return this.get<ApiResponse<Vehicle[]>>(`/search/vehicles?q=${encodeURIComponent(query)}`)
  }

  async searchSessions(query: string): Promise<ApiResponse<ParkingSession[]>> {
    return this.get<ApiResponse<ParkingSession[]>>(`/search/sessions?q=${encodeURIComponent(query)}`)
  }

  // Vehicle sessions API methods
  async getVehicleSessions(
    vehicleId: string, 
    params?: {
      page?: number
      limit?: number
      status?: string
      startDate?: string
      endDate?: string
    }
  ): Promise<PaginatedResponse<ParkingSession>> {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value))
        }
      })
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.get<PaginatedResponse<ParkingSession>>(`/vehicles/${vehicleId}/sessions${query}`)
  }

  async exportVehicleSessions(
    vehicleId: string,
    params?: {
      format?: 'csv' | 'json' | 'excel'
      status?: string
      startDate?: string
      endDate?: string
    }
  ): Promise<Blob> {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value))
        }
      })
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    const response = await this.api.get(`/vehicles/${vehicleId}/sessions/export${query}`, {
      responseType: 'blob'
    })
    
    return response.data
  }

  // Check-in/Check-out API methods
  async getAvailability(garageId: string): Promise<ApiResponse<{
    overall: {
      total: number
      available: number
      occupied: number
      occupancyRate: number
    }
    byVehicleType: {
      compact: { available: number; total: number }
      standard: { available: number; total: number }
      oversized: { available: number; total: number }
    }
  }>> {
    return this.get<ApiResponse<any>>(`/checkin/availability`)
  }

  async getRates(garageId: string): Promise<ApiResponse<{
    standard: number
    compact: number
    oversized: number
    ev_charging: number
  }>> {
    return this.get<ApiResponse<any>>(`/garage/rates`)
  }

  async simulateCheckIn(data: {
    licensePlate: string
    vehicleType: 'compact' | 'standard' | 'oversized'
  }): Promise<ApiResponse<{
    success: boolean
    wouldAssignSpot?: string
    spotLocation?: {
      floor: number
      bay: string
      spotNumber: number
    }
    rate?: number
  }>> {
    return this.post<ApiResponse<any>>('/parking/simulate-checkin', data)
  }

  async checkIn(data: {
    licensePlate: string
    vehicleType: 'compact' | 'standard' | 'oversized'
  }): Promise<ApiResponse<{
    success: boolean
    spotId: string
    location: {
      floor: number
      bay: string
      spotNumber: number
    }
    checkInTime: string
    rate: number
  }>> {
    return this.post<ApiResponse<any>>('/parking/checkin', data)
  }

  async getCheckoutEstimate(sessionId: string): Promise<ApiResponse<{
    sessionId: string
    estimate: {
      checkInTime: string
      currentTime: string
      duration: string
      durationMinutes: number
      rate: number
      estimatedCost: number
      spotId: string
      location: {
        floor: number
        bay: string
        spotNumber: number
      }
    }
  }>> {
    return this.get<ApiResponse<any>>(`/sessions/${sessionId}/checkout-estimate`)
  }

  async checkOut(sessionId: string): Promise<ApiResponse<{
    success: boolean
    sessionId: string
    spotId: string
    timing: {
      checkInTime: string
      checkOutTime: string
      duration: string
      durationMinutes: number
    }
    billing: {
      rate: number
      totalCost: number
      gracePeriodApplied: boolean
    }
  }>> {
    return this.post<ApiResponse<any>>(`/sessions/${sessionId}/checkout`)
  }

  // Legacy license plate-based methods for backward compatibility
  async getCheckoutEstimateByLicensePlate(licensePlate: string): Promise<ApiResponse<{
    licensePlate: string
    estimate: {
      checkInTime: string
      currentTime: string
      duration: string
      durationMinutes: number
      rate: number
      estimatedCost: number
      spotId: string
      location: {
        floor: number
        bay: string
        spotNumber: number
      }
    }
  }>> {
    return this.get<ApiResponse<any>>(`/parking/checkout-estimate/${encodeURIComponent(licensePlate)}`)
  }

  async checkOutByLicensePlate(data: {
    licensePlate: string
    applyGracePeriod?: boolean
  }): Promise<ApiResponse<{
    success: boolean
    licensePlate: string
    spotId: string
    timing: {
      checkInTime: string
      checkOutTime: string
      duration: string
      durationMinutes: number
    }
    billing: {
      rate: number
      totalCost: number
      gracePeriodApplied: boolean
    }
  }>> {
    return this.post<ApiResponse<any>>('/parking/checkout', data)
  }
}

export const apiService = new ApiService()
export default apiService
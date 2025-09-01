import axios, { AxiosInstance, AxiosResponse } from 'axios'
import type {
  ApiResponse,
  PaginatedResponse,
  ParkingGarage,
  ParkingSpot,
  Vehicle,
  User,
  ParkingSession,
  GarageAnalytics,
} from '@/types/api'

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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

  private async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.post<T>(url, data)
    return response.data
  }

  private async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.put<T>(url, data)
    return response.data
  }

  private async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete<T>(url)
    return response.data
  }

  // Garage API methods
  async getGarages(): Promise<ApiResponse<ParkingGarage[]>> {
    return this.get<ApiResponse<ParkingGarage[]>>('/garages')
  }

  async getGarageById(id: string): Promise<ApiResponse<ParkingGarage>> {
    return this.get<ApiResponse<ParkingGarage>>(`/garages/${id}`)
  }

  async createGarage(garage: Partial<ParkingGarage>): Promise<ApiResponse<ParkingGarage>> {
    return this.post<ApiResponse<ParkingGarage>>('/garages', garage)
  }

  async updateGarage(id: string, garage: Partial<ParkingGarage>): Promise<ApiResponse<ParkingGarage>> {
    return this.put<ApiResponse<ParkingGarage>>(`/garages/${id}`, garage)
  }

  async deleteGarage(id: string): Promise<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`/garages/${id}`)
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
  async getVehicles(): Promise<ApiResponse<Vehicle[]>> {
    return this.get<ApiResponse<Vehicle[]>>('/vehicles')
  }

  async getVehicleById(id: string): Promise<ApiResponse<Vehicle>> {
    return this.get<ApiResponse<Vehicle>>(`/vehicles/${id}`)
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
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    
    return this.get<ApiResponse<any>>(`/analytics/system${query}`)
  }

  // Search API methods
  async searchVehicles(query: string): Promise<ApiResponse<Vehicle[]>> {
    return this.get<ApiResponse<Vehicle[]>>(`/search/vehicles?q=${encodeURIComponent(query)}`)
  }

  async searchSessions(query: string): Promise<ApiResponse<ParkingSession[]>> {
    return this.get<ApiResponse<ParkingSession[]>>(`/search/sessions?q=${encodeURIComponent(query)}`)
  }
}

export const apiService = new ApiService()
export default apiService
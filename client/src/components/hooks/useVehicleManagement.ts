import { useState, useEffect, useCallback } from 'react'
import { apiService } from '@/services/api'
import { exportVehicleData, VehicleExportData } from '@/utils/export'
import { formatCurrency, formatDuration } from '@/utils/formatting'
import type { 
  VehicleWithParkingInfo, 
  VehicleFilters, 
  PaginatedResponse,
  Vehicle 
} from '@/types/api'

interface VehicleMetrics {
  totalVehicles: number
  activeVehicles: number
  currentlyParked: number
  totalSessions: number
  recentlyAdded: Vehicle[]
}

interface UseVehicleManagementReturn {
  // Data
  vehicles: VehicleWithParkingInfo[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  metrics: VehicleMetrics | null

  // Actions
  createVehicle: (vehicle: Partial<Vehicle>) => Promise<void>
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<void>
  deleteVehicle: (id: string) => Promise<void>
  bulkDeleteVehicles: (ids: string[]) => Promise<void>
  searchVehicles: (query: string) => Promise<void>
  exportVehicles: (filters?: VehicleFilters) => Promise<void>
  refreshVehicles: () => Promise<void>
  setPage: (page: number) => void
  setPageSize: (limit: number) => void
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void
}

export const useVehicleManagement = (
  filters: VehicleFilters = {}
): UseVehicleManagementReturn => {
  const [vehicles, setVehicles] = useState<VehicleWithParkingInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<VehicleMetrics | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Load vehicles with current filters and pagination
  const loadVehicles = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true)
    setError(null)

    try {
      const response = await apiService.getVehicles({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        type: filters.type,
        status: filters.status,
        sortBy,
        sortOrder
      })

      if (response.success) {
        // Transform vehicles to include parking info
        const vehiclesWithInfo: VehicleWithParkingInfo[] = response.data.map(vehicle => ({
          ...vehicle,
          totalSessions: 0,
          totalSpent: 0,
          averageDuration: 0,
          currentSession: undefined,
          lastParked: undefined
        }))

        setVehicles(vehiclesWithInfo)
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages
        }))
      } else {
        throw new Error(response.message || 'Failed to load vehicles')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load vehicles'
      setError(errorMessage)
      console.error('Error loading vehicles:', err)
    } finally {
      if (showLoader) setLoading(false)
    }
  }, [filters, pagination.page, pagination.limit, sortBy, sortOrder])

  // Load metrics
  const loadMetrics = useCallback(async () => {
    try {
      const response = await apiService.getVehicleMetrics()
      if (response.success) {
        setMetrics(response.data)
      }
    } catch (err) {
      console.error('Error loading vehicle metrics:', err)
    }
  }, [])

  // Load vehicles when filters or pagination change
  useEffect(() => {
    loadVehicles()
  }, [loadVehicles])

  // Load metrics on mount
  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  // Create vehicle
  const createVehicle = useCallback(async (vehicleData: Partial<Vehicle>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiService.createVehicle(vehicleData)
      if (response.success) {
        await loadVehicles(false)
        await loadMetrics()
      } else {
        throw new Error(response.message || 'Failed to create vehicle')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create vehicle'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [loadVehicles, loadMetrics])

  // Update vehicle
  const updateVehicle = useCallback(async (id: string, vehicleData: Partial<Vehicle>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiService.updateVehicle(id, vehicleData)
      if (response.success) {
        await loadVehicles(false)
        await loadMetrics()
      } else {
        throw new Error(response.message || 'Failed to update vehicle')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update vehicle'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [loadVehicles, loadMetrics])

  // Delete vehicle
  const deleteVehicle = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiService.deleteVehicle(id)
      if (response.success) {
        await loadVehicles(false)
        await loadMetrics()
      } else {
        throw new Error(response.message || 'Failed to delete vehicle')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete vehicle'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [loadVehicles, loadMetrics])

  // Bulk delete vehicles
  const bulkDeleteVehicles = useCallback(async (ids: string[]) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiService.bulkDeleteVehicles(ids)
      if (response.success) {
        await loadVehicles(false)
        await loadMetrics()
      } else {
        throw new Error(response.message || 'Failed to delete vehicles')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete vehicles'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [loadVehicles, loadMetrics])

  // Search vehicles
  const searchVehicles = useCallback(async (query: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiService.searchVehicles(query)
      if (response.success) {
        const vehiclesWithInfo: VehicleWithParkingInfo[] = response.data.map(vehicle => ({
          ...vehicle,
          totalSessions: 0,
          totalSpent: 0,
          averageDuration: 0,
          currentSession: undefined,
          lastParked: undefined
        }))
        
        setVehicles(vehiclesWithInfo)
        // Reset pagination for search results
        setPagination(prev => ({
          ...prev,
          total: vehiclesWithInfo.length,
          totalPages: 1,
          page: 1
        }))
      } else {
        throw new Error(response.message || 'Failed to search vehicles')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search vehicles'
      setError(errorMessage)
      console.error('Error searching vehicles:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Export vehicles
  const exportVehicles = useCallback(async (exportFilters: VehicleFilters = {}) => {
    setError(null)

    try {
      const exportData: VehicleExportData[] = vehicles.map(vehicle => ({
        licensePlate: vehicle.licensePlate,
        type: vehicle.type,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        ownerName: vehicle.ownerName,
        ownerEmail: vehicle.ownerEmail,
        ownerPhone: vehicle.ownerPhone,
        status: vehicle.status,
        totalSessions: vehicle.totalSessions,
        totalSpent: vehicle.totalSpent,
        averageDuration: vehicle.averageDuration,
        lastParked: vehicle.lastParked,
        createdAt: vehicle.createdAt
      }))

      exportVehicleData(exportData, 'csv')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export vehicles'
      setError(errorMessage)
      throw err
    }
  }, [vehicles])

  // Refresh vehicles
  const refreshVehicles = useCallback(async () => {
    await loadVehicles()
    await loadMetrics()
  }, [loadVehicles, loadMetrics])

  // Set page
  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  // Set page size
  const setPageSize = useCallback((limit: number) => {
    setPagination(prev => ({ 
      ...prev, 
      limit, 
      page: 1, // Reset to first page
      totalPages: Math.ceil(prev.total / limit)
    }))
  }, [])

  // Set sorting
  const setSorting = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
  }, [])

  return {
    // Data
    vehicles,
    loading,
    error,
    pagination,
    metrics,

    // Actions
    createVehicle,
    updateVehicle,
    deleteVehicle,
    bulkDeleteVehicles,
    searchVehicles,
    exportVehicles,
    refreshVehicles,
    setPage,
    setPageSize,
    setSorting: setSorting,
  }
}
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/loading'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { SpotTile } from './SpotTile'
import { SpotDetailsDialog } from './SpotDetailsDialog'
import { StatusLegend } from './StatusLegend'
import { cn } from '@/utils/cn'
import type { ParkingSpot, SpotUpdate } from '@/types/api'
import { apiService } from '@/services/api'
import { socketService } from '@/services/socket'
import {
  Search,
  RefreshCw,
  Grid3X3,
  List,
  Building2,
  TrendingUp,
  Eye,
  EyeOff,
} from 'lucide-react'

interface ParkingGridProps {
  garageId?: string
  className?: string
  showControls?: boolean
  showLegend?: boolean
  defaultFloor?: number
}

interface FilterState {
  status: ParkingSpot['status'] | 'all'
  type: ParkingSpot['type'] | 'all'
  features: string[]
  searchQuery: string
}

interface GridStats {
  total: number
  available: number
  occupied: number
  reserved: number
  maintenance: number
  occupancyRate: number
}

const GRID_VIEW_OPTIONS = [
  { value: 'grid', label: 'Grid View', icon: Grid3X3 },
  { value: 'list', label: 'List View', icon: List },
] as const

const SPOT_STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'maintenance', label: 'Maintenance' },
] as const

const SPOT_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'standard', label: 'Standard' },
  { value: 'compact', label: 'Compact' },
  { value: 'oversized', label: 'Oversized' },
  { value: 'ev', label: 'EV Charging' },
] as const

export const ParkingGrid: React.FC<ParkingGridProps> = ({
  garageId,
  className,
  showControls = true,
  showLegend = true,
  defaultFloor = 1,
}) => {
  // State
  const [spots, setSpots] = useState<ParkingSpot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeFloor, setActiveFloor] = useState(defaultFloor)
  const [showLegendPanel, setShowLegendPanel] = useState(showLegend)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    type: 'all',
    features: [],
    searchQuery: '',
  })

  // Load spots data
  const loadSpots = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.getSpots(garageId)
      if (response.success) {
        setSpots(response.data)
      } else {
        setError('Failed to load parking spots')
      }
    } catch (err) {
      setError('Error loading parking spots')
      console.error('Error loading spots:', err)
    } finally {
      setLoading(false)
    }
  }, [garageId])

  // Initial load
  useEffect(() => {
    loadSpots()
  }, [loadSpots])

  // WebSocket integration
  useEffect(() => {
    if (!garageId) return

    socketService.connect()
    socketService.joinGarage(garageId)

    const handleSpotUpdate = (update: SpotUpdate) => {
      setSpots(prev => 
        prev.map(spot => 
          spot.id === update.spotId 
            ? { ...spot, ...update }
            : spot
        )
      )
    }

    socketService.onSpotUpdate(handleSpotUpdate)

    return () => {
      socketService.leaveGarage(garageId)
      socketService.off('spot:updated', handleSpotUpdate)
    }
  }, [garageId])

  // Computed data
  const floors = useMemo(() => {
    const floorSet = new Set(spots.map(spot => spot.floor))
    return Array.from(floorSet).sort((a, b) => a - b)
  }, [spots])

  const filteredSpots = useMemo(() => {
    let filtered = spots

    // Filter by floor
    filtered = filtered.filter(spot => spot.floor === activeFloor)

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(spot => spot.status === filters.status)
    }

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(spot => spot.type === filters.type)
    }

    // Filter by features
    if (filters.features.length > 0) {
      filtered = filtered.filter(spot => 
        filters.features.some(feature => spot.features?.includes(feature))
      )
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(spot => 
        spot.bay?.toLowerCase().includes(query) ||
        spot.spotNumber?.toString().includes(query) ||
        spot.id.toLowerCase().includes(query) ||
        spot.currentVehicle?.licensePlate.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [spots, activeFloor, filters])

  const groupedSpots = useMemo(() => {
    const groups: { [bay: string]: ParkingSpot[] } = {}
    filteredSpots.forEach(spot => {
      const bayKey = spot.bay || 'Unknown'
      if (!groups[bayKey]) {
        groups[bayKey] = []
      }
      groups[bayKey].push(spot)
    })
    
    // Sort spots within each bay by spot number
    Object.keys(groups).forEach(bay => {
      groups[bay].sort((a, b) => Number(a.spotNumber || 0) - Number(b.spotNumber || 0))
    })

    return groups
  }, [filteredSpots])

  const stats: GridStats = useMemo(() => {
    const floorSpots = spots.filter(spot => spot.floor === activeFloor)
    const total = floorSpots.length
    const available = floorSpots.filter(spot => spot.status === 'available').length
    const occupied = floorSpots.filter(spot => spot.status === 'occupied').length
    const reserved = floorSpots.filter(spot => spot.status === 'reserved').length
    const maintenance = floorSpots.filter(spot => spot.status === 'maintenance').length
    const occupancyRate = total > 0 ? ((occupied + reserved) / total) * 100 : 0

    return { total, available, occupied, reserved, maintenance, occupancyRate }
  }, [spots, activeFloor])

  // Event handlers
  const handleSpotClick = (spot: ParkingSpot) => {
    setSelectedSpot(spot)
    setDialogOpen(true)
  }

  const handleStatusUpdate = async (spotId: string, status: ParkingSpot['status']) => {
    try {
      setUpdating(true)
      const response = await apiService.updateSpotStatus(spotId, status)
      if (response.success) {
        setSpots(prev => 
          prev.map(spot => 
            spot.id === spotId 
              ? { ...spot, status, updatedAt: new Date().toISOString() }
              : spot
          )
        )
      }
    } catch (err) {
      console.error('Error updating spot status:', err)
    } finally {
      setUpdating(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadSpots()
    setIsRefreshing(false)
  }

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      status: 'all',
      type: 'all',
      features: [],
      searchQuery: '',
    })
  }

  const hasActiveFilters = 
    filters.status !== 'all' || 
    filters.type !== 'all' || 
    filters.features.length > 0 || 
    filters.searchQuery

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadSpots}>Try Again</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-lg font-semibold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Spots</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{stats.available}</div>
              <div className="text-xs text-muted-foreground">Available</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">{stats.occupied}</div>
              <div className="text-xs text-muted-foreground">Occupied</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600">{stats.reserved}</div>
              <div className="text-xs text-muted-foreground">Reserved</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-lg font-semibold flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {Math.round(stats.occupancyRate)}%
              </div>
              <div className="text-xs text-muted-foreground">Occupancy</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      {showControls && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search spots, bays, license plates..."
                    value={filters.searchQuery}
                    onChange={(e) => updateFilter('searchQuery', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                  Refresh
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLegendPanel(!showLegendPanel)}
                  className="flex items-center gap-2"
                >
                  {showLegendPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  Legend
                </Button>

                {/* View Mode Toggle */}
                <Select value={viewMode} onValueChange={(value: 'grid' | 'list') => setViewMode(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRID_VIEW_OPTIONS.map(option => {
                      const Icon = option.icon
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={filters.status} onValueChange={(value: ParkingSpot['status'] | 'all') => updateFilter('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {SPOT_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.type} onValueChange={(value: ParkingSpot['type'] | 'all') => updateFilter('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {SPOT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear Filters
                  </Button>
                )}
                <Badge variant="secondary" className="ml-auto">
                  {filteredSpots.length} spot{filteredSpots.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Parking Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Parking Floor {activeFloor}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Floor Tabs */}
              {floors.length > 1 && (
                <Tabs
                  value={activeFloor.toString()}
                  onValueChange={(value) => setActiveFloor(parseInt(value))}
                  className="mb-6"
                >
                  <TabsList>
                    {floors.map(floor => (
                      <TabsTrigger key={floor} value={floor.toString()}>
                        Floor {floor}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}

              {/* Spots Grid/List */}
              {viewMode === 'grid' ? (
                <div className="space-y-6">
                  {Object.entries(groupedSpots)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([bay, baySpots]) => (
                    <div key={bay} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">Bay {bay}</h4>
                        <Badge variant="outline" className="text-xs">
                          {baySpots.length} spot{baySpots.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-20 gap-2">
                        {baySpots.map(spot => (
                          <SpotTile
                            key={spot.id}
                            spot={spot}
                            onClick={handleSpotClick}
                            className=""
                            size="sm"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSpots.map(spot => (
                    <Card
                      key={spot.id}
                      className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleSpotClick(spot)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <SpotTile spot={spot} onClick={() => {}} className="" size="sm" />
                          <div>
                            <div className="font-medium text-sm">
                              Bay {spot.bay} - Spot {spot.spotNumber}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {spot.type.charAt(0).toUpperCase() + spot.type.slice(1)}
                              {spot.features && spot.features.length > 0 && 
                                ` • ${spot.features.join(', ')}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={
                              spot.status === 'available' ? 'success' :
                              spot.status === 'occupied' ? 'destructive' :
                              spot.status === 'reserved' ? 'warning' :
                              'secondary'
                            }
                          >
                            {spot.status.charAt(0).toUpperCase() + spot.status.slice(1)}
                          </Badge>
                          {spot.currentVehicle && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {spot.currentVehicle.licensePlate}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {filteredSpots.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No parking spots found matching your criteria</p>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
                      Clear filters to see all spots
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Legend Panel */}
        {showLegendPanel && (
          <div className="lg:col-span-1">
            <StatusLegend className="" />
          </div>
        )}
      </div>

      {/* Spot Details Dialog */}
      <SpotDetailsDialog
        spot={selectedSpot}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdateStatus={handleStatusUpdate}
        isUpdating={updating}
      />
    </div>
  )
}

export default ParkingGrid
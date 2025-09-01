import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SpotGrid } from './SpotGrid'
import { SpotList } from './SpotList'
import { SpotForm } from './SpotForm'
import { SpotDetails } from './SpotDetails'
import { MaintenanceScheduler } from './MaintenanceScheduler'
import { 
  Grid, 
  List, 
  Plus, 
  Filter, 
  Search, 
  MoreVertical,
  RefreshCw,
  Settings,
  Wrench,
  AlertTriangle
} from 'lucide-react'
import type { 
  ParkingSpot, 
  SpotFilters, 
  BulkSpotOperation, 
  FloorLayout,
  SpotType,
  SpotStatus
} from '@/types/api'

interface SpotManagementProps {
  garageId: string
}

export const SpotManagement: React.FC<SpotManagementProps> = ({ garageId }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [spots, setSpots] = useState<ParkingSpot[]>([])
  const [floorLayouts, setFloorLayouts] = useState<FloorLayout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSpots, setSelectedSpots] = useState<string[]>([])
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null)
  const [showSpotForm, setShowSpotForm] = useState(false)
  const [showSpotDetails, setShowSpotDetails] = useState(false)
  const [showMaintenanceScheduler, setShowMaintenanceScheduler] = useState(false)
  const [activeView, setActiveView] = useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = useState<SpotFilters>({})
  const [refreshing, setRefreshing] = useState(false)

  // Initialize view from URL params
  useEffect(() => {
    const view = searchParams.get('view') as 'grid' | 'list'
    if (view) setActiveView(view)
    
    // Initialize filters from URL
    const urlFilters: SpotFilters = {}
    if (searchParams.get('search')) urlFilters.search = searchParams.get('search')!
    if (searchParams.get('status')) urlFilters.status = searchParams.get('status') as SpotStatus
    if (searchParams.get('type')) urlFilters.type = searchParams.get('type') as SpotType
    if (searchParams.get('floor')) urlFilters.floor = parseInt(searchParams.get('floor')!)
    setFilters(urlFilters)
  }, [searchParams])

  // Update URL when view or filters change
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('view', activeView)
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    if (filters.type) params.set('type', filters.type)
    if (filters.floor) params.set('floor', filters.floor.toString())
    setSearchParams(params)
  }, [activeView, filters, setSearchParams])

  // Load spots data
  const loadSpots = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockSpots: ParkingSpot[] = Array.from({ length: 50 }, (_, i) => ({
        id: `spot-${i + 1}`,
        garageId,
        spotNumber: `${i + 1}`,
        floor: Math.floor(i / 20) + 1,
        bay: String.fromCharCode(65 + Math.floor((i % 20) / 5)),
        type: ['standard', 'compact', 'handicap', 'ev', 'oversized'][i % 5] as SpotType,
        status: ['available', 'occupied', 'reserved', 'maintenance'][i % 4] as SpotStatus,
        features: i % 3 === 0 ? ['ev_charging'] : i % 7 === 0 ? ['handicap', 'wide'] : [],
        dimensions: { length: 18, width: 9, height: 8 },
        priceOverride: i % 10 === 0 ? 15.0 : undefined,
        maintenanceNotes: i % 4 === 3 ? 'Scheduled cleaning' : undefined,
        usageStats: {
          totalSessions: Math.floor(Math.random() * 100),
          totalRevenue: Math.floor(Math.random() * 1000),
          averageSessionDuration: Math.floor(Math.random() * 180) + 30,
          utilizationRate: Math.floor(Math.random() * 100),
          dailyStats: []
        },
        currentVehicle: i % 4 === 1 ? {
          licensePlate: `ABC-${1000 + i}`,
          checkInTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          vehicleType: 'car'
        } : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

      setSpots(mockSpots)
      generateFloorLayouts(mockSpots)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spots')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const generateFloorLayouts = (spots: ParkingSpot[]) => {
    const floorGroups = spots.reduce((acc, spot) => {
      if (!acc[spot.floor]) acc[spot.floor] = []
      acc[spot.floor].push(spot)
      return acc
    }, {} as Record<number, ParkingSpot[]>)

    const layouts: FloorLayout[] = Object.entries(floorGroups).map(([floor, floorSpots]) => {
      const bayGroups = floorSpots.reduce((acc, spot) => {
        const bay = spot.bay || 'A'
        if (!acc[bay]) acc[bay] = []
        acc[bay].push(spot)
        return acc
      }, {} as Record<string, ParkingSpot[]>)

      const bays = Object.entries(bayGroups).map(([bay, baySpots]) => ({
        bay,
        spots: baySpots.sort((a, b) => parseInt(a.spotNumber) - parseInt(b.spotNumber)),
        maxSpotsPerRow: 5
      }))

      return {
        floor: parseInt(floor),
        bays: bays.sort((a, b) => a.bay.localeCompare(b.bay)),
        totalSpots: floorSpots.length,
        availableSpots: floorSpots.filter(s => s.status === 'available').length
      }
    })

    setFloorLayouts(layouts.sort((a, b) => a.floor - b.floor))
  }

  // Filter spots based on current filters
  const filteredSpots = useMemo(() => {
    return spots.filter(spot => {
      if (filters.search) {
        const search = filters.search.toLowerCase()
        if (!spot.spotNumber.toLowerCase().includes(search) &&
            !spot.bay?.toLowerCase().includes(search) &&
            !spot.id.toLowerCase().includes(search)) {
          return false
        }
      }
      if (filters.status && spot.status !== filters.status) return false
      if (filters.type && spot.type !== filters.type) return false
      if (filters.floor && spot.floor !== filters.floor) return false
      if (filters.bay && spot.bay !== filters.bay) return false
      return true
    })
  }, [spots, filters])

  // Statistics
  const stats = useMemo(() => ({
    total: spots.length,
    available: spots.filter(s => s.status === 'available').length,
    occupied: spots.filter(s => s.status === 'occupied').length,
    reserved: spots.filter(s => s.status === 'reserved').length,
    maintenance: spots.filter(s => s.status === 'maintenance').length,
    selected: selectedSpots.length
  }), [spots, selectedSpots])

  useEffect(() => {
    loadSpots()
  }, [garageId])

  const handleSpotClick = (spot: ParkingSpot) => {
    setSelectedSpot(spot)
    setShowSpotDetails(true)
  }

  const handleSpotEdit = (spot: ParkingSpot) => {
    setSelectedSpot(spot)
    setShowSpotForm(true)
  }

  const handleSpotSelect = (spotIds: string[]) => {
    setSelectedSpots(spotIds)
  }

  const handleBulkOperation = async (operation: BulkSpotOperation) => {
    try {
      setLoading(true)
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      await loadSpots()
      setSelectedSpots([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk operation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof SpotFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const floors = [...new Set(spots.map(s => s.floor))].sort((a, b) => a - b)
  const bays = [...new Set(spots.map(s => s.bay).filter(Boolean))].sort()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Spot Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage parking spots, statuses, and maintenance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => loadSpots(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowMaintenanceScheduler(true)}>
            <Wrench className="h-4 w-4 mr-2" />
            Maintenance
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowSpotForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Spot
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spots</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-red-600">{stats.occupied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-yellow-600">{stats.reserved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-600">{stats.maintenance}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600">{stats.selected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search spots..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filters.status || ''} onValueChange={(value) => handleFilterChange('status', value || undefined)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.type || ''} onValueChange={(value) => handleFilterChange('type', value || undefined)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="handicap">Handicap</SelectItem>
              <SelectItem value="ev">EV Charging</SelectItem>
              <SelectItem value="oversized">Oversized</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.floor?.toString() || ''} onValueChange={(value) => handleFilterChange('floor', value ? parseInt(value) : undefined)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Floors</SelectItem>
              {floors.map(floor => (
                <SelectItem key={floor} value={floor.toString()}>Floor {floor}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {Object.keys(filters).length > 0 && (
            <Button variant="ghost" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedSpots.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedSpots.length} selected</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem 
                  onClick={() => handleBulkOperation({
                    spotIds: selectedSpots,
                    operation: 'change-status',
                    params: { status: 'available' }
                  })}
                >
                  Mark Available
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleBulkOperation({
                    spotIds: selectedSpots,
                    operation: 'change-status',
                    params: { status: 'maintenance' }
                  })}
                >
                  Mark Maintenance
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleBulkOperation({
                    spotIds: selectedSpots,
                    operation: 'schedule-maintenance',
                    params: { 
                      maintenanceType: 'cleaning',
                      scheduledDate: new Date().toISOString(),
                      description: 'Scheduled cleaning'
                    }
                  })}
                >
                  Schedule Maintenance
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex items-center">
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'grid' | 'list')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="grid" className="flex items-center gap-2">
                <Grid className="h-4 w-4" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content */}
      <Tabs value={activeView} className="space-y-4">
        <TabsContent value="grid" className="space-y-0">
          <SpotGrid
            layouts={floorLayouts}
            onSpotClick={handleSpotClick}
            onSpotSelect={handleSpotSelect}
            selectedSpots={selectedSpots}
            loading={loading}
            filters={filters}
          />
        </TabsContent>
        <TabsContent value="list" className="space-y-0">
          <SpotList
            spots={filteredSpots}
            loading={loading}
            onSpotClick={handleSpotClick}
            onSpotEdit={handleSpotEdit}
            onSpotSelect={handleSpotSelect}
            selectedSpots={selectedSpots}
            filters={filters}
            onFiltersChange={setFilters}
            onBulkOperation={handleBulkOperation}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={showSpotForm} onOpenChange={setShowSpotForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSpot ? 'Edit Spot' : 'Add New Spot'}
            </DialogTitle>
          </DialogHeader>
          <SpotForm
            spot={selectedSpot}
            onSave={async (spotData) => {
              await loadSpots()
              setShowSpotForm(false)
              setSelectedSpot(null)
            }}
            onCancel={() => {
              setShowSpotForm(false)
              setSelectedSpot(null)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showSpotDetails} onOpenChange={setShowSpotDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Spot {selectedSpot?.spotNumber} Details
            </DialogTitle>
          </DialogHeader>
          {selectedSpot && (
            <SpotDetails
              spot={selectedSpot}
              onEdit={() => {
                setShowSpotDetails(false)
                setShowSpotForm(true)
              }}
              onClose={() => {
                setShowSpotDetails(false)
                setSelectedSpot(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showMaintenanceScheduler} onOpenChange={setShowMaintenanceScheduler}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Maintenance Scheduler</DialogTitle>
          </DialogHeader>
          <MaintenanceScheduler
            spots={spots}
            onClose={() => setShowMaintenanceScheduler(false)}
            onSchedule={async () => {
              await loadSpots()
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SpotManagement
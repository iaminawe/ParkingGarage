import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SpotTile } from '@/components/parking/SpotTile'
import { 
  ChevronLeft, 
  ChevronRight, 
  Building, 
  MapPin,
  Eye,
  EyeOff,
  Maximize,
  Minimize
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { FloorLayout, ParkingSpot, SpotFilters } from '@/types/api'

interface SpotGridProps {
  layouts: FloorLayout[]
  onSpotClick: (spot: ParkingSpot) => void
  onSpotSelect?: (selectedSpots: string[]) => void
  selectedSpots?: string[]
  loading?: boolean
  filters?: SpotFilters
  className?: string
}

export const SpotGrid: React.FC<SpotGridProps> = ({
  layouts,
  onSpotClick,
  onSpotSelect,
  selectedSpots = [],
  loading = false,
  filters = {},
  className
}) => {
  const [currentFloor, setCurrentFloor] = useState(1)
  const [hideOccupied, setHideOccupied] = useState(false)
  const [hideUnavailable, setHideUnavailable] = useState(false)
  const [compactView, setCompactView] = useState(false)
  const [selectedBay, setSelectedBay] = useState<string | null>(null)

  // Get current floor layout
  const currentLayout = useMemo(() => {
    return layouts.find(layout => layout.floor === currentFloor) || layouts[0]
  }, [layouts, currentFloor])

  // Filter spots based on visibility settings and global filters
  const filteredLayout = useMemo(() => {
    if (!currentLayout) return null

    const filteredBays = currentLayout.bays.map(bay => ({
      ...bay,
      spots: bay.spots.filter(spot => {
        // Apply visibility filters
        if (hideOccupied && spot.status === 'occupied') return false
        if (hideUnavailable && ['maintenance', 'reserved'].includes(spot.status)) return false
        
        // Apply global filters
        if (filters.search) {
          const search = filters.search.toLowerCase()
          if (!spot.spotNumber.toLowerCase().includes(search) &&
              !bay.bay.toLowerCase().includes(search) &&
              !spot.id.toLowerCase().includes(search)) {
            return false
          }
        }
        if (filters.status && spot.status !== filters.status) return false
        if (filters.type && spot.type !== filters.type) return false
        if (filters.bay && bay.bay !== filters.bay) return false
        
        return true
      })
    })).filter(bay => bay.spots.length > 0) // Remove empty bays

    return {
      ...currentLayout,
      bays: filteredBays
    }
  }, [currentLayout, hideOccupied, hideUnavailable, filters])

  // Navigation handlers
  const handleFloorChange = (floor: number) => {
    setCurrentFloor(floor)
    setSelectedBay(null) // Reset bay selection when changing floors
  }

  const handleSpotClick = (spot: ParkingSpot, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      if (onSpotSelect) {
        const newSelection = selectedSpots.includes(spot.id)
          ? selectedSpots.filter(id => id !== spot.id)
          : [...selectedSpots, spot.id]
        onSpotSelect(newSelection)
      }
    } else if (event.shiftKey && selectedSpots.length > 0 && onSpotSelect) {
      // Range select with Shift
      const currentBay = filteredLayout?.bays.find(bay => 
        bay.spots.some(s => s.id === spot.id)
      )
      if (currentBay) {
        const baySpots = currentBay.spots
        const lastSelected = selectedSpots[selectedSpots.length - 1]
        const lastIndex = baySpots.findIndex(s => s.id === lastSelected)
        const currentIndex = baySpots.findIndex(s => s.id === spot.id)
        
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex)
          const end = Math.max(lastIndex, currentIndex)
          const rangeSpots = baySpots.slice(start, end + 1).map(s => s.id)
          const newSelection = [...new Set([...selectedSpots, ...rangeSpots])]
          onSpotSelect(newSelection)
        }
      }
    } else {
      onSpotClick(spot)
    }
  }

  const handleBaySelect = (bay: string, spots: ParkingSpot[]) => {
    if (!onSpotSelect) return
    
    const baySpotIds = spots.map(s => s.id)
    const allSelected = baySpotIds.every(id => selectedSpots.includes(id))
    
    if (allSelected) {
      // Deselect all spots in bay
      onSpotSelect(selectedSpots.filter(id => !baySpotIds.includes(id)))
    } else {
      // Select all spots in bay
      onSpotSelect([...new Set([...selectedSpots, ...baySpotIds])])
    }
  }

  const renderSpotGrid = (bay: FloorLayout['bays'][0]) => {
    const { spots, maxSpotsPerRow = 5 } = bay
    const rows = []
    
    for (let i = 0; i < spots.length; i += maxSpotsPerRow) {
      const rowSpots = spots.slice(i, i + maxSpotsPerRow)
      rows.push(
        <div key={i} className="flex justify-center gap-1 mb-1">
          {rowSpots.map(spot => {
            const isSelected = selectedSpots.includes(spot.id)
            return (
              <div key={spot.id} className="relative">
                {onSpotSelect && (
                  <Checkbox
                    checked={isSelected}
                    onChange={() => {
                      const newSelection = isSelected
                        ? selectedSpots.filter(id => id !== spot.id)
                        : [...selectedSpots, spot.id]
                      onSpotSelect(newSelection)
                    }}
                    className="absolute -top-2 -right-2 z-10 h-3 w-3"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <SpotTile
                  spot={spot}
                  onClick={(s) => handleSpotClick(s, {} as React.MouseEvent)}
                  size={compactView ? 'sm' : 'md'}
                  className={cn(
                    isSelected && 'ring-2 ring-blue-500',
                    'transition-all'
                  )}
                />
              </div>
            )
          })}
        </div>
      )
    }
    
    return rows
  }

  const getStatusStats = (spots: ParkingSpot[]) => ({
    available: spots.filter(s => s.status === 'available').length,
    occupied: spots.filter(s => s.status === 'occupied').length,
    reserved: spots.filter(s => s.status === 'reserved').length,
    maintenance: spots.filter(s => s.status === 'maintenance').length
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <span>Loading floor layouts...</span>
        </div>
      </div>
    )
  }

  if (!layouts.length) {
    return (
      <Alert>
        <AlertDescription>
          No floor layouts available. Please check your garage configuration.
        </AlertDescription>
      </Alert>
    )
  }

  if (!filteredLayout) {
    return (
      <Alert>
        <AlertDescription>
          No spots match the current filters. Try adjusting your search criteria.
        </AlertDescription>
      </Alert>
    )
  }

  const allFloorsStats = layouts.reduce((acc, layout) => {
    const stats = getStatusStats(layout.bays.flatMap(b => b.spots))
    return {
      available: acc.available + stats.available,
      occupied: acc.occupied + stats.occupied,
      reserved: acc.reserved + stats.reserved,
      maintenance: acc.maintenance + stats.maintenance
    }
  }, { available: 0, occupied: 0, reserved: 0, maintenance: 0 })

  return (
    <div className={cn("space-y-6", className)}>
      {/* Floor Navigation and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Floor Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFloorChange(currentFloor - 1)}
              disabled={currentFloor <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-[120px] justify-center">
              <Building className="h-4 w-4" />
              <span className="font-medium">Floor {currentFloor}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFloorChange(currentFloor + 1)}
              disabled={currentFloor >= layouts.length}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Floor Stats */}
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">
              {filteredLayout.availableSpots} / {filteredLayout.totalSpots} Available
            </Badge>
            <span className="text-muted-foreground">
              ({Math.round((filteredLayout.availableSpots / filteredLayout.totalSpots) * 100)}% free)
            </span>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHideOccupied(!hideOccupied)}
            className={hideOccupied ? 'bg-muted' : ''}
          >
            {hideOccupied ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="ml-1">Occupied</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHideUnavailable(!hideUnavailable)}
            className={hideUnavailable ? 'bg-muted' : ''}
          >
            {hideUnavailable ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="ml-1">Unavailable</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCompactView(!compactView)}
            className={compactView ? 'bg-muted' : ''}
          >
            {compactView ? <Maximize className="h-4 w-4" /> : <Minimize className="h-4 w-4" />}
            <span className="ml-1">Compact</span>
          </Button>
        </div>
      </div>

      {/* Overall Stats Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{allFloorsStats.available}</div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{allFloorsStats.occupied}</div>
              <div className="text-sm text-muted-foreground">Occupied</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{allFloorsStats.reserved}</div>
              <div className="text-sm text-muted-foreground">Reserved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{allFloorsStats.maintenance}</div>
              <div className="text-sm text-muted-foreground">Maintenance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floor Grid */}
      <div className="grid gap-6">
        {filteredLayout.bays.map(bay => {
          const bayStats = getStatusStats(bay.spots)
          const allBaySelected = bay.spots.every(spot => selectedSpots.includes(spot.id))
          const someBaySelected = bay.spots.some(spot => selectedSpots.includes(spot.id))

          return (
            <Card key={bay.bay} className={cn(
              selectedBay === bay.bay && 'ring-2 ring-blue-500',
              'transition-all'
            )}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <CardTitle className="text-lg">Bay {bay.bay}</CardTitle>
                    </div>
                    {onSpotSelect && (
                      <Checkbox
                        checked={allBaySelected}
                        indeterminate={someBaySelected && !allBaySelected}
                        onChange={() => handleBaySelect(bay.bay, bay.spots)}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {bayStats.available} / {bay.spots.length} free
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBay(selectedBay === bay.bay ? null : bay.bay)}
                    >
                      {selectedBay === bay.bay ? 'Collapse' : 'Focus'}
                    </Button>
                  </div>
                </div>
                
                {/* Bay Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="text-green-600">{bayStats.available} available</span>
                  <span className="text-red-600">{bayStats.occupied} occupied</span>
                  {bayStats.reserved > 0 && <span className="text-yellow-600">{bayStats.reserved} reserved</span>}
                  {bayStats.maintenance > 0 && <span className="text-gray-600">{bayStats.maintenance} maintenance</span>}
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "p-4 bg-muted/30 rounded-lg",
                  compactView && "p-2"
                )}>
                  {renderSpotGrid(bay)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Selection Summary */}
      {selectedSpots.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className="font-medium">{selectedSpots.length} spots selected</span>
                <span className="text-muted-foreground ml-2">
                  Click spots while holding Ctrl/Cmd to multi-select, or Shift for range selection
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSpotSelect?.([])}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SpotGrid
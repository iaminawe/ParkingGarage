import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/loading'
import { Search, SortAsc, SortDesc, MapPin, Clock, Zap, Users } from 'lucide-react'
import { apiService } from '@/services/api'
import type { ParkingSpot } from '@/types/api'

interface ParkingListViewProps {
  garageId: string
  sharedState: {
    selectedFloor: number
    searchQuery: string
    statusFilter: string
    typeFilter: string
    lastRefresh: Date
  }
  selectedSpots: string[]
  onSpotSelection: (spotId: string, selected: boolean) => void
  className?: string
}

interface SortConfig {
  field: keyof ParkingSpot | 'occupancyDuration'
  direction: 'asc' | 'desc'
}

export const ParkingListView: React.FC<ParkingListViewProps> = ({
  garageId,
  sharedState,
  selectedSpots,
  onSpotSelection,
  className = ''
}) => {
  const [spots, setSpots] = useState<ParkingSpot[]>([])
  const [loading, setLoading] = useState(true)
  const [localSearch, setLocalSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'bay', direction: 'asc' })
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)

  // Load spots data
  useEffect(() => {
    const loadSpots = async () => {
      try {
        setLoading(true)
        const response = await apiService.getSpots(garageId)
        if (response.success) {
          setSpots(response.data)
        }
      } catch (error) {
        console.error('Error loading spots:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSpots()
  }, [garageId, sharedState.lastRefresh])

  // Filter and sort spots
  const processedSpots = useMemo(() => {
    let filtered = spots.filter(spot => spot.floor === sharedState.selectedFloor)

    // Apply filters
    if (sharedState.statusFilter !== 'all') {
      filtered = filtered.filter(spot => spot.status === sharedState.statusFilter)
    }
    if (sharedState.typeFilter !== 'all') {
      filtered = filtered.filter(spot => spot.type === sharedState.typeFilter)
    }

    // Apply search
    const searchTerm = (localSearch || sharedState.searchQuery).toLowerCase()
    if (searchTerm) {
      filtered = filtered.filter(spot => 
        spot.bay?.toLowerCase().includes(searchTerm) ||
        spot.spotNumber?.toString().includes(searchTerm) ||
        spot.id.toLowerCase().includes(searchTerm) ||
        spot.currentVehicle?.licensePlate.toLowerCase().includes(searchTerm)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortConfig.field as keyof ParkingSpot]
      let bValue: any = b[sortConfig.field as keyof ParkingSpot]

      if (sortConfig.field === 'occupancyDuration') {
        aValue = a.currentVehicle ? Date.now() - new Date(a.currentVehicle.checkInTime).getTime() : 0
        bValue = b.currentVehicle ? Date.now() - new Date(b.currentVehicle.checkInTime).getTime() : 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return sortConfig.direction === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

    return filtered
  }, [spots, sharedState, localSearch, sortConfig])

  // Pagination
  const paginatedSpots = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return processedSpots.slice(startIndex, startIndex + pageSize)
  }, [processedSpots, currentPage, pageSize])

  const totalPages = Math.ceil(processedSpots.length / pageSize)

  const handleSort = (field: SortConfig['field']) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const formatDuration = (checkInTime: string) => {
    const duration = Date.now() - new Date(checkInTime).getTime()
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getStatusBadgeVariant = (status: ParkingSpot['status']) => {
    switch (status) {
      case 'available': return 'success'
      case 'occupied': return 'destructive'
      case 'reserved': return 'warning'
      default: return 'secondary'
    }
  }

  const getTypeIcon = (type: ParkingSpot['type'], features?: string[]) => {
    if (features?.includes('ev_charging') || type === 'ev') {
      return <Zap className="h-4 w-4 text-blue-500" />
    }
    if (type === 'oversized') {
      return <Users className="h-4 w-4 text-purple-600" />
    }
    return null
  }

  const SortButton: React.FC<{ field: SortConfig['field'], children: React.ReactNode }> = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-1 font-semibold"
    >
      {children}
      {sortConfig.field === field && (
        sortConfig.direction === 'asc' 
          ? <SortAsc className="ml-1 h-3 w-3" />
          : <SortDesc className="ml-1 h-3 w-3" />
      )}
    </Button>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* List Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search in list view..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary">
              {processedSpots.length} spots
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Parking Spots - Floor {sharedState.selectedFloor}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={paginatedSpots.length > 0 && paginatedSpots.every(spot => selectedSpots.includes(spot.id))}
                    onCheckedChange={(checked) => {
                      paginatedSpots.forEach(spot => {
                        onSpotSelection(spot.id, !!checked)
                      })
                    }}
                  />
                </TableHead>
                <TableHead>
                  <SortButton field="bay">Location</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="type">Type</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="status">Status</SortButton>
                </TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>
                  <SortButton field="occupancyDuration">Duration</SortButton>
                </TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSpots.map((spot) => (
                <TableRow 
                  key={spot.id}
                  className="hover:bg-muted/50 cursor-pointer"
                >
                  <TableCell>
                    <Checkbox 
                      checked={selectedSpots.includes(spot.id)}
                      onCheckedChange={(checked) => onSpotSelection(spot.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Bay {spot.bay} - {spot.spotNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(spot.type, spot.features)}
                      <span className="capitalize">{spot.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(spot.status)}>
                      {spot.status.charAt(0).toUpperCase() + spot.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {spot.currentVehicle ? (
                      <div>
                        <div className="font-medium">{spot.currentVehicle.licensePlate}</div>
                        <div className="text-sm text-muted-foreground">
                          {spot.currentVehicle.vehicleType}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {spot.currentVehicle ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(spot.currentVehicle.checkInTime)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {spot.features && spot.features.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {spot.features.slice(0, 2).map(feature => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature.replace('_', ' ')}
                          </Badge>
                        ))}
                        {spot.features.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{spot.features.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(spot.updatedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, processedSpots.length)} of {processedSpots.length} spots
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ParkingListView
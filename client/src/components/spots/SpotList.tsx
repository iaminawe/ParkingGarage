import React, { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/ui/data-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  MoreHorizontal, 
  Edit, 
  Wrench, 
  MapPin, 
  Zap, 
  Accessibility,
  Users,
  Car,
  Clock,
  DollarSign,
  Calendar
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ParkingSpot, SpotFilters, BulkSpotOperation } from '@/types/api'

interface SpotListProps {
  spots: ParkingSpot[]
  loading?: boolean
  onSpotClick: (spot: ParkingSpot) => void
  onSpotEdit: (spot: ParkingSpot) => void
  onSpotSelect?: (selectedSpots: string[]) => void
  selectedSpots?: string[]
  filters?: SpotFilters
  onFiltersChange?: (filters: SpotFilters) => void
  onBulkOperation?: (operation: BulkSpotOperation) => void
  className?: string
}

export const SpotList: React.FC<SpotListProps> = ({
  spots,
  loading = false,
  onSpotClick,
  onSpotEdit,
  onSpotSelect,
  selectedSpots = [],
  filters = {},
  onFiltersChange,
  onBulkOperation,
  className
}) => {
  // Get status badge variant
  const getStatusVariant = (status: ParkingSpot['status']) => {
    switch (status) {
      case 'available': return 'default'
      case 'occupied': return 'destructive'
      case 'reserved': return 'secondary'
      case 'maintenance': return 'outline'
      default: return 'outline'
    }
  }

  // Get type icon
  const getTypeIcon = (type: ParkingSpot['type'], features?: string[]) => {
    if (features?.includes('ev_charging') || type === 'ev') {
      return <Zap className="h-4 w-4 text-blue-500" />
    }
    if (features?.includes('handicap') || type === 'handicap') {
      return <Accessibility className="h-4 w-4 text-blue-600" />
    }
    if (type === 'oversized') {
      return <Users className="h-4 w-4 text-purple-600" />
    }
    return <Car className="h-4 w-4 text-muted-foreground" />
  }

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  // Format time
  const formatTime = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Define columns
  const columns: Column<ParkingSpot>[] = [
    {
      key: 'spotNumber',
      header: 'Spot',
      sortable: true,
      width: 80,
      render: (value, spot) => (
        <div className="flex items-center gap-2">
          <div className="font-mono font-medium">{value}</div>
          {spot.features?.includes('handicap') && (
            <Accessibility className="h-3 w-3 text-blue-600" />
          )}
          {spot.features?.includes('ev_charging') && (
            <Zap className="h-3 w-3 text-blue-500" />
          )}
        </div>
      )
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      width: 120,
      accessor: (spot) => `Floor ${spot.floor}${spot.bay ? `, Bay ${spot.bay}` : ''}`,
      render: (value, spot) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span>Floor {spot.floor}</span>
          {spot.bay && <span>, Bay {spot.bay}</span>}
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      width: 120,
      render: (value, spot) => (
        <div className="flex items-center gap-2">
          {getTypeIcon(spot.type, spot.features)}
          <span className="capitalize">{value}</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: 100,
      render: (value) => (
        <Badge variant={getStatusVariant(value as ParkingSpot['status'])}>
          {value}
        </Badge>
      )
    },
    {
      key: 'currentVehicle',
      header: 'Current Vehicle',
      width: 150,
      render: (value, spot) => {
        if (!spot.currentVehicle) return '-'
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm">
                  <div className="font-medium">{spot.currentVehicle.licensePlate}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(spot.currentVehicle.checkInTime)}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div>Type: {spot.currentVehicle.vehicleType}</div>
                  <div>Check-in: {new Date(spot.currentVehicle.checkInTime).toLocaleString()}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }
    },
    {
      key: 'usageStats',
      header: 'Usage',
      width: 120,
      render: (value, spot) => {
        if (!spot.usageStats) return '-'
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-green-600" />
              <span className="font-medium">{formatCurrency(spot.usageStats.totalRevenue)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {spot.usageStats.totalSessions} sessions
            </div>
          </div>
        )
      }
    },
    {
      key: 'utilization',
      header: 'Utilization',
      sortable: true,
      width: 100,
      accessor: (spot) => spot.usageStats?.utilizationRate || 0,
      render: (value, spot) => {
        const rate = spot.usageStats?.utilizationRate || 0
        return (
          <div className="flex items-center gap-2">
            <div className="w-12 bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all",
                  rate >= 80 ? 'bg-red-500' :
                  rate >= 60 ? 'bg-yellow-500' :
                  rate >= 40 ? 'bg-blue-500' :
                  'bg-green-500'
                )}
                style={{ width: `${Math.min(rate, 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium">{Math.round(rate)}%</span>
          </div>
        )
      }
    },
    {
      key: 'pricing',
      header: 'Pricing',
      width: 100,
      render: (value, spot) => (
        <div className="text-sm">
          {spot.priceOverride ? (
            <div>
              <div className="font-medium text-blue-600">
                {formatCurrency(spot.priceOverride)}
              </div>
              <div className="text-xs text-muted-foreground">Override</div>
            </div>
          ) : (
            <span className="text-muted-foreground">Default</span>
          )}
        </div>
      )
    },
    {
      key: 'maintenance',
      header: 'Maintenance',
      width: 120,
      render: (value, spot) => {
        const scheduledMaintenance = spot.maintenanceSchedule?.filter(m => m.status === 'scheduled').length || 0
        const inProgressMaintenance = spot.maintenanceSchedule?.filter(m => m.status === 'in-progress').length || 0
        
        if (spot.status === 'maintenance') {
          return (
            <Badge variant="outline" className="text-orange-600">
              <Wrench className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )
        }
        
        if (scheduledMaintenance > 0 || inProgressMaintenance > 0) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-blue-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    {scheduledMaintenance + inProgressMaintenance}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {inProgressMaintenance > 0 && <div>{inProgressMaintenance} in progress</div>}
                  {scheduledMaintenance > 0 && <div>{scheduledMaintenance} scheduled</div>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }
        
        return '-'
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 80,
      render: (value, spot) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSpotClick(spot)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSpotEdit(spot)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Spot
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                if (onBulkOperation) {
                  onBulkOperation({
                    spotIds: [spot.id],
                    operation: 'change-status',
                    params: { 
                      status: spot.status === 'available' ? 'maintenance' : 'available' 
                    }
                  })
                }
              }}
            >
              <Wrench className="h-4 w-4 mr-2" />
              {spot.status === 'maintenance' ? 'Mark Available' : 'Mark Maintenance'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                if (onBulkOperation) {
                  onBulkOperation({
                    spotIds: [spot.id],
                    operation: 'schedule-maintenance',
                    params: { 
                      maintenanceType: 'cleaning',
                      scheduledDate: new Date().toISOString(),
                      description: 'Regular cleaning'
                    }
                  })
                }
              }}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Maintenance
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ]

  // Pagination config
  const pagination = useMemo(() => ({
    page: 1,
    limit: 25,
    total: spots.length,
    totalPages: Math.ceil(spots.length / 25)
  }), [spots.length])

  return (
    <div className={cn("space-y-4", className)}>
      <DataTable
        data={spots}
        columns={columns}
        loading={loading}
        pagination={pagination}
        selectable={!!onSpotSelect}
        selectedItems={selectedSpots}
        onSelectionChange={onSpotSelect}
        getItemId={(spot) => spot.id}
        emptyMessage="No spots found. Try adjusting your filters."
        rowClassName={(spot) => cn(
          spot.status === 'maintenance' && 'bg-orange-50',
          spot.status === 'occupied' && 'bg-red-50',
          spot.status === 'reserved' && 'bg-yellow-50',
          selectedSpots.includes(spot.id) && 'bg-blue-50'
        )}
        onRowClick={onSpotClick}
      />

      {/* Bulk Action Bar */}
      {selectedSpots.length > 0 && onBulkOperation && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white border rounded-lg shadow-lg p-4 flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedSpots.length} spots selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkOperation({
                  spotIds: selectedSpots,
                  operation: 'change-status',
                  params: { status: 'available' }
                })}
              >
                Mark Available
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkOperation({
                  spotIds: selectedSpots,
                  operation: 'change-status',
                  params: { status: 'maintenance' }
                })}
              >
                Mark Maintenance
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkOperation({
                  spotIds: selectedSpots,
                  operation: 'assign-type',
                  params: { type: 'standard' }
                })}
              >
                Set Type
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkOperation({
                  spotIds: selectedSpots,
                  operation: 'schedule-maintenance',
                  params: {
                    maintenanceType: 'cleaning',
                    scheduledDate: new Date().toISOString(),
                    description: 'Bulk maintenance'
                  }
                })}
              >
                Schedule Maintenance
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSpotSelect?.([])}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SpotList
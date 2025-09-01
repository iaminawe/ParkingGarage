import React, { useMemo } from 'react'
import { Edit, Trash2, Eye, History, Car, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import type { Column } from '@/components/ui/data-table'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { formatDate, formatCurrency } from '@/utils/formatting'
import type { VehicleWithParkingInfo, VehicleType, VehicleStatus } from '@/types/api'

interface VehicleListProps {
  vehicles: VehicleWithParkingInfo[]
  loading?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  selectedVehicles?: string[]
  onSelectionChange?: (selected: string[]) => void
  onVehicleSelect?: (vehicle: VehicleWithParkingInfo) => void
  onVehicleEdit?: (vehicle: VehicleWithParkingInfo) => void
  onVehicleDelete?: (vehicleId: string) => void
  onViewHistory?: (vehicle: VehicleWithParkingInfo) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (column: string, order: 'asc' | 'desc') => void
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

// Vehicle type icons
const getVehicleTypeIcon = (type: VehicleType) => {
  switch (type) {
    case 'motorcycle':
      return <Car className="h-4 w-4" />
    case 'truck':
    case 'van':
    case 'bus':
      return <Truck className="h-4 w-4" />
    default:
      return <Car className="h-4 w-4" />
  }
}

// Vehicle type label
const getVehicleTypeLabel = (type: VehicleType) => {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

// Status color mapping
const getStatusColor = (status: VehicleStatus) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 hover:bg-green-200'
    case 'inactive':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    case 'blocked':
      return 'bg-red-100 text-red-800 hover:bg-red-200'
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
  }
}

export const VehicleList: React.FC<VehicleListProps> = ({
  vehicles,
  loading,
  pagination,
  selectedVehicles = [],
  onSelectionChange,
  onVehicleSelect,
  onVehicleEdit,
  onVehicleDelete,
  onViewHistory,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onPageSizeChange,
}) => {
  const columns: Column<VehicleWithParkingInfo>[] = useMemo(() => [
    {
      key: 'licensePlate',
      header: 'License Plate',
      sortable: true,
      className: 'font-mono font-medium',
      render: (value, vehicle) => (
        <div className="flex items-center gap-2">
          {getVehicleTypeIcon(vehicle.type)}
          <span className="font-mono font-medium">{value}</span>
          {vehicle.currentSession && (
            <Badge variant="secondary" className="text-xs">
              PARKED
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (value: VehicleType) => (
        <div className="flex items-center gap-2">
          {getVehicleTypeIcon(value)}
          <span>{getVehicleTypeLabel(value)}</span>
        </div>
      ),
    },
    {
      key: 'make',
      header: 'Make & Model',
      render: (_, vehicle) => (
        <div>
          <div className="font-medium">{vehicle.make}</div>
          <div className="text-sm text-muted-foreground">{vehicle.model}</div>
        </div>
      ),
    },
    {
      key: 'ownerName',
      header: 'Owner',
      sortable: true,
      render: (value, vehicle) => (
        <div>
          <div className="font-medium">{value || 'N/A'}</div>
          {vehicle.ownerEmail && (
            <div className="text-sm text-muted-foreground">{vehicle.ownerEmail}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value: VehicleStatus) => (
        <Badge className={getStatusColor(value)}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'totalSessions',
      header: 'Sessions',
      sortable: true,
      className: 'text-center',
      render: (value) => (
        <div className="text-center font-medium">{value || 0}</div>
      ),
    },
    {
      key: 'totalSpent',
      header: 'Total Spent',
      sortable: true,
      className: 'text-right',
      render: (value) => (
        <div className="text-right font-medium">
          {formatCurrency(value || 0)}
        </div>
      ),
    },
    {
      key: 'lastParked',
      header: 'Last Parked',
      sortable: true,
      render: (value) => (
        <div className="text-sm">
          {value ? formatDate(value) : 'Never'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 120,
      render: (_, vehicle) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onVehicleSelect?.(vehicle)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onVehicleEdit?.(vehicle)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Vehicle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewHistory?.(vehicle)}>
                <History className="h-4 w-4 mr-2" />
                View History
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onVehicleDelete?.(vehicle.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Vehicle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [onVehicleSelect, onVehicleEdit, onVehicleDelete, onViewHistory])

  return (
    <DataTable
      data={vehicles}
      columns={columns}
      loading={loading}
      pagination={pagination}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      selectable={true}
      selectedItems={selectedVehicles}
      onSelectionChange={onSelectionChange}
      onRowClick={onVehicleSelect}
      getItemId={(vehicle) => vehicle.id}
      emptyMessage="No vehicles found. Add your first vehicle to get started."
      rowClassName={(vehicle) => 
        vehicle.currentSession ? 'bg-blue-50 hover:bg-blue-100' : ''
      }
    />
  )
}

export default VehicleList
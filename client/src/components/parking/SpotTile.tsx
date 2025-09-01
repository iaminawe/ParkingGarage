import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/utils/cn'
import type { ParkingSpot } from '@/types/api'
import { 
  Car, 
  Zap, 
  Accessibility, 
  Wrench, 
  Clock, 
  MapPin,
  Users
} from 'lucide-react'

interface SpotTileProps {
  spot: ParkingSpot
  onClick?: (spot: ParkingSpot) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const getStatusColor = (status: ParkingSpot['status']) => {
  switch (status) {
    case 'available':
      return 'bg-green-500 hover:bg-green-600 border-green-600'
    case 'occupied':
      return 'bg-red-500 hover:bg-red-600 border-red-600'
    case 'reserved':
      return 'bg-yellow-500 hover:bg-yellow-600 border-yellow-600'
    case 'maintenance':
      return 'bg-gray-500 hover:bg-gray-600 border-gray-600'
    default:
      return 'bg-gray-300 hover:bg-gray-400 border-gray-400'
  }
}

const getTypeColor = (type: ParkingSpot['type']) => {
  switch (type) {
    case 'ev':
      return 'ring-2 ring-blue-400'
    case 'compact':
      return 'ring-1 ring-orange-300'
    case 'oversized':
      return 'ring-2 ring-purple-400'
    default:
      return ''
  }
}

const getTypeIcon = (type: ParkingSpot['type'], features?: string[]) => {
  if (features?.includes('ev_charging') || type === 'ev') {
    return <Zap className="h-3 w-3 text-blue-400" />
  }
  if (features?.includes('handicap')) {
    return <Accessibility className="h-3 w-3 text-blue-600" />
  }
  if (type === 'oversized') {
    return <Users className="h-3 w-3 text-purple-600" />
  }
  return <Car className="h-3 w-3 text-white opacity-75" />
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

export const SpotTile: React.FC<SpotTileProps> = ({ 
  spot, 
  onClick, 
  className, 
  size = 'md' 
}) => {
  const statusColor = getStatusColor(spot.status)
  const typeRing = getTypeColor(spot.type)
  const typeIcon = getTypeIcon(spot.type, spot.features)
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base'
  }

  const tooltipContent = (
    <div className="text-xs space-y-1">
      <div className="font-semibold">
        <MapPin className="inline h-3 w-3 mr-1" />
        Bay {spot.bay} - Spot {spot.spotNumber}
      </div>
      <div className="text-muted-foreground">
        Floor {spot.floor} • {spot.type.charAt(0).toUpperCase() + spot.type.slice(1)}
      </div>
      <div className="flex items-center gap-1">
        <Badge 
          variant={
            spot.status === 'available' ? 'success' :
            spot.status === 'occupied' ? 'destructive' :
            spot.status === 'reserved' ? 'warning' :
            'secondary'
          }
          className="text-xs"
        >
          {spot.status.charAt(0).toUpperCase() + spot.status.slice(1)}
        </Badge>
      </div>
      {spot.features && spot.features.length > 0 && (
        <div className="text-muted-foreground">
          Features: {spot.features.map(f => f.replace('_', ' ')).join(', ')}
        </div>
      )}
      {spot.currentVehicle && (
        <div className="pt-1 border-t">
          <div className="font-medium">{spot.currentVehicle.licensePlate}</div>
          <div className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Since {formatTime(spot.currentVehicle.checkInTime)}
          </div>
        </div>
      )}
      {spot.status === 'maintenance' && (
        <div className="text-muted-foreground flex items-center gap-1">
          <Wrench className="h-3 w-3" />
          Under maintenance
        </div>
      )}
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onClick?.(spot)}
            className={cn(
              'relative flex items-center justify-center rounded-md border-2 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
              'hover:scale-105 cursor-pointer',
              statusColor,
              typeRing,
              sizeClasses[size],
              className
            )}
            role="button"
            aria-label={`Parking spot ${spot.spotNumber} in bay ${spot.bay}, ${spot.status}`}
          >
            {/* Status indicator */}
            <div className="absolute top-0.5 right-0.5">
              {typeIcon}
            </div>
            
            {/* Spot number */}
            <span className="text-white font-semibold text-center leading-none">
              {spot.spotNumber}
            </span>
            
            {/* Features indicators */}
            {spot.features && spot.features.includes('handicap') && (
              <div className="absolute bottom-0.5 left-0.5">
                <Accessibility className="h-2.5 w-2.5 text-blue-100" />
              </div>
            )}
            
            {/* Occupied indicator */}
            {spot.status === 'occupied' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full opacity-75" />
              </div>
            )}
            
            {/* Maintenance indicator */}
            {spot.status === 'maintenance' && (
              <div className="absolute bottom-0.5 right-0.5">
                <Wrench className="h-2.5 w-2.5 text-white opacity-75" />
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default SpotTile
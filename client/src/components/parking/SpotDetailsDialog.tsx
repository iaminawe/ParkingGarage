import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { ParkingSpot } from '@/types/api'
import {
  Car,
  MapPin,
  Clock,
  Calendar,
  Zap,
  Accessibility,
  Users,
  Wrench,
  CreditCard,
  Timer,
  AlertCircle,
} from 'lucide-react'

interface SpotDetailsDialogProps {
  spot: ParkingSpot | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateStatus?: (spotId: string, status: ParkingSpot['status']) => Promise<void>
  isUpdating?: boolean
}

const getStatusInfo = (status: ParkingSpot['status']) => {
  switch (status) {
    case 'available':
      return {
        color: 'success',
        icon: <Car className="h-4 w-4" />,
        label: 'Available',
        description: 'This spot is ready for parking'
      }
    case 'occupied':
      return {
        color: 'destructive',
        icon: <Car className="h-4 w-4" />,
        label: 'Occupied',
        description: 'This spot is currently in use'
      }
    case 'reserved':
      return {
        color: 'warning',
        icon: <Clock className="h-4 w-4" />,
        label: 'Reserved',
        description: 'This spot is reserved for a specific user'
      }
    case 'maintenance':
      return {
        color: 'secondary',
        icon: <Wrench className="h-4 w-4" />,
        label: 'Maintenance',
        description: 'This spot is temporarily unavailable'
      }
    default:
      return {
        color: 'secondary',
        icon: <AlertCircle className="h-4 w-4" />,
        label: 'Unknown',
        description: 'Status unknown'
      }
  }
}

const getTypeInfo = (type: ParkingSpot['type']) => {
  switch (type) {
    case 'standard':
      return {
        icon: <Car className="h-4 w-4" />,
        label: 'Standard',
        description: 'Regular sized parking space'
      }
    case 'compact':
      return {
        icon: <Car className="h-4 w-4" />,
        label: 'Compact',
        description: 'Smaller space for compact vehicles'
      }
    case 'oversized':
      return {
        icon: <Users className="h-4 w-4" />,
        label: 'Oversized',
        description: 'Larger space for trucks and SUVs'
      }
    case 'ev':
      return {
        icon: <Zap className="h-4 w-4" />,
        label: 'Electric Vehicle',
        description: 'EV charging station included'
      }
    default:
      return {
        icon: <Car className="h-4 w-4" />,
        label: type,
        description: 'Vehicle parking space'
      }
  }
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

const calculateDuration = (checkInTime: string) => {
  const start = new Date(checkInTime)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

export const SpotDetailsDialog: React.FC<SpotDetailsDialogProps> = ({
  spot,
  open,
  onOpenChange,
  onUpdateStatus,
  isUpdating = false,
}) => {
  if (!spot) return null

  const statusInfo = getStatusInfo(spot.status)
  const typeInfo = getTypeInfo(spot.type)
  const hasFeatures = spot.features && spot.features.length > 0
  const isOccupied = spot.status === 'occupied' && spot.currentVehicle

  const handleStatusUpdate = async (newStatus: ParkingSpot['status']) => {
    if (onUpdateStatus) {
      await onUpdateStatus(spot.id, newStatus)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Bay {spot.bay} - Spot {spot.spotNumber}
          </DialogTitle>
          <DialogDescription>
            Floor {spot.floor} • {typeInfo.label}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              Current Status
              {statusInfo.icon}
            </h4>
            <div className="flex items-center gap-2">
              <Badge variant={statusInfo.color as any}>
                {statusInfo.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {statusInfo.description}
              </span>
            </div>
          </div>

          {/* Type Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              Spot Type
              {typeInfo.icon}
            </h4>
            <p className="text-sm text-muted-foreground">
              {typeInfo.description}
            </p>
          </div>

          {/* Features */}
          {hasFeatures && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Features</h4>
              <div className="flex flex-wrap gap-2">
                {spot.features?.map((feature) => {
                  const Icon = feature === 'ev_charging' ? Zap : 
                             feature === 'handicap' ? Accessibility : 
                             AlertCircle
                  return (
                    <Badge key={feature} variant="outline" className="flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Current Vehicle Info */}
          {isOccupied && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Current Vehicle</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">License Plate:</span>
                    <span className="font-mono font-semibold">
                      {spot.currentVehicle.licensePlate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Check-in:
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatDateTime(spot.currentVehicle.checkInTime).time}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(spot.currentVehicle.checkInTime).date}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      Duration:
                    </span>
                    <span className="font-semibold">
                      {calculateDuration(spot.currentVehicle.checkInTime)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Spot Metadata */}
          <Separator />
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Spot ID:</span>
              <span className="font-mono">{spot.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{formatDateTime(spot.createdAt).date}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span>{formatDateTime(spot.updatedAt).date}</span>
            </div>
          </div>

          {/* Action Buttons */}
          {onUpdateStatus && spot.status !== 'occupied' && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  {spot.status !== 'available' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusUpdate('available')}
                      disabled={isUpdating}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      Mark Available
                    </Button>
                  )}
                  {spot.status !== 'maintenance' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusUpdate('maintenance')}
                      disabled={isUpdating}
                      className="text-gray-600 border-gray-200 hover:bg-gray-50"
                    >
                      <Wrench className="h-3 w-3 mr-1" />
                      Maintenance
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SpotDetailsDialog
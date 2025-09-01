import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/utils/cn'
import {
  Car,
  Zap,
  Accessibility,
  Users,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

interface StatusLegendProps {
  className?: string
  compact?: boolean
  showTitle?: boolean
}

const statusItems = [
  {
    status: 'available' as const,
    color: 'bg-green-500',
    icon: <CheckCircle className="h-3 w-3" />,
    label: 'Available',
    description: 'Ready for parking'
  },
  {
    status: 'occupied' as const,
    color: 'bg-red-500',
    icon: <Car className="h-3 w-3" />,
    label: 'Occupied',
    description: 'Currently in use'
  },
  {
    status: 'reserved' as const,
    color: 'bg-yellow-500',
    icon: <Clock className="h-3 w-3" />,
    label: 'Reserved',
    description: 'Reserved by user'
  },
  {
    status: 'maintenance' as const,
    color: 'bg-gray-500',
    icon: <Wrench className="h-3 w-3" />,
    label: 'Maintenance',
    description: 'Temporarily unavailable'
  }
]

const typeItems = [
  {
    type: 'standard' as const,
    ring: 'ring-gray-300',
    icon: <Car className="h-3 w-3" />,
    label: 'Standard',
    description: 'Regular parking space'
  },
  {
    type: 'compact' as const,
    ring: 'ring-orange-300',
    icon: <Car className="h-3 w-3" />,
    label: 'Compact',
    description: 'Smaller vehicles only'
  },
  {
    type: 'oversized' as const,
    ring: 'ring-purple-400',
    icon: <Users className="h-3 w-3" />,
    label: 'Oversized',
    description: 'Large vehicles/trucks'
  },
  {
    type: 'ev' as const,
    ring: 'ring-blue-400',
    icon: <Zap className="h-3 w-3" />,
    label: 'EV Charging',
    description: 'Electric vehicle charging'
  }
]

const featureItems = [
  {
    feature: 'ev_charging',
    icon: <Zap className="h-3 w-3 text-blue-500" />,
    label: 'EV Charging',
    description: 'Electric vehicle charging station'
  },
  {
    feature: 'handicap',
    icon: <Accessibility className="h-3 w-3 text-blue-600" />,
    label: 'Accessible',
    description: 'Handicap accessible spot'
  }
]

export const StatusLegend = ({
  className,
  compact = false,
  showTitle = true,
}: StatusLegendProps) => {
  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        {showTitle && (
          <h3 className="text-sm font-semibold text-foreground">Legend</h3>
        )}
        
        {/* Status Legend - Compact */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Status
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {statusItems.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-sm border', item.color)} />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Type Legend - Compact */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Type
          </h4>
          <div className="space-y-1">
            {typeItems.map((item) => (
              <div key={item.type} className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-sm bg-gray-300 ring-2', item.ring)} />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features - Compact */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Features
          </h4>
          <div className="space-y-1">
            {featureItems.map((item) => (
              <div key={item.feature} className="flex items-center gap-2">
                {item.icon}
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Parking Legend
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {/* Status Legend */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Status Colors</h4>
          <div className="space-y-2">
            {statusItems.map((item) => (
              <div key={item.status} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-4 h-4 rounded border-2', item.color)} />
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Type Legend */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Spot Types</h4>
          <div className="space-y-2">
            {typeItems.map((item) => (
              <div key={item.type} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-4 h-4 rounded bg-gray-300 ring-2', item.ring)} />
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Legend */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Special Features</h4>
          <div className="space-y-2">
            {featureItems.map((item) => (
              <div key={item.feature} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="pt-2 border-t space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            How to Use
          </h5>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Click on any spot to view detailed information</li>
            <li>• Hover over spots to see quick info tooltip</li>
            <li>• Ring colors indicate special spot types</li>
            <li>• Icons show additional features available</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default StatusLegend
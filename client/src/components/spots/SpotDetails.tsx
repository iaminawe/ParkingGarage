import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Edit,
  MapPin,
  Car,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Wrench,
  Zap,
  Accessibility,
  Shield,
  Ruler,
  History,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ParkingSpot } from '@/types/api'

interface SpotDetailsProps {
  spot: ParkingSpot
  onEdit: () => void
  onClose: () => void
  className?: string
}

export const SpotDetails: React.FC<SpotDetailsProps> = ({
  spot,
  onEdit,
  onClose,
  className
}) => {
  const [activeTab, setActiveTab] = useState('overview')

  // Mock extended data - in real implementation, fetch from API
  const extendedData = useMemo(() => ({
    recentSessions: [
      {
        id: '1',
        vehicleLicensePlate: 'ABC-123',
        entryTime: '2024-01-20T08:30:00Z',
        exitTime: '2024-01-20T10:45:00Z',
        duration: 135, // minutes
        cost: 11.25,
        vehicleType: 'car',
        ownerName: 'John Smith'
      },
      {
        id: '2',
        vehicleLicensePlate: 'XYZ-789',
        entryTime: '2024-01-19T14:15:00Z',
        exitTime: '2024-01-19T16:30:00Z',
        duration: 135,
        cost: 11.25,
        vehicleType: 'suv',
        ownerName: 'Sarah Johnson'
      },
      {
        id: '3',
        vehicleLicensePlate: 'DEF-456',
        entryTime: '2024-01-18T09:00:00Z',
        exitTime: '2024-01-18T17:00:00Z',
        duration: 480,
        cost: 40.0,
        vehicleType: 'car',
        ownerName: 'Mike Davis'
      }
    ],
    weeklyStats: [
      { day: 'Mon', sessions: 8, revenue: 64, avgDuration: 120 },
      { day: 'Tue', sessions: 6, revenue: 48, avgDuration: 105 },
      { day: 'Wed', sessions: 10, revenue: 85, avgDuration: 135 },
      { day: 'Thu', sessions: 7, revenue: 56, avgDuration: 110 },
      { day: 'Fri', sessions: 12, revenue: 108, avgDuration: 145 },
      { day: 'Sat', sessions: 5, revenue: 45, avgDuration: 150 },
      { day: 'Sun', sessions: 3, revenue: 27, avgDuration: 180 }
    ],
    maintenanceHistory: [
      {
        id: '1',
        type: 'cleaning',
        description: 'Regular cleaning and inspection',
        scheduledDate: '2024-01-15T10:00:00Z',
        completedDate: '2024-01-15T10:45:00Z',
        status: 'completed',
        assignedTo: 'Maintenance Team A',
        notes: 'Spot cleaned, no issues found'
      },
      {
        id: '2',
        type: 'repair',
        description: 'Paint touch-up on spot markings',
        scheduledDate: '2024-01-10T14:00:00Z',
        completedDate: '2024-01-10T15:30:00Z',
        status: 'completed',
        assignedTo: 'Paint Crew',
        notes: 'Spot lines repainted, looks good'
      },
      {
        id: '3',
        type: 'inspection',
        description: 'Monthly safety inspection',
        scheduledDate: '2024-01-25T09:00:00Z',
        status: 'scheduled',
        assignedTo: 'Inspector Jones',
        notes: 'Routine monthly inspection'
      }
    ]
  }), [])

  // Get status color and icon
  const getStatusDisplay = (status: ParkingSpot['status']) => {
    switch (status) {
      case 'available':
        return { 
          color: 'text-green-600', 
          bg: 'bg-green-50', 
          icon: <CheckCircle className="h-5 w-5" />, 
          label: 'Available' 
        }
      case 'occupied':
        return { 
          color: 'text-red-600', 
          bg: 'bg-red-50', 
          icon: <XCircle className="h-5 w-5" />, 
          label: 'Occupied' 
        }
      case 'reserved':
        return { 
          color: 'text-yellow-600', 
          bg: 'bg-yellow-50', 
          icon: <Clock className="h-5 w-5" />, 
          label: 'Reserved' 
        }
      case 'maintenance':
        return { 
          color: 'text-orange-600', 
          bg: 'bg-orange-50', 
          icon: <Wrench className="h-5 w-5" />, 
          label: 'Maintenance' 
        }
      default:
        return { 
          color: 'text-gray-600', 
          bg: 'bg-gray-50', 
          icon: <AlertTriangle className="h-5 w-5" />, 
          label: 'Unknown' 
        }
    }
  }

  // Get feature icons
  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'ev_charging': return <Zap className="h-4 w-4 text-blue-500" />
      case 'handicap': return <Accessibility className="h-4 w-4 text-blue-600" />
      case 'covered': return <Shield className="h-4 w-4 text-green-600" />
      case 'security_camera': return <Shield className="h-4 w-4 text-purple-600" />
      default: return null
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
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

  // Format date/time
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const statusDisplay = getStatusDisplay(spot.status)
  const stats = spot.usageStats

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Spot {spot.spotNumber}</h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <MapPin className="h-4 w-4" />
              <span>Floor {spot.floor}{spot.bay ? `, Bay ${spot.bay}` : ''}</span>
            </div>
          </div>
          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", statusDisplay.bg)}>
            <div className={statusDisplay.color}>
              {statusDisplay.icon}
            </div>
            <span className={cn("font-medium", statusDisplay.color)}>
              {statusDisplay.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Spot
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Spot Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Type</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize font-medium">{spot.type}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Dimensions</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {spot.dimensions?.length || 18}' × {spot.dimensions?.width || 9}'
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Clearance</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{spot.dimensions?.height || 8}'</span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                {spot.features && spot.features.length > 0 && (
                  <div>
                    <Label>Features</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {spot.features.map(feature => (
                        <Badge key={feature} variant="secondary" className="flex items-center gap-1">
                          {getFeatureIcon(feature)}
                          {feature.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pricing */}
                <div>
                  <Label>Pricing</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    {spot.priceOverride ? (
                      <div>
                        <span className="font-medium text-green-600">
                          {formatCurrency(spot.priceOverride)}/hour
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">(Override)</span>
                      </div>
                    ) : (
                      <span className="font-medium">Default garage pricing</span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {spot.maintenanceNotes && (
                  <div>
                    <Label>Notes</Label>
                    <div className="mt-1 p-3 bg-muted rounded-lg">
                      <p className="text-sm">{spot.maintenanceNotes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Current Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {spot.currentVehicle ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Vehicle</Label>
                      <Badge variant="destructive">Occupied</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">License Plate</span>
                        <span className="font-mono font-medium">
                          {spot.currentVehicle.licensePlate}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Check-in Time</span>
                        <span className="font-medium">
                          {formatDateTime(spot.currentVehicle.checkInTime)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Duration</span>
                        <span className="font-medium">
                          {formatDuration(
                            Math.floor((Date.now() - new Date(spot.currentVehicle.checkInTime).getTime()) / 60000)
                          )}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Estimated Cost</Label>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(Math.floor(
                          ((Date.now() - new Date(spot.currentVehicle.checkInTime).getTime()) / 3600000) * 
                          (spot.priceOverride || 5)
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on {spot.priceOverride ? 'override' : 'standard'} rate
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <h3 className="font-medium text-green-600">Available</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ready for next vehicle
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(stats.totalRevenue)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sessions</p>
                      <p className="text-2xl font-bold">{stats.totalSessions}</p>
                    </div>
                    <Car className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Duration</p>
                      <p className="text-2xl font-bold">
                        {formatDuration(stats.averageSessionDuration)}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Utilization</p>
                      <p className="text-2xl font-bold">{Math.round(stats.utilizationRate)}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-500" />
                  </div>
                  <Progress value={stats.utilizationRate} className="mt-2" />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Weekly Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {extendedData.weeklyStats.map(day => (
                    <div key={day.day} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="w-12 text-sm font-medium">{day.day}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{day.sessions} sessions</span>
                            <span>{formatCurrency(day.revenue)}</span>
                          </div>
                          <Progress 
                            value={(day.sessions / 15) * 100} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Peak Usage Hours</span>
                    <Badge variant="outline">9 AM - 5 PM</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Revenue/Day</span>
                    <span className="font-medium">
                      {formatCurrency(extendedData.weeklyStats.reduce((acc, day) => acc + day.revenue, 0) / 7)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Best Performance Day</span>
                    <Badge variant="secondary">Friday</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Turnover Rate</span>
                    <span className="font-medium">
                      {(extendedData.weeklyStats.reduce((acc, day) => acc + day.sessions, 0) / 7).toFixed(1)} sessions/day
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Recommendations</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>High utilization - consider premium pricing during peak hours</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span>Schedule maintenance during low-usage periods (Sunday morning)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Parking Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {extendedData.recentSessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="font-mono font-bold">{session.vehicleLicensePlate}</div>
                        <div className="text-xs text-muted-foreground capitalize">{session.vehicleType}</div>
                      </div>
                      <div>
                        <div className="font-medium">{session.ownerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateTime(session.entryTime)} - {formatDateTime(session.exitTime)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Duration: {formatDuration(session.duration)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{formatCurrency(session.cost)}</div>
                      <div className="text-xs text-muted-foreground">
                        {(session.cost / (session.duration / 60)).toFixed(2)}/hr
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance History & Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {extendedData.maintenanceHistory.map(maintenance => (
                  <div key={maintenance.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className={cn(
                      "p-2 rounded-full",
                      maintenance.status === 'completed' ? 'bg-green-100 text-green-600' :
                      maintenance.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                      'bg-yellow-100 text-yellow-600'
                    )}>
                      {maintenance.status === 'completed' ? <CheckCircle className="h-4 w-4" /> :
                       maintenance.status === 'in-progress' ? <Clock className="h-4 w-4" /> :
                       <Calendar className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{maintenance.description}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>Type: {maintenance.type}</span>
                            <span>Assigned: {maintenance.assignedTo}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Scheduled: {formatDateTime(maintenance.scheduledDate)}
                            {maintenance.completedDate && (
                              <span> • Completed: {formatDateTime(maintenance.completedDate)}</span>
                            )}
                          </div>
                          {maintenance.notes && (
                            <p className="text-sm mt-2 p-2 bg-muted rounded">{maintenance.notes}</p>
                          )}
                        </div>
                        <Badge 
                          variant={
                            maintenance.status === 'completed' ? 'default' :
                            maintenance.status === 'in-progress' ? 'secondary' :
                            'outline'
                          }
                        >
                          {maintenance.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper component for labels
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-sm font-medium text-muted-foreground">{children}</label>
)

export default SpotDetails
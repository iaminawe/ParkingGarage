import React, { useState, useEffect } from 'react'
import { Edit, History, MapPin, Clock, DollarSign, Calendar, Phone, Mail, User, Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loading } from '@/components/ui/loading'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDate, formatCurrency, formatDuration } from '@/utils/formatting'
import { apiService } from '@/services/api'
import type { VehicleWithParkingInfo, ParkingSession } from '@/types/api'

interface VehicleDetailsProps {
  vehicle: VehicleWithParkingInfo
  onEdit?: () => void
  onViewHistory?: () => void
  className?: string
}

export const VehicleDetails: React.FC<VehicleDetailsProps> = ({
  vehicle,
  onEdit,
  onViewHistory,
  className,
}) => {
  const [currentSession, setCurrentSession] = useState<ParkingSession | null>(null)
  const [recentSessions, setRecentSessions] = useState<ParkingSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load additional vehicle data
  useEffect(() => {
    const loadVehicleDetails = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Load current session if vehicle is parked
        if (vehicle.currentSession) {
          const sessionResponse = await apiService.getSessionById(vehicle.currentSession.id)
          if (sessionResponse.success) {
            setCurrentSession(sessionResponse.data)
          }
        }

        // Load recent sessions
        const sessionsResponse = await apiService.getSessions()
        if (sessionsResponse.success) {
          const vehicleSessions = sessionsResponse.data
            .filter(session => session.vehicleId === vehicle.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5) // Get last 5 sessions
          
          setRecentSessions(vehicleSessions)
        }
      } catch (err) {
        console.error('Failed to load vehicle details:', err)
        setError('Failed to load vehicle details')
      } finally {
        setLoading(false)
      }
    }

    loadVehicleDetails()
  }, [vehicle.id, vehicle.currentSession])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'blocked':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getVehicleTypeIcon = () => {
    switch (vehicle.type) {
      case 'motorcycle':
        return '🏍️'
      case 'truck':
        return '🚛'
      case 'van':
        return '🚐'
      case 'bus':
        return '🚌'
      default:
        return '🚗'
    }
  }

  return (
    <div className={className}>
      {error && (
        <Alert className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Vehicle Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getVehicleTypeIcon()}</div>
                  <div>
                    <CardTitle className="text-2xl font-bold">
                      {vehicle.licensePlate}
                    </CardTitle>
                    <CardDescription className="text-lg">
                      {vehicle.make} {vehicle.model}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(vehicle.status)}>
                    {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                  </Badge>
                  {currentSession && (
                    <Badge variant="secondary">Currently Parked</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Type</div>
                  <div className="font-medium">
                    {vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Color</div>
                  <div className="font-medium">{vehicle.color}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{formatDate(vehicle.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Last Updated</div>
                  <div className="font-medium">{formatDate(vehicle.updatedAt)}</div>
                </div>
              </div>

              {vehicle.notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Notes</div>
                    <div className="p-3 bg-muted rounded-md">{vehicle.notes}</div>
                  </div>
                </>
              )}

              <Separator className="my-4" />
              
              <div className="flex gap-2">
                <Button onClick={onEdit} variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Vehicle
                </Button>
                <Button onClick={onViewHistory} variant="outline">
                  <History className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Owner Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Owner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{vehicle.ownerName}</span>
              </div>
              
              {vehicle.ownerEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${vehicle.ownerEmail}`}
                    className="text-primary hover:underline"
                  >
                    {vehicle.ownerEmail}
                  </a>
                </div>
              )}
              
              {vehicle.ownerPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`tel:${vehicle.ownerPhone}`}
                    className="text-primary hover:underline"
                  >
                    {vehicle.ownerPhone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Parking Session */}
          {currentSession && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Current Parking Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loading size="sm" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Entry Time</div>
                        <div className="font-medium">{formatDate(currentSession.entryTime)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Duration</div>
                        <div className="font-medium">
                          {formatDuration(
                            Math.floor((new Date().getTime() - new Date(currentSession.entryTime).getTime()) / 60000)
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Status</div>
                        <Badge variant={currentSession.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                          {currentSession.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                    
                    {currentSession.spot && (
                      <div>
                        <div className="text-sm text-muted-foreground">Parking Spot</div>
                        <div className="font-medium">
                          Spot {currentSession.spot.spotNumber} - Floor {currentSession.spot.floor}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Parking Sessions
                </CardTitle>
                <Button variant="ghost" onClick={onViewHistory} className="text-sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loading size="sm" />
                </div>
              ) : recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {recentSessions.slice(0, 3).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div>
                        <div className="font-medium">{formatDate(session.entryTime)}</div>
                        <div className="text-sm text-muted-foreground">
                          {session.exitTime ? (
                            `${formatDuration(session.duration || 0)} • ${formatCurrency(session.totalCost || 0)}`
                          ) : (
                            'In progress'
                          )}
                        </div>
                      </div>
                      <Badge variant={
                        session.status === 'completed' ? 'default' : 
                        session.status === 'active' ? 'secondary' : 'outline'
                      }>
                        {session.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No parking sessions found
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statistics Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{vehicle.totalSessions || 0}</div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </div>
              
              <Separator />
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(vehicle.totalSpent || 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Spent</div>
              </div>
              
              <Separator />
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {formatDuration(vehicle.averageDuration || 0)}
                </div>
                <div className="text-sm text-muted-foreground">Average Duration</div>
              </div>
              
              <Separator />
              
              <div className="text-center">
                <div className="text-lg font-medium">
                  {vehicle.lastParked ? formatDate(vehicle.lastParked) : 'Never'}
                </div>
                <div className="text-sm text-muted-foreground">Last Parked</div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Vehicle
              </Button>
              <Button className="w-full" variant="outline" onClick={onViewHistory}>
                <History className="h-4 w-4 mr-2" />
                View Full History
              </Button>
              {!currentSession && (
                <Button className="w-full">
                  <Car className="h-4 w-4 mr-2" />
                  Park Vehicle
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default VehicleDetails
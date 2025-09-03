import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Building2,
  Car, 
  Users, 
  MapPin, 
  Clock, 
  DollarSign,
  RefreshCw,
  Activity,
  BarChart3,
  AlertTriangle
} from 'lucide-react'
import { apiService } from '@/services/api'
import type { ParkingGarage, FloorStatistics } from '@/types/api'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface DashboardData {
  garages: ParkingGarage[]
  liveStatus: any
  floorStats: FloorStatistics | null
  recentActivity: any[]
  currentSessions: any[]
}

export function EnhancedDashboard() {
  const { toast } = useToast()
  const [data, setData] = useState<DashboardData>({
    garages: [],
    liveStatus: null,
    floorStats: null,
    recentActivity: [],
    currentSessions: []
  })
  const [selectedGarage, setSelectedGarage] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedGarage) {
      fetchLiveData()
    }
  }, [selectedGarage])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedGarage) {
        fetchLiveData(true)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [selectedGarage])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      
      // Fetch garages
      const garagesResponse = await apiService.getGarages()
      if (garagesResponse.success && garagesResponse.data.length > 0) {
        setData(prev => ({ ...prev, garages: garagesResponse.data }))
        setSelectedGarage(garagesResponse.data[0].id)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load initial data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchLiveData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)

      // Fetch all data concurrently
      const [liveStatusResponse, floorStatsResponse, recentActivityResponse, currentSessionsResponse] = await Promise.allSettled([
        apiService.getLiveGarageStatus(selectedGarage),
        apiService.getFloorStatistics(selectedGarage),
        apiService.getRecentActivity({ limit: 10, garageId: selectedGarage }),
        apiService.getCurrentSessions({ garageId: selectedGarage, limit: 20 })
      ])

      const newData: Partial<DashboardData> = {}

      if (liveStatusResponse.status === 'fulfilled' && liveStatusResponse.value.success) {
        newData.liveStatus = liveStatusResponse.value.data
      }

      if (floorStatsResponse.status === 'fulfilled' && floorStatsResponse.value.success) {
        newData.floorStats = floorStatsResponse.value.data
      }

      if (recentActivityResponse.status === 'fulfilled' && recentActivityResponse.value.success) {
        newData.recentActivity = recentActivityResponse.value.data
      }

      if (currentSessionsResponse.status === 'fulfilled' && currentSessionsResponse.value.success) {
        newData.currentSessions = currentSessionsResponse.value.data
      }

      setData(prev => ({ ...prev, ...newData }))
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch live data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchLiveData(true)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getOccupancyBadgeColor = (rate: number) => {
    if (rate >= 90) return 'bg-red-100 text-red-800 border-red-200'
    if (rate >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="text-center py-8">Loading dashboard...</div>
      </div>
    )
  }

  const overallStatus = data.liveStatus?.overall || { totalSpots: 0, availableSpots: 0, occupiedSpots: 0, occupancyRate: 0 }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Parking Management Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Select value={selectedGarage} onValueChange={setSelectedGarage}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select garage" />
              </SelectTrigger>
              <SelectContent>
                {data.garages.map(garage => (
                  <SelectItem key={garage.id} value={garage.id}>
                    {garage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {formatTime(lastUpdated)}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Car className="h-4 w-4" />
              Total Spots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStatus.totalSpots}</div>
            <p className="text-xs text-gray-500 mt-1">Across all floors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallStatus.availableSpots}</div>
            <p className="text-xs text-gray-500 mt-1">Ready for parking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Occupied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{overallStatus.occupiedSpots}</div>
            <p className="text-xs text-gray-500 mt-1">Currently parked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Occupancy Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", getOccupancyColor(overallStatus.occupancyRate))}>
              {Math.round(overallStatus.occupancyRate)}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all",
                  overallStatus.occupancyRate >= 90 ? "bg-red-500" : 
                  overallStatus.occupancyRate >= 70 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${Math.min(overallStatus.occupancyRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Floor Breakdown */}
        {data.liveStatus?.garages?.[0]?.floors && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Floor Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.liveStatus.garages[0].floors.map((floor: any) => (
                  <div key={floor.floorNumber} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Floor {floor.floorNumber}</div>
                        <div className="text-sm text-gray-500">
                          {floor.totalSpots} total spots
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={cn(getOccupancyBadgeColor(floor.occupancyRate))}>
                        {Math.round(floor.occupancyRate)}%
                      </Badge>
                      <div className="text-sm text-gray-500 mt-1">
                        {floor.availableSpots} available
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500">No recent activity</p>
              ) : (
                data.recentActivity.slice(0, 6).map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <div className={cn(
                      "p-1.5 rounded-full",
                      activity.type === 'checkin' ? 'bg-green-100' : 'bg-red-100'
                    )}>
                      {activity.type === 'checkin' ? 
                        <Car className="h-3 w-3 text-green-600" /> : 
                        <Car className="h-3 w-3 text-red-600" />
                      }
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{activity.licensePlate}</div>
                      <div className="text-xs text-gray-500">
                        {activity.type === 'checkin' ? 'Checked in' : 'Checked out'} • 
                        Floor {activity.floor}-{activity.bay ? `${activity.bay}-` : ''}Spot {activity.spotNumber}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Sessions Summary */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Parking Sessions
              <Badge variant="secondary">{data.currentSessions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.currentSessions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No active parking sessions</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.currentSessions.slice(0, 6).map((session: any) => (
                  <div key={session.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium">{session.vehicle?.licensePlate}</div>
                      <Badge variant="outline" className="text-xs">
                        {Math.floor((session.duration || 0) / 60)}h {(session.duration || 0) % 60}m
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Floor {session.spot?.floor}, Bay {session.spot?.bay}, Spot {session.spot?.spotNumber}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${session.estimatedCost?.toFixed(2) || '0.00'} estimated
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {data.currentSessions.length > 6 && (
              <div className="text-center mt-4">
                <Button variant="outline" size="sm">
                  View All Sessions ({data.currentSessions.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Alerts */}
        {data.floorStats && data.floorStats.occupancyRate > 90 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                High Occupancy Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-700">
                Parking garage is {Math.round(data.floorStats.occupancyRate)}% full. 
                Consider directing new vehicles to alternative locations.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default EnhancedDashboard
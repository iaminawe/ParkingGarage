import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/loading'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  Users,
  Car,
  AlertCircle,
  Calendar
} from 'lucide-react'

interface AnalyticsViewProps {
  garageId: string
  sharedState: {
    selectedFloor: number
    searchQuery: string
    statusFilter: string
    typeFilter: string
    lastRefresh: Date
  }
  className?: string
}

interface AnalyticsData {
  occupancyRate: number
  averageStayDuration: number
  revenueToday: number
  peakHours: { hour: number; occupancy: number }[]
  spotTypeDistribution: { type: string; count: number; utilization: number }[]
  floorComparison: { floor: number; occupancy: number; revenue: number }[]
  trends: {
    occupancyChange: number
    revenueChange: number
    durationChange: number
  }
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  garageId,
  sharedState,
  className = ''
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('today')

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true)
      
      // Simulate API call - replace with real implementation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock data
      setData({
        occupancyRate: 73.2,
        averageStayDuration: 2.4,
        revenueToday: 1847.50,
        peakHours: [
          { hour: 8, occupancy: 45 },
          { hour: 9, occupancy: 78 },
          { hour: 10, occupancy: 85 },
          { hour: 11, occupancy: 82 },
          { hour: 12, occupancy: 90 },
          { hour: 13, occupancy: 88 },
          { hour: 14, occupancy: 75 },
          { hour: 15, occupancy: 70 },
          { hour: 16, occupancy: 65 },
          { hour: 17, occupancy: 85 },
          { hour: 18, occupancy: 92 },
        ],
        spotTypeDistribution: [
          { type: 'Standard', count: 180, utilization: 75 },
          { type: 'EV Charging', count: 40, utilization: 85 },
          { type: 'Compact', count: 20, utilization: 60 },
          { type: 'Oversized', count: 10, utilization: 90 }
        ],
        floorComparison: [
          { floor: 1, occupancy: 85, revenue: 420.50 },
          { floor: 2, occupancy: 78, revenue: 390.25 },
          { floor: 3, occupancy: 65, revenue: 325.75 },
          { floor: 4, occupancy: 72, revenue: 360.00 },
          { floor: 5, occupancy: 68, revenue: 340.25 }
        ],
        trends: {
          occupancyChange: 5.2,
          revenueChange: 12.8,
          durationChange: -0.3
        }
      })
      
      setLoading(false)
    }

    loadAnalytics()
  }, [garageId, selectedTimeRange, sharedState.lastRefresh])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Unable to load analytics data</p>
      </div>
    )
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <div className="h-4 w-4" />
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Time Range Selector */}
      <Tabs value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="quarter">Quarter</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTimeRange} className="space-y-6 mt-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Occupancy Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{data.occupancyRate}%</span>
                    <div className={`flex items-center gap-1 text-sm ${getTrendColor(data.trends.occupancyChange)}`}>
                      {getTrendIcon(data.trends.occupancyChange)}
                      {Math.abs(data.trends.occupancyChange)}%
                    </div>
                  </div>
                  <Progress value={data.occupancyRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Avg. Stay Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{data.averageStayDuration}h</span>
                    <div className={`flex items-center gap-1 text-sm ${getTrendColor(data.trends.durationChange)}`}>
                      {getTrendIcon(data.trends.durationChange)}
                      {Math.abs(data.trends.durationChange)}h
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Revenue Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">${data.revenueToday}</span>
                    <div className={`flex items-center gap-1 text-sm ${getTrendColor(data.trends.revenueChange)}`}>
                      {getTrendIcon(data.trends.revenueChange)}
                      {Math.abs(data.trends.revenueChange)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Peak Occupancy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">92%</span>
                    <span className="text-sm text-muted-foreground">at 6 PM</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Hourly Occupancy Pattern
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.peakHours.map(({ hour, occupancy }) => (
                    <div key={hour} className="flex items-center gap-3">
                      <div className="w-12 text-sm text-muted-foreground">
                        {hour}:00
                      </div>
                      <Progress value={occupancy} className="flex-1 h-2" />
                      <div className="w-12 text-sm font-medium text-right">
                        {occupancy}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Spot Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Spot Type Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.spotTypeDistribution.map(({ type, count, utilization }) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{type}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{count} spots</span>
                          <Badge variant="outline">{utilization}%</Badge>
                        </div>
                      </div>
                      <Progress value={utilization} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Floor Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Floor Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground">
                      <th className="text-left py-2">Floor</th>
                      <th className="text-left py-2">Occupancy Rate</th>
                      <th className="text-left py-2">Revenue</th>
                      <th className="text-left py-2">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.floorComparison.map(({ floor, occupancy, revenue }) => (
                      <tr key={floor} className="border-b">
                        <td className="py-3 font-medium">Floor {floor}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <Progress value={occupancy} className="w-24 h-2" />
                            <span className="text-sm">{occupancy}%</span>
                          </div>
                        </td>
                        <td className="py-3">${revenue}</td>
                        <td className="py-3">
                          <Badge 
                            variant={occupancy >= 80 ? 'success' : occupancy >= 60 ? 'warning' : 'secondary'}
                          >
                            {occupancy >= 80 ? 'Excellent' : occupancy >= 60 ? 'Good' : 'Needs Attention'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AnalyticsView
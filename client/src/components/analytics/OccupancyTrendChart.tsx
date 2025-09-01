import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/utils/cn'
import { apiService } from '@/services/api'
import type { AnalyticsFilters, OccupancyTrendData } from '@/types/api'

interface OccupancyTrendChartProps {
  filters: AnalyticsFilters
}

type ViewMode = 'hourly' | 'daily' | 'weekly' | 'monthly'
type ChartType = 'line' | 'area'

const OccupancyTrendChart: React.FC<OccupancyTrendChartProps> = ({ filters }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [showPeakHours, setShowPeakHours] = useState(true)

  // Fetch occupancy trend data
  const { 
    data: occupancyData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['occupancy-trends', filters, viewMode],
    queryFn: () => apiService.getOccupancyTrends(filters, viewMode),
    refetchInterval: viewMode === 'hourly' ? 30000 : undefined // Refresh every 30s for hourly view
  })

  // Process and format data for the chart
  const chartData = useMemo(() => {
    if (!occupancyData?.data) return []

    return occupancyData.data.map((item: OccupancyTrendData) => ({
      ...item,
      timestamp: item.timestamp,
      formattedTime: formatTimestamp(item.timestamp, viewMode),
      utilizationPercentage: Math.round((item.occupiedSpots / item.totalSpots) * 100)
    }))
  }, [occupancyData?.data, viewMode])

  // Calculate statistics
  const stats = useMemo(() => {
    if (!chartData.length) {
      return {
        averageOccupancy: 0,
        peakOccupancy: 0,
        lowestOccupancy: 100,
        trend: 'stable' as const,
        trendPercentage: 0
      }
    }

    const occupancyRates = chartData.map(d => d.utilizationPercentage)
    const averageOccupancy = occupancyRates.reduce((sum, rate) => sum + rate, 0) / occupancyRates.length
    const peakOccupancy = Math.max(...occupancyRates)
    const lowestOccupancy = Math.min(...occupancyRates)

    // Calculate trend (comparing first half vs second half)
    const halfPoint = Math.floor(occupancyRates.length / 2)
    const firstHalfAvg = occupancyRates.slice(0, halfPoint).reduce((sum, rate) => sum + rate, 0) / halfPoint
    const secondHalfAvg = occupancyRates.slice(halfPoint).reduce((sum, rate) => sum + rate, 0) / (occupancyRates.length - halfPoint)
    const trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (Math.abs(trendPercentage) > 5) {
      trend = trendPercentage > 0 ? 'up' : 'down'
    }

    return {
      averageOccupancy: Math.round(averageOccupancy),
      peakOccupancy,
      lowestOccupancy,
      trend,
      trendPercentage: Math.abs(trendPercentage)
    }
  }, [chartData])

  // Format timestamp based on view mode
  function formatTimestamp(timestamp: string, mode: ViewMode): string {
    const date = parseISO(timestamp)
    
    switch (mode) {
      case 'hourly':
        return format(date, 'HH:mm')
      case 'daily':
        return format(date, 'MMM d')
      case 'weekly':
        return format(date, 'MMM d')
      case 'monthly':
        return format(date, 'MMM yyyy')
      default:
        return format(date, 'MMM d')
    }
  }

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ payload: OccupancyTrendData }>
    label?: string
  }) => {
    if (!active || !payload?.length) return null

    const data = payload[0].payload
    
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium">{label}</p>
        <div className="space-y-1 mt-2">
          <div className="flex justify-between items-center space-x-4">
            <span className="text-sm text-gray-600">Occupied:</span>
            <span className="font-medium">{data.occupiedSpots} spots</span>
          </div>
          <div className="flex justify-between items-center space-x-4">
            <span className="text-sm text-gray-600">Total:</span>
            <span className="font-medium">{data.totalSpots} spots</span>
          </div>
          <div className="flex justify-between items-center space-x-4">
            <span className="text-sm text-gray-600">Occupancy:</span>
            <span className="font-medium text-blue-600">
              {data.utilizationPercentage}%
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Get peak hours for reference lines
  const peakHours = useMemo(() => {
    if (!showPeakHours || viewMode !== 'hourly' || !chartData.length) return []
    
    const sorted = [...chartData].sort((a, b) => b.utilizationPercentage - a.utilizationPercentage)
    return sorted.slice(0, 2) // Top 2 peak hours
  }, [chartData, showPeakHours, viewMode])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Occupancy Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading occupancy data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Occupancy Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-red-600">Failed to load occupancy data</p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const TrendIcon = stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Occupancy</p>
                <p className="text-2xl font-bold">{stats.averageOccupancy}%</p>
              </div>
              <div className={cn(
                'flex items-center space-x-1 px-2 py-1 rounded-full text-xs',
                stats.trend === 'up' ? 'bg-red-100 text-red-700' :
                stats.trend === 'down' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              )}>
                <TrendIcon className="h-3 w-3" />
                <span>{stats.trendPercentage.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Peak Occupancy</p>
              <p className="text-2xl font-bold text-red-600">{stats.peakOccupancy}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Lowest Occupancy</p>
              <p className="text-2xl font-bold text-green-600">{stats.lowestOccupancy}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Data Points</p>
              <p className="text-2xl font-bold">{chartData.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Occupancy Trends</CardTitle>
            <div className="flex items-center space-x-2">
              {/* View Mode Selector */}
              <div className="flex space-x-1">
                {(['hourly', 'daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="capitalize"
                  >
                    {mode}
                  </Button>
                ))}
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Chart Type Selector */}
              <div className="flex space-x-1">
                <Button
                  variant={chartType === 'line' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('line')}
                >
                  Line
                </Button>
                <Button
                  variant={chartType === 'area' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('area')}
                >
                  Area
                </Button>
              </div>

              {viewMode === 'hourly' && (
                <>
                  <Separator orientation="vertical" className="h-6" />
                  <Button
                    variant={showPeakHours ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowPeakHours(!showPeakHours)}
                  >
                    Peak Hours
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="formattedTime" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {/* Peak hour reference lines */}
                  {peakHours.map((peak, index) => (
                    <ReferenceLine
                      key={index}
                      x={peak.formattedTime}
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      label={{ value: "Peak", position: "top" }}
                    />
                  ))}

                  <Area
                    type="monotone"
                    dataKey="utilizationPercentage"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name="Occupancy %"
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="formattedTime" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {/* Peak hour reference lines */}
                  {peakHours.map((peak, index) => (
                    <ReferenceLine
                      key={index}
                      x={peak.formattedTime}
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      label={{ value: "Peak", position: "top" }}
                    />
                  ))}

                  <Line
                    type="monotone"
                    dataKey="utilizationPercentage"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    name="Occupancy %"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights & Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Occupancy Patterns</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>
                    • Average occupancy rate is{' '}
                    <span className="font-medium">{stats.averageOccupancy}%</span>
                    {stats.averageOccupancy > 80 && (
                      <span className="text-red-600"> - Consider capacity expansion</span>
                    )}
                  </li>
                  <li>
                    • Peak occupancy reaches{' '}
                    <span className="font-medium">{stats.peakOccupancy}%</span>
                  </li>
                  <li>
                    • Utilization trend is{' '}
                    <span className={cn(
                      'font-medium',
                      stats.trend === 'up' ? 'text-red-600' :
                      stats.trend === 'down' ? 'text-green-600' :
                      'text-gray-600'
                    )}>
                      {stats.trend === 'up' ? 'increasing' :
                       stats.trend === 'down' ? 'decreasing' : 'stable'}
                    </span>
                    {' '}by {stats.trendPercentage.toFixed(1)}%
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Recommendations</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {stats.averageOccupancy > 85 && (
                    <li>• Consider dynamic pricing during peak hours</li>
                  )}
                  {stats.peakOccupancy > 95 && (
                    <li>• Implement reservation system for high-demand periods</li>
                  )}
                  {stats.lowestOccupancy < 30 && (
                    <li>• Offer promotional rates during low-demand periods</li>
                  )}
                  {stats.trend === 'up' && stats.trendPercentage > 10 && (
                    <li>• Monitor capacity constraints and plan for expansion</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default OccupancyTrendChart
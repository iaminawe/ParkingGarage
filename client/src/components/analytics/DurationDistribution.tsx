import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  ComposedChart,
  Line
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Clock, Timer, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { apiService } from '@/services/api'
import type { AnalyticsFilters, DurationData } from '@/types/api'

interface DurationDistributionProps {
  filters: AnalyticsFilters
}

type ChartType = 'histogram' | 'area' | 'combined'
type TimeUnit = 'minutes' | 'hours'

const DurationDistribution: React.FC<DurationDistributionProps> = ({ filters }) => {
  const [chartType, setChartType] = useState<ChartType>('histogram')
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('hours')
  const [showAverage, setShowAverage] = useState(true)
  const [showMedian, setShowMedian] = useState(false)

  // Fetch duration distribution data
  const { 
    data: durationData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['duration-distribution', filters],
    queryFn: () => apiService.getDurationDistribution(filters)
  })

  // Process and format data for charts
  const chartData = useMemo(() => {
    if (!durationData?.data) return []

    return durationData.data.map((item: DurationData) => {
      // Convert average duration from minutes to selected unit
      const avgDuration = timeUnit === 'hours' 
        ? item.averageDuration / 60 
        : item.averageDuration

      return {
        ...item,
        displayDuration: avgDuration,
        formattedRange: formatDurationRange(item.durationRange, timeUnit),
        density: (item.count / getTotalCount()) * 100 // For area chart
      }
    })
  }, [durationData?.data, timeUnit])

  // Calculate statistics
  const stats = useMemo(() => {
    if (!chartData.length) {
      return {
        totalSessions: 0,
        averageDuration: 0,
        medianDuration: 0,
        shortestDuration: 0,
        longestDuration: 0,
        mode: null,
        standardDeviation: 0
      }
    }

    const totalSessions = chartData.reduce((sum, item) => sum + item.count, 0)
    
    // Calculate weighted average
    const weightedSum = chartData.reduce((sum, item) => sum + (item.displayDuration * item.count), 0)
    const averageDuration = weightedSum / totalSessions

    // Find mode (most common duration range)
    const mode = chartData.reduce((max, current) => 
      current.count > max.count ? current : max
    )

    // Estimate median (approximate, since we have ranges)
    let cumulativeCount = 0
    let medianDuration = 0
    for (const item of chartData) {
      cumulativeCount += item.count
      if (cumulativeCount >= totalSessions / 2) {
        medianDuration = item.displayDuration
        break
      }
    }

    // Calculate standard deviation (approximation)
    const variance = chartData.reduce((sum, item) => {
      const diff = item.displayDuration - averageDuration
      return sum + (diff * diff * item.count)
    }, 0) / totalSessions
    const standardDeviation = Math.sqrt(variance)

    return {
      totalSessions,
      averageDuration: Math.round(averageDuration * 100) / 100,
      medianDuration: Math.round(medianDuration * 100) / 100,
      shortestDuration: Math.min(...chartData.map(item => item.displayDuration)),
      longestDuration: Math.max(...chartData.map(item => item.displayDuration)),
      mode,
      standardDeviation: Math.round(standardDeviation * 100) / 100
    }
  }, [chartData])

  function getTotalCount(): number {
    return chartData.reduce((sum, item) => sum + item.count, 0)
  }

  function formatDurationRange(range: string, unit: TimeUnit): string {
    // Parse range like "60-120" and convert to display format
    const [min, max] = range.split('-').map(Number)
    
    if (unit === 'hours') {
      const minHours = min / 60
      const maxHours = max / 60
      if (minHours < 1 && maxHours < 1) {
        return `${min}-${max}min`
      }
      return `${minHours.toFixed(1)}-${maxHours.toFixed(1)}h`
    }
    
    return `${min}-${max}min`
  }

  function formatDuration(minutes: number): string {
    if (timeUnit === 'hours') {
      const hours = minutes / 60
      if (hours < 1) {
        return `${Math.round(minutes)}min`
      }
      return `${hours.toFixed(1)}h`
    }
    return `${Math.round(minutes)}min`
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null

    const data = payload[0].payload
    
    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg min-w-48">
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Sessions:</span>
            <span className="font-medium">{data.count.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Percentage:</span>
            <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Avg Duration:</span>
            <span className="font-medium">
              {formatDuration(data.averageDuration)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Parking Duration Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading duration data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Parking Duration Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-red-600">Failed to load duration data</p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!chartData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Parking Duration Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-gray-500">No duration data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Average Duration</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatDuration(stats.averageDuration * (timeUnit === 'hours' ? 60 : 1))}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Median Duration</p>
              <p className="text-2xl font-bold text-green-600">
                {formatDuration(stats.medianDuration * (timeUnit === 'hours' ? 60 : 1))}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Most Common</p>
              <p className="text-lg font-bold">
                {stats.mode?.formattedRange || 'N/A'}
              </p>
              <p className="text-sm text-orange-600">
                {stats.mode?.count.toLocaleString()} sessions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Std Deviation</p>
              <p className="text-2xl font-bold">
                {formatDuration(stats.standardDeviation * (timeUnit === 'hours' ? 60 : 1))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Parking Duration Distribution</CardTitle>
            <div className="flex items-center space-x-2">
              {/* Chart Type Selector */}
              <div className="flex space-x-1">
                <Button
                  variant={chartType === 'histogram' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('histogram')}
                >
                  Histogram
                </Button>
                <Button
                  variant={chartType === 'area' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('area')}
                >
                  Area
                </Button>
                <Button
                  variant={chartType === 'combined' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('combined')}
                >
                  Combined
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Time Unit Selector */}
              <div className="flex space-x-1">
                <Button
                  variant={timeUnit === 'minutes' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeUnit('minutes')}
                >
                  Minutes
                </Button>
                <Button
                  variant={timeUnit === 'hours' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeUnit('hours')}
                >
                  Hours
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Reference Lines */}
              <Button
                variant={showAverage ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowAverage(!showAverage)}
              >
                Avg
              </Button>
              <Button
                variant={showMedian ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowMedian(!showMedian)}
              >
                Median
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'histogram' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="formattedRange" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Sessions', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {showAverage && (
                    <ReferenceLine
                      x={chartData.find(item => 
                        Math.abs(item.displayDuration - stats.averageDuration) === 
                        Math.min(...chartData.map(d => Math.abs(d.displayDuration - stats.averageDuration)))
                      )?.formattedRange}
                      stroke="#3b82f6"
                      strokeDasharray="5 5"
                      label={{ value: "Avg", position: "top" }}
                    />
                  )}

                  {showMedian && (
                    <ReferenceLine
                      x={chartData.find(item => 
                        Math.abs(item.displayDuration - stats.medianDuration) === 
                        Math.min(...chartData.map(d => Math.abs(d.displayDuration - stats.medianDuration)))
                      )?.formattedRange}
                      stroke="#10b981"
                      strokeDasharray="5 5"
                      label={{ value: "Median", position: "top" }}
                    />
                  )}

                  <Bar 
                    dataKey="count" 
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="formattedRange" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Density (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Area
                    type="monotone"
                    dataKey="density"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                </AreaChart>
              ) : (
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="formattedRange" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    yAxisId="count"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Sessions', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="percentage"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Percentage (%)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Bar 
                    yAxisId="count"
                    dataKey="count" 
                    fill="#3b82f6"
                    fillOpacity={0.7}
                    radius={[4, 4, 0, 0]}
                  />
                  
                  <Line
                    yAxisId="percentage"
                    type="monotone"
                    dataKey="percentage"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Duration Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Timer className="h-5 w-5" />
              <span>Duration Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Short Stays (&lt; 1h):</span>
                <span className="font-medium">
                  {chartData
                    .filter(item => item.averageDuration < 60)
                    .reduce((sum, item) => sum + item.count, 0)
                    .toLocaleString()} sessions
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Medium Stays (1-4h):</span>
                <span className="font-medium">
                  {chartData
                    .filter(item => item.averageDuration >= 60 && item.averageDuration < 240)
                    .reduce((sum, item) => sum + item.count, 0)
                    .toLocaleString()} sessions
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Long Stays (4-8h):</span>
                <span className="font-medium">
                  {chartData
                    .filter(item => item.averageDuration >= 240 && item.averageDuration < 480)
                    .reduce((sum, item) => sum + item.count, 0)
                    .toLocaleString()} sessions
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Extended Stays (&gt; 8h):</span>
                <span className="font-medium">
                  {chartData
                    .filter(item => item.averageDuration >= 480)
                    .reduce((sum, item) => sum + item.count, 0)
                    .toLocaleString()} sessions
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Insights & Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-2">
                {stats.averageDuration > 240 && (
                  <div className="flex items-start space-x-2 p-2 bg-yellow-50 rounded">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-yellow-700">
                      High average duration suggests possible long-term parking abuse
                    </span>
                  </div>
                )}
                
                {stats.mode && stats.mode.count > stats.totalSessions * 0.3 && (
                  <div className="flex items-start space-x-2 p-2 bg-blue-50 rounded">
                    <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-blue-700">
                      Strong preference for {stats.mode.formattedRange} duration
                    </span>
                  </div>
                )}
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    • Average stay: <strong>{formatDuration(stats.averageDuration * (timeUnit === 'hours' ? 60 : 1))}</strong>
                  </p>
                  <p>
                    • Most parking sessions last: <strong>{stats.mode?.formattedRange}</strong>
                  </p>
                  <p>
                    • Duration variability: <strong>
                      {stats.standardDeviation < stats.averageDuration * 0.5 ? 'Low' : 
                       stats.standardDeviation < stats.averageDuration ? 'Moderate' : 'High'}
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DurationDistribution
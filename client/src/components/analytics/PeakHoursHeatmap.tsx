import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, TrendingUp, Users, Loader2, Thermometer } from 'lucide-react'
import { cn } from '@/utils/cn'
import { apiService } from '@/services/api'
import type { AnalyticsFilters, PeakHoursData } from '@/types/api'

interface PeakHoursHeatmapProps {
  filters: AnalyticsFilters
}

type ViewMode = 'occupancy' | 'sessions' | 'both'
type ColorScale = 'red' | 'blue' | 'green' | 'purple'

const PeakHoursHeatmap: React.FC<PeakHoursHeatmapProps> = ({ filters }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('occupancy')
  const [colorScale, setColorScale] = useState<ColorScale>('red')
  const [showValues, setShowValues] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{hour: number, day: number} | null>(null)

  // Fetch peak hours data
  const { 
    data: peakHoursData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['peak-hours', filters],
    queryFn: () => apiService.getPeakHoursData(filters)
  })

  // Day names
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  // Hours array (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // Process data into heatmap format
  const heatmapData = useMemo(() => {
    if (!peakHoursData?.data) return []

    // Create a 7x24 grid (days x hours)
    const grid: Array<Array<PeakHoursData | null>> = Array(7).fill(null).map(() => Array(24).fill(null))

    // Fill the grid with data
    peakHoursData.data.forEach((item: PeakHoursData) => {
      if (item.dayOfWeek >= 0 && item.dayOfWeek < 7 && item.hour >= 0 && item.hour < 24) {
        grid[item.dayOfWeek][item.hour] = item
      }
    })

    return grid
  }, [peakHoursData?.data])

  // Calculate statistics
  const stats = useMemo(() => {
    if (!peakHoursData?.data) {
      return {
        peakHour: null,
        peakDay: null,
        averageOccupancy: 0,
        averageSessions: 0,
        quietestHour: null,
        quietestDay: null,
        totalSessions: 0
      }
    }

    const data = peakHoursData.data
    const peakOccupancy = data.reduce((max, current) => 
      current.occupancyRate > max.occupancyRate ? current : max
    )
    
    const quietest = data.reduce((min, current) => 
      current.occupancyRate < min.occupancyRate ? current : min
    )

    const averageOccupancy = data.reduce((sum, item) => sum + item.occupancyRate, 0) / data.length
    const averageSessions = data.reduce((sum, item) => sum + item.sessionCount, 0) / data.length
    const totalSessions = data.reduce((sum, item) => sum + item.sessionCount, 0)

    // Find busiest day of week
    const dayStats = Array(7).fill(0).map((_, day) => ({
      day,
      totalOccupancy: data.filter(item => item.dayOfWeek === day)
        .reduce((sum, item) => sum + item.occupancyRate, 0),
      count: data.filter(item => item.dayOfWeek === day).length
    }))
    
    const busiestDay = dayStats.reduce((max, current) => 
      (current.totalOccupancy / current.count) > (max.totalOccupancy / max.count) ? current : max
    )

    const quietestDay = dayStats.reduce((min, current) => 
      (current.totalOccupancy / current.count) < (min.totalOccupancy / min.count) ? current : min
    )

    return {
      peakHour: peakOccupancy,
      peakDay: busiestDay,
      averageOccupancy: Math.round(averageOccupancy),
      averageSessions: Math.round(averageSessions),
      quietestHour: quietest,
      quietestDay: quietestDay,
      totalSessions
    }
  }, [peakHoursData?.data])

  // Get maximum values for normalization
  const maxValues = useMemo(() => {
    if (!peakHoursData?.data) return { occupancy: 100, sessions: 1 }

    const maxOccupancy = Math.max(...peakHoursData.data.map((item: PeakHoursData) => item.occupancyRate))
    const maxSessions = Math.max(...peakHoursData.data.map((item: PeakHoursData) => item.sessionCount))

    return {
      occupancy: maxOccupancy,
      sessions: maxSessions
    }
  }, [peakHoursData?.data])

  // Get color intensity based on value and mode
  const getColorIntensity = (data: PeakHoursData | null): number => {
    if (!data) return 0

    switch (viewMode) {
      case 'occupancy':
        return data.occupancyRate / maxValues.occupancy
      case 'sessions':
        return data.sessionCount / maxValues.sessions
      case 'both':
        return ((data.occupancyRate / maxValues.occupancy) + (data.sessionCount / maxValues.sessions)) / 2
      default:
        return 0
    }
  }

  // Get color class based on intensity and color scale
  const getColorClass = (intensity: number): string => {
    if (intensity === 0) return 'bg-gray-100'
    
    const level = Math.min(Math.floor(intensity * 5), 4) // 0-4 intensity levels
    
    const colorMaps = {
      red: [
        'bg-red-100', 'bg-red-200', 'bg-red-300', 'bg-red-400', 'bg-red-500'
      ],
      blue: [
        'bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500'
      ],
      green: [
        'bg-green-100', 'bg-green-200', 'bg-green-300', 'bg-green-400', 'bg-green-500'
      ],
      purple: [
        'bg-purple-100', 'bg-purple-200', 'bg-purple-300', 'bg-purple-400', 'bg-purple-500'
      ]
    }

    return colorMaps[colorScale][level]
  }

  // Format hour for display
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12am'
    if (hour === 12) return '12pm'
    if (hour < 12) return `${hour}am`
    return `${hour - 12}pm`
  }

  // Get display value for cell
  const getDisplayValue = (data: PeakHoursData | null): string => {
    if (!data) return ''
    
    switch (viewMode) {
      case 'occupancy':
        return `${data.occupancyRate}%`
      case 'sessions':
        return `${data.sessionCount}`
      case 'both':
        return `${data.occupancyRate}%\n${data.sessionCount}`
      default:
        return ''
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Peak Hours Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading peak hours data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Peak Hours Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-red-600">Failed to load peak hours data</p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Peak Hour</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.peakHour ? formatHour(stats.peakHour.hour) : 'N/A'}
                </p>
                <p className="text-sm text-gray-500">
                  {stats.peakHour?.dayName} - {stats.peakHour?.occupancyRate}%
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Busiest Day</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.peakDay ? dayNames[stats.peakDay.day] : 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                Avg {Math.round((stats.peakDay?.totalOccupancy || 0) / (stats.peakDay?.count || 1))}% occupancy
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Average Occupancy</p>
              <p className="text-2xl font-bold text-blue-600">{stats.averageOccupancy}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Heatmap */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Thermometer className="h-5 w-5" />
              <span>Peak Hours Heatmap</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {/* View Mode Selector */}
              <div className="flex space-x-1">
                <Button
                  variant={viewMode === 'occupancy' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('occupancy')}
                >
                  Occupancy
                </Button>
                <Button
                  variant={viewMode === 'sessions' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('sessions')}
                >
                  Sessions
                </Button>
                <Button
                  variant={viewMode === 'both' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('both')}
                >
                  Both
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Color Scale Selector */}
              <div className="flex space-x-1">
                {(['red', 'blue', 'green', 'purple'] as ColorScale[]).map((scale) => (
                  <Button
                    key={scale}
                    variant={colorScale === scale ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setColorScale(scale)}
                    className={cn(
                      'w-8 h-8 p-0',
                      scale === 'red' && 'bg-red-500 hover:bg-red-600',
                      scale === 'blue' && 'bg-blue-500 hover:bg-blue-600',
                      scale === 'green' && 'bg-green-500 hover:bg-green-600',
                      scale === 'purple' && 'bg-purple-500 hover:bg-purple-600'
                    )}
                  >
                    <span className="sr-only">{scale}</span>
                  </Button>
                ))}
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Show Values Toggle */}
              <Button
                variant={showValues ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowValues(!showValues)}
              >
                Values
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Hour labels */}
              <div className="flex mb-2">
                <div className="w-16"></div> {/* Space for day labels */}
                {hours.map(hour => (
                  <div 
                    key={hour} 
                    className="w-12 text-xs text-center text-gray-600 font-medium"
                  >
                    {hour % 6 === 0 ? formatHour(hour) : hour}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="space-y-1">
                {heatmapData.map((dayData, dayIndex) => (
                  <div key={dayIndex} className="flex items-center">
                    {/* Day label */}
                    <div className="w-16 text-sm font-medium text-gray-700 text-right pr-2">
                      {dayAbbreviations[dayIndex]}
                    </div>
                    
                    {/* Hour cells */}
                    <div className="flex space-x-1">
                      {dayData.map((hourData, hourIndex) => {
                        const intensity = getColorIntensity(hourData)
                        const isSelected = selectedCell?.hour === hourIndex && selectedCell?.day === dayIndex
                        
                        return (
                          <div
                            key={`${dayIndex}-${hourIndex}`}
                            className={cn(
                              'w-12 h-8 border border-gray-200 rounded cursor-pointer transition-all relative',
                              'hover:border-gray-400 hover:scale-105',
                              getColorClass(intensity),
                              isSelected && 'ring-2 ring-gray-900 ring-offset-1'
                            )}
                            onClick={() => setSelectedCell({ hour: hourIndex, day: dayIndex })}
                            title={hourData ? 
                              `${dayNames[dayIndex]} ${formatHour(hourIndex)}: ${hourData.occupancyRate}% occupancy, ${hourData.sessionCount} sessions` : 
                              'No data'
                            }
                          >
                            {showValues && hourData && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={cn(
                                  'text-xs font-medium leading-tight',
                                  intensity > 0.6 ? 'text-white' : 'text-gray-800'
                                )}>
                                  {getDisplayValue(hourData).split('\n')[0]}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Color scale legend */}
              <div className="mt-4 flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {viewMode === 'occupancy' ? 'Occupancy Rate:' : 
                   viewMode === 'sessions' ? 'Session Count:' : 'Combined Intensity:'}
                </span>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">Low</span>
                  {[0, 1, 2, 3, 4].map(level => (
                    <div 
                      key={level}
                      className={cn('w-4 h-4 border border-gray-200', getColorClass(level / 4))}
                    />
                  ))}
                  <span className="text-xs text-gray-500">High</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Cell Details */}
      {selectedCell && heatmapData[selectedCell.day]?.[selectedCell.hour] && (
        <Card>
          <CardHeader>
            <CardTitle>
              {dayNames[selectedCell.day]} at {formatHour(selectedCell.hour)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Occupancy Rate:</span>
                  <span className="font-medium">
                    {heatmapData[selectedCell.day][selectedCell.hour]?.occupancyRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Session Count:</span>
                  <span className="font-medium">
                    {heatmapData[selectedCell.day][selectedCell.hour]?.sessionCount}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">vs Average:</span>
                  <span className={cn(
                    'font-medium',
                    (heatmapData[selectedCell.day][selectedCell.hour]?.occupancyRate || 0) > stats.averageOccupancy
                      ? 'text-red-600' : 'text-green-600'
                  )}>
                    {((heatmapData[selectedCell.day][selectedCell.hour]?.occupancyRate || 0) - stats.averageOccupancy).toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {(heatmapData[selectedCell.day][selectedCell.hour]?.occupancyRate || 0) > stats.averageOccupancy * 1.2 
                    ? 'Peak period' 
                    : (heatmapData[selectedCell.day][selectedCell.hour]?.occupancyRate || 0) < stats.averageOccupancy * 0.7
                    ? 'Low activity period'
                    : 'Moderate activity period'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  Relative to day's peak: <span className="font-medium">
                    {Math.round(((heatmapData[selectedCell.day][selectedCell.hour]?.occupancyRate || 0) / (stats.peakHour?.occupancyRate || 1)) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Peak Hours Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Peak Patterns</span>
              </h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>
                  • Peak hour: <span className="font-medium">
                    {stats.peakHour ? `${dayNames[stats.peakHour.dayOfWeek]} at ${formatHour(stats.peakHour.hour)}` : 'N/A'}
                  </span>
                  {stats.peakHour && (
                    <span className="text-red-600"> ({stats.peakHour.occupancyRate}% occupancy)</span>
                  )}
                </li>
                <li>
                  • Busiest day: <span className="font-medium">
                    {stats.peakDay ? dayNames[stats.peakDay.day] : 'N/A'}
                  </span>
                </li>
                <li>
                  • Quietest period: <span className="font-medium">
                    {stats.quietestHour ? `${dayNames[stats.quietestHour.dayOfWeek]} at ${formatHour(stats.quietestHour.hour)}` : 'N/A'}
                  </span>
                  {stats.quietestHour && (
                    <span className="text-green-600"> ({stats.quietestHour.occupancyRate}% occupancy)</span>
                  )}
                </li>
                <li>
                  • Average occupancy: <span className="font-medium">{stats.averageOccupancy}%</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Operational Recommendations</span>
              </h4>
              <ul className="text-sm text-gray-600 space-y-2">
                {stats.peakHour && stats.peakHour.occupancyRate > 90 && (
                  <li>• Consider dynamic pricing during peak hours to manage demand</li>
                )}
                {stats.quietestHour && stats.quietestHour.occupancyRate < 30 && (
                  <li>• Offer discounted rates during quiet periods to increase utilization</li>
                )}
                <li>• Staff scheduling should align with peak hour patterns</li>
                <li>• Maintenance and cleaning best scheduled during low-activity periods</li>
                {stats.averageOccupancy > 80 && (
                  <li>• High utilization indicates potential for capacity expansion</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PeakHoursHeatmap
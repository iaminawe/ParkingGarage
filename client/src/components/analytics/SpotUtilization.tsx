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
  ScatterChart,
  Scatter,
  ReferenceLine,
  ComposedChart,
  Line
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  Filter
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { apiService } from '@/services/api'
import type { AnalyticsFilters, SpotUtilizationData } from '@/types/api'

interface SpotUtilizationProps {
  filters: AnalyticsFilters
}

type ViewMode = 'utilization' | 'revenue' | 'efficiency' | 'sessions'
type ChartType = 'bar' | 'scatter' | 'combined'
type SortBy = 'utilization' | 'revenue' | 'sessions' | 'spotNumber'
type FilterBy = 'all' | 'low' | 'medium' | 'high' | 'underperforming'

const SpotUtilization: React.FC<SpotUtilizationProps> = ({ filters }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('utilization')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [sortBy, setSortBy] = useState<SortBy>('utilization')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterBy, setFilterBy] = useState<FilterBy>('all')
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all')

  // Fetch spot utilization data
  const { 
    data: spotData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['spot-utilization', filters],
    queryFn: () => apiService.getSpotUtilization(filters)
  })

  // Process and filter data
  const processedData = useMemo(() => {
    if (!spotData?.data) return []

    let data = [...spotData.data]

    // Filter by floor
    if (selectedFloor !== 'all') {
      data = data.filter(spot => spot.floor === selectedFloor)
    }

    // Filter by efficiency/utilization
    if (filterBy !== 'all') {
      switch (filterBy) {
        case 'low':
          data = data.filter(spot => spot.utilizationRate < 30)
          break
        case 'medium':
          data = data.filter(spot => spot.utilizationRate >= 30 && spot.utilizationRate < 70)
          break
        case 'high':
          data = data.filter(spot => spot.utilizationRate >= 70)
          break
        case 'underperforming':
          data = data.filter(spot => spot.efficiency === 'low')
          break
      }
    }

    // Sort data
    data.sort((a, b) => {
      let aValue: number
      let bValue: number

      switch (sortBy) {
        case 'utilization':
          aValue = a.utilizationRate
          bValue = b.utilizationRate
          break
        case 'revenue':
          aValue = a.revenue
          bValue = b.revenue
          break
        case 'sessions':
          aValue = a.totalSessions
          bValue = b.totalSessions
          break
        case 'spotNumber':
          aValue = parseInt(a.spotNumber) || 0
          bValue = parseInt(b.spotNumber) || 0
          break
        default:
          aValue = a.utilizationRate
          bValue = b.utilizationRate
      }

      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
    })

    // Add computed fields for display
    return data.map((spot, index) => ({
      ...spot,
      displayName: `${spot.spotNumber}`,
      fullDisplayName: `Floor ${spot.floor} - ${spot.spotNumber}`,
      revenuePerSession: spot.totalSessions > 0 ? spot.revenue / spot.totalSessions : 0,
      rank: index + 1
    }))
  }, [spotData?.data, selectedFloor, filterBy, sortBy, sortOrder])

  // Get available floors
  const availableFloors = useMemo(() => {
    if (!spotData?.data) return []
    const floors = [...new Set(spotData.data.map(spot => spot.floor))].sort()
    return floors
  }, [spotData?.data])

  // Calculate statistics
  const stats = useMemo(() => {
    if (!processedData.length) {
      return {
        averageUtilization: 0,
        totalRevenue: 0,
        totalSessions: 0,
        topPerformer: null,
        underperformers: 0,
        highEfficiencySpots: 0,
        mediumEfficiencySpots: 0,
        lowEfficiencySpots: 0
      }
    }

    const averageUtilization = processedData.reduce((sum, spot) => sum + spot.utilizationRate, 0) / processedData.length
    const totalRevenue = processedData.reduce((sum, spot) => sum + spot.revenue, 0)
    const totalSessions = processedData.reduce((sum, spot) => sum + spot.totalSessions, 0)
    const topPerformer = processedData.reduce((max, current) => 
      current.utilizationRate > max.utilizationRate ? current : max
    )

    const underperformers = processedData.filter(spot => spot.efficiency === 'low').length
    const highEfficiencySpots = processedData.filter(spot => spot.efficiency === 'high').length
    const mediumEfficiencySpots = processedData.filter(spot => spot.efficiency === 'medium').length
    const lowEfficiencySpots = processedData.filter(spot => spot.efficiency === 'low').length

    return {
      averageUtilization: Math.round(averageUtilization),
      totalRevenue,
      totalSessions,
      topPerformer,
      underperformers,
      highEfficiencySpots,
      mediumEfficiencySpots,
      lowEfficiencySpots
    }
  }, [processedData])

  // Get efficiency color
  const getEfficiencyColor = (efficiency: SpotUtilizationData['efficiency']): string => {
    switch (efficiency) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getEfficiencyBgColor = (efficiency: SpotUtilizationData['efficiency']): string => {
    switch (efficiency) {
      case 'high': return 'bg-green-100'
      case 'medium': return 'bg-yellow-100'
      case 'low': return 'bg-red-100'
      default: return 'bg-gray-100'
    }
  }

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Get current data key based on view mode
  const getDataKey = (): string => {
    switch (viewMode) {
      case 'utilization': return 'utilizationRate'
      case 'revenue': return 'revenue'
      case 'efficiency': return 'utilizationRate'
      case 'sessions': return 'totalSessions'
      default: return 'utilizationRate'
    }
  }

  // Get bar color based on efficiency
  const getBarColor = (data: SpotUtilizationData): string => {
    if (viewMode === 'efficiency') {
      switch (data.efficiency) {
        case 'high': return '#10b981'
        case 'medium': return '#f59e0b'
        case 'low': return '#ef4444'
        default: return '#6b7280'
      }
    }
    return '#3b82f6'
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: {
    active?: boolean
    payload?: Array<{ payload: SpotUtilizationData }>
  }) => {
    if (!active || !payload?.length) return null

    const data = payload[0].payload
    
    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg min-w-64">
        <p className="font-medium mb-2">{data.fullDisplayName}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Utilization:</span>
            <span className="font-medium">{data.utilizationRate}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Revenue:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(data.revenue)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Sessions:</span>
            <span className="font-medium">{data.totalSessions}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Avg Duration:</span>
            <span className="font-medium">{Math.round(data.averageDuration)}min</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Efficiency:</span>
            <span className={cn('font-medium capitalize', getEfficiencyColor(data.efficiency))}>
              {data.efficiency}
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
          <CardTitle>Spot Utilization Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading spot utilization data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spot Utilization Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-red-600">Failed to load spot utilization data</p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!processedData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spot Utilization Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-gray-500">No spot utilization data available</p>
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
                <p className="text-sm text-gray-600">Avg Utilization</p>
                <p className="text-2xl font-bold text-blue-600">{stats.averageUtilization}%</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
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
                <p className="text-sm text-gray-600">High Efficiency</p>
                <p className="text-2xl font-bold text-green-600">{stats.highEfficiencySpots}</p>
                <p className="text-xs text-gray-500">
                  {processedData.length > 0 ? Math.round((stats.highEfficiencySpots / processedData.length) * 100) : 0}% of spots
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Underperforming</p>
                <p className="text-2xl font-bold text-red-600">{stats.underperformers}</p>
                <p className="text-xs text-gray-500">Need attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* View Mode */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">View:</span>
              <div className="flex space-x-1">
                {(['utilization', 'revenue', 'efficiency', 'sessions'] as ViewMode[]).map((mode) => (
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
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Chart Type */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Chart:</span>
              <div className="flex space-x-1">
                {(['bar', 'scatter', 'combined'] as ChartType[]).map((type) => (
                  <Button
                    key={type}
                    variant={chartType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChartType(type)}
                    className="capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Floor Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Floor:</span>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-1 text-sm border rounded-md"
              >
                <option value="all">All Floors</option>
                {availableFloors.map(floor => (
                  <option key={floor} value={floor}>Floor {floor}</option>
                ))}
              </select>
            </div>

            {/* Efficiency Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterBy)}
                className="px-3 py-1 text-sm border rounded-md"
              >
                <option value="all">All Spots</option>
                <option value="high">High Utilization (70%+)</option>
                <option value="medium">Medium Utilization (30-70%)</option>
                <option value="low">Low Utilization (&lt;30%)</option>
                <option value="underperforming">Underperforming</option>
              </select>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Sort Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-1 text-sm border rounded-md"
              >
                <option value="utilization">Utilization</option>
                <option value="revenue">Revenue</option>
                <option value="sessions">Sessions</option>
                <option value="spotNumber">Spot Number</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              >
                {sortOrder === 'desc' ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            Spot Utilization - {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Analysis
            {selectedFloor !== 'all' && ` (Floor ${selectedFloor})`}
          </CardTitle>
          <p className="text-sm text-gray-600">
            Showing {processedData.length} spots sorted by {sortBy} ({sortOrder}ending)
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={processedData.slice(0, 50)}> {/* Limit to 50 spots for readability */}
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="displayName"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ 
                      value: viewMode === 'revenue' ? 'Revenue ($)' : 
                             viewMode === 'sessions' ? 'Sessions' : 
                             'Utilization (%)', 
                      angle: -90, 
                      position: 'insideLeft' 
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Bar 
                    dataKey={getDataKey()}
                    radius={[2, 2, 0, 0]}
                  >
                    {processedData.slice(0, 50).map((entry, index) => (
                      <Bar 
                        key={`bar-${index}`} 
                        dataKey="utilization"
                        fill={getBarColor(entry)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartType === 'scatter' ? (
                <ScatterChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    type="number"
                    dataKey="utilizationRate"
                    name="Utilization Rate"
                    unit="%"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Utilization Rate (%)', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis 
                    type="number"
                    dataKey="revenue"
                    name="Revenue"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Scatter
                    name="Spots"
                    data={processedData}
                    fill="#3b82f6"
                  />
                  
                  {/* Reference lines for average */}
                  <ReferenceLine
                    x={stats.averageUtilization}
                    stroke="#6b7280"
                    strokeDasharray="5 5"
                    label={{ value: "Avg Util", position: "top" }}
                  />
                </ScatterChart>
              ) : (
                <ComposedChart data={processedData.slice(0, 30)}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="displayName"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    yAxisId="utilization"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="revenue"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Revenue ($)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Bar 
                    yAxisId="utilization"
                    dataKey="utilizationRate" 
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    radius={[2, 2, 0, 0]}
                  />
                  
                  <Line
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top/Bottom Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              <span>Top Performers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedData.slice(0, 5).map((spot, index) => (
                <div 
                  key={spot.spotId} 
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{spot.fullDisplayName}</p>
                      <p className="text-sm text-gray-600">
                        {spot.utilizationRate}% utilization • {formatCurrency(spot.revenue)} revenue
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    getEfficiencyBgColor(spot.efficiency),
                    getEfficiencyColor(spot.efficiency)
                  )}>
                    {spot.efficiency.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <TrendingDown className="h-5 w-5" />
              <span>Needs Attention</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedData
                .filter(spot => spot.efficiency === 'low' || spot.utilizationRate < 20)
                .slice(0, 5)
                .map((spot) => (
                <div 
                  key={spot.spotId} 
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                    <div>
                      <p className="font-medium">{spot.fullDisplayName}</p>
                      <p className="text-sm text-gray-600">
                        {spot.utilizationRate}% utilization • {spot.totalSessions} sessions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600 font-medium">
                      {formatCurrency(spot.revenue)}
                    </p>
                    <p className="text-xs text-gray-500">Lost potential</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Immediate Actions</h4>
              <div className="space-y-3">
                {stats.underperformers > 0 && (
                  <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Address Underperforming Spots</p>
                      <p className="text-sm text-red-700">
                        {stats.underperformers} spots need immediate attention. 
                        Consider pricing adjustments or access improvements.
                      </p>
                    </div>
                  </div>
                )}
                
                {stats.averageUtilization < 50 && (
                  <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Low Overall Utilization</p>
                      <p className="text-sm text-yellow-700">
                        Average utilization is {stats.averageUtilization}%. 
                        Consider promotional pricing or marketing campaigns.
                      </p>
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Review pricing for spots with &lt;20% utilization</p>
                  <p>• Investigate accessibility issues for underperforming areas</p>
                  <p>• Consider dynamic pricing for high-demand spots</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Strategic Improvements</h4>
              <div className="space-y-3">
                {stats.highEfficiencySpots > 0 && (
                  <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Leverage High Performers</p>
                      <p className="text-sm text-green-700">
                        {stats.highEfficiencySpots} spots are performing excellently. 
                        Study their characteristics for replication.
                      </p>
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Analyze patterns of top-performing spots</p>
                  <p>• Implement learnings across similar spot types</p>
                  <p>• Consider premium services for high-utilization areas</p>
                  <p>• Monitor competitor pricing in high-demand zones</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SpotUtilization
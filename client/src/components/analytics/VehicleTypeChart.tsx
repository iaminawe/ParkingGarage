import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Car, Truck, Zap, Users, Loader2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import { apiService } from '@/services/api'
import type { AnalyticsFilters, VehicleTypeData } from '@/types/api'

interface VehicleTypeChartProps {
  filters: AnalyticsFilters
}

type ChartType = 'pie' | 'donut' | 'bar'

const VehicleTypeChart: React.FC<VehicleTypeChartProps> = ({ filters }) => {
  const [chartType, setChartType] = useState<ChartType>('donut')
  const [showPercentages, setShowPercentages] = useState(true)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())

  // Fetch vehicle type distribution data
  const { 
    data: vehicleTypeData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['vehicle-types', filters],
    queryFn: () => apiService.getVehicleTypeDistribution(filters)
  })

  // Color scheme for different vehicle types
  const colorScheme = useMemo(() => ({
    'sedan': '#3b82f6',      // Blue
    'suv': '#10b981',        // Green
    'truck': '#f59e0b',      // Amber
    'motorcycle': '#ef4444', // Red
    'electric': '#8b5cf6',   // Purple
    'compact': '#06b6d4',    // Cyan
    'van': '#84cc16',        // Lime
    'luxury': '#f97316',     // Orange
    'other': '#6b7280'       // Gray
  }), [])

  // Process data with colors and visibility
  const processedData = useMemo(() => {
    if (!vehicleTypeData?.data) return []

    return vehicleTypeData.data
      .map((item: VehicleTypeData) => ({
        ...item,
        color: item.color || colorScheme[item.type.toLowerCase() as keyof typeof colorScheme] || colorScheme.other,
        visible: !hiddenTypes.has(item.type)
      }))
      .filter(item => item.visible)
  }, [vehicleTypeData?.data, hiddenTypes, colorScheme])

  // Calculate statistics
  const stats = useMemo(() => {
    if (!processedData.length) {
      return {
        totalVehicles: 0,
        mostCommonType: null,
        leastCommonType: null,
        diversityIndex: 0
      }
    }

    const totalVehicles = processedData.reduce((sum, item) => sum + item.count, 0)
    const sortedTypes = [...processedData].sort((a, b) => b.count - a.count)
    
    // Calculate diversity (Shannon diversity index)
    const diversityIndex = processedData.reduce((index, item) => {
      const proportion = item.count / totalVehicles
      return index - (proportion * Math.log2(proportion))
    }, 0)

    return {
      totalVehicles,
      mostCommonType: sortedTypes[0],
      leastCommonType: sortedTypes[sortedTypes.length - 1],
      diversityIndex: Math.round(diversityIndex * 100) / 100
    }
  }, [processedData])

  // Get vehicle type icon
  const getVehicleIcon = (type: string) => {
    const lowercaseType = type.toLowerCase()
    if (lowercaseType.includes('electric')) return Zap
    if (lowercaseType.includes('truck') || lowercaseType.includes('van')) return Truck
    if (lowercaseType.includes('motorcycle')) return Users
    return Car
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }: {
    active?: boolean
    payload?: Array<{ payload: VehicleTypeData }>
  }) => {
    if (!active || !payload?.length) return null

    const data = payload[0].payload
    
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <div className="flex items-center space-x-2 mb-2">
          {React.createElement(getVehicleIcon(data.type), { className: "h-4 w-4" })}
          <span className="font-medium capitalize">{data.type}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center space-x-4">
            <span className="text-sm text-gray-600">Count:</span>
            <span className="font-medium">{data.count.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center space-x-4">
            <span className="text-sm text-gray-600">Percentage:</span>
            <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    )
  }

  // Custom label for pie/donut charts
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx: number
    cy: number
    midAngle: number
    innerRadius: number
    outerRadius: number
    percent: number
  }) => {
    if (!showPercentages || percent < 0.05) return null // Don't show labels for very small slices

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
        className="drop-shadow-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  // Toggle visibility of vehicle type
  const toggleTypeVisibility = (type: string) => {
    const newHidden = new Set(hiddenTypes)
    if (newHidden.has(type)) {
      newHidden.delete(type)
    } else {
      newHidden.add(type)
    }
    setHiddenTypes(newHidden)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Type Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading vehicle type data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Type Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-red-600">Failed to load vehicle type data</p>
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
          <CardTitle>Vehicle Type Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-gray-500">No vehicle type data available</p>
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
                <p className="text-sm text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold">{stats.totalVehicles.toLocaleString()}</p>
              </div>
              <Car className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Most Common</p>
              <p className="text-lg font-bold capitalize">
                {stats.mostCommonType?.type || 'N/A'}
              </p>
              <p className="text-sm text-blue-600">
                {stats.mostCommonType?.percentage.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Least Common</p>
              <p className="text-lg font-bold capitalize">
                {stats.leastCommonType?.type || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                {stats.leastCommonType?.percentage.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Diversity Index</p>
              <p className="text-2xl font-bold">{stats.diversityIndex}</p>
              <p className="text-xs text-gray-500">Higher = more diverse</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vehicle Type Distribution</CardTitle>
            <div className="flex items-center space-x-2">
              {/* Chart Type Selector */}
              <div className="flex space-x-1">
                <Button
                  variant={chartType === 'pie' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('pie')}
                >
                  Pie
                </Button>
                <Button
                  variant={chartType === 'donut' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('donut')}
                >
                  Donut
                </Button>
                <Button
                  variant={chartType === 'bar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('bar')}
                >
                  Bar
                </Button>
              </div>

              {(chartType === 'pie' || chartType === 'donut') && (
                <>
                  <div className="w-px h-6 bg-gray-300" />
                  <Button
                    variant={showPercentages ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowPercentages(!showPercentages)}
                  >
                    %
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="type" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    radius={[4, 4, 0, 0]}
                  >
                    {processedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={processedData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={chartType === 'donut' ? 120 : 140}
                    innerRadius={chartType === 'donut' ? 60 : 0}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {processedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Type Legend with Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicleTypeData?.data.map((item: VehicleTypeData) => {
              const Icon = getVehicleIcon(item.type)
              const isVisible = !hiddenTypes.has(item.type)
              const color = item.color || colorScheme[item.type.toLowerCase() as keyof typeof colorScheme] || colorScheme.other

              return (
                <div
                  key={item.type}
                  className={cn(
                    'flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer',
                    isVisible 
                      ? 'bg-white border-gray-200 hover:border-gray-300' 
                      : 'bg-gray-50 border-gray-100 opacity-60'
                  )}
                  onClick={() => toggleTypeVisibility(item.type)}
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <Icon className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium capitalize">{item.type}</p>
                      <p className="text-sm text-gray-600">
                        {item.count.toLocaleString()} ({item.percentage.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                  <button className="p-1">
                    {isVisible ? (
                      <Eye className="h-4 w-4 text-gray-400" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Type Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Fleet Composition</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>
                  • Most common vehicle type: <span className="font-medium capitalize">
                    {stats.mostCommonType?.type} ({stats.mostCommonType?.percentage.toFixed(1)}%)
                  </span>
                </li>
                <li>
                  • Total unique vehicle types: <span className="font-medium">
                    {vehicleTypeData?.data.length}
                  </span>
                </li>
                <li>
                  • Fleet diversity score: <span className="font-medium">
                    {stats.diversityIndex}/10
                  </span>
                  {stats.diversityIndex > 2.5 && (
                    <span className="text-green-600"> (High diversity)</span>
                  )}
                </li>
                <li>
                  • Electric vehicles: <span className="font-medium">
                    {vehicleTypeData?.data
                      .filter((item: VehicleTypeData) => item.type.toLowerCase().includes('electric'))
                      .reduce((sum: number, item: VehicleTypeData) => sum + item.percentage, 0)
                      .toFixed(1)}%
                  </span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Recommendations</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                {stats.mostCommonType && stats.mostCommonType.percentage > 60 && (
                  <li>• High concentration in {stats.mostCommonType.type}s - consider diversification incentives</li>
                )}
                {vehicleTypeData?.data.some((item: VehicleTypeData) => 
                  item.type.toLowerCase().includes('electric') && item.percentage < 10
                ) && (
                  <li>• Low EV adoption - consider adding more charging stations</li>
                )}
                {stats.diversityIndex < 1.5 && (
                  <li>• Low fleet diversity - target marketing to underrepresented segments</li>
                )}
                <li>• Monitor seasonal variations in vehicle type preferences</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VehicleTypeChart
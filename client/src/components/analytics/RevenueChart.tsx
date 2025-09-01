import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DollarSign, TrendingUp, TrendingDown, Users, Loader2 } from 'lucide-react'
import { format, parseISO, subDays, addDays } from 'date-fns'
import { cn } from '@/utils/cn'
import { apiService } from '@/services/api'
import type { AnalyticsFilters, RevenueData } from '@/types/api'

interface RevenueChartProps {
  filters: AnalyticsFilters
}

type GroupBy = 'day' | 'week' | 'month' | 'garage'
type ComparisonPeriod = 'none' | 'previous' | 'year-over-year'

const RevenueChart: React.FC<RevenueChartProps> = ({ filters }) => {
  const [groupBy, setGroupBy] = useState<GroupBy>('day')
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('previous')
  const [showSessions, setShowSessions] = useState(true)

  // Fetch current period revenue data
  const { 
    data: currentRevenueData, 
    isLoading: isLoadingCurrent, 
    error 
  } = useQuery({
    queryKey: ['revenue-data', filters, groupBy],
    queryFn: () => apiService.getRevenueData(filters, groupBy)
  })

  // Fetch comparison period data
  const comparisonFilters = useMemo(() => {
    if (comparisonPeriod === 'none') return null

    const startDate = new Date(filters.dateRange.startDate)
    const endDate = new Date(filters.dateRange.endDate)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    let comparisonStartDate: Date
    let comparisonEndDate: Date

    if (comparisonPeriod === 'previous') {
      comparisonEndDate = subDays(startDate, 1)
      comparisonStartDate = subDays(comparisonEndDate, daysDiff)
    } else { // year-over-year
      comparisonStartDate = new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate())
      comparisonEndDate = addDays(comparisonStartDate, daysDiff)
    }

    return {
      ...filters,
      dateRange: {
        ...filters.dateRange,
        startDate: format(comparisonStartDate, 'yyyy-MM-dd'),
        endDate: format(comparisonEndDate, 'yyyy-MM-dd')
      }
    }
  }, [filters, comparisonPeriod])

  const { 
    data: comparisonRevenueData, 
    isLoading: isLoadingComparison 
  } = useQuery({
    queryKey: ['revenue-comparison', comparisonFilters, groupBy],
    queryFn: () => comparisonFilters ? apiService.getRevenueData(comparisonFilters, groupBy) : null,
    enabled: !!comparisonFilters
  })

  // Process and combine data for the chart
  const chartData = useMemo(() => {
    if (!currentRevenueData?.data) return []

    const currentData = currentRevenueData.data
    const comparisonData = comparisonRevenueData?.data || []

    return currentData.map((current: RevenueData) => {
      const comparison = comparisonData.find((comp: RevenueData) => {
        // Match by relative position for time series, or by garage for garage grouping
        if (groupBy === 'garage') {
          return comp.garageId === current.garageId
        }
        return comparisonData.indexOf(comp) === currentData.indexOf(current)
      })

      return {
        ...current,
        formattedPeriod: formatPeriod(current.period, groupBy),
        comparisonRevenue: comparison?.revenue || 0,
        comparisonSessions: comparison?.sessions || 0,
        revenueGrowth: comparison ? 
          ((current.revenue - comparison.revenue) / comparison.revenue) * 100 : 0,
        sessionGrowth: comparison ?
          ((current.sessions - comparison.sessions) / comparison.sessions) * 100 : 0
      }
    })
  }, [currentRevenueData?.data, comparisonRevenueData?.data, groupBy])

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!chartData.length) {
      return {
        totalRevenue: 0,
        totalSessions: 0,
        averageRevenue: 0,
        totalGrowth: 0,
        sessionGrowth: 0,
        bestPerformingPeriod: null
      }
    }

    const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0)
    const totalSessions = chartData.reduce((sum, item) => sum + item.sessions, 0)
    const averageRevenue = totalRevenue / chartData.length
    
    const totalComparisonRevenue = chartData.reduce((sum, item) => sum + item.comparisonRevenue, 0)
    const totalComparisonSessions = chartData.reduce((sum, item) => sum + item.comparisonSessions, 0)
    
    const totalGrowth = totalComparisonRevenue > 0 ? 
      ((totalRevenue - totalComparisonRevenue) / totalComparisonRevenue) * 100 : 0
    const sessionGrowth = totalComparisonSessions > 0 ?
      ((totalSessions - totalComparisonSessions) / totalComparisonSessions) * 100 : 0

    const bestPerformingPeriod = chartData.reduce((best, current) => 
      current.revenue > best.revenue ? current : best
    )

    return {
      totalRevenue,
      totalSessions,
      averageRevenue,
      totalGrowth,
      sessionGrowth,
      bestPerformingPeriod
    }
  }, [chartData])

  function formatPeriod(period: string, groupBy: GroupBy): string {
    if (groupBy === 'garage') {
      return period // Garage name
    }
    
    try {
      const date = parseISO(period)
      switch (groupBy) {
        case 'day':
          return format(date, 'MMM d')
        case 'week':
          return format(date, 'MMM d')
        case 'month':
          return format(date, 'MMM yyyy')
        default:
          return format(date, 'MMM d')
      }
    } catch {
      return period
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ payload: RevenueData & { revenueGrowth: number; sessionGrowth: number } }>
    label?: string
  }) => {
    if (!active || !payload?.length) return null

    const data = payload[0].payload
    
    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg min-w-64">
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Revenue:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(data.revenue)}
            </span>
          </div>
          {comparisonPeriod !== 'none' && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {comparisonPeriod === 'previous' ? 'Previous Period:' : 'Last Year:'}
                </span>
                <span className="font-medium text-gray-500">
                  {formatCurrency(data.comparisonRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Growth:</span>
                <span className={cn(
                  'font-medium',
                  data.revenueGrowth > 0 ? 'text-green-600' : 
                  data.revenueGrowth < 0 ? 'text-red-600' : 'text-gray-500'
                )}>
                  {data.revenueGrowth > 0 ? '+' : ''}{data.revenueGrowth.toFixed(1)}%
                </span>
              </div>
            </>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Sessions:</span>
            <span className="font-medium">{data.sessions}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Avg per Session:</span>
            <span className="font-medium">
              {formatCurrency(data.averageRevenue)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (isLoadingCurrent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading revenue data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-red-600">Failed to load revenue data</p>
          <Button onClick={() => window.location.reload()} variant="outline">
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
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            {comparisonPeriod !== 'none' && (
              <div className={cn(
                'flex items-center space-x-1 mt-2',
                stats.totalGrowth > 0 ? 'text-green-600' :
                stats.totalGrowth < 0 ? 'text-red-600' : 'text-gray-500'
              )}>
                {stats.totalGrowth > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-sm font-medium">
                  {stats.totalGrowth > 0 ? '+' : ''}{stats.totalGrowth.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">vs {comparisonPeriod}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            {comparisonPeriod !== 'none' && (
              <div className={cn(
                'flex items-center space-x-1 mt-2',
                stats.sessionGrowth > 0 ? 'text-green-600' :
                stats.sessionGrowth < 0 ? 'text-red-600' : 'text-gray-500'
              )}>
                {stats.sessionGrowth > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-sm font-medium">
                  {stats.sessionGrowth > 0 ? '+' : ''}{stats.sessionGrowth.toFixed(1)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Average Revenue</p>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.averageRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Per {groupBy}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Best Performing</p>
              <p className="text-lg font-bold truncate">
                {stats.bestPerformingPeriod?.formattedPeriod || 'N/A'}
              </p>
              <p className="text-sm text-green-600">
                {stats.bestPerformingPeriod ? formatCurrency(stats.bestPerformingPeriod.revenue) : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Revenue Analysis</CardTitle>
            <div className="flex items-center space-x-2">
              {/* Group By Selector */}
              <div className="flex space-x-1">
                {(['day', 'week', 'month', 'garage'] as GroupBy[]).map((group) => (
                  <Button
                    key={group}
                    variant={groupBy === group ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGroupBy(group)}
                    className="capitalize"
                  >
                    {group}
                  </Button>
                ))}
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Comparison Period Selector */}
              <div className="flex space-x-1">
                <Button
                  variant={comparisonPeriod === 'none' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setComparisonPeriod('none')}
                >
                  No Compare
                </Button>
                <Button
                  variant={comparisonPeriod === 'previous' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setComparisonPeriod('previous')}
                >
                  Previous
                </Button>
                <Button
                  variant={comparisonPeriod === 'year-over-year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setComparisonPeriod('year-over-year')}
                >
                  YoY
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Show Sessions Toggle */}
              <Button
                variant={showSessions ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowSessions(!showSessions)}
              >
                Sessions
              </Button>
            </div>
          </div>
          {isLoadingComparison && (
            <p className="text-sm text-gray-500 flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading comparison data...</span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="formattedPeriod" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  yAxisId="revenue"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrency(value)}
                  label={{ value: 'Revenue', angle: -90, position: 'insideLeft' }}
                />
                {showSessions && (
                  <YAxis 
                    yAxisId="sessions"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Sessions', angle: 90, position: 'insideRight' }}
                  />
                )}
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Bar
                  yAxisId="revenue"
                  dataKey="revenue"
                  fill="#10b981"
                  name="Current Revenue"
                  radius={[4, 4, 0, 0]}
                />
                
                {comparisonPeriod !== 'none' && (
                  <Bar
                    yAxisId="revenue"
                    dataKey="comparisonRevenue"
                    fill="#6b7280"
                    name={`${comparisonPeriod === 'previous' ? 'Previous' : 'Last Year'} Revenue`}
                    opacity={0.6}
                    radius={[4, 4, 0, 0]}
                  />
                )}

                {showSessions && (
                  <Line
                    yAxisId="sessions"
                    type="monotone"
                    dataKey="sessions"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    name="Sessions"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown by Garage (if multiple garages) */}
      {groupBy !== 'garage' && filters.garageIds && filters.garageIds.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Garage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* This would be populated with individual garage revenue data */}
              <p className="text-sm text-gray-500 col-span-full">
                Garage breakdown will be available when individual garage data is loaded
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium">Performance Summary</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>
                    • Total revenue: <span className="font-medium text-green-600">
                      {formatCurrency(stats.totalRevenue)}
                    </span>
                  </li>
                  <li>
                    • Average revenue per {groupBy}: <span className="font-medium">
                      {formatCurrency(stats.averageRevenue)}
                    </span>
                  </li>
                  {comparisonPeriod !== 'none' && (
                    <li>
                      • Growth vs {comparisonPeriod}: <span className={cn(
                        'font-medium',
                        stats.totalGrowth > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {stats.totalGrowth > 0 ? '+' : ''}{stats.totalGrowth.toFixed(1)}%
                      </span>
                    </li>
                  )}
                  <li>
                    • Total parking sessions: <span className="font-medium">
                      {stats.totalSessions.toLocaleString()}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">Recommendations</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  {stats.totalGrowth > 10 && (
                    <li>• Excellent growth! Consider expanding capacity or services</li>
                  )}
                  {stats.totalGrowth < -5 && (
                    <li>• Revenue declining. Review pricing strategy and promotions</li>
                  )}
                  {stats.averageRevenue < 50 && (
                    <li>• Low average revenue per session. Consider premium services</li>
                  )}
                  <li>• Monitor peak revenue periods for optimization opportunities</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default RevenueChart
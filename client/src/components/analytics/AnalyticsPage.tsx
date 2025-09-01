import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar, 
  Download, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Clock, 
  MapPin,
  Filter,
  Loader2
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { cn } from '@/utils/cn'
import { apiService } from '@/services/api'
import type { AnalyticsDateRange, AnalyticsFilters, ParkingGarage } from '@/types/api'

import OccupancyTrendChart from './OccupancyTrendChart'
import RevenueChart from './RevenueChart'
import VehicleTypeChart from './VehicleTypeChart'
import DurationDistribution from './DurationDistribution'
import PeakHoursHeatmap from './PeakHoursHeatmap'
import SpotUtilization from './SpotUtilization'

type TabType = 'occupancy' | 'revenue' | 'vehicles' | 'duration' | 'peak-hours' | 'utilization'

interface DateRangeOption {
  label: string
  value: AnalyticsDateRange['period']
  getDates: () => { startDate: string; endDate: string }
}

const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('occupancy')
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsDateRange['period']>('week')
  const [customDateRange, setCustomDateRange] = useState<{
    startDate: string
    endDate: string
  } | null>(null)
  const [selectedGarageIds, setSelectedGarageIds] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  // Date range options
  const dateRangeOptions: DateRangeOption[] = useMemo(() => [
    {
      label: 'Today',
      value: 'today',
      getDates: () => ({
        startDate: format(startOfDay(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfDay(new Date()), 'yyyy-MM-dd')
      })
    },
    {
      label: 'This Week',
      value: 'week',
      getDates: () => ({
        startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
      })
    },
    {
      label: 'This Month',
      value: 'month',
      getDates: () => ({
        startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
      })
    },
    {
      label: 'This Year',
      value: 'year',
      getDates: () => ({
        startDate: format(subDays(new Date(), 365), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
      })
    }
  ], [])

  // Get current date range
  const currentDateRange = useMemo((): AnalyticsDateRange => {
    if (selectedPeriod === 'custom' && customDateRange) {
      return {
        ...customDateRange,
        period: 'custom'
      }
    }
    
    const option = dateRangeOptions.find(opt => opt.value === selectedPeriod)
    if (option) {
      return {
        ...option.getDates(),
        period: selectedPeriod
      }
    }
    
    return {
      ...dateRangeOptions[1].getDates(),
      period: 'week'
    }
  }, [selectedPeriod, customDateRange, dateRangeOptions])

  // Analytics filters
  const analyticsFilters: AnalyticsFilters = useMemo(() => ({
    dateRange: currentDateRange,
    garageIds: selectedGarageIds.length > 0 ? selectedGarageIds : undefined
  }), [currentDateRange, selectedGarageIds])

  // Fetch garages for filter dropdown
  const { data: garagesResponse } = useQuery({
    queryKey: ['garages'],
    queryFn: () => apiService.getGarages()
  })

  const garages = garagesResponse?.data || []

  // Tab configuration
  const tabs = [
    { 
      id: 'occupancy' as TabType, 
      label: 'Occupancy Trends', 
      icon: TrendingUp,
      description: 'Real-time occupancy patterns and trends'
    },
    { 
      id: 'revenue' as TabType, 
      label: 'Revenue Analysis', 
      icon: BarChart3,
      description: 'Revenue performance and comparisons'
    },
    { 
      id: 'vehicles' as TabType, 
      label: 'Vehicle Types', 
      icon: PieChart,
      description: 'Distribution of vehicle types'
    },
    { 
      id: 'duration' as TabType, 
      label: 'Parking Duration', 
      icon: Clock,
      description: 'Analysis of parking session lengths'
    },
    { 
      id: 'peak-hours' as TabType, 
      label: 'Peak Hours', 
      icon: Calendar,
      description: 'Heatmap of busy hours and patterns'
    },
    { 
      id: 'utilization' as TabType, 
      label: 'Spot Utilization', 
      icon: MapPin,
      description: 'Individual parking spot performance'
    }
  ]

  const handleExportReport = async () => {
    setIsExporting(true)
    try {
      const blob = await apiService.exportAnalyticsReport(analyticsFilters, 'csv')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `parking-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export report:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const renderChart = () => {
    const commonProps = { filters: analyticsFilters }
    
    switch (activeTab) {
      case 'occupancy':
        return <OccupancyTrendChart {...commonProps} />
      case 'revenue':
        return <RevenueChart {...commonProps} />
      case 'vehicles':
        return <VehicleTypeChart {...commonProps} />
      case 'duration':
        return <DurationDistribution {...commonProps} />
      case 'peak-hours':
        return <PeakHoursHeatmap {...commonProps} />
      case 'utilization':
        return <SpotUtilization {...commonProps} />
      default:
        return <OccupancyTrendChart {...commonProps} />
    }
  }

  const activeTabInfo = tabs.find(tab => tab.id === activeTab)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive parking garage performance insights and trends
            </p>
          </div>
          <Button 
            onClick={handleExportReport}
            disabled={isExporting}
            className="flex items-center space-x-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Range Filter */}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Period:</span>
                <div className="flex space-x-1">
                  {dateRangeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={selectedPeriod === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedPeriod(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                  <Button
                    variant={selectedPeriod === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod('custom')}
                  >
                    Custom
                  </Button>
                </div>
              </div>

              {/* Custom Date Range Inputs */}
              {selectedPeriod === 'custom' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={customDateRange?.startDate || ''}
                    onChange={(e) => setCustomDateRange(prev => ({
                      ...prev,
                      startDate: e.target.value,
                      endDate: prev?.endDate || e.target.value
                    }))}
                    className="px-3 py-1 text-sm border rounded-md"
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <input
                    type="date"
                    value={customDateRange?.endDate || ''}
                    onChange={(e) => setCustomDateRange(prev => ({
                      ...prev,
                      startDate: prev?.startDate || e.target.value,
                      endDate: e.target.value
                    }))}
                    className="px-3 py-1 text-sm border rounded-md"
                  />
                </div>
              )}

              <Separator orientation="vertical" className="h-6" />

              {/* Garage Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Garages:</span>
                <select
                  multiple
                  value={selectedGarageIds}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value)
                    setSelectedGarageIds(values)
                  }}
                  className="px-3 py-1 text-sm border rounded-md min-w-40"
                >
                  <option value="">All Garages</option>
                  {garages.map((garage) => (
                    <option key={garage.id} value={garage.id}>
                      {garage.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Navigation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  {activeTabInfo?.icon && <activeTabInfo.icon className="h-5 w-5" />}
                  <span>{activeTabInfo?.label}</span>
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {activeTabInfo?.description}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-b">
              <nav className="flex overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap',
                      'hover:text-blue-600 hover:border-blue-300 transition-colors',
                      activeTab === tab.id
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-500 border-transparent'
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </CardContent>
        </Card>

        {/* Chart Content */}
        <div className="min-h-96">
          {renderChart()}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiService } from '@/services/api'
import { socketService } from '@/services/socket'
import type { GarageAnalytics, ParkingGarage, ParkingSession } from '@/types/api'
import MetricCard from './MetricCard'
import QuickActions from './QuickActions'
import RecentActivity from './RecentActivity'
import OccupancyChart from './OccupancyChart'

interface DashboardData {
  analytics: GarageAnalytics | null
  garages: ParkingGarage[]
  recentSessions: ParkingSession[]
  totalOccupancy: {
    occupied: number
    available: number
    total: number
  }
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    analytics: null,
    garages: [],
    recentSessions: [],
    totalOccupancy: { occupied: 0, available: 0, total: 0 }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected')

  const fetchDashboardData = async () => {
    try {
      setError(null)
      
      // Fetch each API endpoint independently and handle failures gracefully
      const fetchWithFallback = async <T>(
        apiCall: () => Promise<any>,
        fallbackValue: T,
        endpoint: string
      ): Promise<T> => {
        try {
          const response = await apiCall()
          return response.success ? response.data : fallbackValue
        } catch (error) {
          console.warn(`Failed to fetch ${endpoint}:`, error)
          return fallbackValue
        }
      }

      const [garages, systemAnalytics, sessions] = await Promise.all([
        fetchWithFallback(
          () => apiService.getGarages(),
          [],
          'garages'
        ),
        fetchWithFallback(
          () => apiService.getSystemAnalytics(),
          null,
          'system analytics'
        ),
        fetchWithFallback(
          () => apiService.getSessions(),
          [],
          'sessions'
        )
      ])

      const totalOccupancy = Array.isArray(garages) ? garages.reduce(
        (acc, garage) => ({
          occupied: acc.occupied + (garage.totalSpots - garage.availableSpots || 0),
          available: acc.available + (garage.availableSpots || 0),
          total: acc.total + (garage.totalSpots || 0)
        }),
        { occupied: 0, available: 0, total: 0 }
      ) : { occupied: 0, available: 0, total: 100 } // Mock data when API fails

      // Get recent sessions (last 10)
      const recentSessions = Array.isArray(sessions) 
        ? sessions
            .sort((a, b) => new Date(b.createdAt || b.startTime).getTime() - new Date(a.createdAt || a.startTime).getTime())
            .slice(0, 10)
        : []

      setData({
        analytics: systemAnalytics as unknown as GarageAnalytics,
        garages: Array.isArray(garages) ? garages : [],
        recentSessions,
        totalOccupancy
      })
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initialize WebSocket connection
    socketService.connect()
    
    // Initial data fetch
    fetchDashboardData()
    
    // Set up connection status monitoring
    const handleConnectionStatusChange = (status: 'connected' | 'connecting' | 'disconnected' | 'error') => {
      setConnectionStatus(status)
    }
    
    socketService.onConnectionStatusChange(handleConnectionStatusChange)
    setConnectionStatus(socketService.getConnectionStatus())
    
    // Listen for real-time updates
    const handleGarageStatusUpdate = (update: any) => {
      console.log('🔄 Received garage status update:', update)
      
      // Update relevant data based on the update
      setData(prev => {
        const updatedData = { ...prev }
        
        // Update analytics if provided
        if (update.analytics) {
          updatedData.analytics = update.analytics
        }
        
        // Update total occupancy if provided
        if (update.occupancy) {
          updatedData.totalOccupancy = update.occupancy
        }
        
        return updatedData
      })
    }
    
    const handleSpotUpdate = (update: any) => {
      console.log('🔄 Received spot update:', update)
      
      // Refresh analytics when spots change
      // This is more efficient than polling every 30 seconds
      setTimeout(() => {
        fetchDashboardData()
      }, 1000) // Small delay to ensure server has processed the update
    }
    
    const handleSessionUpdate = (sessionData: any) => {
      console.log('🔄 Received session update:', sessionData)
      
      // Update recent sessions
      setData(prev => ({
        ...prev,
        recentSessions: [sessionData, ...prev.recentSessions.slice(0, 9)] // Keep latest 10
      }))
    }
    
    // Set up WebSocket event listeners
    socketService.onGarageStatusUpdate(handleGarageStatusUpdate)
    socketService.onSpotUpdate(handleSpotUpdate)
    socketService.onSessionStart(handleSessionUpdate)
    socketService.onSessionEnd(handleSessionUpdate)
    
    // Join garage room for updates (assuming garage ID 'main' or get from context)
    socketService.joinGarage('main')
    
    // Cleanup function
    return () => {
      socketService.offConnectionStatusChange(handleConnectionStatusChange)
      socketService.removeAllListeners()
      socketService.leaveGarage('main')
      // Don't disconnect here as other components might be using it
    }
  }, [])

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="animate-pulse w-4 h-4 bg-gray-300 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => {
                setIsLoading(true)
                fetchDashboardData()
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { analytics, garages, recentSessions, totalOccupancy } = data
  const occupancyPercentage = totalOccupancy.total > 0 
    ? (totalOccupancy.occupied / totalOccupancy.total) * 100 
    : 0

  // Calculate revenue statistics
  const dailyRevenue = analytics?.dailyStats?.reduce((sum, day) => sum + day.revenue, 0) || 0
  const weeklyRevenue = analytics?.dailyStats?.slice(-7)?.reduce((sum, day) => sum + day.revenue, 0) || 0
  const monthlyRevenue = analytics?.totalRevenue || 0

  // Calculate average parking duration in hours
  const avgDurationHours = analytics?.averageSessionDuration 
    ? Math.round(analytics.averageSessionDuration / (1000 * 60 * 60) * 100) / 100
    : 0

  // Find peak hour
  const peakHour = analytics?.peakHours?.reduce(
    (max, hour) => hour.sessions > max.sessions ? hour : max,
    { hour: 0, sessions: 0 }
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-bounce' :
            connectionStatus === 'error' ? 'bg-red-500' :
            'bg-gray-500'
          }`} />
          <span>{
            connectionStatus === 'connected' ? 'Live' :
            connectionStatus === 'connecting' ? 'Connecting...' :
            connectionStatus === 'error' ? 'Connection Error' :
            'Offline'
          }</span>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Occupied Spots"
          value={totalOccupancy.occupied}
          subtitle={`of ${totalOccupancy.total} spots`}
          trend={0} // Will be calculated based on historical data
          icon="🚗"
          color="blue"
        />
        
        <MetricCard
          title="Available Spots"
          value={totalOccupancy.available}
          subtitle="ready for parking"
          trend={0}
          icon="🅿️"
          color="green"
        />
        
        <MetricCard
          title="Daily Revenue"
          value={`$${dailyRevenue.toFixed(2)}`}
          subtitle="today's earnings"
          trend={0}
          icon="💰"
          color="emerald"
        />
        
        <MetricCard
          title="Avg Duration"
          value={`${avgDurationHours}h`}
          subtitle="parking time"
          trend={0}
          icon="⏱️"
          color="purple"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Occupancy Chart */}
        <div className="lg:col-span-1">
          <OccupancyChart 
            occupiedSpots={totalOccupancy.occupied}
            totalSpots={totalOccupancy.total}
            percentage={occupancyPercentage}
          />
        </div>
        
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity sessions={recentSessions} />
        </div>
      </div>

      {/* Revenue & Peak Hours Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Today</span>
              <span className="text-lg font-bold">${dailyRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">This Week</span>
              <span className="text-lg font-bold">${weeklyRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">This Month</span>
              <span className="text-lg font-bold">${monthlyRevenue.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold">
                {peakHour ? `${peakHour.hour}:00` : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">
                {peakHour ? `${peakHour.sessions} sessions` : 'No data available'}
              </div>
              <div className="text-xs text-muted-foreground">
                Busiest hour today
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Garage Status */}
      <Card>
        <CardHeader>
          <CardTitle>Garage Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {garages.map(garage => {
              const garageOccupancy = ((garage.totalSpots - garage.availableSpots) / garage.totalSpots) * 100
              return (
                <div key={garage.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{garage.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      garage.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {garage.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {garage.location}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Available: {garage.availableSpots}</span>
                    <span>Total: {garage.totalSpots}</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Occupancy</span>
                      <span>{garageOccupancy.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          garageOccupancy > 90 ? 'bg-red-500' :
                          garageOccupancy > 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(garageOccupancy, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
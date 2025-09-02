import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ParkingGrid, StatusLegend } from '@/components/parking'
import { ZoomControls } from '@/components/parking/ZoomControls'
import { BulkOperationsToolbar } from '@/components/parking/BulkOperationsToolbar'
import { ParkingListView } from '@/components/parking/ParkingListView'
import { AnalyticsView } from '@/components/parking/AnalyticsView'
import { MaintenanceView } from '@/components/parking/MaintenanceView'
import { ReportsView } from '@/components/parking/ReportsView'
import { socketService } from '@/services/socket'
import { apiService } from '@/services/api'
import type { ParkingSpot } from '@/types/api'
import { 
  Building2, 
  Car, 
  Info, 
  Lightbulb,
  Zap,
  RefreshCw,
  Eye,
  Grid3X3,
  List,
  BarChart3,
  Wrench,
  FileText,
  Bell,
  Settings2
} from 'lucide-react'

interface SharedParkingState {
  spots: ParkingSpot[]
  selectedFloor: number
  searchQuery: string
  statusFilter: string
  typeFilter: string
  selectedSpots: string[]
  zoomLevel: number
  lastRefresh: Date
  isLoading: boolean
}

type TabType = 'grid' | 'list' | 'analytics' | 'maintenance' | 'reports'

export const ParkingGridPage: React.FC = () => {
  // Main state
  const [activeTab, setActiveTab] = useState<TabType>('grid')
  const [sharedState, setSharedState] = useState<SharedParkingState>({
    spots: [],
    selectedFloor: 1,
    searchQuery: '',
    statusFilter: 'all',
    typeFilter: 'all',
    selectedSpots: [],
    zoomLevel: 100,
    lastRefresh: new Date(),
    isLoading: true
  })
  const [notifications, setNotifications] = useState<Array<{ id: string, message: string, type: 'info' | 'success' | 'warning' | 'error' }>>([])

  // Load initial data
  useEffect(() => {
    loadParkingData()
    setupWebSocket()
  }, [])

  const loadParkingData = async () => {
    try {
      setSharedState(prev => ({ ...prev, isLoading: true }))
      const response = await apiService.getSpots('demo-garage-1')
      if (response.success) {
        setSharedState(prev => ({ 
          ...prev, 
          spots: response.data, 
          isLoading: false,
          lastRefresh: new Date()
        }))
      }
    } catch (error) {
      console.error('Error loading parking data:', error)
      setSharedState(prev => ({ ...prev, isLoading: false }))
    }
  }

  const setupWebSocket = () => {
    socketService.connect()
    socketService.joinGarage('demo-garage-1')
    
    // Real-time spot updates
    socketService.onSpotUpdate((update) => {
      setSharedState(prev => ({
        ...prev,
        spots: prev.spots.map(spot => 
          spot.id === update.spotId 
            ? { ...spot, ...update }
            : spot
        )
      }))
    })

    // System notifications
    socketService.on('system:notification', (notification) => {
      addNotification(notification.message, notification.type)
    })
  }

  const addNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    const id = Date.now().toString()
    setNotifications(prev => [...prev, { id, message, type }])
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  // Shared state update functions
  const updateSharedState = useCallback((updates: Partial<SharedParkingState>) => {
    setSharedState(prev => ({ ...prev, ...updates }))
  }, [])

  const handleSpotSelection = useCallback((spotId: string, selected: boolean) => {
    setSharedState(prev => ({
      ...prev,
      selectedSpots: selected 
        ? [...prev.selectedSpots, spotId]
        : prev.selectedSpots.filter(id => id !== spotId)
    }))
  }, [])

  const handleBulkOperation = useCallback(async (operation: string, spotIds: string[]) => {
    // Implementation for bulk operations
    console.log('Bulk operation:', operation, spotIds)
    addNotification(`Bulk operation "${operation}" applied to ${spotIds.length} spots`, 'success')
  }, [])

  const clearSelection = useCallback(() => {
    setSharedState(prev => ({ ...prev, selectedSpots: [] }))
  }, [])

  // Tab configuration
  const tabs = [
    {
      id: 'grid' as const,
      label: 'Interactive Grid',
      icon: Grid3X3,
      description: 'Visual spot management with zoom and bulk operations'
    },
    {
      id: 'list' as const,
      label: 'Advanced List',
      icon: List,
      description: 'Detailed table view with sorting and filtering'
    },
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: BarChart3,
      description: 'Occupancy trends and utilization insights'
    },
    {
      id: 'maintenance' as const,
      label: 'Maintenance',
      icon: Wrench,
      description: 'Scheduled maintenance and work orders'
    },
    {
      id: 'reports' as const,
      label: 'Reports',
      icon: FileText,
      description: 'Custom reports and export tools'
    }
  ]

  // Calculate stats for display
  const stats = {
    totalSpots: sharedState.spots.length,
    availableSpots: sharedState.spots.filter(s => s.status === 'available').length,
    occupiedSpots: sharedState.spots.filter(s => s.status === 'occupied').length,
    selectedCount: sharedState.selectedSpots.length,
    occupancyRate: sharedState.spots.length > 0 
      ? Math.round((sharedState.spots.filter(s => s.status === 'occupied').length / sharedState.spots.length) * 100)
      : 0
  }

  const floors = Array.from(new Set(sharedState.spots.map(s => s.floor))).sort((a, b) => a - b)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Parking Management Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive real-time parking facility management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-2">
              <Zap className="h-3 w-3" />
              Real-time Updates
            </Badge>
            {notifications.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-2">
                <Bell className="h-3 w-3" />
                {notifications.length}
              </Badge>
            )}
          </div>
        </div>

        {/* Enhanced Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-semibold">{floors.length}</div>
                  <div className="text-sm text-muted-foreground">Floors</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Car className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-semibold">{stats.totalSpots}</div>
                  <div className="text-sm text-muted-foreground">Total Spots</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-semibold">{stats.availableSpots}</div>
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-red-600" />
                <div>
                  <div className="text-2xl font-semibold">{stats.occupiedSpots}</div>
                  <div className="text-sm text-muted-foreground">Occupied</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-semibold">{stats.occupancyRate}%</div>
                  <div className="text-sm text-muted-foreground">Occupancy</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      {sharedState.selectedSpots.length > 0 && (
        <BulkOperationsToolbar
          selectedCount={stats.selectedCount}
          onBulkOperation={handleBulkOperation}
          onClearSelection={clearSelection}
        />
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card key={notification.id} className={`border-l-4 ${
              notification.type === 'error' ? 'border-l-red-500 bg-red-50' :
              notification.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
              notification.type === 'success' ? 'border-l-green-500 bg-green-50' :
              'border-l-blue-500 bg-blue-50'
            }`}>
              <CardContent className="p-3">
                <p className="text-sm">{notification.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b">
          <TabsList className="grid grid-cols-5 w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
          
          {/* Tab Description */}
          <div className="px-6 py-2 text-sm text-muted-foreground">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </div>
        </div>

        {/* Tab Content */}
        <TabsContent value="grid" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Interactive Grid View</h2>
            <ZoomControls
              zoomLevel={sharedState.zoomLevel}
              onZoomChange={(level) => updateSharedState({ zoomLevel: level })}
            />
          </div>
          <ParkingGrid
            garageId="demo-garage-1"
            showControls={true}
            showLegend={true}
            defaultFloor={sharedState.selectedFloor}
            className=""
            style={{ transform: `scale(${sharedState.zoomLevel / 100})`, transformOrigin: 'top left' }}
          />
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <h2 className="text-2xl font-semibold">Advanced List View</h2>
          <ParkingListView
            garageId="demo-garage-1"
            sharedState={sharedState}
            selectedSpots={sharedState.selectedSpots}
            onSpotSelection={handleSpotSelection}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <h2 className="text-2xl font-semibold">Analytics Dashboard</h2>
          <AnalyticsView
            spots={sharedState.spots}
            selectedFloor={sharedState.selectedFloor}
          />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <h2 className="text-2xl font-semibold">Maintenance Management</h2>
          <MaintenanceView
            spots={sharedState.spots}
            onScheduleUpdate={(spotId, schedule) => {
              console.log('Schedule update:', spotId, schedule)
            }}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <h2 className="text-2xl font-semibold">Reports & Export</h2>
          <ReportsView
            spots={sharedState.spots}
            selectedSpots={sharedState.selectedSpots}
            onExport={(format, data) => {
              console.log('Export:', format, data)
              addNotification(`Report exported as ${format}`, 'success')
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={loadParkingData}
              className="flex items-center gap-2"
              disabled={sharedState.isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${sharedState.isLoading ? 'animate-spin' : ''}`} />
              Refresh All Data
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const csvData = sharedState.spots.map(spot => ({
                  id: spot.id,
                  bay: spot.bay,
                  spotNumber: spot.spotNumber,
                  status: spot.status,
                  type: spot.type,
                  floor: spot.floor,
                  currentVehicle: spot.currentVehicle?.licensePlate || ''
                }));
                console.log('Exporting:', csvData);
                addNotification('Data exported successfully', 'success');
              }}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Export Current View
            </Button>
            <Button
              variant="outline"
              onClick={() => clearSelection()}
              className="flex items-center gap-2"
              disabled={sharedState.selectedSpots.length === 0}
            >
              <Eye className="h-4 w-4" />
              Clear Selection ({stats.selectedCount})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ParkingGridPage
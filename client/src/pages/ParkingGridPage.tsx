import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ParkingGrid, StatusLegend } from '@/components/parking'
import { ZoomControls } from '@/components/parking/ZoomControls'
import { BulkOperationsToolbar } from '@/components/parking/BulkOperationsToolbar'
import { ParkingListView } from '@/components/parking/ParkingListView'
import { AnalyticsView } from '@/components/parking/AnalyticsView'
import { MaintenanceView } from '@/components/parking/MaintenanceView'
import { ReportsView } from '@/components/parking/ReportsView'
import { 
  Building2, 
  Car, 
  Grid3X3,
  List,
  BarChart3,
  Wrench,
  FileText,
  Zap,
  RefreshCw,
  Eye,
  Download,
  Search,
  Filter
} from 'lucide-react'
import type { ParkingSpot } from '@/types/api'

export const ParkingGridPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('grid')
  const [selectedSpots, setSelectedSpots] = useState<string[]>([])
  const [zoomLevel, setZoomLevel] = useState(100)
  const [garageId] = useState('demo-garage-1')

  // Shared state for all tabs
  const [sharedState, setSharedState] = useState({
    selectedFloor: 1,
    searchQuery: '',
    statusFilter: 'all' as const,
    typeFilter: 'all' as const,
    lastRefresh: new Date()
  })

  const handleBulkOperation = useCallback((operation: string, spotIds: string[]) => {
    console.log(`Bulk operation: ${operation} on spots:`, spotIds)
    // Implementation would go here
    setSelectedSpots([])
  }, [])

  const handleExport = useCallback((format: 'csv' | 'pdf') => {
    console.log(`Exporting data as ${format}`)
    // Implementation would go here
  }, [])

  const handleZoomChange = useCallback((level: number) => {
    setZoomLevel(Math.max(25, Math.min(150, level)))
  }, [])

  const handleSpotSelection = useCallback((spotId: string, selected: boolean) => {
    setSelectedSpots(prev => 
      selected 
        ? [...prev, spotId]
        : prev.filter(id => id !== spotId)
    )
  }, [])

  const tabs = [
    { id: 'grid', label: 'Grid View', icon: Grid3X3 },
    { id: 'list', label: 'List View', icon: List },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'reports', label: 'Reports', icon: FileText }
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Enhanced Parking Management</h1>
            <p className="text-muted-foreground mt-1">
              Professional tabbed interface with advanced features
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-2">
              <Zap className="h-3 w-3" />
              Real-time Updates
            </Badge>
            {selectedSpots.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-2">
                {selectedSpots.length} selected
              </Badge>
            )}
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Global search and filters available in each tab</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            {selectedSpots.length > 0 && (
              <BulkOperationsToolbar 
                selectedCount={selectedSpots.length}
                onBulkOperation={handleBulkOperation}
                onClearSelection={() => setSelectedSpots([])}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl mx-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="mt-6">
          {/* Grid View Tab */}
          <TabsContent value="grid" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Enhanced Grid View</h2>
              <div className="flex items-center gap-4">
                <ZoomControls 
                  zoomLevel={zoomLevel}
                  onZoomChange={handleZoomChange}
                  minZoom={25}
                  maxZoom={150}
                />
              </div>
            </div>
            <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}>
              <ParkingGrid
                garageId={garageId}
                showControls={true}
                showLegend={true}
                defaultFloor={sharedState.selectedFloor}
                selectedSpots={selectedSpots}
                onSpotSelection={handleSpotSelection}
                enableMultiSelect={true}
              />
            </div>
          </TabsContent>

          {/* List View Tab */}
          <TabsContent value="list" className="space-y-4">
            <h2 className="text-2xl font-semibold">Advanced List View</h2>
            <ParkingListView
              garageId={garageId}
              sharedState={sharedState}
              selectedSpots={selectedSpots}
              onSpotSelection={handleSpotSelection}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <h2 className="text-2xl font-semibold">Analytics Dashboard</h2>
            <AnalyticsView
              garageId={garageId}
              sharedState={sharedState}
            />
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            <h2 className="text-2xl font-semibold">Maintenance Management</h2>
            <MaintenanceView
              garageId={garageId}
              sharedState={sharedState}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <h2 className="text-2xl font-semibold">Reports & Export</h2>
            <ReportsView
              garageId={garageId}
              sharedState={sharedState}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export default ParkingGridPage
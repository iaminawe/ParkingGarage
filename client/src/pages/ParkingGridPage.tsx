import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ParkingGrid, StatusLegend } from '@/components/parking'
import { 
  Building2, 
  Car, 
  Info, 
  Lightbulb,
  Zap,
  RefreshCw,
  Eye
} from 'lucide-react'

export const ParkingGridPage: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState('full')

  const demoConfigs = {
    full: {
      title: 'Complete Parking Grid',
      description: 'Full-featured parking grid with all controls and legend',
      showControls: true,
      showLegend: true,
    },
    minimal: {
      title: 'Minimal Grid View',
      description: 'Clean grid view without extra controls',
      showControls: false,
      showLegend: false,
    },
    controls: {
      title: 'Grid with Controls',
      description: 'Grid with search and filter controls only',
      showControls: true,
      showLegend: false,
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Parking Grid Visualization</h1>
            <p className="text-muted-foreground mt-1">
              Interactive real-time parking spot management system
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            Real-time Updates
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-semibold">5</div>
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
                  <div className="text-2xl font-semibold">250</div>
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
                  <div className="text-2xl font-semibold">Live</div>
                  <div className="text-sm text-muted-foreground">WebSocket</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-semibold">2</div>
                  <div className="text-sm text-muted-foreground">View Modes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Features Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">Visual Status System</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Color-coded spot status (Available/Occupied/Reserved/Maintenance)</li>
                <li>• Ring indicators for spot types (Standard/Compact/Oversized/EV)</li>
                <li>• Feature badges for special amenities</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Interactive Controls</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Floor selection tabs</li>
                <li>• Search by spot number, bay, or license plate</li>
                <li>• Filter by status, type, and features</li>
                <li>• Grid and list view modes</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Real-time Features</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• WebSocket live updates</li>
                <li>• Instant status change notifications</li>
                <li>• Hover tooltips with detailed info</li>
                <li>• Click-to-view detailed spot information</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Demo Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedDemo} onValueChange={setSelectedDemo}>
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="full">Complete</TabsTrigger>
              <TabsTrigger value="minimal">Minimal</TabsTrigger>
              <TabsTrigger value="controls">With Controls</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 space-y-2">
              <h4 className="font-semibold">{demoConfigs[selectedDemo as keyof typeof demoConfigs].title}</h4>
              <p className="text-sm text-muted-foreground">
                {demoConfigs[selectedDemo as keyof typeof demoConfigs].description}
              </p>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Demo Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Interactive Demo</h2>
        <ParkingGrid
          garageId="demo-garage-1"
          showControls={demoConfigs[selectedDemo as keyof typeof demoConfigs].showControls}
          showLegend={demoConfigs[selectedDemo as keyof typeof demoConfigs].showLegend}
          defaultFloor={1}
        />
      </div>

      {/* Standalone Legend for Reference */}
      {selectedDemo === 'minimal' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Standalone Legend (Full)</h3>
            <StatusLegend />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">Compact Legend</h3>
            <StatusLegend compact={true} />
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Basic Interaction</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>1. Click any parking spot to view detailed information</li>
                <li>2. Hover over spots for quick status tooltips</li>
                <li>3. Use floor tabs to switch between different levels</li>
                <li>4. Toggle between grid and list view modes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Filtering & Search</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>1. Search by spot number, bay, or license plate</li>
                <li>2. Filter by spot status (available, occupied, etc.)</li>
                <li>3. Filter by spot type (standard, EV, oversized, etc.)</li>
                <li>4. Clear all filters to reset the view</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Status Management</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Click on any available or maintenance spot to open the details dialog, where you can:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• View complete spot information and features</li>
              <li>• See current vehicle details (if occupied)</li>
              <li>• Calculate parking duration in real-time</li>
              <li>• Update spot status (Available ↔ Maintenance)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ParkingGridPage
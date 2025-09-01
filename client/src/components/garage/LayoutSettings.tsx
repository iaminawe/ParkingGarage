import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  LayoutGrid, 
  Building, 
  Navigation, 
  Accessibility, 
  Zap,
  Shield,
  Lightbulb,
  Wind,
  AlertTriangle,
  Plus,
  Trash2,
  Car,
  Eye,
  Smartphone,
  Signpost
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { LayoutConfig, SpotType } from '@/types/api'

interface LayoutSettingsProps {
  config: LayoutConfig
  onChange: (config: Partial<LayoutConfig>) => void
  errors?: string[]
  className?: string
}

const SPOT_TYPES: { value: SpotType; label: string; color: string }[] = [
  { value: 'standard', label: 'Standard', color: 'bg-blue-100 text-blue-800' },
  { value: 'compact', label: 'Compact', color: 'bg-green-100 text-green-800' },
  { value: 'handicap', label: 'Handicap', color: 'bg-purple-100 text-purple-800' },
  { value: 'ev', label: 'EV Charging', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'oversized', label: 'Oversized', color: 'bg-orange-100 text-orange-800' }
]

const LIGHTING_TYPES = [
  { value: 'led', label: 'LED Lighting' },
  { value: 'fluorescent', label: 'Fluorescent' },
  { value: 'motion-sensor', label: 'Motion Sensor LED' }
]

const VENTILATION_TYPES = [
  { value: 'natural', label: 'Natural Ventilation' },
  { value: 'mechanical', label: 'Mechanical Ventilation' },
  { value: 'hvac', label: 'HVAC System' }
]

export const LayoutSettings: React.FC<LayoutSettingsProps> = ({
  config,
  onChange,
  errors = [],
  className
}) => {
  const [localConfig, setLocalConfig] = useState(config)

  // Recalculate totals when floors change
  useEffect(() => {
    const newCapacity = {
      total: 0,
      standard: 0,
      compact: 0,
      handicap: 0,
      ev: 0,
      oversized: 0
    }

    localConfig.floors.forEach(floor => {
      newCapacity.total += floor.totalSpots
      Object.entries(floor.spotTypes).forEach(([type, count]) => {
        newCapacity[type as SpotType] += count
      })
    })

    if (JSON.stringify(newCapacity) !== JSON.stringify(localConfig.capacity)) {
      const updatedConfig = {
        ...localConfig,
        capacity: newCapacity
      }
      setLocalConfig(updatedConfig)
      onChange(updatedConfig)
    }
  }, [localConfig.floors])

  const handleFloorChange = (index: number, field: string, value: any) => {
    const updatedFloors = [...localConfig.floors]
    
    if (field.startsWith('spotTypes.')) {
      const spotType = field.split('.')[1] as SpotType
      updatedFloors[index] = {
        ...updatedFloors[index],
        spotTypes: {
          ...updatedFloors[index].spotTypes,
          [spotType]: value
        }
      }
      
      // Recalculate total spots for this floor
      const totalSpots = Object.values(updatedFloors[index].spotTypes).reduce((sum, count) => sum + count, 0)
      updatedFloors[index].totalSpots = totalSpots
    } else if (field === 'bays') {
      updatedFloors[index] = {
        ...updatedFloors[index],
        [field]: value
      }
    } else {
      updatedFloors[index] = {
        ...updatedFloors[index],
        [field]: value
      }
    }
    
    const updatedConfig = {
      ...localConfig,
      floors: updatedFloors
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const addFloor = () => {
    const newFloor = {
      number: localConfig.floors.length + 1,
      name: `Floor ${localConfig.floors.length + 1}`,
      totalSpots: 0,
      spotTypes: {
        standard: 0,
        compact: 0,
        handicap: 0,
        ev: 0,
        oversized: 0
      },
      bays: ['A']
    }
    
    const updatedConfig = {
      ...localConfig,
      floors: [...localConfig.floors, newFloor]
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const removeFloor = (index: number) => {
    const updatedFloors = localConfig.floors.filter((_, i) => i !== index)
    // Renumber floors
    const renumberedFloors = updatedFloors.map((floor, i) => ({
      ...floor,
      number: i + 1,
      name: floor.name.includes('Floor') ? `Floor ${i + 1}` : floor.name
    }))
    
    const updatedConfig = {
      ...localConfig,
      floors: renumberedFloors
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleNavigationChange = (field: string, value: any) => {
    const updatedConfig = {
      ...localConfig,
      navigation: {
        ...localConfig.navigation,
        [field]: value
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleAccessibilityChange = (field: string, value: any) => {
    const updatedConfig = {
      ...localConfig,
      accessibility: {
        ...localConfig.accessibility,
        [field]: value
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleFeaturesChange = (field: string, value: any) => {
    const updatedConfig = {
      ...localConfig,
      features: {
        ...localConfig.features,
        [field]: value
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const addBayToFloor = (floorIndex: number) => {
    const currentBays = localConfig.floors[floorIndex].bays
    const nextBayLetter = String.fromCharCode(65 + currentBays.length) // A, B, C, etc.
    const updatedBays = [...currentBays, nextBayLetter]
    handleFloorChange(floorIndex, 'bays', updatedBays)
  }

  const removeBayFromFloor = (floorIndex: number, bayIndex: number) => {
    const updatedBays = localConfig.floors[floorIndex].bays.filter((_, i) => i !== bayIndex)
    handleFloorChange(floorIndex, 'bays', updatedBays)
  }

  const getSpotTypeUtilization = (spotType: SpotType) => {
    const total = localConfig.capacity.total
    const count = localConfig.capacity[spotType]
    return total > 0 ? (count / total) * 100 : 0
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Error Display */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="floors" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="floors">Floors & Capacity</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        {/* Floors & Capacity */}
        <TabsContent value="floors" className="space-y-6">
          {/* Capacity Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                Capacity Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">Total Capacity</span>
                  <span className="text-2xl font-bold">{localConfig.capacity.total}</span>
                </div>
                
                <div className="space-y-3">
                  {SPOT_TYPES.map(spotType => {
                    const count = localConfig.capacity[spotType.value]
                    const percentage = getSpotTypeUtilization(spotType.value)
                    
                    return (
                      <div key={spotType.value} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={spotType.color}>
                              {spotType.label}
                            </Badge>
                          </div>
                          <span className="font-medium">
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Floor Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Floor Configuration
                </CardTitle>
                <Button onClick={addFloor} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Floor
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {localConfig.floors.map((floor, floorIndex) => (
                <div key={floor.number} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 mr-4">
                      <div className="space-y-2">
                        <Label>Floor Number</Label>
                        <Input
                          type="number"
                          min="1"
                          value={floor.number}
                          onChange={(e) => handleFloorChange(
                            floorIndex, 
                            'number', 
                            parseInt(e.target.value) || 1
                          )}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Floor Name</Label>
                        <Input
                          value={floor.name || ''}
                          onChange={(e) => handleFloorChange(floorIndex, 'name', e.target.value)}
                          placeholder={`Floor ${floor.number}`}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Total Spots</Label>
                        <Input
                          type="number"
                          value={floor.totalSpots}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>
                    
                    {localConfig.floors.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFloor(floorIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Spot Type Distribution */}
                  <div>
                    <Label className="text-base font-medium">Spot Distribution</Label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                      {SPOT_TYPES.map(spotType => (
                        <div key={spotType.value} className="space-y-2">
                          <Label className="text-sm">{spotType.label}</Label>
                          <Input
                            type="number"
                            min="0"
                            value={floor.spotTypes[spotType.value]}
                            onChange={(e) => handleFloorChange(
                              floorIndex, 
                              `spotTypes.${spotType.value}`, 
                              parseInt(e.target.value) || 0
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bay Configuration */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-base font-medium">Bays</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addBayToFloor(floorIndex)}
                        disabled={floor.bays.length >= 10}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Bay
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {floor.bays.map((bay, bayIndex) => (
                        <div key={bayIndex} className="flex items-center gap-1">
                          <Badge variant="outline" className="px-3 py-1">
                            Bay {bay}
                          </Badge>
                          {floor.bays.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBayFromFloor(floorIndex, bayIndex)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Navigation */}
        <TabsContent value="navigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Navigation & Wayfinding
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure navigation aids and customer guidance systems
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <Signpost className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={localConfig.navigation.signageEnabled}
                        onChange={(checked) => handleNavigationChange('signageEnabled', checked)}
                      />
                      <Label className="font-medium">Physical Signage</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Traditional directional signs and markers
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={localConfig.navigation.digitalDisplays}
                        onChange={(checked) => handleNavigationChange('digitalDisplays', checked)}
                      />
                      <Label className="font-medium">Digital Displays</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Electronic displays showing availability
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={localConfig.navigation.mobileApp}
                        onChange={(checked) => handleNavigationChange('mobileApp', checked)}
                      />
                      <Label className="font-medium">Mobile App</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Smartphone app with navigation features
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accessibility */}
        <TabsContent value="accessibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Accessibility className="h-5 w-5" />
                Accessibility Features
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure accessibility compliance and accommodations
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Handicap Accessible Spots</Label>
                    <Input
                      type="number"
                      min="0"
                      value={localConfig.accessibility.handicapSpots}
                      onChange={(e) => handleAccessibilityChange(
                        'handicapSpots', 
                        parseInt(e.target.value) || 0
                      )}
                    />
                    <p className="text-sm text-muted-foreground">
                      ADA compliant parking spaces with proper access
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={localConfig.accessibility.wheelchairAccess}
                      onChange={(checked) => handleAccessibilityChange('wheelchairAccess', checked)}
                    />
                    <Label>Wheelchair Accessible Paths</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={localConfig.accessibility.elevatorsAvailable}
                      onChange={(checked) => handleAccessibilityChange('elevatorsAvailable', checked)}
                    />
                    <Label>Elevator Access</Label>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">ADA Compliance</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Minimum 1 accessible spot per 25 total spots</li>
                    <li>• Accessible spots should be closest to entrances</li>
                    <li>• Van accessible spots: 1 per 6 accessible spots</li>
                    <li>• Clear width of 36 inches minimum for access aisles</li>
                  </ul>
                </div>
              </div>

              {localConfig.accessibility.handicapSpots < Math.ceil(localConfig.capacity.total / 25) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Consider adding more handicap spots to meet ADA guidelines. 
                    Recommended: {Math.ceil(localConfig.capacity.total / 25)} spots for {localConfig.capacity.total} total capacity.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Garage Features
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure physical features and amenities
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>EV Charging Stations</Label>
                    <Input
                      type="number"
                      min="0"
                      value={localConfig.features.evChargingStations}
                      onChange={(e) => handleFeaturesChange(
                        'evChargingStations', 
                        parseInt(e.target.value) || 0
                      )}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={localConfig.features.securityCameras}
                      onChange={(checked) => handleFeaturesChange('securityCameras', checked)}
                    />
                    <Label>Security Cameras</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Lighting Type</Label>
                    <Select
                      value={localConfig.features.lightingType}
                      onValueChange={(value) => handleFeaturesChange('lightingType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LIGHTING_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Lightbulb className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Ventilation System</Label>
                    <Select
                      value={localConfig.features.ventilation}
                      onValueChange={(value) => handleFeaturesChange('ventilation', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VENTILATION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Wind className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LayoutSettings
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Save, 
  X, 
  MapPin, 
  Car, 
  DollarSign, 
  Ruler, 
  Wrench, 
  Clock,
  Zap,
  Accessibility,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ParkingSpot, SpotType, SpotStatus } from '@/types/api'

interface SpotFormProps {
  spot?: ParkingSpot | null
  onSave: (spotData: Partial<ParkingSpot>) => Promise<void>
  onCancel: () => void
  className?: string
}

interface SpotFormData {
  spotNumber: string
  floor: number
  bay: string
  type: SpotType
  status: SpotStatus
  features: string[]
  dimensions: {
    length: number
    width: number
    height: number
  }
  priceOverride?: number
  maintenanceNotes?: string
}

const SPOT_TYPES: { value: SpotType; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Regular parking spot for most vehicles' },
  { value: 'compact', label: 'Compact', description: 'Smaller spot for compact cars' },
  { value: 'handicap', label: 'Handicap', description: 'Accessible parking with wider access' },
  { value: 'ev', label: 'EV Charging', description: 'Electric vehicle charging station' },
  { value: 'oversized', label: 'Oversized', description: 'Large spot for trucks, vans, etc.' }
]

const SPOT_FEATURES: { value: string; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'ev_charging', label: 'EV Charging', description: 'Electric vehicle charging station', icon: <Zap className="h-4 w-4" /> },
  { value: 'handicap', label: 'Handicap Access', description: 'ADA compliant accessibility', icon: <Accessibility className="h-4 w-4" /> },
  { value: 'covered', label: 'Covered', description: 'Protected from weather', icon: <Shield className="h-4 w-4" /> },
  { value: 'wide', label: 'Extra Wide', description: 'Wider than standard spots', icon: <Ruler className="h-4 w-4" /> },
  { value: 'security_camera', label: 'Security Camera', description: 'Enhanced security monitoring', icon: <Shield className="h-4 w-4" /> },
  { value: 'valet_only', label: 'Valet Only', description: 'Restricted to valet service', icon: <Shield className="h-4 w-4" /> }
]

export const SpotForm: React.FC<SpotFormProps> = ({
  spot,
  onSave,
  onCancel,
  className
}) => {
  const [formData, setFormData] = useState<SpotFormData>({
    spotNumber: '',
    floor: 1,
    bay: 'A',
    type: 'standard',
    status: 'available',
    features: [],
    dimensions: {
      length: 18,
      width: 9,
      height: 8
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Initialize form with spot data if editing
  useEffect(() => {
    if (spot) {
      setFormData({
        spotNumber: spot.spotNumber,
        floor: spot.floor,
        bay: spot.bay || 'A',
        type: spot.type,
        status: spot.status,
        features: spot.features || [],
        dimensions: {
          length: spot.dimensions?.length || 18,
          width: spot.dimensions?.width || 9,
          height: spot.dimensions?.height || 8
        },
        priceOverride: spot.priceOverride,
        maintenanceNotes: spot.maintenanceNotes
      })
    }
  }, [spot])

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.spotNumber.trim()) {
      errors.spotNumber = 'Spot number is required'
    } else if (!/^[A-Za-z0-9-]+$/.test(formData.spotNumber)) {
      errors.spotNumber = 'Spot number can only contain letters, numbers, and hyphens'
    }

    if (formData.floor < 1) {
      errors.floor = 'Floor must be at least 1'
    } else if (formData.floor > 50) {
      errors.floor = 'Floor cannot exceed 50'
    }

    if (!formData.bay.trim()) {
      errors.bay = 'Bay is required'
    } else if (!/^[A-Z]$/.test(formData.bay)) {
      errors.bay = 'Bay must be a single uppercase letter'
    }

    if (formData.dimensions.length < 10 || formData.dimensions.length > 30) {
      errors.length = 'Length must be between 10-30 feet'
    }

    if (formData.dimensions.width < 6 || formData.dimensions.width > 15) {
      errors.width = 'Width must be between 6-15 feet'
    }

    if (formData.dimensions.height < 6 || formData.dimensions.height > 12) {
      errors.height = 'Height must be between 6-12 feet'
    }

    if (formData.priceOverride !== undefined && formData.priceOverride < 0) {
      errors.priceOverride = 'Price override cannot be negative'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle input changes
  const handleInputChange = (field: keyof SpotFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: _removed, ...rest } = prev
        return rest
      })
    }
  }

  const handleDimensionChange = (dimension: 'length' | 'width' | 'height', value: number) => {
    setFormData(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [dimension]: value
      }
    }))
  }

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }))
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Prepare spot data
      const spotData: Partial<ParkingSpot> = {
        ...formData,
        dimensions: formData.dimensions,
        features: formData.features.length > 0 ? formData.features : undefined,
        priceOverride: formData.priceOverride || undefined,
        maintenanceNotes: formData.maintenanceNotes?.trim() || undefined
      }

      await onSave(spotData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save spot')
    } finally {
      setLoading(false)
    }
  }

  // Get form title
  const formTitle = spot ? `Edit Spot ${spot.spotNumber}` : 'Add New Spot'

  // Check if form has changes
  const hasChanges = spot ? (
    formData.spotNumber !== spot.spotNumber ||
    formData.floor !== spot.floor ||
    formData.bay !== (spot.bay || 'A') ||
    formData.type !== spot.type ||
    formData.status !== spot.status ||
    JSON.stringify(formData.features.sort()) !== JSON.stringify((spot.features || []).sort()) ||
    JSON.stringify(formData.dimensions) !== JSON.stringify(spot.dimensions || { length: 18, width: 9, height: 8 }) ||
    formData.priceOverride !== spot.priceOverride ||
    formData.maintenanceNotes !== spot.maintenanceNotes
  ) : (
    formData.spotNumber.trim() !== '' ||
    formData.floor !== 1 ||
    formData.bay !== 'A' ||
    formData.type !== 'standard' ||
    formData.features.length > 0 ||
    formData.priceOverride !== undefined ||
    formData.maintenanceNotes?.trim() !== ''
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{formTitle}</h2>
          <p className="text-muted-foreground mt-1">
            {spot ? 'Update spot properties and configuration' : 'Configure new parking spot details'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !hasChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : spot ? 'Update Spot' : 'Create Spot'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Basic Information */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location & Identification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="spotNumber">
                    Spot Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="spotNumber"
                    value={formData.spotNumber}
                    onChange={(e) => handleInputChange('spotNumber', e.target.value)}
                    placeholder="e.g. A-001, 123, P1-A5"
                    className={validationErrors.spotNumber ? 'border-red-500' : ''}
                  />
                  {validationErrors.spotNumber && (
                    <p className="text-sm text-red-500">{validationErrors.spotNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="floor">
                    Floor <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="floor"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.floor}
                    onChange={(e) => handleInputChange('floor', parseInt(e.target.value) || 1)}
                    className={validationErrors.floor ? 'border-red-500' : ''}
                  />
                  {validationErrors.floor && (
                    <p className="text-sm text-red-500">{validationErrors.floor}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bay">Bay</Label>
                  <Select 
                    value={formData.bay} 
                    onValueChange={(value: string) => handleInputChange('bay', value)}
                  >
                    <SelectTrigger className={validationErrors.bay ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map(bay => (
                        <SelectItem key={bay} value={bay}>Bay {bay}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.bay && (
                    <p className="text-sm text-red-500">{validationErrors.bay}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Spot Type & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Spot Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: string) => handleInputChange('type', value as SpotType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPOT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: string) => handleInputChange('status', value as SpotStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Spot Dimensions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="length">Length (feet)</Label>
                  <Input
                    id="length"
                    type="number"
                    min="10"
                    max="30"
                    step="0.5"
                    value={formData.dimensions.length}
                    onChange={(e) => handleDimensionChange('length', parseFloat(e.target.value) || 18)}
                    className={validationErrors.length ? 'border-red-500' : ''}
                  />
                  {validationErrors.length && (
                    <p className="text-sm text-red-500">{validationErrors.length}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="width">Width (feet)</Label>
                  <Input
                    id="width"
                    type="number"
                    min="6"
                    max="15"
                    step="0.5"
                    value={formData.dimensions.width}
                    onChange={(e) => handleDimensionChange('width', parseFloat(e.target.value) || 9)}
                    className={validationErrors.width ? 'border-red-500' : ''}
                  />
                  {validationErrors.width && (
                    <p className="text-sm text-red-500">{validationErrors.width}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Height Clearance (feet)</Label>
                  <Input
                    id="height"
                    type="number"
                    min="6"
                    max="12"
                    step="0.5"
                    value={formData.dimensions.height}
                    onChange={(e) => handleDimensionChange('height', parseFloat(e.target.value) || 8)}
                    className={validationErrors.height ? 'border-red-500' : ''}
                  />
                  {validationErrors.height && (
                    <p className="text-sm text-red-500">{validationErrors.height}</p>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Standard dimensions: 18' × 9' × 8' clearance. Adjust based on spot type and requirements.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Spot Features</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select all features available at this parking spot
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SPOT_FEATURES.map(feature => (
                  <div key={feature.value} className="flex items-start space-x-3">
                    <Checkbox
                      id={feature.value}
                      checked={formData.features.includes(feature.value)}
                      onChange={() => handleFeatureToggle(feature.value)}
                    />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {feature.icon}
                        <Label 
                          htmlFor={feature.value} 
                          className="text-sm font-medium cursor-pointer"
                        >
                          {feature.label}
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {formData.features.length > 0 && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium">Selected Features</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.features.map(feature => {
                      const featureData = SPOT_FEATURES.find(f => f.value === feature)
                      return (
                        <Badge key={feature} variant="secondary" className="flex items-center gap-1">
                          {featureData?.icon}
                          {featureData?.label}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="priceOverride">Price Override (per hour)</Label>
                <Input
                  id="priceOverride"
                  type="number"
                  min="0"
                  step="0.25"
                  value={formData.priceOverride || ''}
                  onChange={(e) => handleInputChange('priceOverride', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Leave empty to use default garage pricing"
                  className={validationErrors.priceOverride ? 'border-red-500' : ''}
                />
                {validationErrors.priceOverride && (
                  <p className="text-sm text-red-500">{validationErrors.priceOverride}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Override the default garage pricing for this specific spot. Leave blank to use garage defaults.
                </p>
              </div>

              {formData.priceOverride && (
                <Alert>
                  <DollarSign className="h-4 w-4" />
                  <AlertDescription>
                    This spot will charge <strong>${formData.priceOverride}/hour</strong> instead of the default garage rate.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maintenanceNotes">Maintenance Notes</Label>
                <Textarea
                  id="maintenanceNotes"
                  value={formData.maintenanceNotes || ''}
                  onChange={(e) => handleInputChange('maintenanceNotes', e.target.value)}
                  placeholder="Add any maintenance notes, special instructions, or known issues..."
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Record any ongoing maintenance issues, special cleaning requirements, or operational notes.
                </p>
              </div>

              {spot?.maintenanceSchedule && spot.maintenanceSchedule.length > 0 && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium">Scheduled Maintenance</Label>
                  <div className="space-y-2 mt-2">
                    {spot.maintenanceSchedule.slice(0, 3).map(maintenance => (
                      <div key={maintenance.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{maintenance.description}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {new Date(maintenance.scheduledDate).toLocaleDateString()}
                            <Badge variant="outline" className="text-xs">
                              {maintenance.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SpotForm
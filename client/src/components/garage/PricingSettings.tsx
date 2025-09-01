import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DollarSign, 
  TrendingUp, 
  Gift, 
  Clock, 
  AlertTriangle,
  Plus,
  Trash2,
  Car,
  Truck
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { PricingConfig, VehicleType } from '@/types/api'

interface PricingSettingsProps {
  config: PricingConfig
  onChange: (config: Partial<PricingConfig>) => void
  errors?: string[]
  className?: string
}

const VEHICLE_TYPES: { value: VehicleType; label: string; icon: React.ReactNode }[] = [
  { value: 'car', label: 'Car', icon: <Car className="h-4 w-4" /> },
  { value: 'motorcycle', label: 'Motorcycle', icon: <Car className="h-4 w-4" /> },
  { value: 'truck', label: 'Truck', icon: <Truck className="h-4 w-4" /> },
  { value: 'van', label: 'Van', icon: <Car className="h-4 w-4" /> },
  { value: 'bus', label: 'Bus', icon: <Truck className="h-4 w-4" /> }
]

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed Amount' }
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

export const PricingSettings: React.FC<PricingSettingsProps> = ({
  config,
  onChange,
  errors = [],
  className
}) => {
  const [localConfig, setLocalConfig] = useState(config)

  const handleRateChange = (
    vehicleType: VehicleType, 
    period: 'hourly' | 'daily' | 'weekly' | 'monthly',
    value: number,
    isPeakRate: boolean = false
  ) => {
    const rateKey = isPeakRate ? 'peakRates' : 'defaultRates'
    const updatedConfig = {
      ...localConfig,
      [rateKey]: {
        ...localConfig[rateKey as keyof PricingConfig],
        [vehicleType]: {
          ...localConfig[rateKey as keyof PricingConfig]?.[vehicleType],
          [period]: value
        }
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handlePeakHoursChange = (index: number, field: 'start' | 'end', value: string) => {
    const updatedPeakHours = [...localConfig.peakHours]
    updatedPeakHours[index] = {
      ...updatedPeakHours[index],
      [field]: value
    }
    
    const updatedConfig = {
      ...localConfig,
      peakHours: updatedPeakHours
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const addPeakHours = () => {
    const updatedConfig = {
      ...localConfig,
      peakHours: [
        ...localConfig.peakHours,
        { start: '09:00', end: '17:00' }
      ]
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const removePeakHours = (index: number) => {
    const updatedPeakHours = localConfig.peakHours.filter((_, i) => i !== index)
    const updatedConfig = {
      ...localConfig,
      peakHours: updatedPeakHours
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleDiscountChange = (index: number, field: string, value: any) => {
    const updatedDiscounts = [...localConfig.discounts]
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      updatedDiscounts[index] = {
        ...updatedDiscounts[index],
        [parent]: {
          ...updatedDiscounts[index][parent as keyof typeof updatedDiscounts[0]],
          [child]: value
        }
      }
    } else {
      updatedDiscounts[index] = {
        ...updatedDiscounts[index],
        [field]: value
      }
    }
    
    const updatedConfig = {
      ...localConfig,
      discounts: updatedDiscounts
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const addDiscount = () => {
    const newDiscount = {
      id: Date.now().toString(),
      name: '',
      type: 'percentage' as const,
      value: 0,
      conditions: {},
      active: true
    }
    
    const updatedConfig = {
      ...localConfig,
      discounts: [...localConfig.discounts, newDiscount]
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const removeDiscount = (index: number) => {
    const updatedDiscounts = localConfig.discounts.filter((_, i) => i !== index)
    const updatedConfig = {
      ...localConfig,
      discounts: updatedDiscounts
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleFreeParkingChange = (field: string, value: any) => {
    const updatedConfig = {
      ...localConfig,
      freeParking: {
        ...localConfig.freeParking,
        [field]: value
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleOvertimeChargesChange = (field: string, value: any) => {
    const updatedConfig = {
      ...localConfig,
      overtimeCharges: {
        ...localConfig.overtimeCharges,
        [field]: value
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const renderRateTable = (isPeakRates: boolean = false) => {
    const rates = isPeakRates ? localConfig.peakRates : localConfig.defaultRates
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Vehicle Type</th>
              <th className="text-left p-2">Hourly</th>
              <th className="text-left p-2">Daily</th>
              {!isPeakRates && <th className="text-left p-2">Weekly</th>}
              {!isPeakRates && <th className="text-left p-2">Monthly</th>}
            </tr>
          </thead>
          <tbody>
            {VEHICLE_TYPES.map(vehicleType => (
              <tr key={vehicleType.value} className="border-b">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {vehicleType.icon}
                    {vehicleType.label}
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex items-center">
                    <span className="mr-1">$</span>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={rates?.[vehicleType.value]?.hourly || 0}
                      onChange={(e) => handleRateChange(
                        vehicleType.value, 
                        'hourly', 
                        parseFloat(e.target.value) || 0,
                        isPeakRates
                      )}
                      className="w-20"
                    />
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex items-center">
                    <span className="mr-1">$</span>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={rates?.[vehicleType.value]?.daily || 0}
                      onChange={(e) => handleRateChange(
                        vehicleType.value, 
                        'daily', 
                        parseFloat(e.target.value) || 0,
                        isPeakRates
                      )}
                      className="w-20"
                    />
                  </div>
                </td>
                {!isPeakRates && (
                  <>
                    <td className="p-2">
                      <div className="flex items-center">
                        <span className="mr-1">$</span>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          value={localConfig.defaultRates[vehicleType.value]?.weekly || 0}
                          onChange={(e) => handleRateChange(
                            vehicleType.value, 
                            'weekly', 
                            parseFloat(e.target.value) || 0
                          )}
                          className="w-20"
                        />
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <span className="mr-1">$</span>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          value={localConfig.defaultRates[vehicleType.value]?.monthly || 0}
                          onChange={(e) => handleRateChange(
                            vehicleType.value, 
                            'monthly', 
                            parseFloat(e.target.value) || 0
                          )}
                          className="w-20"
                        />
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
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

      <Tabs defaultValue="rates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rates">Base Rates</TabsTrigger>
          <TabsTrigger value="peak">Peak Rates</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        {/* Base Rates */}
        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Default Parking Rates
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Set standard pricing for different vehicle types and time periods
              </p>
            </CardHeader>
            <CardContent>
              {renderRateTable(false)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Peak Rates */}
        <TabsContent value="peak" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Peak Hour Settings
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure peak hours and premium pricing
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Peak Hours Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Peak Hours</h4>
                  <Button onClick={addPeakHours} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Peak Hours
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {localConfig.peakHours.map((peakHour, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Label>From:</Label>
                        <Input
                          type="time"
                          value={peakHour.start}
                          onChange={(e) => handlePeakHoursChange(index, 'start', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>To:</Label>
                        <Input
                          type="time"
                          value={peakHour.end}
                          onChange={(e) => handlePeakHoursChange(index, 'end', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePeakHours(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Peak Rates Table */}
              {localConfig.peakHours.length > 0 && (
                <div>
                  <h4 className="font-medium mb-4">Peak Hour Rates</h4>
                  {renderRateTable(true)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discounts */}
        <TabsContent value="discounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Discounts & Promotions
              </CardTitle>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Create and manage discount rules
                </p>
                <Button onClick={addDiscount} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Discount
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {localConfig.discounts.map((discount, index) => (
                <div key={discount.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Discount name"
                        value={discount.name}
                        onChange={(e) => handleDiscountChange(index, 'name', e.target.value)}
                        className="w-48"
                      />
                      <Badge variant={discount.active ? "default" : "secondary"}>
                        {discount.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={discount.active}
                        onChange={(checked) => handleDiscountChange(index, 'active', checked)}
                      />
                      <Label>Active</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeDiscount(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Discount Type</Label>
                      <Select
                        value={discount.type}
                        onValueChange={(value) => handleDiscountChange(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DISCOUNT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>
                        Value {discount.type === 'percentage' ? '(%)' : '($)'}
                      </Label>
                      <Input
                        type="number"
                        step={discount.type === 'percentage' ? '1' : '0.25'}
                        min="0"
                        max={discount.type === 'percentage' ? '100' : undefined}
                        value={discount.value}
                        onChange={(e) => handleDiscountChange(index, 'value', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Min Duration (minutes)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={discount.conditions.minDuration || ''}
                        onChange={(e) => handleDiscountChange(
                          index, 
                          'conditions.minDuration', 
                          e.target.value ? parseInt(e.target.value) : undefined
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {localConfig.discounts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No discounts configured. Click "Add Discount" to create one.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies */}
        <TabsContent value="policies" className="space-y-6">
          {/* Free Parking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Free Parking Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={localConfig.freeParking.enabled}
                  onChange={(checked) => handleFreeParkingChange('enabled', checked)}
                />
                <Label>Enable free parking period</Label>
              </div>
              
              {localConfig.freeParking.enabled && (
                <div className="space-y-2">
                  <Label>Free parking duration (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={localConfig.freeParking.duration}
                    onChange={(e) => handleFreeParkingChange('duration', parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Customers will not be charged for parking sessions shorter than this duration.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overtime Charges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Overtime Charges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={localConfig.overtimeCharges.enabled}
                  onChange={(checked) => handleOvertimeChargesChange('enabled', checked)}
                />
                <Label>Enable overtime charges</Label>
              </div>
              
              {localConfig.overtimeCharges.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Grace period (minutes)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={localConfig.overtimeCharges.gracePeriodMinutes}
                      onChange={(e) => handleOvertimeChargesChange(
                        'gracePeriodMinutes', 
                        parseInt(e.target.value) || 0
                      )}
                    />
                    <p className="text-sm text-muted-foreground">
                      Grace period before overtime charges apply.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Overtime multiplier</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      value={localConfig.overtimeCharges.multiplier}
                      onChange={(e) => handleOvertimeChargesChange(
                        'multiplier', 
                        parseFloat(e.target.value) || 1
                      )}
                    />
                    <p className="text-sm text-muted-foreground">
                      Multiplier for overtime rates (e.g., 1.5 = 50% surcharge).
                    </p>
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

export default PricingSettings
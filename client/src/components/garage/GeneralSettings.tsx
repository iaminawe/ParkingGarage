import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  FileText,
  AlertTriangle,
  Plus,
  Trash2
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { GeneralConfig } from '@/types/api'

interface GeneralSettingsProps {
  config: GeneralConfig
  onChange: (config: Partial<GeneralConfig>) => void
  errors?: string[]
  className?: string
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'UTC', label: 'UTC' }
]

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  config,
  onChange,
  errors = [],
  className
}) => {
  const [localConfig, setLocalConfig] = useState(config)

  const handleInputChange = (field: string, value: any) => {
    const updatedConfig = { ...localConfig }
    
    // Handle nested properties
    if (field.includes('.')) {
      const parts = field.split('.')
      let current = updatedConfig as any
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]]
      }
      current[parts[parts.length - 1]] = value
    } else {
      (updatedConfig as any)[field] = value
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleOperatingHoursChange = (
    period: 'weekdays' | 'weekends' | 'holidays',
    field: 'open' | 'close' | 'is24Hours',
    value: any
  ) => {
    const updatedHours = {
      ...localConfig.operatingHours,
      [period]: {
        ...localConfig.operatingHours[period],
        [field]: value
      }
    }
    
    // Clear open/close times if 24 hours is selected
    if (field === 'is24Hours' && value) {
      updatedHours[period] = {
        ...updatedHours[period],
        open: '00:00',
        close: '23:59'
      }
    }
    
    const updatedConfig = {
      ...localConfig,
      operatingHours: updatedHours
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const renderOperatingHoursSection = (
    period: 'weekdays' | 'weekends' | 'holidays',
    title: string,
    description: string
  ) => {
    const hours = localConfig.operatingHours[period]
    const is24Hours = hours?.is24Hours || false
    
    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${period}-24hours`}
            checked={is24Hours}
            onChange={(checked) => handleOperatingHoursChange(period, 'is24Hours', checked)}
          />
          <Label htmlFor={`${period}-24hours`} className="text-sm">
            Open 24 Hours
          </Label>
        </div>
        
        {!is24Hours && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${period}-open`}>Opening Time</Label>
              <Input
                id={`${period}-open`}
                type="time"
                value={hours?.open || '09:00'}
                onChange={(e) => handleOperatingHoursChange(period, 'open', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`${period}-close`}>Closing Time</Label>
              <Input
                id={`${period}-close`}
                type="time"
                value={hours?.close || '18:00'}
                onChange={(e) => handleOperatingHoursChange(period, 'close', e.target.value)}
              />
            </div>
          </div>
        )}
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

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Garage Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={localConfig.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter garage name"
                className={errors.some(e => e.includes('name')) ? 'border-red-500' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select 
                value={localConfig.timezone} 
                onValueChange={(value) => handleInputChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={localConfig.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter garage description"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={localConfig.address.street}
              onChange={(e) => handleInputChange('address.street', e.target.value)}
              placeholder="Enter street address"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={localConfig.address.city}
                onChange={(e) => handleInputChange('address.city', e.target.value)}
                placeholder="Enter city"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={localConfig.address.state}
                onChange={(e) => handleInputChange('address.state', e.target.value)}
                placeholder="Enter state"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP/Postal Code</Label>
              <Input
                id="zipCode"
                value={localConfig.address.zipCode}
                onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                placeholder="Enter ZIP code"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={localConfig.address.country}
              onChange={(e) => handleInputChange('address.country', e.target.value)}
              placeholder="Enter country"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={localConfig.contact.phone}
                onChange={(e) => handleInputChange('contact.phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={localConfig.contact.email}
                onChange={(e) => handleInputChange('contact.email', e.target.value)}
                placeholder="Enter email address"
                className={errors.some(e => e.includes('email')) ? 'border-red-500' : ''}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={localConfig.contact.website || ''}
              onChange={(e) => handleInputChange('contact.website', e.target.value)}
              placeholder="Enter website URL"
            />
          </div>
        </CardContent>
      </Card>

      {/* Operating Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Operating Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderOperatingHoursSection(
            'weekdays',
            'Weekdays (Monday - Friday)',
            'Operating hours for Monday through Friday'
          )}
          
          {renderOperatingHoursSection(
            'weekends',
            'Weekends (Saturday - Sunday)',
            'Operating hours for Saturday and Sunday'
          )}
          
          {renderOperatingHoursSection(
            'holidays',
            'Holidays',
            'Special operating hours for holidays (optional)'
          )}
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">Business License Number</Label>
              <Input
                id="licenseNumber"
                value={localConfig.business.licenseNumber || ''}
                onChange={(e) => handleInputChange('business.licenseNumber', e.target.value)}
                placeholder="Enter license number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID</Label>
              <Input
                id="taxId"
                value={localConfig.business.taxId || ''}
                onChange={(e) => handleInputChange('business.taxId', e.target.value)}
                placeholder="Enter tax ID"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="insuranceNumber">Insurance Policy Number</Label>
            <Input
              id="insuranceNumber"
              value={localConfig.business.insuranceNumber || ''}
              onChange={(e) => handleInputChange('business.insuranceNumber', e.target.value)}
              placeholder="Enter insurance policy number"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GeneralSettings
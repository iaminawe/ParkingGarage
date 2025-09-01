import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle,
  Building,
  DollarSign,
  LayoutGrid,
  Zap,
  Cog
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { GarageConfiguration as GarageConfigType } from '@/types/api'

import { GeneralSettings } from './GeneralSettings'
import { PricingSettings } from './PricingSettings'
import { LayoutSettings } from './LayoutSettings'
import { IntegrationSettings } from './IntegrationSettings'
import { OperationalSettings } from './OperationalSettings'

interface GarageConfigurationProps {
  garageId: string
  className?: string
}

export const GarageConfiguration: React.FC<GarageConfigurationProps> = ({
  garageId,
  className
}) => {
  const [configuration, setConfiguration] = useState<GarageConfigType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration()
  }, [garageId])

  const loadConfiguration = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // TODO: Replace with actual API call
      const mockConfig: GarageConfigType = {
        id: '1',
        garageId,
        general: {
          name: 'Downtown Parking Garage',
          description: 'Modern multi-level parking facility in downtown area',
          address: {
            street: '123 Main Street',
            city: 'Downtown',
            state: 'CA',
            zipCode: '90210',
            country: 'USA'
          },
          contact: {
            phone: '+1-555-123-4567',
            email: 'info@downtownparking.com',
            website: 'https://downtownparking.com'
          },
          operatingHours: {
            weekdays: { open: '06:00', close: '22:00' },
            weekends: { open: '08:00', close: '20:00' }
          },
          timezone: 'America/Los_Angeles',
          business: {
            licenseNumber: 'PG-2024-001',
            taxId: '12-3456789'
          }
        },
        pricing: {
          defaultRates: {
            car: { hourly: 3.00, daily: 25.00, weekly: 150.00, monthly: 550.00 },
            motorcycle: { hourly: 2.00, daily: 15.00, weekly: 90.00, monthly: 300.00 },
            truck: { hourly: 5.00, daily: 40.00, weekly: 250.00, monthly: 900.00 },
            van: { hourly: 4.00, daily: 32.00, weekly: 200.00, monthly: 720.00 },
            bus: { hourly: 8.00, daily: 60.00, weekly: 400.00, monthly: 1400.00 }
          },
          peakHours: [
            { start: '07:00', end: '09:00' },
            { start: '17:00', end: '19:00' }
          ],
          discounts: [],
          freeParking: {
            enabled: true,
            duration: 30
          },
          overtimeCharges: {
            enabled: true,
            gracePeriodMinutes: 15,
            multiplier: 1.5
          }
        },
        layout: {
          floors: [
            {
              number: 1,
              name: 'Ground Floor',
              totalSpots: 50,
              spotTypes: {
                standard: 35,
                compact: 10,
                handicap: 3,
                ev: 2,
                oversized: 0
              },
              bays: ['A', 'B', 'C', 'D']
            }
          ],
          capacity: {
            total: 50,
            standard: 35,
            compact: 10,
            handicap: 3,
            ev: 2,
            oversized: 0
          },
          navigation: {
            signageEnabled: true,
            digitalDisplays: false,
            mobileApp: true
          },
          accessibility: {
            handicapSpots: 3,
            wheelchairAccess: true,
            elevatorsAvailable: false
          },
          features: {
            evChargingStations: 2,
            securityCameras: true,
            lightingType: 'led',
            ventilation: 'mechanical'
          }
        },
        integration: {
          payments: {
            primary: {
              provider: 'stripe',
              apiKey: '',
              enabled: false
            }
          },
          notifications: {
            email: {
              provider: 'sendgrid',
              apiKey: '',
              fromAddress: '',
              templates: {
                checkin: '',
                checkout: '',
                receipt: '',
                reminder: ''
              },
              enabled: false
            },
            sms: {
              provider: 'twilio',
              apiKey: '',
              fromNumber: '',
              enabled: false
            }
          },
          thirdParty: {
            parkingApps: []
          },
          backup: {
            provider: 'local',
            configuration: {},
            schedule: 'daily',
            retention: 30,
            enabled: false
          },
          security: {
            encryption: {
              enabled: false,
              algorithm: 'AES-256'
            },
            accessControl: {
              ipWhitelist: [],
              apiRateLimit: 100
            }
          }
        },
        operational: {
          checkin: {
            requirePhoto: false,
            requireSignature: false,
            autoAssignment: true,
            allowReservations: true
          },
          checkout: {
            autoCalculate: true,
            requireInspection: false,
            gracePeriodMinutes: 15,
            overtimeMultiplier: 1.5
          },
          reservations: {
            enabled: true,
            maxAdvanceDays: 30,
            cancellationHours: 2,
            noShowPenalty: 10.00
          },
          maintenance: {
            windows: [],
            autoScheduling: false,
            notifications: true
          },
          staff: {
            shiftHours: [],
            permissions: {}
          },
          security: {
            cameraRecording: true,
            accessCards: false,
            securityGuard: false,
            emergencyContacts: []
          }
        },
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin'
      }
      
      setConfiguration(mockConfig)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleConfigurationChange = (section: keyof GarageConfigType, data: any) => {
    if (!configuration) return
    
    setConfiguration(prev => ({
      ...prev!,
      [section]: { ...prev![section], ...data }
    }))
    setHasUnsavedChanges(true)
    
    // Clear validation errors for this section
    if (validationErrors[section]) {
      setValidationErrors(prev => {
        const { [section]: _, ...rest } = prev
        return rest
      })
    }
  }

  const validateConfiguration = (): boolean => {
    const errors: Record<string, string[]> = {}
    
    if (!configuration) return false
    
    // Validate general settings
    if (!configuration.general.name.trim()) {
      errors.general = [...(errors.general || []), 'Garage name is required']
    }
    
    if (!configuration.general.contact.email.trim()) {
      errors.general = [...(errors.general || []), 'Contact email is required']
    }
    
    // Validate pricing settings
    Object.entries(configuration.pricing.defaultRates).forEach(([vehicleType, rates]) => {
      if (rates.hourly <= 0) {
        errors.pricing = [...(errors.pricing || []), `${vehicleType} hourly rate must be greater than 0`]
      }
    })
    
    // Validate layout settings
    if (configuration.layout.capacity.total <= 0) {
      errors.layout = [...(errors.layout || []), 'Total capacity must be greater than 0']
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!configuration || !validateConfiguration()) {
      return
    }
    
    try {
      setSaving(true)
      setError(null)
      
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setHasUnsavedChanges(false)
      // Show success message or toast
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleExportConfig = () => {
    if (!configuration) return
    
    const dataStr = JSON.stringify(configuration, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `garage-config-${garageId}-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string)
        setConfiguration(importedConfig)
        setHasUnsavedChanges(true)
      } catch (err) {
        setError('Invalid configuration file format')
      }
    }
    reader.readAsText(file)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading configuration...</p>
        </div>
      </div>
    )
  }

  if (!configuration) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Configuration Not Found</h3>
        <p className="text-muted-foreground">No configuration found for this garage.</p>
      </div>
    )
  }

  const getTabIcon = (tab: string) => {
    const icons = {
      general: Building,
      pricing: DollarSign,
      layout: LayoutGrid,
      integration: Zap,
      operational: Cog
    }
    return icons[tab as keyof typeof icons] || Settings
  }

  const getValidationStatus = (section: string) => {
    if (validationErrors[section]) {
      return { status: 'error', count: validationErrors[section].length }
    }
    return { status: 'valid', count: 0 }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Garage Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure all aspects of your parking garage operations
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".json"
            onChange={handleImportConfig}
            className="hidden"
            id="config-import"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('config-import')?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExportConfig}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-4">
        {hasUnsavedChanges && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Unsaved Changes
          </Badge>
        )}
        
        {Object.keys(validationErrors).length === 0 && !hasUnsavedChanges && (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            All Settings Valid
          </Badge>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {[
            { id: 'general', label: 'General' },
            { id: 'pricing', label: 'Pricing' },
            { id: 'layout', label: 'Layout' },
            { id: 'integration', label: 'Integration' },
            { id: 'operational', label: 'Operations' }
          ].map(tab => {
            const Icon = getTabIcon(tab.id)
            const validation = getValidationStatus(tab.id)
            
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {tab.label}
                {validation.status === 'error' && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                    {validation.count}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralSettings
            config={configuration.general}
            onChange={(data) => handleConfigurationChange('general', data)}
            errors={validationErrors.general}
          />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <PricingSettings
            config={configuration.pricing}
            onChange={(data) => handleConfigurationChange('pricing', data)}
            errors={validationErrors.pricing}
          />
        </TabsContent>

        <TabsContent value="layout" className="space-y-6">
          <LayoutSettings
            config={configuration.layout}
            onChange={(data) => handleConfigurationChange('layout', data)}
            errors={validationErrors.layout}
          />
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <IntegrationSettings
            config={configuration.integration}
            onChange={(data) => handleConfigurationChange('integration', data)}
            errors={validationErrors.integration}
          />
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <OperationalSettings
            config={configuration.operational}
            onChange={(data) => handleConfigurationChange('operational', data)}
            errors={validationErrors.operational}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default GarageConfiguration
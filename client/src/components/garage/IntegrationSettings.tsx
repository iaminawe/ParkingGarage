import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Zap, 
  CreditCard, 
  Mail, 
  MessageSquare, 
  Cloud, 
  Shield, 
  Database,
  AlertTriangle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  TestTube,
  CheckCircle,
  XCircle,
  ExternalLink,
  Key,
  Lock
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { IntegrationConfig } from '@/types/api'

interface IntegrationSettingsProps {
  config: IntegrationConfig
  onChange: (config: Partial<IntegrationConfig>) => void
  errors?: string[]
  className?: string
}

const PAYMENT_PROVIDERS = [
  { value: 'stripe', label: 'Stripe', icon: '💳' },
  { value: 'square', label: 'Square', icon: '⬜' },
  { value: 'paypal', label: 'PayPal', icon: '🅿️' },
  { value: 'other', label: 'Other Provider', icon: '💰' }
]

const EMAIL_PROVIDERS = [
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'mailgun', label: 'Mailgun' },
  { value: 'ses', label: 'Amazon SES' },
  { value: 'smtp', label: 'Custom SMTP' }
]

const SMS_PROVIDERS = [
  { value: 'twilio', label: 'Twilio' },
  { value: 'aws-sns', label: 'Amazon SNS' },
  { value: 'other', label: 'Other Provider' }
]

const BACKUP_PROVIDERS = [
  { value: 'aws-s3', label: 'Amazon S3' },
  { value: 'google-cloud', label: 'Google Cloud Storage' },
  { value: 'azure', label: 'Azure Blob Storage' },
  { value: 'local', label: 'Local Storage' }
]

const BACKUP_SCHEDULES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
]

export const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({
  config,
  onChange,
  errors = [],
  className
}) => {
  const [localConfig, setLocalConfig] = useState(config)
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'testing'>>({})

  const handlePaymentChange = (type: 'primary' | 'backup', field: string, value: any) => {
    const updatedConfig = {
      ...localConfig,
      payments: {
        ...localConfig.payments,
        [type]: {
          ...localConfig.payments[type],
          [field]: value
        }
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleNotificationChange = (type: 'email' | 'sms', field: string, value: any) => {
    let updatedValue = value
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      updatedValue = {
        ...localConfig.notifications[type][parent as keyof typeof localConfig.notifications[typeof type]],
        [child]: value
      }
      field = parent
    }
    
    const updatedConfig = {
      ...localConfig,
      notifications: {
        ...localConfig.notifications,
        [type]: {
          ...localConfig.notifications[type],
          [field]: updatedValue
        }
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleThirdPartyChange = (index: number, field: string, value: any) => {
    const updatedApps = [...localConfig.thirdParty.parkingApps]
    updatedApps[index] = {
      ...updatedApps[index],
      [field]: value
    }
    
    const updatedConfig = {
      ...localConfig,
      thirdParty: {
        ...localConfig.thirdParty,
        parkingApps: updatedApps
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const addThirdPartyApp = () => {
    const newApp = {
      name: '',
      apiEndpoint: '',
      apiKey: '',
      enabled: false
    }
    
    const updatedConfig = {
      ...localConfig,
      thirdParty: {
        ...localConfig.thirdParty,
        parkingApps: [...localConfig.thirdParty.parkingApps, newApp]
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const removeThirdPartyApp = (index: number) => {
    const updatedApps = localConfig.thirdParty.parkingApps.filter((_, i) => i !== index)
    
    const updatedConfig = {
      ...localConfig,
      thirdParty: {
        ...localConfig.thirdParty,
        parkingApps: updatedApps
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleBackupChange = (field: string, value: any) => {
    const updatedConfig = {
      ...localConfig,
      backup: {
        ...localConfig.backup,
        [field]: value
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleSecurityChange = (section: 'encryption' | 'accessControl', field: string, value: any) => {
    const updatedConfig = {
      ...localConfig,
      security: {
        ...localConfig.security,
        [section]: {
          ...localConfig.security[section],
          [field]: value
        }
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const toggleApiKeyVisibility = (key: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const testConnection = async (type: string) => {
    setTestResults(prev => ({ ...prev, [type]: 'testing' }))
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Randomly succeed or fail for demo
    const success = Math.random() > 0.3
    setTestResults(prev => ({ ...prev, [type]: success ? 'success' : 'error' }))
  }

  const renderApiKeyInput = (
    value: string, 
    onChange: (value: string) => void, 
    keyName: string,
    placeholder: string = "Enter API key"
  ) => (
    <div className="relative">
      <Input
        type={showApiKeys[keyName] ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => toggleApiKeyVisibility(keyName)}
        className="absolute right-0 top-0 h-full px-3"
      >
        {showApiKeys[keyName] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  )

  const renderTestButton = (type: string, onTest: () => void) => (
    <Button
      variant="outline"
      size="sm"
      onClick={onTest}
      disabled={testResults[type] === 'testing'}
      className="ml-2"
    >
      {testResults[type] === 'testing' ? (
        <>
          <TestTube className="h-4 w-4 mr-2 animate-spin" />
          Testing...
        </>
      ) : testResults[type] === 'success' ? (
        <>
          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
          Success
        </>
      ) : testResults[type] === 'error' ? (
        <>
          <XCircle className="h-4 w-4 mr-2 text-red-600" />
          Failed
        </>
      ) : (
        <>
          <TestTube className="h-4 w-4 mr-2" />
          Test
        </>
      )}
    </Button>
  )

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

      <Tabs defaultValue="payments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="third-party">Third Party</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Payment Integration */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Primary Payment Gateway
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={localConfig.payments.primary.provider}
                    onValueChange={(value) => handlePaymentChange('primary', 'provider', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_PROVIDERS.map(provider => (
                        <SelectItem key={provider.value} value={provider.value}>
                          <div className="flex items-center gap-2">
                            <span>{provider.icon}</span>
                            {provider.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 pt-8">
                  <Checkbox
                    checked={localConfig.payments.primary.enabled}
                    onChange={(checked) => handlePaymentChange('primary', 'enabled', checked)}
                  />
                  <Label>Enabled</Label>
                  {renderTestButton('primary-payment', () => testConnection('primary-payment'))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>API Key</Label>
                {renderApiKeyInput(
                  localConfig.payments.primary.apiKey,
                  (value) => handlePaymentChange('primary', 'apiKey', value),
                  'primary-payment-key',
                  "Enter your payment provider API key"
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Webhook URL (optional)</Label>
                <Input
                  value={localConfig.payments.primary.webhookUrl || ''}
                  onChange={(e) => handlePaymentChange('primary', 'webhookUrl', e.target.value)}
                  placeholder="https://your-domain.com/webhooks/payments"
                />
              </div>
            </CardContent>
          </Card>

          {/* Backup Payment Gateway */}
          <Card>
            <CardHeader>
              <CardTitle>Backup Payment Gateway</CardTitle>
              <p className="text-sm text-muted-foreground">
                Optional backup payment processor for redundancy
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  checked={!!localConfig.payments.backup}
                  onChange={(checked) => {
                    if (checked) {
                      handlePaymentChange('backup', 'provider', 'stripe')
                      handlePaymentChange('backup', 'apiKey', '')
                      handlePaymentChange('backup', 'enabled', false)
                    } else {
                      const updatedConfig = {
                        ...localConfig,
                        payments: {
                          ...localConfig.payments,
                          backup: undefined
                        }
                      }
                      setLocalConfig(updatedConfig)
                      onChange(updatedConfig)
                    }
                  }}
                />
                <Label>Enable backup payment gateway</Label>
              </div>
              
              {localConfig.payments.backup && (
                <div className="space-y-4 pl-6 border-l-2 border-muted">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select
                        value={localConfig.payments.backup.provider}
                        onValueChange={(value) => handlePaymentChange('backup', 'provider', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_PROVIDERS.map(provider => (
                            <SelectItem key={provider.value} value={provider.value}>
                              <div className="flex items-center gap-2">
                                <span>{provider.icon}</span>
                                {provider.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-8">
                      <Checkbox
                        checked={localConfig.payments.backup.enabled}
                        onChange={(checked) => handlePaymentChange('backup', 'enabled', checked)}
                      />
                      <Label>Enabled</Label>
                      {renderTestButton('backup-payment', () => testConnection('backup-payment'))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    {renderApiKeyInput(
                      localConfig.payments.backup.apiKey,
                      (value) => handlePaymentChange('backup', 'apiKey', value),
                      'backup-payment-key'
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  checked={localConfig.notifications.email.enabled}
                  onChange={(checked) => handleNotificationChange('email', 'enabled', checked)}
                />
                <Label>Enable email notifications</Label>
                {renderTestButton('email', () => testConnection('email'))}
              </div>
              
              {localConfig.notifications.email.enabled && (
                <div className="space-y-4 pl-6 border-l-2 border-muted">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email Provider</Label>
                      <Select
                        value={localConfig.notifications.email.provider}
                        onValueChange={(value) => handleNotificationChange('email', 'provider', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EMAIL_PROVIDERS.map(provider => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>From Address</Label>
                      <Input
                        type="email"
                        value={localConfig.notifications.email.fromAddress}
                        onChange={(e) => handleNotificationChange('email', 'fromAddress', e.target.value)}
                        placeholder="noreply@yourgarage.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    {renderApiKeyInput(
                      localConfig.notifications.email.apiKey,
                      (value) => handleNotificationChange('email', 'apiKey', value),
                      'email-api-key'
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Email Templates</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(localConfig.notifications.email.templates).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <Label className="capitalize">{key} Template ID</Label>
                          <Input
                            value={value}
                            onChange={(e) => handleNotificationChange('email', `templates.${key}`, e.target.value)}
                            placeholder={`Template ID for ${key} emails`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SMS Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  checked={localConfig.notifications.sms.enabled}
                  onChange={(checked) => handleNotificationChange('sms', 'enabled', checked)}
                />
                <Label>Enable SMS notifications</Label>
                {renderTestButton('sms', () => testConnection('sms'))}
              </div>
              
              {localConfig.notifications.sms.enabled && (
                <div className="space-y-4 pl-6 border-l-2 border-muted">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMS Provider</Label>
                      <Select
                        value={localConfig.notifications.sms.provider}
                        onValueChange={(value) => handleNotificationChange('sms', 'provider', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SMS_PROVIDERS.map(provider => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>From Number</Label>
                      <Input
                        value={localConfig.notifications.sms.fromNumber}
                        onChange={(e) => handleNotificationChange('sms', 'fromNumber', e.target.value)}
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    {renderApiKeyInput(
                      localConfig.notifications.sms.apiKey,
                      (value) => handleNotificationChange('sms', 'apiKey', value),
                      'sms-api-key'
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Third Party Integrations */}
        <TabsContent value="third-party" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Third-Party Parking Apps
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Connect with parking discovery and reservation apps
                  </p>
                </div>
                <Button onClick={addThirdPartyApp} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {localConfig.thirdParty.parkingApps.map((app, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 mr-4">
                      <div className="space-y-2">
                        <Label>App Name</Label>
                        <Input
                          value={app.name}
                          onChange={(e) => handleThirdPartyChange(index, 'name', e.target.value)}
                          placeholder="e.g., ParkWhiz, SpotHero"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-8">
                        <Checkbox
                          checked={app.enabled}
                          onChange={(checked) => handleThirdPartyChange(index, 'enabled', checked)}
                        />
                        <Label>Enabled</Label>
                        {renderTestButton(`third-party-${index}`, () => testConnection(`third-party-${index}`))}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeThirdPartyApp(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>API Endpoint</Label>
                    <Input
                      value={app.apiEndpoint}
                      onChange={(e) => handleThirdPartyChange(index, 'apiEndpoint', e.target.value)}
                      placeholder="https://api.parkingapp.com/v1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    {renderApiKeyInput(
                      app.apiKey,
                      (value) => handleThirdPartyChange(index, 'apiKey', value),
                      `third-party-${index}-key`
                    )}
                  </div>
                </div>
              ))}
              
              {localConfig.thirdParty.parkingApps.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No third-party integrations configured. Click "Add Integration" to connect with parking apps.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup & Sync */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backup & Data Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  checked={localConfig.backup.enabled}
                  onChange={(checked) => handleBackupChange('enabled', checked)}
                />
                <Label>Enable automatic backups</Label>
              </div>
              
              {localConfig.backup.enabled && (
                <div className="space-y-4 pl-6 border-l-2 border-muted">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Backup Provider</Label>
                      <Select
                        value={localConfig.backup.provider}
                        onValueChange={(value) => handleBackupChange('provider', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BACKUP_PROVIDERS.map(provider => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Schedule</Label>
                      <Select
                        value={localConfig.backup.schedule}
                        onValueChange={(value) => handleBackupChange('schedule', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BACKUP_SCHEDULES.map(schedule => (
                            <SelectItem key={schedule.value} value={schedule.value}>
                              {schedule.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Retention (days)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={localConfig.backup.retention}
                        onChange={(e) => handleBackupChange('retention', parseInt(e.target.value) || 30)}
                      />
                    </div>
                  </div>
                  
                  {localConfig.backup.provider !== 'local' && (
                    <div className="space-y-2">
                      <Label>Configuration (JSON)</Label>
                      <Textarea
                        value={JSON.stringify(localConfig.backup.configuration, null, 2)}
                        onChange={(e) => {
                          try {
                            const config = JSON.parse(e.target.value)
                            handleBackupChange('configuration', config)
                          } catch (err) {
                            // Invalid JSON, ignore
                          }
                        }}
                        placeholder='{"region": "us-east-1", "bucket": "garage-backups"}'
                        rows={4}
                      />
                      <p className="text-sm text-muted-foreground">
                        Provider-specific configuration in JSON format
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          {/* Encryption */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Data Encryption
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={localConfig.security.encryption.enabled}
                  onChange={(checked) => handleSecurityChange('encryption', 'enabled', checked)}
                />
                <Label>Enable data encryption</Label>
              </div>
              
              {localConfig.security.encryption.enabled && (
                <div className="space-y-2 pl-6">
                  <Label>Encryption Algorithm</Label>
                  <Select
                    value={localConfig.security.encryption.algorithm}
                    onValueChange={(value) => handleSecurityChange('encryption', 'algorithm', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AES-256">AES-256</SelectItem>
                      <SelectItem value="AES-192">AES-192</SelectItem>
                      <SelectItem value="AES-128">AES-128</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Access Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Access Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>IP Whitelist</Label>
                <Textarea
                  value={localConfig.security.accessControl.ipWhitelist.join('\n')}
                  onChange={(e) => {
                    const ips = e.target.value.split('\n').filter(ip => ip.trim())
                    handleSecurityChange('accessControl', 'ipWhitelist', ips)
                  }}
                  placeholder="192.168.1.1&#10;10.0.0.0/8&#10;Leave empty to allow all IPs"
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  One IP address or CIDR block per line. Leave empty to allow all IPs.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>API Rate Limit (requests per minute)</Label>
                <Input
                  type="number"
                  min="1"
                  value={localConfig.security.accessControl.apiRateLimit}
                  onChange={(e) => handleSecurityChange(
                    'accessControl', 
                    'apiRateLimit', 
                    parseInt(e.target.value) || 100
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default IntegrationSettings
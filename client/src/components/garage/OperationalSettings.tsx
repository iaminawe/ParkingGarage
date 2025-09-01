import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
 
  LogIn, 
  LogOut, 
  Calendar, 
  Wrench, 
  Users, 
  Shield, 
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Camera,
  CreditCard,
  UserCheck,
  FileText,
  Phone,
  Settings
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { OperationalConfig } from '@/types/api'

interface OperationalSettingsProps {
  config: OperationalConfig
  onChange: (config: Partial<OperationalConfig>) => void
  errors?: string[]
  className?: string
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

const USER_ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'operator', label: 'Operator' },
  { value: 'attendant', label: 'Attendant' },
  { value: 'security', label: 'Security Guard' }
]

const PERMISSIONS = [
  { value: 'manage_spots', label: 'Manage Parking Spots' },
  { value: 'manage_vehicles', label: 'Manage Vehicles' },
  { value: 'manage_sessions', label: 'Manage Parking Sessions' },
  { value: 'view_analytics', label: 'View Analytics' },
  { value: 'manage_pricing', label: 'Manage Pricing' },
  { value: 'manage_users', label: 'Manage Users' },
  { value: 'manage_config', label: 'Manage Configuration' },
  { value: 'process_payments', label: 'Process Payments' },
  { value: 'schedule_maintenance', label: 'Schedule Maintenance' },
  { value: 'emergency_access', label: 'Emergency Access' }
]

export const OperationalSettings: React.FC<OperationalSettingsProps> = ({
  config,
  onChange,
  errors = [],
  className
}) => {
  const [localConfig, setLocalConfig] = useState(config)

  const handleCheckinChange = (field: string, value: unknown) => {
    const updatedConfig = {
      ...localConfig,
      checkin: {
        ...localConfig.checkin,
        [field]: value
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleCheckoutChange = (field: string, value: unknown) => {
    const updatedConfig = {
      ...localConfig,
      checkout: {
        ...localConfig.checkout,
        [field]: value
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleReservationsChange = (field: string, value: unknown) => {
    const updatedConfig = {
      ...localConfig,
      reservations: {
        ...localConfig.reservations,
        [field]: value
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleMaintenanceChange = (field: string, value: unknown) => {
    const updatedConfig = {
      ...localConfig,
      maintenance: {
        ...localConfig.maintenance,
        [field]: value
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleMaintenanceWindowChange = (index: number, field: string, value: unknown) => {
    const updatedWindows = [...localConfig.maintenance.windows]
    updatedWindows[index] = {
      ...updatedWindows[index],
      [field]: value
    }
    
    const updatedConfig = {
      ...localConfig,
      maintenance: {
        ...localConfig.maintenance,
        windows: updatedWindows
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const addMaintenanceWindow = () => {
    const newWindow = {
      start: '02:00',
      end: '06:00',
      daysOfWeek: [1, 2, 3, 4, 5] // Monday-Friday
    }
    
    const updatedConfig = {
      ...localConfig,
      maintenance: {
        ...localConfig.maintenance,
        windows: [...localConfig.maintenance.windows, newWindow]
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const removeMaintenanceWindow = (index: number) => {
    const updatedWindows = localConfig.maintenance.windows.filter((_, i) => i !== index)
    
    const updatedConfig = {
      ...localConfig,
      maintenance: {
        ...localConfig.maintenance,
        windows: updatedWindows
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  // Removed unused handleStaffChange function

  const handleShiftChange = (index: number, field: string, value: unknown) => {
    const updatedShifts = [...localConfig.staff.shiftHours]
    updatedShifts[index] = {
      ...updatedShifts[index],
      [field]: value
    }
    
    const updatedConfig = {
      ...localConfig,
      staff: {
        ...localConfig.staff,
        shiftHours: updatedShifts
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const addShift = () => {
    const newShift = {
      start: '08:00',
      end: '17:00',
      daysOfWeek: [1, 2, 3, 4, 5] // Monday-Friday
    }
    
    const updatedConfig = {
      ...localConfig,
      staff: {
        ...localConfig.staff,
        shiftHours: [...localConfig.staff.shiftHours, newShift]
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const removeShift = (index: number) => {
    const updatedShifts = localConfig.staff.shiftHours.filter((_, i) => i !== index)
    
    const updatedConfig = {
      ...localConfig,
      staff: {
        ...localConfig.staff,
        shiftHours: updatedShifts
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handlePermissionChange = (role: string, permission: string, granted: boolean) => {
    const updatedPermissions = { ...localConfig.staff.permissions }
    
    if (!updatedPermissions[role]) {
      updatedPermissions[role] = []
    }
    
    if (granted) {
      updatedPermissions[role] = [...updatedPermissions[role], permission]
    } else {
      updatedPermissions[role] = updatedPermissions[role].filter(p => p !== permission)
    }
    
    const updatedConfig = {
      ...localConfig,
      staff: {
        ...localConfig.staff,
        permissions: updatedPermissions
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleSecurityChange = (field: string, value: unknown) => {
    const updatedConfig = {
      ...localConfig,
      security: {
        ...localConfig.security,
        [field]: value
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const handleEmergencyContactChange = (index: number, field: string, value: unknown) => {
    const updatedContacts = [...localConfig.security.emergencyContacts]
    updatedContacts[index] = {
      ...updatedContacts[index],
      [field]: value
    }
    
    const updatedConfig = {
      ...localConfig,
      security: {
        ...localConfig.security,
        emergencyContacts: updatedContacts
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const addEmergencyContact = () => {
    const newContact = {
      name: '',
      phone: '',
      role: 'Security'
    }
    
    const updatedConfig = {
      ...localConfig,
      security: {
        ...localConfig.security,
        emergencyContacts: [...localConfig.security.emergencyContacts, newContact]
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
  }

  const removeEmergencyContact = (index: number) => {
    const updatedContacts = localConfig.security.emergencyContacts.filter((_, i) => i !== index)
    
    const updatedConfig = {
      ...localConfig,
      security: {
        ...localConfig.security,
        emergencyContacts: updatedContacts
      }
    }
    
    setLocalConfig(updatedConfig)
    onChange(updatedConfig)
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

      <Tabs defaultValue="checkin" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="checkin">Check-in</TabsTrigger>
          <TabsTrigger value="checkout">Check-out</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Check-in Policies */}
        <TabsContent value="checkin" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Check-in Policies
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure check-in procedures and requirements
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={localConfig.checkin.requirePhoto}
                          onChange={(checked) => handleCheckinChange('requirePhoto', checked)}
                        />
                        <Label className="font-medium">Require Vehicle Photo</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Take photo of vehicle during check-in
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={localConfig.checkin.requireSignature}
                          onChange={(checked) => handleCheckinChange('requireSignature', checked)}
                        />
                        <Label className="font-medium">Require Customer Signature</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Digital signature for terms acceptance
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={localConfig.checkin.autoAssignment}
                          onChange={(checked) => handleCheckinChange('autoAssignment', checked)}
                        />
                        <Label className="font-medium">Automatic Spot Assignment</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Automatically assign optimal parking spot
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={localConfig.checkin.allowReservations}
                          onChange={(checked) => handleCheckinChange('allowReservations', checked)}
                        />
                        <Label className="font-medium">Allow Advance Reservations</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enable customers to reserve spots in advance
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Check-out Policies */}
        <TabsContent value="checkout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Check-out Policies
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure check-out procedures and payment policies
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={localConfig.checkout.autoCalculate}
                          onChange={(checked) => handleCheckoutChange('autoCalculate', checked)}
                        />
                        <Label className="font-medium">Auto-calculate Charges</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Automatically calculate parking fees
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <UserCheck className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={localConfig.checkout.requireInspection}
                          onChange={(checked) => handleCheckoutChange('requireInspection', checked)}
                        />
                        <Label className="font-medium">Require Vehicle Inspection</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Staff inspection before checkout
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Grace Period (minutes)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="60"
                      value={localConfig.checkout.gracePeriodMinutes}
                      onChange={(e) => handleCheckoutChange('gracePeriodMinutes', parseInt(e.target.value) || 0)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Grace period before overtime charges apply
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Overtime Multiplier</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      value={localConfig.checkout.overtimeMultiplier}
                      onChange={(e) => handleCheckoutChange('overtimeMultiplier', parseFloat(e.target.value) || 1)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Rate multiplier for overtime charges
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reservations */}
        <TabsContent value="reservations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Reservation Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  checked={localConfig.reservations.enabled}
                  onChange={(checked) => handleReservationsChange('enabled', checked)}
                />
                <Label className="font-medium">Enable Reservations</Label>
              </div>

              {localConfig.reservations.enabled && (
                <div className="space-y-4 pl-6 border-l-2 border-muted">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Max Advance Days</Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={localConfig.reservations.maxAdvanceDays}
                        onChange={(e) => handleReservationsChange('maxAdvanceDays', parseInt(e.target.value) || 30)}
                      />
                      <p className="text-sm text-muted-foreground">
                        How far in advance customers can book
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Cancellation Window (hours)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="48"
                        value={localConfig.reservations.cancellationHours}
                        onChange={(e) => handleReservationsChange('cancellationHours', parseInt(e.target.value) || 2)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Hours before reservation can be cancelled
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>No-Show Penalty ($)</Label>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        value={localConfig.reservations.noShowPenalty}
                        onChange={(e) => handleReservationsChange('noShowPenalty', parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Penalty for not showing up
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Maintenance Windows
                </CardTitle>
                <Button onClick={addMaintenanceWindow} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Window
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {localConfig.maintenance.windows.map((window, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Maintenance Window {index + 1}</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMaintenanceWindow(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={window.start}
                        onChange={(e) => handleMaintenanceWindowChange(index, 'start', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={window.end}
                        onChange={(e) => handleMaintenanceWindowChange(index, 'end', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            checked={window.daysOfWeek.includes(day.value)}
                            onCheckedChange={(checked) => {
                              const updatedDays = checked
                                ? [...window.daysOfWeek, day.value]
                                : window.daysOfWeek.filter(d => d !== day.value)
                              handleMaintenanceWindowChange(index, 'daysOfWeek', updatedDays)
                            }}
                          />
                          <Label className="text-sm">{day.label.slice(0, 3)}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={localConfig.maintenance.autoScheduling}
                    onChange={(checked) => handleMaintenanceChange('autoScheduling', checked)}
                  />
                  <Label>Enable Auto-scheduling</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={localConfig.maintenance.notifications}
                    onChange={(checked) => handleMaintenanceChange('notifications', checked)}
                  />
                  <Label>Send Maintenance Notifications</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Management */}
        <TabsContent value="staff" className="space-y-6">
          {/* Shift Hours */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Staff Shifts
                </CardTitle>
                <Button onClick={addShift} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shift
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {localConfig.staff.shiftHours.map((shift, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Shift {index + 1}</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeShift(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={shift.start}
                        onChange={(e) => handleShiftChange(index, 'start', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={shift.end}
                        onChange={(e) => handleShiftChange(index, 'end', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            checked={shift.daysOfWeek.includes(day.value)}
                            onCheckedChange={(checked) => {
                              const updatedDays = checked
                                ? [...shift.daysOfWeek, day.value]
                                : shift.daysOfWeek.filter(d => d !== day.value)
                              handleShiftChange(index, 'daysOfWeek', updatedDays)
                            }}
                          />
                          <Label className="text-sm">{day.label.slice(0, 3)}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Role Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Role Permissions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure permissions for different user roles
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Permission</th>
                      {USER_ROLES.map(role => (
                        <th key={role.value} className="text-center p-2 min-w-24">
                          {role.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.map(permission => (
                      <tr key={permission.value} className="border-b">
                        <td className="p-2 font-medium">{permission.label}</td>
                        {USER_ROLES.map(role => (
                          <td key={role.value} className="text-center p-2">
                            <Checkbox
                              checked={localConfig.staff.permissions[role.value]?.includes(permission.value) || false}
                              onCheckedChange={(checked: boolean) => handlePermissionChange(role.value, permission.value, checked)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={localConfig.security.cameraRecording}
                        onChange={(checked) => handleSecurityChange('cameraRecording', checked)}
                      />
                      <Label className="font-medium">Camera Recording</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Record security camera footage
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={localConfig.security.accessCards}
                        onChange={(checked) => handleSecurityChange('accessCards', checked)}
                      />
                      <Label className="font-medium">Access Cards</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Key card/fob access system
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <UserCheck className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={localConfig.security.securityGuard}
                        onChange={(checked) => handleSecurityChange('securityGuard', checked)}
                      />
                      <Label className="font-medium">Security Guard</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      On-site security personnel
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Emergency Contacts
                </CardTitle>
                <Button onClick={addEmergencyContact} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {localConfig.security.emergencyContacts.map((contact, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Emergency Contact {index + 1}</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeEmergencyContact(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={contact.name}
                        onChange={(e) => handleEmergencyContactChange(index, 'name', e.target.value)}
                        placeholder="Contact name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => handleEmergencyContactChange(index, 'phone', e.target.value)}
                        placeholder="Phone number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input
                        value={contact.role}
                        onChange={(e) => handleEmergencyContactChange(index, 'role', e.target.value)}
                        placeholder="e.g., Security, Manager"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {localConfig.security.emergencyContacts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No emergency contacts configured. Click "Add Contact" to add one.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default OperationalSettings
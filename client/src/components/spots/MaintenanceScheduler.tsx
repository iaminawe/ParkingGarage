import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Calendar,
  Plus,
  Edit,
  CheckCircle,
  AlertTriangle,
  Search,
  Wrench,
  PlayCircle,
  History
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ParkingSpot, MaintenanceSchedule, MaintenanceType } from '@/types/api'
import { format } from 'date-fns'

interface MaintenanceSchedulerProps {
  spots: ParkingSpot[]
  onClose: () => void
  onSchedule?: () => void
  className?: string
}

interface MaintenanceFormData {
  spotIds: string[]
  type: MaintenanceType
  scheduledDate: Date
  estimatedDuration: number
  description: string
  assignedTo: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  recurring?: {
    enabled: boolean
    interval: number
    unit: 'days' | 'weeks' | 'months'
  }
}

const MAINTENANCE_TYPES: { value: MaintenanceType; label: string; description: string; estimatedDuration: number }[] = [
  { value: 'cleaning', label: 'Cleaning', description: 'General cleaning and tidying', estimatedDuration: 30 },
  { value: 'repair', label: 'Repair', description: 'Fix damage or wear issues', estimatedDuration: 120 },
  { value: 'inspection', label: 'Inspection', description: 'Safety and condition check', estimatedDuration: 15 },
  { value: 'upgrade', label: 'Upgrade', description: 'Enhancement or modernization', estimatedDuration: 240 }
]

const MAINTENANCE_STAFF = [
  'Maintenance Team A',
  'Maintenance Team B',
  'Cleaning Crew',
  'Paint Crew',
  'Electrical Team',
  'Inspector Jones',
  'Inspector Smith',
  'External Contractor'
]

export const MaintenanceScheduler: React.FC<MaintenanceSchedulerProps> = ({
  spots,
  onClose,
  onSchedule,
  className
}) => {
  const [activeTab, setActiveTab] = useState('schedule')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceSchedule | null>(null)
  // Log selected maintenance for debugging
  console.log('Selected maintenance:', selectedMaintenance)
  const [formData, setFormData] = useState<MaintenanceFormData>({
    spotIds: [],
    type: 'cleaning',
    scheduledDate: new Date(),
    estimatedDuration: 30,
    description: '',
    assignedTo: 'Maintenance Team A',
    priority: 'medium'
  })
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    assignedTo: '',
    search: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mock maintenance data - in real implementation, fetch from API
  const maintenanceSchedule = useMemo<MaintenanceSchedule[]>(() => [
    {
      id: '1',
      spotId: 'spot-1',
      type: 'cleaning',
      scheduledDate: '2024-01-25T10:00:00Z',
      estimatedDuration: 30,
      description: 'Weekly cleaning and inspection',
      status: 'scheduled',
      assignedTo: 'Cleaning Crew'
    },
    {
      id: '2',
      spotId: 'spot-15',
      type: 'repair',
      scheduledDate: '2024-01-26T14:00:00Z',
      estimatedDuration: 120,
      description: 'Fix crack in concrete surface',
      status: 'in-progress',
      assignedTo: 'Maintenance Team A',
      notes: 'Materials ordered, waiting for delivery'
    },
    {
      id: '3',
      spotId: 'spot-8',
      type: 'inspection',
      scheduledDate: '2024-01-20T09:00:00Z',
      estimatedDuration: 15,
      description: 'Monthly safety inspection',
      status: 'completed',
      completedDate: '2024-01-20T09:15:00Z',
      assignedTo: 'Inspector Jones',
      notes: 'All systems check out, no issues found'
    },
    {
      id: '4',
      spotId: 'spot-23',
      type: 'upgrade',
      scheduledDate: '2024-01-28T08:00:00Z',
      estimatedDuration: 240,
      description: 'Install EV charging station',
      status: 'scheduled',
      assignedTo: 'Electrical Team'
    }
  ], [])

  // Filter maintenance schedule
  const filteredMaintenance = useMemo(() => {
    return maintenanceSchedule.filter(maintenance => {
      const spot = spots.find(s => s.id === maintenance.spotId)
      const spotNumber = spot?.spotNumber || ''
      
      if (filters.status && maintenance.status !== filters.status) return false
      if (filters.type && maintenance.type !== filters.type) return false
      if (filters.assignedTo && maintenance.assignedTo !== filters.assignedTo) return false
      if (filters.search) {
        const search = filters.search.toLowerCase()
        if (!maintenance.description.toLowerCase().includes(search) &&
            !spotNumber.toLowerCase().includes(search) &&
            !(maintenance.assignedTo || '').toLowerCase().includes(search)) {
          return false
        }
      }
      return true
    })
  }, [maintenanceSchedule, filters, spots])

  // Statistics
  const stats = useMemo(() => {
    const total = maintenanceSchedule.length
    const scheduled = maintenanceSchedule.filter(m => m.status === 'scheduled').length
    const inProgress = maintenanceSchedule.filter(m => m.status === 'in-progress').length
    const completed = maintenanceSchedule.filter(m => m.status === 'completed').length
    const overdue = maintenanceSchedule.filter(m => 
      m.status === 'scheduled' && new Date(m.scheduledDate) < new Date()
    ).length

    return { total, scheduled, inProgress, completed, overdue }
  }, [maintenanceSchedule])

  // Handle form changes
  const handleFormChange = (field: keyof MaintenanceFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Auto-update estimated duration based on type
    if (field === 'type') {
      const maintenanceType = MAINTENANCE_TYPES.find(t => t.value === value)
      if (maintenanceType) {
        setFormData(prev => ({ ...prev, estimatedDuration: maintenanceType.estimatedDuration }))
      }
    }
  }

  // const handleSpotSelection = (spotIds: string[]) => {
  //   setFormData(prev => ({ ...prev, spotIds }))
  //   console.log('Selected spots:', spotIds) // Log for debugging
  // }

  // Submit maintenance schedule
  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      // Validation
      if (formData.spotIds.length === 0) {
        throw new Error('Please select at least one spot')
      }
      if (!formData.description.trim()) {
        throw new Error('Please provide a description')
      }
      if (formData.estimatedDuration <= 0) {
        throw new Error('Estimated duration must be greater than 0')
      }

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setShowCreateForm(false)
      onSchedule?.()
      
      // Reset form
      setFormData({
        spotIds: [],
        type: 'cleaning',
        scheduledDate: new Date(),
        estimatedDuration: 30,
        description: '',
        assignedTo: 'Maintenance Team A',
        priority: 'medium'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule maintenance')
    } finally {
      setLoading(false)
    }
  }

  // Update maintenance status
  const handleStatusUpdate = async (maintenanceId: string, newStatus: MaintenanceSchedule['status']) => {
    try {
      setLoading(true)
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500))
      // In real implementation, update the maintenance record
      console.log(`Updated maintenance ${maintenanceId} to status ${newStatus}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  // Define table columns
  const columns: Column<MaintenanceSchedule>[] = [
    {
      key: 'spot',
      header: 'Spot',
      width: 80,
      render: (_, maintenance) => {
        const spot = spots.find(s => s.id === maintenance.spotId)
        return (
          <div className="font-mono font-medium">
            {spot?.spotNumber || 'N/A'}
          </div>
        )
      }
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      width: 100,
      render: (value) => (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      )
    },
    {
      key: 'description',
      header: 'Description',
      width: 200,
      render: (value) => (
        <div className="max-w-[200px] truncate" title={value as string}>
          {value}
        </div>
      )
    },
    {
      key: 'scheduledDate',
      header: 'Scheduled',
      sortable: true,
      width: 150,
      render: (value) => (
        <div className="text-sm">
          {format(new Date(value as string), 'MMM dd, yyyy HH:mm')}
        </div>
      )
    },
    {
      key: 'estimatedDuration',
      header: 'Duration',
      width: 80,
      render: (value) => (
        <span className="text-sm">{value}min</span>
      )
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      width: 120,
      render: (value) => (
        <div className="text-sm truncate" title={value as string}>
          {value}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: 100,
      render: (value, maintenance) => {
        const isOverdue = maintenance.status === 'scheduled' && 
          new Date(maintenance.scheduledDate) < new Date()
        
        return (
          <Badge 
            variant={
              value === 'completed' ? 'default' :
              value === 'in-progress' ? 'secondary' :
              isOverdue ? 'destructive' :
              'outline'
            }
          >
            {isOverdue ? 'Overdue' : value}
          </Badge>
        )
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 120,
      render: (_, maintenance) => (
        <div className="flex items-center gap-1">
          {maintenance.status === 'scheduled' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleStatusUpdate(maintenance.id, 'in-progress')}
            >
              <PlayCircle className="h-4 w-4" />
            </Button>
          )}
          {maintenance.status === 'in-progress' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleStatusUpdate(maintenance.id, 'completed')}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedMaintenance(maintenance)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Scheduler</h1>
          <p className="text-muted-foreground mt-1">
            Schedule, track, and manage spot maintenance activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Maintenance
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
              <PlayCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search maintenance..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select 
              value={filters.status} 
              onValueChange={(value: string) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={filters.type} 
              onValueChange={(value: string) => setFilters(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {MAINTENANCE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={filters.assignedTo} 
              onValueChange={(value: string) => setFilters(prev => ({ ...prev, assignedTo: value }))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Assigned To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Staff</SelectItem>
                {MAINTENANCE_STAFF.map(staff => (
                  <SelectItem key={staff} value={staff}>{staff}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Maintenance Table */}
          <DataTable
            data={filteredMaintenance}
            columns={columns}
            loading={loading}
            emptyMessage="No maintenance scheduled. Click 'Schedule Maintenance' to add new tasks."
          />
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarComponent
                mode="single"
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Maintenance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {maintenanceSchedule
                  .filter(m => m.status === 'completed')
                  .map(maintenance => {
                    const spot = spots.find(s => s.id === maintenance.spotId)
                    return (
                      <div key={maintenance.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="p-2 rounded-full bg-green-100 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{maintenance.description}</h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span>Spot: {spot?.spotNumber}</span>
                                <span>Type: {maintenance.type}</span>
                                <span>Duration: {maintenance.estimatedDuration}min</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Completed: {maintenance.completedDate && 
                                  format(new Date(maintenance.completedDate), 'MMM dd, yyyy HH:mm')
                                } by {maintenance.assignedTo}
                              </div>
                              {maintenance.notes && (
                                <p className="text-sm mt-2 p-2 bg-muted rounded">{maintenance.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Maintenance Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Spot Selection */}
            <div className="space-y-2">
              <Label>Select Spots *</Label>
              <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2">
                  {spots.slice(0, 20).map(spot => (
                    <div key={spot.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.spotIds.includes(spot.id)}
                        onChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              spotIds: [...prev.spotIds, spot.id] 
                            }))
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              spotIds: prev.spotIds.filter(id => id !== spot.id) 
                            }))
                          }
                        }}
                      />
                      <Label className="text-sm font-mono">{spot.spotNumber}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {formData.spotIds.length} spots selected
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type */}
              <div className="space-y-2">
                <Label>Maintenance Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: string) => handleFormChange('type', value as MaintenanceType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_TYPES.map(type => (
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

              {/* Scheduled Date */}
              <div className="space-y-2">
                <Label>Scheduled Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(formData.scheduledDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={formData.scheduledDate}
                      onSelect={(date) => date && handleFormChange('scheduledDate', date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Estimated Duration (minutes) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.estimatedDuration}
                  onChange={(e) => handleFormChange('estimatedDuration', parseInt(e.target.value) || 0)}
                />
              </div>

              {/* Assigned To */}
              <div className="space-y-2">
                <Label>Assign To *</Label>
                <Select 
                  value={formData.assignedTo} 
                  onValueChange={(value: string) => handleFormChange('assignedTo', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_STAFF.map(staff => (
                      <SelectItem key={staff} value={staff}>{staff}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: string) => handleFormChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Describe the maintenance task..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule Maintenance'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MaintenanceScheduler
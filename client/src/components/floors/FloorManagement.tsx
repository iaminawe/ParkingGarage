import { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Building2, 
  Filter,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Search,
  MapPin
} from 'lucide-react'
import { apiService } from '@/services/api'
import type { Floor, FloorStatistics, ParkingGarage } from '@/types/api'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface FloorFilters {
  garageId: string
  isActive: 'all' | 'true' | 'false'
  hasAvailableSpots: 'all' | 'true' | 'false'
  search: string
}

interface FloorFormData {
  garageId: string
  floorNumber: number
  description: string
  totalSpots: number
  isActive: boolean
}

export function FloorManagement() {
  const { toast } = useToast()
  const [floors, setFloors] = useState<Floor[]>([])
  const [garages, setGarages] = useState<ParkingGarage[]>([])
  const [statistics, setStatistics] = useState<FloorStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [filters, setFilters] = useState<FloorFilters>({
    garageId: '',
    isActive: 'all',
    hasAvailableSpots: 'all',
    search: ''
  })
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null)
  const [formData, setFormData] = useState<FloorFormData>({
    garageId: '',
    floorNumber: 1,
    description: '',
    totalSpots: 0,
    isActive: true
  })

  useEffect(() => {
    fetchGarages()
  }, [])

  useEffect(() => {
    fetchFloors()
    if (filters.garageId) {
      fetchStatistics()
    }
  }, [filters])

  const fetchGarages = async () => {
    try {
      const response = await apiService.getGarages()
      if (response.success && response.data.length > 0) {
        setGarages(response.data)
        setFilters(prev => ({ ...prev, garageId: response.data[0].id }))
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch garages',
        variant: 'destructive'
      })
    }
  }

  const fetchFloors = async () => {
    try {
      setLoading(true)
      const filterParams = {
        garageId: filters.garageId || undefined,
        isActive: filters.isActive !== 'all' ? filters.isActive === 'true' : undefined,
        hasAvailableSpots: filters.hasAvailableSpots !== 'all' ? filters.hasAvailableSpots === 'true' : undefined,
        limit: 100
      }
      
      const response = await apiService.getFloors(filterParams)
      if (response.success) {
        setFloors(response.data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch floors',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await apiService.getFloorStatistics(filters.garageId)
      if (response.success) {
        setStatistics(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch floor statistics:', error)
    }
  }

  const handleCreateFloor = async () => {
    try {
      setSubmitting(true)
      const response = await apiService.createFloor(formData)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Floor created successfully'
        })
        setShowCreateDialog(false)
        fetchFloors()
        fetchStatistics()
        resetForm()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create floor',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditFloor = async () => {
    if (!editingFloor) return
    
    try {
      setSubmitting(true)
      const response = await apiService.updateFloor(editingFloor.id, formData)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Floor updated successfully'
        })
        setShowEditDialog(false)
        fetchFloors()
        fetchStatistics()
        resetForm()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update floor',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteFloor = async (floorId: string) => {
    try {
      const response = await apiService.deleteFloor(floorId)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Floor deactivated successfully'
        })
        fetchFloors()
        fetchStatistics()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to deactivate floor',
        variant: 'destructive'
      })
    }
  }

  const openCreateDialog = () => {
    resetForm()
    setFormData(prev => ({ ...prev, garageId: filters.garageId }))
    setShowCreateDialog(true)
  }

  const openEditDialog = (floor: Floor) => {
    setEditingFloor(floor)
    setFormData({
      garageId: floor.garageId,
      floorNumber: floor.floorNumber,
      description: floor.description || '',
      totalSpots: floor.totalSpots,
      isActive: floor.isActive
    })
    setShowEditDialog(true)
  }

  const resetForm = () => {
    setFormData({
      garageId: '',
      floorNumber: 1,
      description: '',
      totalSpots: 0,
      isActive: true
    })
    setEditingFloor(null)
  }

  const filteredFloors = floors.filter(floor => {
    if (filters.search && !floor.floorNumber.toString().includes(filters.search) && 
        !floor.description?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    return true
  })

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getOccupancyBadgeColor = (rate: number) => {
    if (rate >= 90) return 'bg-red-100 text-red-800 border-red-200'
    if (rate >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Floors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalFloors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Floors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.activeFloors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Spots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalSpots}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Available Spots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.availableSpots}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", getOccupancyColor(statistics.occupancyRate))}>
                {Math.round(statistics.occupancyRate)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Floor Management
          </CardTitle>
          <CardDescription>
            Monitor and manage parking garage floors with bay information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and Actions */}
          <div className="space-y-4 mb-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-1 block">Garage</Label>
                <Select value={filters.garageId} onValueChange={(value) => setFilters(prev => ({ ...prev, garageId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select garage" />
                  </SelectTrigger>
                  <SelectContent>
                    {garages.map(garage => (
                      <SelectItem key={garage.id} value={garage.id}>
                        {garage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium mb-1 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search floor number or description..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button onClick={fetchFloors} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Floor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Floor</DialogTitle>
                    <DialogDescription>
                      Add a new floor to the parking garage
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="garage">Garage</Label>
                      <Select value={formData.garageId} onValueChange={(value) => setFormData(prev => ({ ...prev, garageId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select garage" />
                        </SelectTrigger>
                        <SelectContent>
                          {garages.map(garage => (
                            <SelectItem key={garage.id} value={garage.id}>
                              {garage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="floorNumber">Floor Number</Label>
                      <Input
                        id="floorNumber"
                        type="number"
                        value={formData.floorNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, floorNumber: parseInt(e.target.value) || 1 }))}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g., Ground Floor, Basement Level 1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalSpots">Total Spots</Label>
                      <Input
                        id="totalSpots"
                        type="number"
                        value={formData.totalSpots}
                        onChange={(e) => setFormData(prev => ({ ...prev, totalSpots: parseInt(e.target.value) || 0 }))}
                        min="0"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateFloor} disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create Floor'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex gap-4">
              <Select 
                value={filters.isActive} 
                onValueChange={(value: 'all' | 'true' | 'false') => setFilters(prev => ({ ...prev, isActive: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.hasAvailableSpots} 
                onValueChange={(value: 'all' | 'true' | 'false') => setFilters(prev => ({ ...prev, hasAvailableSpots: value }))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  <SelectItem value="true">Has Available Spots</SelectItem>
                  <SelectItem value="false">Full Floors</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Floors Display */}
          {loading ? (
            <div className="text-center py-8">Loading floors...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredFloors.map((floor) => {
                const occupancyRate = floor.totalSpots > 0 
                  ? Math.round(((floor.totalSpots - (floor.availableSpots || 0)) / floor.totalSpots) * 100)
                  : 0

                return (
                  <Card key={floor.id} className={cn(
                    "transition-all hover:shadow-md",
                    !floor.isActive && "opacity-60 border-dashed"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Floor {floor.floorNumber}
                        </CardTitle>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(floor)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteFloor(floor.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {floor.description && (
                        <CardDescription>{floor.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Total Spots</span>
                          <Badge variant="outline">{floor.totalSpots}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Available</span>
                          <Badge className="bg-green-100 text-green-800">
                            {floor.availableSpots || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Occupancy</span>
                          <Badge className={cn(getOccupancyBadgeColor(occupancyRate))}>
                            {occupancyRate}%
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Status</span>
                          <Badge variant={floor.isActive ? "default" : "secondary"}>
                            {floor.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      
                      {floor.totalSpots > 0 && (
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={cn(
                                "h-2 rounded-full transition-all",
                                occupancyRate >= 90 ? "bg-red-500" : 
                                occupancyRate >= 70 ? "bg-yellow-500" : "bg-green-500"
                              )}
                              style={{ width: `${occupancyRate}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-center">
                            {floor.totalSpots - (floor.availableSpots || 0)} / {floor.totalSpots} occupied
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {filteredFloors.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No floors found matching the current filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Floor</DialogTitle>
            <DialogDescription>
              Update floor information and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-garage">Garage</Label>
              <Select value={formData.garageId} onValueChange={(value) => setFormData(prev => ({ ...prev, garageId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select garage" />
                </SelectTrigger>
                <SelectContent>
                  {garages.map(garage => (
                    <SelectItem key={garage.id} value={garage.id}>
                      {garage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-floorNumber">Floor Number</Label>
              <Input
                id="edit-floorNumber"
                type="number"
                value={formData.floorNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, floorNumber: parseInt(e.target.value) || 1 }))}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Ground Floor, Basement Level 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-totalSpots">Total Spots</Label>
              <Input
                id="edit-totalSpots"
                type="number"
                value={formData.totalSpots}
                onChange={(e) => setFormData(prev => ({ ...prev, totalSpots: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditFloor} disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Floor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FloorManagement
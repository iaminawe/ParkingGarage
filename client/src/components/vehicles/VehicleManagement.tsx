import React, { useState, useEffect } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Car, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Clock,
  MapPin,
  DollarSign,
  Calendar
} from 'lucide-react'
import { apiService } from '@/services/api'
import type { Vehicle, ParkingSession } from '@/types/api-extensions'
import { toast } from '@/components/ui/use-toast'

export function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [sessions, setSessions] = useState<ParkingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false)
  const [newVehicle, setNewVehicle] = useState({
    licensePlate: '',
    make: '',
    model: '',
    color: '',
    type: 'standard' as Vehicle['type'],
    ownerName: '',
    ownerEmail: '',
    ownerPhone: ''
  })

  useEffect(() => {
    fetchVehicles()
    fetchSessions()
  }, [])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const response = await apiService.getVehicles()
      if (response.success) {
        setVehicles(response.data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch vehicles',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await apiService.getSessions()
      if (response.success) {
        setSessions(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchVehicles()
      return
    }

    try {
      setLoading(true)
      const response = await apiService.searchVehicles(searchQuery)
      if (response.success) {
        setVehicles(response.data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Search failed',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddVehicle = async () => {
    try {
      const response = await apiService.createVehicle(newVehicle)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Vehicle added successfully'
        })
        setIsAddDialogOpen(false)
        fetchVehicles()
        setNewVehicle({
          licensePlate: '',
          make: '',
          model: '',
          color: '',
          type: 'standard',
          ownerName: '',
          ownerEmail: '',
          ownerPhone: ''
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add vehicle',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateVehicle = async () => {
    if (!selectedVehicle) return

    try {
      const response = await apiService.updateVehicle(selectedVehicle.id, selectedVehicle)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Vehicle updated successfully'
        })
        setIsEditDialogOpen(false)
        fetchVehicles()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update vehicle',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return

    try {
      const response = await apiService.deleteVehicle(id)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Vehicle deleted successfully'
        })
        fetchVehicles()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete vehicle',
        variant: 'destructive'
      })
    }
  }

  const handleCheckIn = async (vehicleId: string) => {
    try {
      const response = await apiService.startSession({
        garageId: '1', // Default garage
        vehicleId: vehicleId
      })
      if (response.success) {
        toast({
          title: 'Success',
          description: `Vehicle checked in to spot ${response.data.spotId}`
        })
        setIsCheckInDialogOpen(false)
        fetchSessions()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check in vehicle',
        variant: 'destructive'
      })
    }
  }

  const handleCheckOut = async (sessionId: string) => {
    try {
      const response = await apiService.endSession(sessionId)
      if (response.success) {
        toast({
          title: 'Success',
          description: `Check out complete. Total: $${response.data.totalAmount}`
        })
        fetchSessions()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check out vehicle',
        variant: 'destructive'
      })
    }
  }

  const getActiveSession = (vehicleId: string) => {
    return sessions.find(s => s.vehicleId === vehicleId && s.status === 'active')
  }

  const getVehicleStatus = (vehicle: Vehicle) => {
    const activeSession = getActiveSession(vehicle.id)
    if (activeSession) {
      return {
        status: 'parked' as const,
        spotId: activeSession.spotId,
        duration: activeSession.checkInTime ? 
          Math.floor((Date.now() - new Date(activeSession.checkInTime).getTime()) / (1000 * 60)) : 0
      }
    }
    return { status: 'not_parked' as const }
  }

  const filteredVehicles = vehicles.filter(vehicle => 
    searchQuery === '' ||
    vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehicle Management
          </CardTitle>
          <CardDescription>
            Manage all vehicles in the parking system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by license plate, make, model, or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} variant="secondary">
              Search
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Vehicle</DialogTitle>
                  <DialogDescription>
                    Enter vehicle and owner information
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="licensePlate">License Plate</Label>
                      <Input
                        id="licensePlate"
                        value={newVehicle.licensePlate}
                        onChange={(e) => setNewVehicle({...newVehicle, licensePlate: e.target.value})}
                        placeholder="ABC-1234"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Vehicle Type</Label>
                      <Select
                        value={newVehicle.type}
                        onValueChange={(value: Vehicle['type']) => setNewVehicle({...newVehicle, type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Compact</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                          <SelectItem value="motorcycle">Motorcycle</SelectItem>
                          <SelectItem value="electric">Electric</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="make">Make</Label>
                      <Input
                        id="make"
                        value={newVehicle.make}
                        onChange={(e) => setNewVehicle({...newVehicle, make: e.target.value})}
                        placeholder="Toyota"
                      />
                    </div>
                    <div>
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={newVehicle.model}
                        onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                        placeholder="Camry"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={newVehicle.color}
                      onChange={(e) => setNewVehicle({...newVehicle, color: e.target.value})}
                      placeholder="Silver"
                    />
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Owner Information</h4>
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="ownerName">Name</Label>
                        <Input
                          id="ownerName"
                          value={newVehicle.ownerName}
                          onChange={(e) => setNewVehicle({...newVehicle, ownerName: e.target.value})}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="ownerEmail">Email</Label>
                          <Input
                            id="ownerEmail"
                            type="email"
                            value={newVehicle.ownerEmail}
                            onChange={(e) => setNewVehicle({...newVehicle, ownerEmail: e.target.value})}
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="ownerPhone">Phone</Label>
                          <Input
                            id="ownerPhone"
                            value={newVehicle.ownerPhone}
                            onChange={(e) => setNewVehicle({...newVehicle, ownerPhone: e.target.value})}
                            placeholder="+1 234 567 8900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddVehicle}>Add Vehicle</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading vehicles...</div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => {
                    const vehicleStatus = getVehicleStatus(vehicle)
                    const activeSession = getActiveSession(vehicle.id)
                    
                    return (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">
                          {vehicle.licensePlate}
                        </TableCell>
                        <TableCell>
                          {vehicle.make} {vehicle.model}
                          {vehicle.color && (
                            <span className="text-sm text-gray-500 ml-2">({vehicle.color})</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{vehicle.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{vehicle.ownerName}</div>
                            {vehicle.ownerEmail && (
                              <div className="text-sm text-gray-500">{vehicle.ownerEmail}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {vehicleStatus.status === 'parked' ? (
                            <div className="space-y-1">
                              <Badge className="bg-green-100 text-green-800">
                                <MapPin className="h-3 w-3 mr-1" />
                                {vehicleStatus.spotId}
                              </Badge>
                              <div className="text-sm text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {vehicleStatus.duration} min
                              </div>
                            </div>
                          ) : (
                            <Badge variant="secondary">Not Parked</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {vehicleStatus.status === 'parked' && activeSession ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCheckOut(activeSession.id)}
                              >
                                Check Out
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleCheckIn(vehicle.id)}
                              >
                                Check In
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedVehicle(vehicle)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteVehicle(vehicle.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {filteredVehicles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No vehicles found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Vehicle Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>
              Update vehicle information
            </DialogDescription>
          </DialogHeader>
          {selectedVehicle && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-licensePlate">License Plate</Label>
                  <Input
                    id="edit-licensePlate"
                    value={selectedVehicle.licensePlate}
                    onChange={(e) => setSelectedVehicle({...selectedVehicle, licensePlate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-type">Vehicle Type</Label>
                  <Select
                    value={selectedVehicle.type}
                    onValueChange={(value: Vehicle['type']) => setSelectedVehicle({...selectedVehicle, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="motorcycle">Motorcycle</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-make">Make</Label>
                  <Input
                    id="edit-make"
                    value={selectedVehicle.make || ''}
                    onChange={(e) => setSelectedVehicle({...selectedVehicle, make: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-model">Model</Label>
                  <Input
                    id="edit-model"
                    value={selectedVehicle.model || ''}
                    onChange={(e) => setSelectedVehicle({...selectedVehicle, model: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <Input
                  id="edit-color"
                  value={selectedVehicle.color || ''}
                  onChange={(e) => setSelectedVehicle({...selectedVehicle, color: e.target.value})}
                />
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Owner Information</h4>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="edit-ownerName">Name</Label>
                    <Input
                      id="edit-ownerName"
                      value={selectedVehicle.ownerName || ''}
                      onChange={(e) => setSelectedVehicle({...selectedVehicle, ownerName: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-ownerEmail">Email</Label>
                      <Input
                        id="edit-ownerEmail"
                        type="email"
                        value={selectedVehicle.ownerEmail || ''}
                        onChange={(e) => setSelectedVehicle({...selectedVehicle, ownerEmail: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-ownerPhone">Phone</Label>
                      <Input
                        id="edit-ownerPhone"
                        value={selectedVehicle.ownerPhone || ''}
                        onChange={(e) => setSelectedVehicle({...selectedVehicle, ownerPhone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateVehicle}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
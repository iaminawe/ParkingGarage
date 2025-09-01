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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Building2,
  Plus,
  Edit,
  Save,
  X,
  DollarSign,
  Phone,
  Mail,
  Zap,
  Accessibility
} from 'lucide-react'
import { apiService } from '@/services/api'
import type { ParkingGarage } from '@/types/api-extensions'
import { useToast } from '@/hooks/use-toast'

interface GarageConfig extends ParkingGarage {
  businessHours: {
    monday: { open: string; close: string; closed: boolean }
    tuesday: { open: string; close: string; closed: boolean }
    wednesday: { open: string; close: string; closed: boolean }
    thursday: { open: string; close: string; closed: boolean }
    friday: { open: string; close: string; closed: boolean }
    saturday: { open: string; close: string; closed: boolean }
    sunday: { open: string; close: string; closed: boolean }
  }
  pricing: {
    hourly: number
    daily: number
    monthly: number
    overnight: number
    weekend: number
    earlyBird: { enabled: boolean; rate: number; startTime: string; endTime: string }
    maxDaily: number
  }
  features: {
    evCharging: boolean
    valet: boolean
    carWash: boolean
    security24h: boolean
    coveredParking: boolean
    wheelchairAccess: boolean
  }
  notifications: {
    email: boolean
    sms: boolean
    maxCapacityAlert: number
    maintenanceReminder: boolean
  }
}

const defaultBusinessHours = {
  monday: { open: '06:00', close: '22:00', closed: false },
  tuesday: { open: '06:00', close: '22:00', closed: false },
  wednesday: { open: '06:00', close: '22:00', closed: false },
  thursday: { open: '06:00', close: '22:00', closed: false },
  friday: { open: '06:00', close: '22:00', closed: false },
  saturday: { open: '07:00', close: '23:00', closed: false },
  sunday: { open: '07:00', close: '22:00', closed: false }
}

interface GarageConfigurationProps {
  garageId?: string
}

export function GarageConfiguration({ garageId }: GarageConfigurationProps = {}) {
  const { toast } = useToast()
  const [garages, setGarages] = useState<GarageConfig[]>([])
  const [selectedGarage, setSelectedGarage] = useState<GarageConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newGarage, setNewGarage] = useState<Partial<GarageConfig>>({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    totalFloors: 1,
    spotsPerFloor: 50,
    totalSpots: 50,
    businessHours: defaultBusinessHours,
    pricing: {
      hourly: 5,
      daily: 30,
      monthly: 200,
      overnight: 15,
      weekend: 7,
      earlyBird: { enabled: false, rate: 20, startTime: '05:00', endTime: '09:00' },
      maxDaily: 40
    },
    features: {
      evCharging: false,
      valet: false,
      carWash: false,
      security24h: true,
      coveredParking: false,
      wheelchairAccess: true
    },
    notifications: {
      email: true,
      sms: false,
      maxCapacityAlert: 90,
      maintenanceReminder: true
    }
  })

  useEffect(() => {
    fetchGarages()
  }, [])

  const fetchGarages = async () => {
    try {
      setLoading(true)
      const response = await apiService.getGarages()
      if (response.success) {
        // Enhance garage data with config fields
        const enhancedGarages = response.data.map(garage => ({
          ...garage,
          businessHours: defaultBusinessHours,
          pricing: {
            hourly: 5,
            daily: 30,
            monthly: 200,
            overnight: 15,
            weekend: 7,
            earlyBird: { enabled: false, rate: 20, startTime: '05:00', endTime: '09:00' },
            maxDaily: 40
          },
          features: {
            evCharging: false,
            valet: false,
            carWash: false,
            security24h: true,
            coveredParking: false,
            wheelchairAccess: true
          },
          notifications: {
            email: true,
            sms: false,
            maxCapacityAlert: 90,
            maintenanceReminder: true
          }
        }))
        setGarages(enhancedGarages as GarageConfig[])
        if (enhancedGarages.length > 0) {
          setSelectedGarage(enhancedGarages[0] as GarageConfig)
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch garages',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGarage = async () => {
    if (!selectedGarage) return

    try {
      const response = await apiService.updateGarage(selectedGarage.id, selectedGarage)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Garage configuration saved successfully'
        })
        setIsEditing(false)
        fetchGarages()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save garage configuration',
        variant: 'destructive'
      })
    }
  }

  const handleAddGarage = async () => {
    try {
      const response = await apiService.createGarage(newGarage as Partial<ParkingGarage>)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'New garage added successfully'
        })
        setIsAddDialogOpen(false)
        fetchGarages()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add new garage',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteGarage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this garage?')) return

    try {
      const response = await apiService.deleteGarage(id)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Garage deleted successfully'
        })
        fetchGarages()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete garage',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading garage configuration...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Garage Configuration
          </CardTitle>
          <CardDescription>
            Manage garage settings, pricing, and operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Label>Select Garage</Label>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 border rounded-md"
                  value={selectedGarage?.id || ''}
                  onChange={(e) => {
                    const garage = garages.find(g => g.id === e.target.value)
                    setSelectedGarage(garage || null)
                    setIsEditing(false)
                  }}
                >
                  {garages.map(garage => (
                    <option key={garage.id} value={garage.id}>
                      {garage.name}
                    </option>
                  ))}
                </select>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Garage
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Garage</DialogTitle>
                      <DialogDescription>
                        Configure a new parking garage
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Garage Name</Label>
                          <Input
                            id="name"
                            value={newGarage.name || ''}
                            onChange={(e) => setNewGarage({...newGarage, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={newGarage.phone || ''}
                            onChange={(e) => setNewGarage({...newGarage, phone: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={newGarage.address || ''}
                          onChange={(e) => setNewGarage({...newGarage, address: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={newGarage.city || ''}
                            onChange={(e) => setNewGarage({...newGarage, city: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={newGarage.state || ''}
                            onChange={(e) => setNewGarage({...newGarage, state: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="zipCode">ZIP Code</Label>
                          <Input
                            id="zipCode"
                            value={newGarage.zipCode || ''}
                            onChange={(e) => setNewGarage({...newGarage, zipCode: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="totalFloors">Total Floors</Label>
                          <Input
                            id="totalFloors"
                            type="number"
                            value={newGarage.totalFloors || 1}
                            onChange={(e) => setNewGarage({...newGarage, totalFloors: parseInt(e.target.value)})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="spotsPerFloor">Spots per Floor</Label>
                          <Input
                            id="spotsPerFloor"
                            type="number"
                            value={newGarage.spotsPerFloor || 50}
                            onChange={(e) => setNewGarage({...newGarage, spotsPerFloor: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddGarage}>Add Garage</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSaveGarage}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Configuration
                </Button>
              )}
            </div>
          </div>

          {selectedGarage && (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="hours">Hours</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="garage-name">Garage Name</Label>
                        <Input
                          id="garage-name"
                          value={selectedGarage.name}
                          onChange={(e) => setSelectedGarage({...selectedGarage, name: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="garage-phone">Phone</Label>
                        <Input
                          id="garage-phone"
                          value={selectedGarage.phone || ''}
                          onChange={(e) => setSelectedGarage({...selectedGarage, phone: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="garage-address">Address</Label>
                      <Input
                        id="garage-address"
                        value={selectedGarage.address}
                        onChange={(e) => setSelectedGarage({...selectedGarage, address: e.target.value})}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="garage-city">City</Label>
                        <Input
                          id="garage-city"
                          value={selectedGarage.city}
                          onChange={(e) => setSelectedGarage({...selectedGarage, city: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="garage-state">State</Label>
                        <Input
                          id="garage-state"
                          value={selectedGarage.state}
                          onChange={(e) => setSelectedGarage({...selectedGarage, state: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="garage-zip">ZIP Code</Label>
                        <Input
                          id="garage-zip"
                          value={selectedGarage.zipCode}
                          onChange={(e) => setSelectedGarage({...selectedGarage, zipCode: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="garage-email">Email</Label>
                        <Input
                          id="garage-email"
                          type="email"
                          value={selectedGarage.email || ''}
                          onChange={(e) => setSelectedGarage({...selectedGarage, email: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="garage-website">Website</Label>
                        <Input
                          id="garage-website"
                          value={selectedGarage.website || ''}
                          onChange={(e) => setSelectedGarage({...selectedGarage, website: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="garage-description">Description</Label>
                      <Textarea
                        id="garage-description"
                        value={selectedGarage.description || ''}
                        onChange={(e) => setSelectedGarage({...selectedGarage, description: e.target.value})}
                        disabled={!isEditing}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Structure</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="total-floors">Total Floors</Label>
                        <Input
                          id="total-floors"
                          type="number"
                          value={selectedGarage.totalFloors}
                          onChange={(e) => setSelectedGarage({...selectedGarage, totalFloors: parseInt(e.target.value)})}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="spots-per-floor">Spots per Floor</Label>
                        <Input
                          id="spots-per-floor"
                          type="number"
                          value={selectedGarage.spotsPerFloor}
                          onChange={(e) => setSelectedGarage({...selectedGarage, spotsPerFloor: parseInt(e.target.value)})}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="total-spots">Total Spots</Label>
                        <Input
                          id="total-spots"
                          type="number"
                          value={selectedGarage.totalSpots}
                          disabled
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Standard Rates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="hourly-rate">Hourly Rate</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="hourly-rate"
                            type="number"
                            value={selectedGarage.pricing.hourly}
                            onChange={(e) => setSelectedGarage({
                              ...selectedGarage,
                              pricing: {...selectedGarage.pricing, hourly: parseFloat(e.target.value)}
                            })}
                            disabled={!isEditing}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="daily-rate">Daily Rate</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="daily-rate"
                            type="number"
                            value={selectedGarage.pricing.daily}
                            onChange={(e) => setSelectedGarage({
                              ...selectedGarage,
                              pricing: {...selectedGarage.pricing, daily: parseFloat(e.target.value)}
                            })}
                            disabled={!isEditing}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="monthly-rate">Monthly Rate</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="monthly-rate"
                            type="number"
                            value={selectedGarage.pricing.monthly}
                            onChange={(e) => setSelectedGarage({
                              ...selectedGarage,
                              pricing: {...selectedGarage.pricing, monthly: parseFloat(e.target.value)}
                            })}
                            disabled={!isEditing}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="overnight-rate">Overnight Rate</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="overnight-rate"
                            type="number"
                            value={selectedGarage.pricing.overnight}
                            onChange={(e) => setSelectedGarage({
                              ...selectedGarage,
                              pricing: {...selectedGarage.pricing, overnight: parseFloat(e.target.value)}
                            })}
                            disabled={!isEditing}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="weekend-rate">Weekend Rate</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="weekend-rate"
                            type="number"
                            value={selectedGarage.pricing.weekend}
                            onChange={(e) => setSelectedGarage({
                              ...selectedGarage,
                              pricing: {...selectedGarage.pricing, weekend: parseFloat(e.target.value)}
                            })}
                            disabled={!isEditing}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="max-daily">Max Daily Charge</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="max-daily"
                            type="number"
                            value={selectedGarage.pricing.maxDaily}
                            onChange={(e) => setSelectedGarage({
                              ...selectedGarage,
                              pricing: {...selectedGarage.pricing, maxDaily: parseFloat(e.target.value)}
                            })}
                            disabled={!isEditing}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Early Bird Special</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="early-bird-enabled"
                        checked={selectedGarage.pricing.earlyBird.enabled}
                        onCheckedChange={(checked) => setSelectedGarage({
                          ...selectedGarage,
                          pricing: {
                            ...selectedGarage.pricing,
                            earlyBird: {...selectedGarage.pricing.earlyBird, enabled: checked}
                          }
                        })}
                        disabled={!isEditing}
                      />
                      <Label htmlFor="early-bird-enabled">Enable Early Bird Pricing</Label>
                    </div>
                    {selectedGarage.pricing.earlyBird.enabled && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="early-bird-rate">Early Bird Rate</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="early-bird-rate"
                              type="number"
                              value={selectedGarage.pricing.earlyBird.rate}
                              onChange={(e) => setSelectedGarage({
                                ...selectedGarage,
                                pricing: {
                                  ...selectedGarage.pricing,
                                  earlyBird: {...selectedGarage.pricing.earlyBird, rate: parseFloat(e.target.value)}
                                }
                              })}
                              disabled={!isEditing}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="early-bird-start">Start Time</Label>
                          <Input
                            id="early-bird-start"
                            type="time"
                            value={selectedGarage.pricing.earlyBird.startTime}
                            onChange={(e) => setSelectedGarage({
                              ...selectedGarage,
                              pricing: {
                                ...selectedGarage.pricing,
                                earlyBird: {...selectedGarage.pricing.earlyBird, startTime: e.target.value}
                              }
                            })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <Label htmlFor="early-bird-end">End Time</Label>
                          <Input
                            id="early-bird-end"
                            type="time"
                            value={selectedGarage.pricing.earlyBird.endTime}
                            onChange={(e) => setSelectedGarage({
                              ...selectedGarage,
                              pricing: {
                                ...selectedGarage.pricing,
                                earlyBird: {...selectedGarage.pricing.earlyBird, endTime: e.target.value}
                              }
                            })}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hours" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Business Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Day</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Opening Time</TableHead>
                          <TableHead>Closing Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(selectedGarage.businessHours).map(([day, hours]) => (
                          <TableRow key={day}>
                            <TableCell className="capitalize">{day}</TableCell>
                            <TableCell>
                              <Switch
                                checked={!hours.closed}
                                onCheckedChange={(checked) => setSelectedGarage({
                                  ...selectedGarage,
                                  businessHours: {
                                    ...selectedGarage.businessHours,
                                    [day]: {...hours, closed: !checked}
                                  }
                                })}
                                disabled={!isEditing}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="time"
                                value={hours.open}
                                onChange={(e) => setSelectedGarage({
                                  ...selectedGarage,
                                  businessHours: {
                                    ...selectedGarage.businessHours,
                                    [day]: {...hours, open: e.target.value}
                                  }
                                })}
                                disabled={!isEditing || hours.closed}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="time"
                                value={hours.close}
                                onChange={(e) => setSelectedGarage({
                                  ...selectedGarage,
                                  businessHours: {
                                    ...selectedGarage.businessHours,
                                    [day]: {...hours, close: e.target.value}
                                  }
                                })}
                                disabled={!isEditing || hours.closed}
                                className="w-32"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="features" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="ev-charging"
                          checked={selectedGarage.features.evCharging}
                          onCheckedChange={(checked) => setSelectedGarage({
                            ...selectedGarage,
                            features: {...selectedGarage.features, evCharging: checked}
                          })}
                          disabled={!isEditing}
                        />
                        <Label htmlFor="ev-charging" className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          EV Charging Stations
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="valet"
                          checked={selectedGarage.features.valet}
                          onCheckedChange={(checked) => setSelectedGarage({
                            ...selectedGarage,
                            features: {...selectedGarage.features, valet: checked}
                          })}
                          disabled={!isEditing}
                        />
                        <Label htmlFor="valet">Valet Service</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="car-wash"
                          checked={selectedGarage.features.carWash}
                          onCheckedChange={(checked) => setSelectedGarage({
                            ...selectedGarage,
                            features: {...selectedGarage.features, carWash: checked}
                          })}
                          disabled={!isEditing}
                        />
                        <Label htmlFor="car-wash">Car Wash Service</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="security-24h"
                          checked={selectedGarage.features.security24h}
                          onCheckedChange={(checked) => setSelectedGarage({
                            ...selectedGarage,
                            features: {...selectedGarage.features, security24h: checked}
                          })}
                          disabled={!isEditing}
                        />
                        <Label htmlFor="security-24h">24/7 Security</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="covered-parking"
                          checked={selectedGarage.features.coveredParking}
                          onCheckedChange={(checked) => setSelectedGarage({
                            ...selectedGarage,
                            features: {...selectedGarage.features, coveredParking: checked}
                          })}
                          disabled={!isEditing}
                        />
                        <Label htmlFor="covered-parking">Covered Parking</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="wheelchair-access"
                          checked={selectedGarage.features.wheelchairAccess}
                          onCheckedChange={(checked) => setSelectedGarage({
                            ...selectedGarage,
                            features: {...selectedGarage.features, wheelchairAccess: checked}
                          })}
                          disabled={!isEditing}
                        />
                        <Label htmlFor="wheelchair-access" className="flex items-center gap-2">
                          <Accessibility className="h-4 w-4" />
                          Accessibility Accessible
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="email-notifications"
                          checked={selectedGarage.notifications.email}
                          onCheckedChange={(checked) => setSelectedGarage({
                            ...selectedGarage,
                            notifications: {...selectedGarage.notifications, email: checked}
                          })}
                          disabled={!isEditing}
                        />
                        <Label htmlFor="email-notifications" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Notifications
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="sms-notifications"
                          checked={selectedGarage.notifications.sms}
                          onCheckedChange={(checked) => setSelectedGarage({
                            ...selectedGarage,
                            notifications: {...selectedGarage.notifications, sms: checked}
                          })}
                          disabled={!isEditing}
                        />
                        <Label htmlFor="sms-notifications" className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          SMS Notifications
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="maintenance-reminder"
                          checked={selectedGarage.notifications.maintenanceReminder}
                          onCheckedChange={(checked) => setSelectedGarage({
                            ...selectedGarage,
                            notifications: {...selectedGarage.notifications, maintenanceReminder: checked}
                          })}
                          disabled={!isEditing}
                        />
                        <Label htmlFor="maintenance-reminder">Maintenance Reminders</Label>
                      </div>
                      <div>
                        <Label htmlFor="capacity-alert">Capacity Alert Threshold (%)</Label>
                        <Input
                          id="capacity-alert"
                          type="number"
                          min="0"
                          max="100"
                          value={selectedGarage.notifications.maxCapacityAlert}
                          onChange={(e) => setSelectedGarage({
                            ...selectedGarage,
                            notifications: {...selectedGarage.notifications, maxCapacityAlert: parseInt(e.target.value)}
                          })}
                          disabled={!isEditing}
                          className="w-32"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Alert when occupancy reaches this percentage
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
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
import { Separator } from '@/components/ui/separator'
import { 
  LogIn, 
  LogOut, 
  Search, 
  MapPin, 
  Clock,
  Car,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { apiService } from '@/services/api'
import { useToast } from '@/hooks/use-toast'

interface CheckInData {
  licensePlate: string
  vehicleType: 'compact' | 'standard' | 'oversized'
}

export function CheckInCheckOut() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [currentSessions, setCurrentSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Check-in form state
  const [showCheckInDialog, setShowCheckInDialog] = useState(false)
  const [checkInData, setCheckInData] = useState<CheckInData>({
    licensePlate: '',
    vehicleType: 'standard'
  })
  const [checkInSimulation, setCheckInSimulation] = useState<any>(null)
  
  // Check-out state
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [checkOutEstimate, setCheckOutEstimate] = useState<any>(null)
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false)

  useEffect(() => {
    fetchCurrentSessions()
  }, [])

  const fetchCurrentSessions = async () => {
    try {
      setLoading(true)
      const response = await apiService.getCurrentSessions({ limit: 50 })
      if (response.success) {
        setCurrentSessions(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch current sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchVehicles = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      const response = await apiService.searchLicensePlate(query)
      if (response.success) {
        setSearchResults(response.data)
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    }
  }

  const simulateCheckIn = async () => {
    try {
      const response = await apiService.simulateCheckIn(checkInData)
      if (response.success) {
        setCheckInSimulation(response.data)
      }
    } catch (error: any) {
      toast({
        title: 'Simulation Failed',
        description: error.response?.data?.message || 'Unable to simulate check-in',
        variant: 'destructive'
      })
    }
  }

  const performCheckIn = async () => {
    try {
      setSubmitting(true)
      const response = await apiService.checkIn(checkInData)
      if (response.success && response.data.success) {
        toast({
          title: 'Check-in Successful',
          description: `Vehicle assigned to spot ${response.data.location.floor}-${response.data.location.bay}-${response.data.location.spotNumber}`
        })
        setShowCheckInDialog(false)
        resetCheckIn()
        fetchCurrentSessions()
      } else {
        throw new Error('Check-in failed')
      }
    } catch (error: any) {
      toast({
        title: 'Check-in Failed',
        description: error.response?.data?.message || 'Unable to check in vehicle',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getCheckoutEstimate = async (sessionId: string) => {
    try {
      const response = await apiService.getCheckoutEstimate(sessionId)
      if (response.success) {
        setCheckOutEstimate(response.data)
        setShowCheckOutDialog(true)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Unable to get checkout estimate',
        variant: 'destructive'
      })
    }
  }

  const performCheckOut = async () => {
    if (!selectedSession) return

    try {
      setSubmitting(true)
      const response = await apiService.checkOut(selectedSession.id)
      if (response.success && response.data.success) {
        toast({
          title: 'Check-out Successful',
          description: `Total cost: $${response.data.billing.totalCost.toFixed(2)}`
        })
        setShowCheckOutDialog(false)
        setSelectedSession(null)
        setCheckOutEstimate(null)
        fetchCurrentSessions()
      } else {
        throw new Error('Check-out failed')
      }
    } catch (error: any) {
      toast({
        title: 'Check-out Failed',
        description: error.response?.data?.message || 'Unable to check out vehicle',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const resetCheckIn = () => {
    setCheckInData({
      licensePlate: '',
      vehicleType: 'standard'
    })
    setCheckInSimulation(null)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getVehicleTypeIcon = (_type: string) => {
    return <Car className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search license plate..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    searchVehicles(e.target.value)
                  }}
                  className="pl-10"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="font-medium">{result.licensePlate}</div>
                      <div className="text-xs text-gray-500">
                        {result.isCurrentlyParked ? 'Currently parked' : 'Available for check-in'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Check-In Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
              <DialogTrigger asChild>
                <Button className="w-full" onClick={() => setShowCheckInDialog(true)}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Check In
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Vehicle Check-In</DialogTitle>
                  <DialogDescription>
                    Enter vehicle details to check in
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="licensePlate">License Plate</Label>
                    <Input
                      id="licensePlate"
                      value={checkInData.licensePlate}
                      onChange={(e) => setCheckInData(prev => ({ ...prev, licensePlate: e.target.value.toUpperCase() }))}
                      placeholder="Enter license plate"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleType">Vehicle Type</Label>
                    <Select 
                      value={checkInData.vehicleType} 
                      onValueChange={(value: 'compact' | 'standard' | 'oversized') => 
                        setCheckInData(prev => ({ ...prev, vehicleType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="oversized">Oversized</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {checkInData.licensePlate && (
                    <Button 
                      variant="outline" 
                      onClick={simulateCheckIn}
                      className="w-full"
                    >
                      Simulate Check-In
                    </Button>
                  )}

                  {checkInSimulation && (
                    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Assignment Preview
                      </div>
                      {checkInSimulation.success ? (
                        <div className="text-sm space-y-1">
                          <div>Spot: {checkInSimulation.spotLocation?.floor}-{checkInSimulation.spotLocation?.bay}-{checkInSimulation.spotLocation?.spotNumber}</div>
                          <div>Rate: ${checkInSimulation.rate}/hour</div>
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">
                          No available spots for this vehicle type
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCheckInDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={performCheckIn} 
                    disabled={submitting || !checkInData.licensePlate || (checkInSimulation && !checkInSimulation.success)}
                  >
                    {submitting ? 'Checking In...' : 'Check In'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentSessions.length}</div>
            <p className="text-sm text-gray-500">Active parking sessions</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchCurrentSessions} 
              className="w-full mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Parking Sessions
          </CardTitle>
          <CardDescription>
            Vehicles currently parked in the garage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading sessions...</div>
          ) : currentSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active parking sessions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {getVehicleTypeIcon(session.vehicle?.type || 'standard')}
                    </div>
                    <div>
                      <div className="font-medium">{session.vehicle?.licensePlate}</div>
                      <div className="text-sm text-gray-500">
                        {session.vehicle?.make} {session.vehicle?.model} • {session.vehicle?.color}
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Floor {session.spot?.floor}, Bay {session.spot?.bay}, Spot {session.spot?.spotNumber}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDuration(session.duration || 0)} • ${session.estimatedCost?.toFixed(2) || '0.00'} est.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSession(session)
                        getCheckoutEstimate(session.id)
                      }}
                    >
                      <LogOut className="h-3 w-3 mr-1" />
                      Check Out
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-out Dialog */}
      <Dialog open={showCheckOutDialog} onOpenChange={setShowCheckOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Out Vehicle</DialogTitle>
            <DialogDescription>
              Review parking session and complete check-out
            </DialogDescription>
          </DialogHeader>
          {checkOutEstimate && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="font-medium mb-2">{selectedSession?.vehicle?.licensePlate}</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-500">Location</label>
                    <div>Floor {checkOutEstimate.estimate.location.floor}, Bay {checkOutEstimate.estimate.location.bay}, Spot {checkOutEstimate.estimate.location.spotNumber}</div>
                  </div>
                  <div>
                    <label className="text-gray-500">Duration</label>
                    <div>{checkOutEstimate.estimate.duration}</div>
                  </div>
                  <div>
                    <label className="text-gray-500">Rate</label>
                    <div>${checkOutEstimate.estimate.rate}/hour</div>
                  </div>
                  <div>
                    <label className="text-gray-500">Total Cost</label>
                    <div className="font-medium text-lg">${checkOutEstimate.estimate.estimatedCost.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertCircle className="h-4 w-4" />
                Final amount will be calculated at checkout
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckOutDialog(false)}>
              Cancel
            </Button>
            <Button onClick={performCheckOut} disabled={submitting}>
              {submitting ? 'Processing...' : 'Complete Check-out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CheckInCheckOut
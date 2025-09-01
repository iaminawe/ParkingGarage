import { useState, useEffect } from 'react'
import { Car, Clock, DollarSign, MapPin, AlertCircle, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { apiService } from '@/services/api'
import { socketService } from '@/services'

interface CheckInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Availability {
  overall: {
    total: number
    available: number
    occupied: number
    occupancyRate: number
  }
  byVehicleType: {
    compact: { available: number; total: number }
    standard: { available: number; total: number }
    oversized: { available: number; total: number }
  }
}

interface Rates {
  standard: number
  compact: number
  oversized: number
  ev_charging: number
}

interface SimulationResult {
  success: boolean
  wouldAssignSpot?: string
  spotLocation?: {
    floor: number
    bay: string
    spotNumber: number
  }
  rate?: number
}

interface CheckInResult {
  success: boolean
  spotId: string
  location: {
    floor: number
    bay: string
    spotNumber: number
  }
  checkInTime: string
  rate: number
}

export function CheckInDialog({ open, onOpenChange }: CheckInDialogProps) {
  const [step, setStep] = useState<'form' | 'confirmation' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [licensePlate, setLicensePlate] = useState('')
  const [vehicleType, setVehicleType] = useState<'compact' | 'standard' | 'oversized'>('standard')
  const [licensePlateError, setLicensePlateError] = useState<string | null>(null)
  
  // Data
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [rates, setRates] = useState<Rates | null>(null)
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null)

  // Load initial data when dialog opens
  useEffect(() => {
    if (open) {
      loadInitialData()
    } else {
      resetDialog()
    }
  }, [open])

  const suggestSpot = async () => {
    if (!licensePlate.trim() || !vehicleType) return

    try {
      const result = await apiService.simulateCheckIn({
        licensePlate: licensePlate.trim(),
        vehicleType
      })
      
      setSimulation(result.data)
      setError(null)
    } catch (error: any) {
      setSimulation(null)
      if (error.response?.status !== 404) {
        console.error('Simulation failed:', error)
      }
    }
  }

  // Auto-suggest spot when vehicle type changes
  useEffect(() => {
    if (licensePlate && vehicleType) {
      suggestSpot()
    }
  }, [licensePlate, vehicleType])

  const loadInitialData = async () => {
    try {
      const [availabilityRes, ratesRes] = await Promise.all([
        apiService.getAvailability('default'),
        apiService.getRates('default')
      ])
      
      setAvailability(availabilityRes.data)
      setRates(ratesRes.data)
    } catch (error) {
      console.error('Failed to load initial data:', error)
      setError('Failed to load parking information. Please try again.')
    }
  }

  const validateLicensePlate = (plate: string): boolean => {
    const trimmed = plate.trim()
    if (!trimmed) {
      setLicensePlateError('License plate is required')
      return false
    }
    if (trimmed.length < 2 || trimmed.length > 15) {
      setLicensePlateError('License plate must be between 2-15 characters')
      return false
    }
    if (!/^[A-Za-z0-9\s-]+$/.test(trimmed)) {
      setLicensePlateError('License plate can only contain letters, numbers, spaces, and hyphens')
      return false
    }
    setLicensePlateError(null)
    return true
  }

  const handleLicensePlateChange = (value: string) => {
    setLicensePlate(value.toUpperCase())
    if (value.trim()) {
      validateLicensePlate(value)
    } else {
      setLicensePlateError(null)
    }
  }

  const proceedToConfirmation = () => {
    if (!validateLicensePlate(licensePlate)) return
    if (!availability?.byVehicleType[vehicleType]?.available) {
      setError(`No ${vehicleType} spots available`)
      return
    }
    
    setStep('confirmation')
  }

  const performCheckIn = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await apiService.checkIn({
        licensePlate: licensePlate.trim(),
        vehicleType,
      })
      
      setCheckInResult(result.data)
      setStep('success')
      
      // Emit socket notification for real-time updates
      socketService.emit('spotOccupied', {
        spotId: result.data.spotId,
        licensePlate: licensePlate.trim(),
        checkInTime: result.data.checkInTime
      })
    } catch (error: unknown) {
      console.error('Check-in failed:', error)
      setError((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Check-in failed. Please try again.')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  const resetDialog = () => {
    setStep('form')
    setLoading(false)
    setError(null)
    setLicensePlate('')
    setVehicleType('standard')
    setLicensePlateError(null)
    setAvailability(null)
    setRates(null)
    setSimulation(null)
    setCheckInResult(null)
  }

  const handleCloseDialog = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Check-In
              </DialogTitle>
              <DialogDescription>
                Enter your vehicle information to find and reserve a parking spot.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="licensePlate">License Plate *</Label>
                <Input
                  id="licensePlate"
                  value={licensePlate}
                  onChange={(e) => handleLicensePlateChange(e.target.value)}
                  placeholder="Enter license plate (e.g., ABC123)"
                  className={licensePlateError ? 'border-red-500' : ''}
                />
                {licensePlateError && (
                  <p className="text-sm text-red-500">{licensePlateError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type *</Label>
                <Select value={vehicleType} onValueChange={(value: 'compact' | 'standard' | 'oversized') => setVehicleType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">
                      Compact {availability && `(${availability.byVehicleType.compact.available} available)`}
                    </SelectItem>
                    <SelectItem value="standard">
                      Standard {availability && `(${availability.byVehicleType.standard.available} available)`}
                    </SelectItem>
                    <SelectItem value="oversized">
                      Oversized {availability && `(${availability.byVehicleType.oversized.available} available)`}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {rates && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Parking Rates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center">
                        <p className="font-medium">Compact</p>
                        <p className="text-muted-foreground">${rates.compact}/hr</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">Standard</p>
                        <p className="text-muted-foreground">${rates.standard}/hr</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">Oversized</p>
                        <p className="text-muted-foreground">${rates.oversized}/hr</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {simulation && simulation.wouldAssignSpot && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">Available Spot Found</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Spot {simulation.wouldAssignSpot} would be assigned
                      {simulation.spotLocation && (
                        ` (Floor ${simulation.spotLocation.floor}, Bay ${simulation.spotLocation.bay})`
                      )}
                    </p>
                    {simulation.rate && (
                      <p className="text-sm text-green-700 mt-1">
                        Rate: ${simulation.rate}/hour
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {availability && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Current Availability</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Total Spots</p>
                        <p className="text-muted-foreground">{availability.overall.available} / {availability.overall.total}</p>
                      </div>
                      <div>
                        <p className="font-medium">Occupancy</p>
                        <p className="text-muted-foreground">{Math.round(availability.overall.occupancyRate * 100)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={proceedToConfirmation} disabled={!licensePlate.trim() || !!licensePlateError || !availability?.byVehicleType[vehicleType]?.available}>
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirmation' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Confirm Check-In
              </DialogTitle>
              <DialogDescription>
                Please review your check-in details before proceeding.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">License Plate:</span>
                      <Badge variant="outline">{licensePlate}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Vehicle Type:</span>
                      <span className="capitalize">{vehicleType}</span>
                    </div>
                    {rates && (
                      <div className="flex justify-between">
                        <span className="font-medium">Hourly Rate:</span>
                        <span className="font-mono">${rates[vehicleType]}/hr</span>
                      </div>
                    )}
                    {simulation?.wouldAssignSpot && (
                      <>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="font-medium">Assigned Spot:</span>
                          <span className="font-mono">{simulation.wouldAssignSpot}</span>
                        </div>
                        {simulation.spotLocation && (
                          <div className="flex justify-between">
                            <span className="font-medium">Location:</span>
                            <span>Floor {simulation.spotLocation.floor}, Bay {simulation.spotLocation.bay}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Your parking session will begin immediately after confirmation.
                  You can check out at any time through this system.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('form')}>
                Back
              </Button>
              <Button onClick={performCheckIn} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm Check-In'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && checkInResult && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Check-In Successful!
              </DialogTitle>
              <DialogDescription>
                Your vehicle has been successfully checked in.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold text-green-800">
                        {checkInResult.spotId}
                      </div>
                      <p className="text-sm text-green-600">Your Parking Spot</p>
                    </div>
                    
                    <Separator className="bg-green-200" />
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-medium text-green-800">Floor</p>
                        <p className="text-green-700">{checkInResult.location.floor}</p>
                      </div>
                      <div>
                        <p className="font-medium text-green-800">Bay</p>
                        <p className="text-green-700">{checkInResult.location.bay}</p>
                      </div>
                      <div>
                        <p className="font-medium text-green-800">Check-In Time</p>
                        <p className="text-green-700">
                          {new Date(checkInResult.checkInTime).toLocaleTimeString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-green-800">Rate</p>
                        <p className="text-green-700">${checkInResult.rate}/hr</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  Please remember your spot number: <strong>{checkInResult.spotId}</strong>
                  <br />
                  Location: Floor {checkInResult.location.floor}, Bay {checkInResult.location.bay}
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button onClick={handleCloseDialog} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
import { useState, useEffect } from 'react'
import { 
  Car, 
  MapPin, 
  AlertCircle, 
  CheckCircle, 
  Receipt, 
  CreditCard,
  Search,
  Timer
} from 'lucide-react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { apiService } from '@/services/api'
import { socketService } from '@/services'

interface CheckOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface EstimateData {
  licensePlate: string
  estimate: {
    checkInTime: string
    currentTime: string
    duration: string
    durationMinutes: number
    rate: number
    estimatedCost: number
    spotId: string
    location: {
      floor: number
      bay: string
      spotNumber: number
    }
  }
}

interface CheckOutResult {
  success: boolean
  licensePlate: string
  spotId: string
  timing: {
    checkInTime: string
    checkOutTime: string
    duration: string
    durationMinutes: number
  }
  billing: {
    rate: number
    totalCost: number
    gracePeriodApplied: boolean
  }
}

export function CheckOutDialog({ open, onOpenChange }: CheckOutDialogProps) {
  const [step, setStep] = useState<'search' | 'payment' | 'receipt'>('search')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [licensePlate, setLicensePlate] = useState('')
  const [licensePlateError, setLicensePlateError] = useState<string | null>(null)
  const [applyGracePeriod, setApplyGracePeriod] = useState(true)
  
  // Data
  const [estimateData, setEstimateData] = useState<EstimateData | null>(null)
  const [checkOutResult, setCheckOutResult] = useState<CheckOutResult | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'cash'>('credit')

  useEffect(() => {
    if (open) {
      resetDialog()
    }
  }, [open])

  const searchVehicle = async () => {
    if (!licensePlate.trim()) return

    try {
      const result = await apiService.getCheckoutEstimateByLicensePlate(licensePlate.trim())
      setEstimateData(result.data)
      setError(null)
    } catch (error: unknown) {
      setEstimateData(null)
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        setError('Vehicle not found. Please check the license plate and try again.')
      } else {
        setError('Failed to load vehicle information. Please try again.')
      }
    }
  }

  // Search for vehicle when license plate changes
  useEffect(() => {
    if (licensePlate.trim() && licensePlate.length >= 3) {
      searchVehicle()
    } else {
      setEstimateData(null)
      setError(null)
    }
  }, [licensePlate])

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

  const proceedToPayment = () => {
    if (!validateLicensePlate(licensePlate) || !estimateData) return
    setStep('payment')
  }

  const simulatePayment = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Simulate payment processing delay
      setTimeout(() => {
        // 95% success rate for demo purposes
        const success = Math.random() > 0.05
        resolve(success)
      }, 2000)
    })
  }

  const performCheckOut = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Simulate payment processing
      const paymentSuccess = await simulatePayment()
      
      if (!paymentSuccess) {
        setError('Payment failed. Please try again or use a different payment method.')
        return
      }

      const result = await apiService.checkOutByLicensePlate({
        licensePlate: licensePlate.trim(),
        applyGracePeriod,
      })
      
      setCheckOutResult(result.data)
      setStep('receipt')
      
      // Emit socket notification for real-time updates
      socketService.emit('spotVacated', {
        spotId: result.data.spotId,
        licensePlate: licensePlate.trim(),
        checkOutTime: result.data.timing.checkOutTime
      })
    } catch (error: unknown) {
      console.error('Check-out failed:', error)
      setError((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Check-out failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetDialog = () => {
    setStep('search')
    setLoading(false)
    setError(null)
    setLicensePlate('')
    setLicensePlateError(null)
    setApplyGracePeriod(true)
    setEstimateData(null)
    setCheckOutResult(null)
    setPaymentMethod('credit')
  }

  const handleCloseDialog = () => {
    onOpenChange(false)
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 'search' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Vehicle Check-Out
              </DialogTitle>
              <DialogDescription>
                Enter your license plate to search for your parked vehicle.
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

              {estimateData && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                      <Car className="h-4 w-4" />
                      Vehicle Found
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="font-medium text-blue-800">Spot</p>
                          <p className="text-blue-700 font-mono">{estimateData.estimate.spotId}</p>
                        </div>
                        <div>
                          <p className="font-medium text-blue-800">Location</p>
                          <p className="text-blue-700">
                            Floor {estimateData.estimate.location.floor}, Bay {estimateData.estimate.location.bay}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-blue-800">Check-In Time</p>
                          <p className="text-blue-700">
                            {new Date(estimateData.estimate.checkInTime).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-blue-800">Duration</p>
                          <p className="text-blue-700">
                            {formatDuration(estimateData.estimate.durationMinutes)}
                          </p>
                        </div>
                      </div>
                      
                      <Separator className="bg-blue-200" />
                      
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-800">Estimated Cost:</span>
                        <span className="text-lg font-bold text-blue-900">
                          {formatCurrency(estimateData.estimate.estimatedCost)}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600">
                        Rate: ${estimateData.estimate.rate}/hour
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="gracePeriod"
                  checked={applyGracePeriod}
                  onChange={(e) => setApplyGracePeriod(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="gracePeriod" className="text-sm">
                  Apply 15-minute grace period (if applicable)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button 
                onClick={proceedToPayment} 
                disabled={!estimateData || !!licensePlateError}
              >
                Proceed to Payment
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'payment' && estimateData && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Processing
              </DialogTitle>
              <DialogDescription>
                Review your parking charges and complete payment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Parking Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Vehicle:</span>
                      <Badge variant="outline">{estimateData.licensePlate}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Spot:</span>
                      <span className="font-mono">{estimateData.estimate.spotId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{formatDuration(estimateData.estimate.durationMinutes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rate:</span>
                      <span>${estimateData.estimate.rate}/hour</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(estimateData.estimate.estimatedCost)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="credit"
                        name="payment"
                        value="credit"
                        checked={paymentMethod === 'credit'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'credit')}
                      />
                      <Label htmlFor="credit">Credit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="debit"
                        name="payment"
                        value="debit"
                        checked={paymentMethod === 'debit'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'debit')}
                      />
                      <Label htmlFor="debit">Debit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="cash"
                        name="payment"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'cash')}
                      />
                      <Label htmlFor="cash">Cash</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <Timer className="h-4 w-4" />
                <AlertDescription>
                  Payment simulation only. No actual charges will be made.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('search')}>
                Back
              </Button>
              <Button onClick={performCheckOut} disabled={loading}>
                {loading ? 'Processing Payment...' : `Pay ${formatCurrency(estimateData.estimate.estimatedCost)}`}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'receipt' && checkOutResult && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Receipt className="h-5 w-5" />
                Payment Complete
              </DialogTitle>
              <DialogDescription>
                Your vehicle has been successfully checked out.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Check-Out Receipt
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 text-sm">
                    <div className="text-center mb-3">
                      <div className="text-xl font-bold text-green-800">
                        Thank You!
                      </div>
                      <p className="text-green-600">Safe travels</p>
                    </div>
                    
                    <Separator className="bg-green-200" />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-green-700">Vehicle:</span>
                        <Badge variant="outline" className="border-green-300 text-green-700">
                          {checkOutResult.licensePlate}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Spot:</span>
                        <span className="font-mono text-green-800">{checkOutResult.spotId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Check-In:</span>
                        <span className="text-green-800">
                          {new Date(checkOutResult.timing.checkInTime).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Check-Out:</span>
                        <span className="text-green-800">
                          {new Date(checkOutResult.timing.checkOutTime).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Duration:</span>
                        <span className="text-green-800">
                          {formatDuration(checkOutResult.timing.durationMinutes)}
                        </span>
                      </div>
                      
                      <Separator className="bg-green-200" />
                      
                      <div className="flex justify-between">
                        <span className="text-green-700">Rate:</span>
                        <span className="text-green-800">${checkOutResult.billing.rate}/hour</span>
                      </div>
                      {checkOutResult.billing.gracePeriodApplied && (
                        <div className="flex justify-between">
                          <span className="text-green-700">Grace Period:</span>
                          <span className="text-green-600">Applied</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold">
                        <span className="text-green-700">Total Paid:</span>
                        <span className="text-green-900">
                          {formatCurrency(checkOutResult.billing.totalCost)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  Your spot <strong>{checkOutResult.spotId}</strong> is now available for other vehicles.
                  <br />
                  Please exit the parking area within 15 minutes.
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
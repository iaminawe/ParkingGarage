import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DialogFooter } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/loading'
import type { Vehicle, VehicleType, VehicleStatus } from '@/types/api'

// Validation schema
const vehicleSchema = z.object({
  licensePlate: z
    .string()
    .min(1, 'License plate is required')
    .max(20, 'License plate must be 20 characters or less')
    .regex(/^[A-Z0-9-\s]+$/, 'License plate must contain only letters, numbers, hyphens, and spaces'),
  type: z.enum(['car', 'motorcycle', 'truck', 'van', 'bus'], {
    message: 'Vehicle type is required',
  }),
  make: z
    .string()
    .min(1, 'Make is required')
    .max(50, 'Make must be 50 characters or less'),
  model: z
    .string()
    .min(1, 'Model is required')
    .max(50, 'Model must be 50 characters or less'),
  color: z
    .string()
    .min(1, 'Color is required')
    .max(30, 'Color must be 30 characters or less'),
  ownerName: z
    .string()
    .min(1, 'Owner name is required')
    .max(100, 'Owner name must be 100 characters or less'),
  ownerEmail: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email must be 100 characters or less')
    .optional()
    .or(z.literal('')),
  ownerPhone: z
    .string()
    .max(20, 'Phone number must be 20 characters or less')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or less')
    .optional()
    .or(z.literal('')),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
})

type VehicleFormData = z.infer<typeof vehicleSchema>

interface VehicleFormProps {
  vehicle?: Vehicle | null
  onSubmit: (data: Partial<Vehicle>) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const vehicleTypes: { value: VehicleType; label: string }[] = [
  { value: 'car', label: 'Car' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'truck', label: 'Truck' },
  { value: 'van', label: 'Van' },
  { value: 'bus', label: 'Bus' },
]

const vehicleStatuses: { value: VehicleStatus; label: string; description: string }[] = [
  { value: 'active', label: 'Active', description: 'Vehicle can park normally' },
  { value: 'inactive', label: 'Inactive', description: 'Vehicle is temporarily disabled' },
  { value: 'blocked', label: 'Blocked', description: 'Vehicle is blocked from parking' },
]

export const VehicleForm: React.FC<VehicleFormProps> = ({
  vehicle,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const isEditing = !!vehicle

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      licensePlate: '',
      type: 'car',
      make: '',
      model: '',
      color: '',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      notes: '',
      status: 'active',
    },
  })

  // Load vehicle data for editing
  useEffect(() => {
    if (vehicle) {
      reset({
        licensePlate: vehicle.licensePlate || '',
        type: vehicle.type || 'car',
        make: vehicle.make || '',
        model: vehicle.model || '',
        color: vehicle.color || '',
        ownerName: vehicle.ownerName || '',
        ownerEmail: vehicle.ownerEmail || '',
        ownerPhone: vehicle.ownerPhone || '',
        notes: vehicle.notes || '',
        status: vehicle.status || 'active',
      })
    }
  }, [vehicle, reset])

  const handleFormSubmit = async (data: VehicleFormData) => {
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      // Clean up empty strings
      const cleanedData = {
        ...data,
        ownerEmail: data.ownerEmail || undefined,
        ownerPhone: data.ownerPhone || undefined,
        notes: data.notes || undefined,
        licensePlate: data.licensePlate.toUpperCase(), // Normalize license plate
      }

      await onSubmit(cleanedData)
    } catch (error) {
      console.error('Form submission error:', error)
      setSubmitError(
        error instanceof Error 
          ? error.message 
          : 'Failed to save vehicle. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const watchedType = watch('type')
  const watchedStatus = watch('status')

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {submitError && (
        <Alert>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="licensePlate">
                License Plate <span className="text-destructive">*</span>
              </Label>
              <Input
                id="licensePlate"
                {...register('licensePlate')}
                placeholder="e.g., ABC-123"
                className={errors.licensePlate ? 'border-destructive' : ''}
                disabled={isSubmitting || loading}
              />
              {errors.licensePlate && (
                <p className="text-sm text-destructive">{errors.licensePlate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                Vehicle Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watchedType}
                onValueChange={(value: VehicleType) => setValue('type', value)}
                disabled={isSubmitting || loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">
                Make <span className="text-destructive">*</span>
              </Label>
              <Input
                id="make"
                {...register('make')}
                placeholder="e.g., Toyota"
                className={errors.make ? 'border-destructive' : ''}
                disabled={isSubmitting || loading}
              />
              {errors.make && (
                <p className="text-sm text-destructive">{errors.make.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">
                Model <span className="text-destructive">*</span>
              </Label>
              <Input
                id="model"
                {...register('model')}
                placeholder="e.g., Camry"
                className={errors.model ? 'border-destructive' : ''}
                disabled={isSubmitting || loading}
              />
              {errors.model && (
                <p className="text-sm text-destructive">{errors.model.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">
                Color <span className="text-destructive">*</span>
              </Label>
              <Input
                id="color"
                {...register('color')}
                placeholder="e.g., Blue"
                className={errors.color ? 'border-destructive' : ''}
                disabled={isSubmitting || loading}
              />
              {errors.color && (
                <p className="text-sm text-destructive">{errors.color.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Owner Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Owner Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ownerName">
              Owner Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ownerName"
              {...register('ownerName')}
              placeholder="e.g., John Doe"
              className={errors.ownerName ? 'border-destructive' : ''}
              disabled={isSubmitting || loading}
            />
            {errors.ownerName && (
              <p className="text-sm text-destructive">{errors.ownerName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Email</Label>
              <Input
                id="ownerEmail"
                type="email"
                {...register('ownerEmail')}
                placeholder="e.g., john.doe@email.com"
                className={errors.ownerEmail ? 'border-destructive' : ''}
                disabled={isSubmitting || loading}
              />
              {errors.ownerEmail && (
                <p className="text-sm text-destructive">{errors.ownerEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerPhone">Phone Number</Label>
              <Input
                id="ownerPhone"
                type="tel"
                {...register('ownerPhone')}
                placeholder="e.g., +1 (555) 123-4567"
                className={errors.ownerPhone ? 'border-destructive' : ''}
                disabled={isSubmitting || loading}
              />
              {errors.ownerPhone && (
                <p className="text-sm text-destructive">{errors.ownerPhone.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watchedStatus}
                onValueChange={(value: VehicleStatus) => setValue('status', value)}
                disabled={isSubmitting || loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicleStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div>
                        <div className="font-medium">{status.label}</div>
                        <div className="text-sm text-muted-foreground">{status.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Special Requirements</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any special requirements or notes about this vehicle..."
              rows={3}
              className={errors.notes ? 'border-destructive' : ''}
              disabled={isSubmitting || loading}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!isValid || isSubmitting || loading}
        >
          {(isSubmitting || loading) && <Spinner size="sm" className="mr-2" />}
          {isEditing ? 'Update Vehicle' : 'Add Vehicle'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default VehicleForm
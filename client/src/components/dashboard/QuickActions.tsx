import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiService } from '@/services/api'

interface QuickCheckInModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const QuickCheckInModal: React.FC<QuickCheckInModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [licensePlate, setLicensePlate] = useState('')
  const [garageId, setGarageId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [garages, setGarages] = useState<{ id: string; name: string; isActive: boolean; availableSpots: number }[]>([])

  React.useEffect(() => {
    if (isOpen) {
      fetchGarages()
    }
  }, [isOpen])

  const fetchGarages = async () => {
    try {
      const response = await apiService.getGarages()
      if (response.success) {
        setGarages(response.data.filter(g => g.isActive))
      }
    } catch (err) {
      console.error('Failed to fetch garages:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licensePlate.trim() || !garageId) return

    setIsLoading(true)
    setError(null)

    try {
      // First, try to find the vehicle
      const vehicleResponse = await apiService.searchVehicles(licensePlate.trim())
      
      let vehicleId: string
      if (vehicleResponse.success && vehicleResponse.data.length > 0) {
        vehicleId = vehicleResponse.data[0].id
      } else {
        // Create a new vehicle (simplified - in real app, you'd collect more info)
        const newVehicle = await apiService.createVehicle({
          licensePlate: licensePlate.trim().toUpperCase(),
          make: 'Unknown',
          model: 'Unknown',
          color: 'Unknown',
          ownerId: 'guest' // In real app, this would be the current user
        })
        
        if (!newVehicle.success) {
          throw new Error('Failed to register vehicle')
        }
        vehicleId = newVehicle.data.id
      }

      // Start parking session
      const sessionResponse = await apiService.startSession({
        garageId,
        vehicleId
      })

      if (!sessionResponse.success) {
        throw new Error('Failed to start parking session')
      }

      onSuccess()
      onClose()
      setLicensePlate('')
      setGarageId('')
    } catch (err) {
      console.error('Quick check-in error:', err)
      setError(err instanceof Error ? err.message : 'Failed to check in')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Quick Check-In</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              License Plate
            </label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ABC-1234"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Garage
            </label>
            <select
              value={garageId}
              onChange={(e) => setGarageId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a garage</option>
              {garages.map(garage => (
                <option key={garage.id} value={garage.id}>
                  {garage.name} ({garage.availableSpots} spots available)
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Checking In...' : 'Check In'}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const QuickActions: React.FC = () => {
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [, forceUpdate] = useState(0)

  const handleQuickCheckInSuccess = () => {
    // Force a re-render to update dashboard data
    forceUpdate(prev => prev + 1)
  }

  const actions = [
    {
      label: 'Quick Check-In',
      icon: '🚗',
      description: 'Check in a vehicle quickly',
      onClick: () => setShowCheckInModal(true),
      variant: 'default' as const
    },
    {
      label: 'View All Vehicles',
      icon: '📋',
      description: 'See all parked vehicles',
      onClick: () => window.location.href = '/vehicles',
      variant: 'outline' as const
    },
    {
      label: 'Generate Reports',
      icon: '📈',
      description: 'Create analytics reports',
      onClick: () => window.location.href = '/reports',
      variant: 'outline' as const
    },
    {
      label: 'Manage Spots',
      icon: '⚙️',
      description: 'Configure parking spots',
      onClick: () => window.location.href = '/spots',
      variant: 'outline' as const
    }
  ]

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant}
                onClick={action.onClick}
                className="h-auto p-4 flex flex-col items-center space-y-2 text-left"
              >
                <div className="text-2xl">{action.icon}</div>
                <div className="text-sm font-medium">{action.label}</div>
                <div className="text-xs text-muted-foreground text-center">
                  {action.description}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <QuickCheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onSuccess={handleQuickCheckInSuccess}
      />
    </>
  )
}

export default QuickActions
import React from 'react'
import { VehicleManagement } from '@/components/vehicles'

/**
 * Vehicles Page Component
 * 
 * This is the main page component for vehicle management in the parking garage system.
 * It wraps the VehicleManagement component and provides the complete vehicle management interface.
 */
const VehiclesPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <VehicleManagement className="w-full" />
    </div>
  )
}

export default VehiclesPage
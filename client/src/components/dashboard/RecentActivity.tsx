import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ParkingSession } from '@/types/api'
import { apiService } from '@/services/api'

interface RecentActivityProps {
  sessions: ParkingSession[]
}

interface EnhancedSession extends ParkingSession {
  vehicleInfo?: {
    licensePlate: string
    make: string
    model: string
    color: string
  }
  spotInfo?: {
    spotNumber: string
    floor: number
  }
  garageInfo?: {
    name: string
  }
}

const RecentActivity: React.FC<RecentActivityProps> = ({ sessions }) => {
  const [enhancedSessions, setEnhancedSessions] = useState<EnhancedSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(Date.now())

  const enhanceSessionsWithDetails = async (sessionList: ParkingSession[]) => {
    try {
      const enhanced = await Promise.all(
        sessionList.map(async (session) => {
          const [vehicleRes, spotRes, garageRes] = await Promise.allSettled([
            apiService.getVehicleById(session.vehicleId),
            apiService.getSpotById(session.spotId),
            apiService.getGarageById(session.garageId)
          ])

          const enhancedSession: EnhancedSession = { ...session }

          if (vehicleRes.status === 'fulfilled' && vehicleRes.value.success) {
            const vehicle = vehicleRes.value.data
            enhancedSession.vehicleInfo = {
              licensePlate: vehicle.licensePlate,
              make: vehicle.make,
              model: vehicle.model,
              color: vehicle.color
            }
          }

          if (spotRes.status === 'fulfilled' && spotRes.value.success) {
            const spot = spotRes.value.data
            enhancedSession.spotInfo = {
              spotNumber: spot.spotNumber,
              floor: spot.floor
            }
          }

          if (garageRes.status === 'fulfilled' && garageRes.value.success) {
            const garage = garageRes.value.data
            enhancedSession.garageInfo = {
              name: garage.name
            }
          }

          return enhancedSession
        })
      )

      setEnhancedSessions(enhanced)
    } catch (error) {
      console.error('Error enhancing sessions:', error)
      // Fallback to basic sessions
      setEnhancedSessions(sessionList.map(s => ({ ...s })))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (sessions.length > 0) {
      enhanceSessionsWithDetails(sessions)
      setLastUpdate(Date.now())
    } else {
      setIsLoading(false)
    }
  }, [sessions])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getActivityIcon = (session: EnhancedSession) => {
    if (session.status === 'completed') {
      return '🚙' // Check-out
    }
    return '🚗' // Check-in
  }

  const getActivityColor = (session: EnhancedSession) => {
    if (session.status === 'completed') {
      return 'text-red-600 bg-red-50'
    }
    if (session.status === 'active') {
      return 'text-green-600 bg-green-50'
    }
    return 'text-gray-600 bg-gray-50'
  }

  const getActivityDescription = (session: EnhancedSession) => {
    const vehicle = session.vehicleInfo?.licensePlate || `Vehicle ${session.vehicleId.slice(-4)}`
    const spot = session.spotInfo?.spotNumber || `Spot ${session.spotId.slice(-4)}`
    const garage = session.garageInfo?.name || 'Garage'

    if (session.status === 'completed') {
      return `${vehicle} checked out from ${spot} at ${garage}`
    }
    return `${vehicle} checked in to ${spot} at ${garage}`
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span>Updated {formatTime(new Date(lastUpdate).toISOString())}</span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : enhancedSessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">📋</div>
            <div>No recent activity</div>
            <div className="text-xs">Check-ins and check-outs will appear here</div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {enhancedSessions.map((session) => {
              const timestamp = session.exitTime || session.entryTime
              return (
                <div key={session.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${getActivityColor(session)}`}>
                    {getActivityIcon(session)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {getActivityDescription(session)}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                      {session.vehicleInfo && (
                        <span>
                          {session.vehicleInfo.make} {session.vehicleInfo.model} 
                          <span className="ml-1 text-gray-400">({session.vehicleInfo.color})</span>
                        </span>
                      )}
                      {session.spotInfo && (
                        <span>Floor {session.spotInfo.floor}</span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        session.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        session.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(timestamp)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RecentActivity
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { socketService } from '@/services'
import type { SpotUpdate, GarageStatusUpdate } from '@/types/api'

interface SocketContextValue {
  isConnected: boolean
  joinGarage: (garageId: string) => void
  leaveGarage: (garageId: string) => void
  onSpotUpdate: (callback: (update: SpotUpdate) => void) => void
  onGarageStatusUpdate: (callback: (update: GarageStatusUpdate) => void) => void
  offSpotUpdate: (callback?: (update: SpotUpdate) => void) => void
  offGarageStatusUpdate: (callback?: (update: GarageStatusUpdate) => void) => void
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined)

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Connect to socket when provider mounts
    socketService.connect()

    // Set up connection status listener
    socketService.on('connect', () => setIsConnected(true))
    socketService.on('disconnect', () => setIsConnected(false))

    // Check initial connection status
    setIsConnected(socketService.isConnected())

    // Cleanup on unmount
    return () => {
      socketService.disconnect()
    }
  }, [])

  const joinGarage = (garageId: string) => {
    socketService.joinGarage(garageId)
  }

  const leaveGarage = (garageId: string) => {
    socketService.leaveGarage(garageId)
  }

  const onSpotUpdate = (callback: (update: SpotUpdate) => void) => {
    socketService.onSpotUpdate(callback)
  }

  const onGarageStatusUpdate = (callback: (update: GarageStatusUpdate) => void) => {
    socketService.onGarageStatusUpdate(callback)
  }

  const offSpotUpdate = (callback?: (update: SpotUpdate) => void) => {
    socketService.off('spot:updated', callback)
  }

  const offGarageStatusUpdate = (callback?: (update: GarageStatusUpdate) => void) => {
    socketService.off('garage:status', callback)
  }

  const value: SocketContextValue = {
    isConnected,
    joinGarage,
    leaveGarage,
    onSpotUpdate,
    onGarageStatusUpdate,
    offSpotUpdate,
    offGarageStatusUpdate,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
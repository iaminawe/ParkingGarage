import { io, Socket } from 'socket.io-client'
import type { SpotUpdate, GarageStatusUpdate } from '@/types/api'

class SocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map()

  connect(): void {
    if (this.socket?.connected) return

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      retries: 3,
    })

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server')
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server')
    })

    this.socket.on('error', (error: Error) => {
      console.error('Socket error:', error)
    })

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error)
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  // Generic event listeners
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.socket) {
      console.warn('Socket not connected. Call connect() first.')
      return
    }

    this.socket.on(event, callback)
    
    // Store callback for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)?.push(callback)
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (!this.socket) return

    if (callback) {
      this.socket.off(event, callback)
      
      // Remove from stored listeners
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        const index = eventListeners.indexOf(callback)
        if (index > -1) {
          eventListeners.splice(index, 1)
        }
      }
    } else {
      this.socket.off(event)
      this.listeners.delete(event)
    }
  }

  emit(event: string, data?: any): void {
    if (!this.socket) {
      console.warn('Socket not connected. Call connect() first.')
      return
    }

    this.socket.emit(event, data)
  }

  // Parking-specific methods
  joinGarage(garageId: string): void {
    this.emit('join:garage', { garageId })
  }

  leaveGarage(garageId: string): void {
    this.emit('leave:garage', { garageId })
  }

  onSpotUpdate(callback: (update: SpotUpdate) => void): void {
    this.on('spot:updated', callback)
  }

  onGarageStatusUpdate(callback: (update: GarageStatusUpdate) => void): void {
    this.on('garage:status', callback)
  }

  onSessionStart(callback: (sessionData: any) => void): void {
    this.on('session:started', callback)
  }

  onSessionEnd(callback: (sessionData: any) => void): void {
    this.on('session:ended', callback)
  }

  // Admin/operator specific events
  onEmergencyAlert(callback: (alert: any) => void): void {
    this.on('emergency:alert', callback)
  }

  onSystemNotification(callback: (notification: any) => void): void {
    this.on('system:notification', callback)
  }

  // Utility methods
  removeAllListeners(): void {
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket?.off(event, callback)
      })
    })
    this.listeners.clear()
  }
}

export const socketService = new SocketService()
export default socketService
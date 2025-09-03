import { io, Socket } from 'socket.io-client'
import type { SpotUpdate, GarageStatusUpdate } from '@/types/api'

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

class SocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Array<(...args: unknown[]) => void>> = new Map()
  private connectionStatus: ConnectionStatus = 'disconnected'
  private statusCallbacks: Array<(status: ConnectionStatus) => void> = []

  connect(): void {
    if (this.socket?.connected) return

    this.setConnectionStatus('connecting')

    // Fix: Use correct fallback port 8742 instead of 5000
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 
      import.meta.env.VITE_API_URL?.replace('/api', '') || 
      'http://localhost:8742'
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      retries: 3,
      // Add reconnection settings
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      reconnectionDelayMax: 5000,
      // Enable exponential backoff
      randomizationFactor: 0.5,
    })

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server at', socketUrl)
      this.setConnectionStatus('connected')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason)
      this.setConnectionStatus('disconnected')
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to WebSocket server (attempt', attemptNumber + ')')
      this.setConnectionStatus('connected')
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('⏳ Attempting to reconnect...', attemptNumber)
      this.setConnectionStatus('connecting')
    })

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to WebSocket server')
      this.setConnectionStatus('error')
    })

    this.socket.on('error', (error: Error) => {
      console.error('❌ Socket error:', error)
      this.setConnectionStatus('error')
    })

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Socket connection error:', error.message)
      this.setConnectionStatus('error')
    })
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status
      this.statusCallbacks.forEach(callback => callback(status))
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
      this.statusCallbacks = []
      this.setConnectionStatus('disconnected')
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.statusCallbacks.push(callback)
  }

  offConnectionStatusChange(callback: (status: ConnectionStatus) => void): void {
    const index = this.statusCallbacks.indexOf(callback)
    if (index > -1) {
      this.statusCallbacks.splice(index, 1)
    }
  }

  // Generic event listeners
  on(event: string, callback: (...args: unknown[]) => void): void {
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

  off(event: string, callback?: (...args: unknown[]) => void): void {
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

  emit(event: string, data?: unknown): void {
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

  onSessionStart(callback: (sessionData: unknown) => void): void {
    this.on('session:started', callback)
  }

  onSessionEnd(callback: (sessionData: unknown) => void): void {
    this.on('session:ended', callback)
  }

  // Admin/operator specific events
  onEmergencyAlert(callback: (alert: unknown) => void): void {
    this.on('emergency:alert', callback)
  }

  onSystemNotification(callback: (notification: unknown) => void): void {
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
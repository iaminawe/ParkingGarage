/**
 * Type-safe Socket.IO server registry
 * Replaces unsafe global.io assignment with proper singleton pattern
 */

import type { TypedSocketIOServer, SocketIORegistry } from '../types/server';

/**
 * Thread-safe Socket.IO server registry
 * Provides type-safe access to Socket.IO server instance across modules
 */
class SocketIORegistryImpl implements SocketIORegistry {
  private static instance: SocketIORegistryImpl;
  private socketServer: TypedSocketIOServer | null = null;

  private constructor() {}

  /**
   * Get singleton instance of the registry
   */
  public static getInstance(): SocketIORegistryImpl {
    if (!SocketIORegistryImpl.instance) {
      SocketIORegistryImpl.instance = new SocketIORegistryImpl();
    }
    return SocketIORegistryImpl.instance;
  }

  /**
   * Get the Socket.IO server instance
   */
  public getInstance(): TypedSocketIOServer | null {
    return this.socketServer;
  }

  /**
   * Set the Socket.IO server instance
   * Should only be called during server initialization
   */
  public setInstance(server: TypedSocketIOServer): void {
    if (this.socketServer) {
      console.warn('⚠️  Socket.IO server instance already set. Overwriting existing instance.');
    }
    this.socketServer = server;
  }

  /**
   * Clear the Socket.IO server instance
   * Should be called during graceful shutdown
   */
  public clearInstance(): void {
    this.socketServer = null;
  }

  /**
   * Check if Socket.IO server is available
   */
  public isAvailable(): boolean {
    return this.socketServer !== null;
  }

  /**
   * Get server instance or throw error if not available
   */
  public getInstanceOrThrow(): TypedSocketIOServer {
    if (!this.socketServer) {
      throw new Error('Socket.IO server not initialized. Call setInstance() first.');
    }
    return this.socketServer;
  }

  /**
   * Emit event to all connected clients
   */
  public emit(event: string, data?: any): boolean {
    if (!this.socketServer) {
      console.error('❌ Cannot emit Socket.IO event: server not initialized');
      return false;
    }
    
    this.socketServer.emit(event, data);
    return true;
  }

  /**
   * Emit event to specific room
   */
  public emitToRoom(room: string, event: string, data?: any): boolean {
    if (!this.socketServer) {
      console.error('❌ Cannot emit Socket.IO event to room: server not initialized');
      return false;
    }
    
    this.socketServer.to(room).emit(event, data);
    return true;
  }

  /**
   * Get current connection count
   */
  public getConnectionCount(): number {
    if (!this.socketServer) {
      return 0;
    }
    
    return this.socketServer.engine.clientsCount;
  }

  /**
   * Get server statistics
   */
  public getStats(): {
    connected: number;
    rooms: string[];
    isInitialized: boolean;
  } {
    if (!this.socketServer) {
      return {
        connected: 0,
        rooms: [],
        isInitialized: false,
      };
    }

    return {
      connected: this.socketServer.engine.clientsCount,
      rooms: Array.from(this.socketServer.sockets.adapter.rooms.keys()),
      isInitialized: true,
    };
  }
}

// Export singleton instance
export const socketIORegistry = SocketIORegistryImpl.getInstance();

// Export type for dependency injection
export type { SocketIORegistry };
/**
 * Socket Service - Real-time communication management via Socket.IO
 *
 * This service manages Socket.IO server lifecycle, room management for garage operations,
 * and type-safe real-time communication events. Replaces global variable pattern
 * with proper service injection and singleton architecture.
 *
 * @example
 * ```typescript
 * // Before (❌ Global variable anti-pattern):
 * (global as any).io = io;
 * const io = (global as any).io;
 * io.emit('event', data);
 * 
 * // After (✅ Service injection pattern):
 * import { getSocketService } from '../server';
 * const socketService = getSocketService();
 * await socketService.emitSpotUpdate(spotId, updateData);
 * ```
 *
 * @module SocketService
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createLogger } from '../utils/logger';
import type { IAdapterLogger } from '../adapters/interfaces/BaseAdapter';
import {
  WebSocketMessage,
  SpotStatusUpdateMessage,
  VehicleEventMessage,
  VehicleRecord,
  SpotRecord
} from '../types/api';
import type {
  TypedSocketIOServer,
  TypedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData
} from '../types/server';

/**
 * Socket service configuration options
 */
export interface SocketConfig {
  cors?: {
    origin?: string[] | string;
    methods?: string[];
    credentials?: boolean;
  };
  transports?: ('websocket' | 'polling')[];
  connectionTimeout?: number;
  pingTimeout?: number;
  pingInterval?: number;
  enableLogging?: boolean;
}

/**
 * Socket connection statistics
 */
export interface SocketStats {
  totalConnections: number;
  activeConnections: number;
  totalRooms: number;
  activeRooms: string[];
  uptime: number;
  messagesEmitted: number;
  messagesReceived: number;
  lastActivity: Date | null;
}

/**
 * Socket event handlers interface
 */
export interface SocketEventHandlers {
  onConnect?: (socket: TypedSocket) => void;
  onDisconnect?: (socket: TypedSocket, reason: string) => void;
  onJoinGarage?: (socket: TypedSocket, data: { garageId: string }) => void;
  onLeaveGarage?: (socket: TypedSocket, data: { garageId: string }) => void;
  onError?: (socket: TypedSocket, error: Error) => void;
}

/**
 * Room management interface for garage operations
 */
export interface IRoomManager {
  joinRoom(socketId: string, room: string): Promise<void>;
  leaveRoom(socketId: string, room: string): Promise<void>;
  emitToRoom(room: string, event: string, data: unknown): Promise<void>;
  getRoomSockets(room: string): Promise<string[]>;
  getRoomCount(room: string): Promise<number>;
  getAllRooms(): Promise<string[]>;
}

/**
 * Socket service interface for type-safe operations
 */
export interface ISocketService extends IRoomManager {
  initialize(server: HttpServer): Promise<void>;
  shutdown(): Promise<void>;
  isInitialized(): boolean;
  getStats(): SocketStats;
  emitSpotUpdate(spotId: string, update: SpotStatusUpdateMessage): Promise<void>;
  emitVehicleEvent(garageId: string, event: VehicleEventMessage): Promise<void>;
  emitGarageStatsUpdate(garageId: string, stats: unknown): Promise<void>;
  emitSystemNotification(message: string, level?: 'info' | 'warning' | 'error'): Promise<void>;
  emitEmergencyAlert(garageId: string, alert: unknown): Promise<void>;
  broadcastToAll(event: string, data: unknown): Promise<void>;
  setEventHandlers(handlers: Partial<SocketEventHandlers>): void;
  addShutdownHandler(handler: () => Promise<void>): void;
}

/**
 * Central Socket.IO service for managing real-time communications
 */
export class SocketService implements ISocketService {
  private static instance: SocketService;
  private io: TypedSocketIOServer | null = null;
  private logger: IAdapterLogger;
  private config: Required<SocketConfig>;
  private isInitializedFlag = false;
  private startTime: Date | null = null;
  private lastActivity: Date | null = null;
  private stats: {
    totalConnections: number;
    activeConnections: number;
    messagesEmitted: number;
    messagesReceived: number;
  } = {
    totalConnections: 0,
    activeConnections: 0,
    messagesEmitted: 0,
    messagesReceived: 0,
  };
  private eventHandlers: Partial<SocketEventHandlers> = {};
  private shutdownHandlers: (() => Promise<void>)[] = [];

  constructor(config: SocketConfig = {}) {
    this.logger = createLogger('SocketService');
    this.config = {
      cors: config.cors || {
        origin: [
          'http://localhost:3000',
          'http://localhost:4285',
          'http://127.0.0.1:4285',
          'http://127.0.0.1:9000',
          'http://localhost:9000',
        ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: config.transports || ['websocket', 'polling'],
      connectionTimeout: config.connectionTimeout || 10000,
      pingTimeout: config.pingTimeout || 60000,
      pingInterval: config.pingInterval || 25000,
      enableLogging: config.enableLogging || false,
    };

    this.setupGracefulShutdown();
  }

  /**
   * Get singleton instance of SocketService
   */
  static getInstance(config?: SocketConfig): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService(config);
    }
    return SocketService.instance;
  }

  /**
   * Initialize Socket.IO server with HTTP server
   */
  async initialize(server: HttpServer): Promise<void> {
    if (this.io) {
      this.logger.warn('Socket service already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Socket.IO server...');

      // Initialize Socket.IO server with configuration  
      this.io = new SocketIOServer(server, {
        cors: this.config.cors,
        transports: this.config.transports,
        connectTimeout: this.config.connectionTimeout,
        pingTimeout: this.config.pingTimeout,
        pingInterval: this.config.pingInterval,
      });

      // Set up event handlers
      this.setupEventHandlers();
      
      this.isInitializedFlag = true;
      this.startTime = new Date();

      this.logger.info('Socket.IO server initialized successfully', {
        transports: this.config.transports,
        cors: this.config.cors.origin,
      });
    } catch (error) {
      this.logger.error('Failed to initialize Socket service', error as Error);
      throw error;
    }
  }

  /**
   * Set up Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) {
      throw new Error('Socket service not initialized');
    }

    this.io.on('connection', (socket: TypedSocket) => {
      this.stats.totalConnections++;
      this.stats.activeConnections++;
      this.lastActivity = new Date();

      this.logger.info(`Client connected: ${socket.id}`, {
        totalConnections: this.stats.totalConnections,
        activeConnections: this.stats.activeConnections,
      });

      // Call custom connect handler if provided
      if (this.eventHandlers.onConnect) {
        this.eventHandlers.onConnect(socket);
      }

      // Handle garage room joining
      socket.on('join:garage', async (data: { garageId: string }) => {
        try {
          const room = `garage:${data.garageId}`;
          await socket.join(room);
          this.logger.debug(`Client ${socket.id} joined ${room}`);

          if (this.eventHandlers.onJoinGarage) {
            this.eventHandlers.onJoinGarage(socket, data);
          }
        } catch (error) {
          this.logger.error('Error joining garage room', error as Error, {
            socketId: socket.id,
            garageId: data.garageId,
          });
        }
      });

      // Handle garage room leaving
      socket.on('leave:garage', async (data: { garageId: string }) => {
        try {
          const room = `garage:${data.garageId}`;
          await socket.leave(room);
          this.logger.debug(`Client ${socket.id} left ${room}`);

          if (this.eventHandlers.onLeaveGarage) {
            this.eventHandlers.onLeaveGarage(socket, data);
          }
        } catch (error) {
          this.logger.error('Error leaving garage room', error as Error, {
            socketId: socket.id,
            garageId: data.garageId,
          });
        }
      });

      // Handle generic message events for stats tracking
      socket.onAny(() => {
        this.stats.messagesReceived++;
        this.lastActivity = new Date();
      });

      // Handle disconnection
      socket.on('disconnect', (reason: string) => {
        this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);
        this.lastActivity = new Date();

        this.logger.info(`Client disconnected: ${socket.id}`, {
          reason,
          activeConnections: this.stats.activeConnections,
        });

        if (this.eventHandlers.onDisconnect) {
          this.eventHandlers.onDisconnect(socket, reason);
        }
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        this.logger.error('Socket error', error, {
          socketId: socket.id,
        });

        if (this.eventHandlers.onError) {
          this.eventHandlers.onError(socket, error);
        }
      });
    });
  }

  /**
   * Check if socket service is initialized
   */
  isInitialized(): boolean {
    return this.isInitializedFlag && this.io !== null;
  }

  /**
   * Join a socket to a room
   */
  async joinRoom(socketId: string, room: string): Promise<void> {
    if (!this.io) {
      throw new Error('Socket service not initialized');
    }

    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      await socket.join(room);
      this.logger.debug(`Socket ${socketId} joined room ${room}`);
    } else {
      this.logger.warn(`Socket ${socketId} not found for room join`);
    }
  }

  /**
   * Remove a socket from a room
   */
  async leaveRoom(socketId: string, room: string): Promise<void> {
    if (!this.io) {
      throw new Error('Socket service not initialized');
    }

    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      await socket.leave(room);
      this.logger.debug(`Socket ${socketId} left room ${room}`);
    } else {
      this.logger.warn(`Socket ${socketId} not found for room leave`);
    }
  }

  /**
   * Emit event to all sockets in a room
   */
  async emitToRoom(room: string, event: string, data: unknown): Promise<void> {
    if (!this.io) {
      throw new Error('Socket service not initialized');
    }

    this.io.to(room).emit(event, data);
    this.stats.messagesEmitted++;
    this.lastActivity = new Date();

    this.logger.debug(`Emitted ${event} to room ${room}`, {
      room,
      event,
      messagesEmitted: this.stats.messagesEmitted,
    });
  }

  /**
   * Get list of socket IDs in a room
   */
  async getRoomSockets(room: string): Promise<string[]> {
    if (!this.io) {
      throw new Error('Socket service not initialized');
    }

    const sockets = await this.io.in(room).fetchSockets();
    return sockets.map(socket => socket.id);
  }

  /**
   * Get number of sockets in a room
   */
  async getRoomCount(room: string): Promise<number> {
    if (!this.io) {
      throw new Error('Socket service not initialized');
    }

    const sockets = await this.io.in(room).fetchSockets();
    return sockets.length;
  }

  /**
   * Get all active rooms
   */
  async getAllRooms(): Promise<string[]> {
    if (!this.io) {
      throw new Error('Socket service not initialized');
    }

    const rooms = Array.from(this.io.sockets.adapter.rooms.keys());
    // Filter out socket IDs (which are also stored as rooms)
    return rooms.filter(room => !this.io!.sockets.sockets.has(room));
  }

  /**
   * Emit spot status update to relevant clients
   */
  async emitSpotUpdate(spotId: string, update: SpotStatusUpdateMessage): Promise<void> {
    const message: WebSocketMessage<SpotStatusUpdateMessage> = {
      type: 'spot_status_change',
      data: update,
      timestamp: new Date().toISOString(),
    };

    // Emit to all connected clients (could be refined to specific garage room)
    await this.broadcastToAll('spot:updated', message);
    this.logger.debug('Spot update emitted', { spotId, update });
  }

  /**
   * Emit vehicle event (check-in/check-out) to garage clients
   */
  async emitVehicleEvent(garageId: string, event: VehicleEventMessage): Promise<void> {
    const message: WebSocketMessage<VehicleEventMessage> = {
      type: event.event === 'checkin' ? 'vehicle_checkin' : 'vehicle_checkout',
      data: event,
      timestamp: new Date().toISOString(),
    };

    const room = `garage:${garageId}`;
    await this.emitToRoom(room, event.event === 'checkin' ? 'session:started' : 'session:ended', message);
    this.logger.debug('Vehicle event emitted', { garageId, event: event.event });
  }

  /**
   * Emit garage statistics update to clients
   */
  async emitGarageStatsUpdate(garageId: string, stats: unknown): Promise<void> {
    const message: WebSocketMessage = {
      type: 'garage_stats_update',
      data: stats,
      timestamp: new Date().toISOString(),
    };

    const room = `garage:${garageId}`;
    await this.emitToRoom(room, 'garage:status', message);
    this.logger.debug('Garage stats update emitted', { garageId });
  }

  /**
   * Emit system notification to all clients
   */
  async emitSystemNotification(message: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    const notification = {
      message,
      level,
      timestamp: new Date().toISOString(),
    };

    await this.broadcastToAll('system:notification', notification);
    this.logger.debug('System notification emitted', { message, level });
  }

  /**
   * Emit emergency alert to garage clients
   */
  async emitEmergencyAlert(garageId: string, alert: unknown): Promise<void> {
    const emergencyAlert = {
      garageId,
      alert,
      timestamp: new Date().toISOString(),
    };

    const room = `garage:${garageId}`;
    await this.emitToRoom(room, 'emergency:alert', emergencyAlert);
    this.logger.info('Emergency alert emitted', { garageId });
  }

  /**
   * Broadcast event to all connected clients
   */
  async broadcastToAll(event: string, data: unknown): Promise<void> {
    if (!this.io) {
      throw new Error('Socket service not initialized');
    }

    this.io.emit(event, data);
    this.stats.messagesEmitted++;
    this.lastActivity = new Date();

    this.logger.debug(`Broadcasted ${event} to all clients`, {
      event,
      activeConnections: this.stats.activeConnections,
    });
  }

  /**
   * Set custom event handlers
   */
  setEventHandlers(handlers: Partial<SocketEventHandlers>): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
    this.logger.debug('Event handlers updated', {
      handlers: Object.keys(handlers),
    });
  }

  /**
   * Get socket service statistics
   */
  getStats(): SocketStats {
    return {
      totalConnections: this.stats.totalConnections,
      activeConnections: this.stats.activeConnections,
      totalRooms: this.io ? this.io.sockets.adapter.rooms.size : 0,
      activeRooms: this.io ? Array.from(this.io.sockets.adapter.rooms.keys())
        .filter(room => !this.io!.sockets.sockets.has(room)) : [],
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      messagesEmitted: this.stats.messagesEmitted,
      messagesReceived: this.stats.messagesReceived,
      lastActivity: this.lastActivity,
    };
  }

  /**
   * Add shutdown handler
   */
  addShutdownHandler(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Remove shutdown handler
   */
  removeShutdownHandler(handler: () => Promise<void>): void {
    const index = this.shutdownHandlers.indexOf(handler);
    if (index > -1) {
      this.shutdownHandlers.splice(index, 1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Initiating Socket service shutdown...');

    try {
      // Execute shutdown handlers
      for (const handler of this.shutdownHandlers) {
        try {
          await handler();
        } catch (error) {
          this.logger.error('Shutdown handler error', error as Error);
        }
      }

      if (this.io) {
        // Notify all connected clients about shutdown
        await this.emitSystemNotification('Server is shutting down', 'info');
        
        // Give clients time to receive the message
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Close all connections
        this.io.close();
        this.io = null;
      }

      this.isInitializedFlag = false;
      this.logger.info('Socket service shutdown completed');
    } catch (error) {
      this.logger.error('Error during Socket service shutdown', error as Error);
      throw error;
    }
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, initiating graceful shutdown...`);

      try {
        await this.shutdown();
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during graceful shutdown', error as Error);
        process.exit(1);
      }
    };

    // Note: We don't add process handlers here to avoid conflicts with DatabaseService
    // Let DatabaseService handle process signals and call our shutdown method
  }

  /**
   * Reset singleton instance (for testing)
   */
  static reset(): void {
    SocketService.instance = null as any;
  }
}

export default SocketService;
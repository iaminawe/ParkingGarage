/**
 * Server-specific type definitions for type-safe server.ts
 * Provides interfaces for Socket.IO, configuration, and server management
 */

import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { Express } from 'express';

/**
 * Server configuration interface
 */
export interface ServerConfig {
  readonly port: number;
  readonly host: string;
  readonly nodeEnv: string;
  readonly clientOrigins: string[];
}

/**
 * Socket.IO CORS configuration
 */
export interface SocketCorsConfig {
  origin: string[];
  methods: string[];
  credentials: boolean;
}

/**
 * Socket.IO server configuration
 */
export interface SocketIOConfig {
  cors: SocketCorsConfig;
  transports: string[];
}

/**
 * Client-to-Server Socket.IO events interface
 */
export interface ClientToServerEvents {
  'join:garage': (data: { garageId: string }) => void;
  'leave:garage': (data: { garageId: string }) => void;
}

/**
 * Server-to-Client Socket.IO events interface
 */
export interface ServerToClientEvents {
  'garage:updated': (data: { garageId: string; stats: any }) => void;
  'garage:status': (data: any) => void;
  'spot:occupied': (data: { garageId: string; spotId: string }) => void;
  'spot:available': (data: { garageId: string; spotId: string }) => void;
  'spot:updated': (data: any) => void;
  'session:started': (data: any) => void;
  'session:ended': (data: any) => void;
  'emergency:alert': (data: any) => void;
  'system:notification': (data: any) => void;
  'server:shutdown': (data: { message: string; timestamp: string }) => void;
  // Allow any string event for flexibility
  [event: string]: (...args: any[]) => void;
}

/**
 * Inter-server Socket.IO events interface
 */
export interface InterServerEvents {
  ping: () => void;
}

/**
 * Socket data interface for typed socket sessions
 */
export interface SocketData {
  userId?: string;
  sessionId?: string;
  connectedGarages: Set<string>;
}

/**
 * Typed Socket.IO server
 */
export type TypedSocketIOServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Typed Socket.IO socket
 */
export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Socket.IO server instance interface
 */
export interface ServerInstances {
  httpServer: HTTPServer;
  socketServer: TypedSocketIOServer;
  app: Express;
}

/**
 * Graceful shutdown configuration
 */
export interface ShutdownConfig {
  readonly gracefulShutdownTimeout: number;
  readonly forceShutdownTimeout: number;
}

/**
 * Process signal types for shutdown handlers
 */
export type ProcessSignal = 'SIGTERM' | 'SIGINT' | 'SIGUSR1' | 'SIGUSR2';

/**
 * Shutdown handler function type
 */
export type ShutdownHandler = (signal: ProcessSignal) => void;

/**
 * Error handler for uncaught exceptions and unhandled rejections
 */
export interface ProcessErrorHandlers {
  uncaughtException: (error: Error) => void;
  unhandledRejection: (reason: unknown, promise: Promise<unknown>) => void;
}

/**
 * Server startup result
 */
export interface ServerStartupResult {
  server: HTTPServer;
  socketServer: TypedSocketIOServer;
  config: ServerConfig;
}

/**
 * Socket.IO registry interface for sharing instances
 */
export interface SocketIORegistry {
  getInstance(): TypedSocketIOServer | null;
  setInstance(server: TypedSocketIOServer): void;
  clearInstance(): void;
}

/**
 * SeedData module interface to replace require()
 */
export interface SeedDataModule {
  initialize(): Promise<void>;
  reset?(): Promise<void>;
  isInitialized?(): boolean;
}

/**
 * Node.js error with errno code
 */
export interface NodeError extends Error {
  code?: string;
  errno?: number;
  path?: string;
  syscall?: string;
}

/**
 * Server health check response
 */
export interface ServerHealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

/**
 * Environment configuration with strict typing
 */
export interface ServerEnvironment {
  readonly PORT: number;
  readonly HOST: string;
  readonly NODE_ENV: string;
  readonly CLIENT_ORIGIN?: string;
}
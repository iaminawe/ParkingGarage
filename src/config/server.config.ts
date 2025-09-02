/**
 * Server Configuration Module
 * Centralized configuration management with type safety and validation
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment types
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * Server configuration interface
 */
export interface ServerConfig {
  /** Server port number */
  port: number;
  /** Server host address */
  host: string;
  /** Current environment */
  environment: Environment;
  /** Whether running in development mode */
  isDevelopment: boolean;
  /** Whether running in production mode */
  isProduction: boolean;
  /** Whether running in test mode */
  isTest: boolean;
  /** Socket.IO CORS configuration */
  cors: {
    origin: string[];
    methods: string[];
    credentials: boolean;
  };
  /** Socket.IO transport methods */
  transports: string[];
  /** Graceful shutdown timeout in milliseconds */
  shutdownTimeout: number;
}

/**
 * Parse and validate environment variable as integer
 */
function parseInteger(value: string | undefined, defaultValue: number, name: string): number {
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`⚠️  Invalid ${name}: "${value}". Using default: ${defaultValue}`);
    return defaultValue;
  }
  
  return parsed;
}

/**
 * Parse and validate environment
 */
function parseEnvironment(value: string | undefined): Environment {
  const env = (value || 'development').toLowerCase();
  if (env === 'production' || env === 'test' || env === 'development') {
    return env as Environment;
  }
  
  console.warn(`⚠️  Invalid NODE_ENV: "${value}". Using default: development`);
  return 'development';
}

/**
 * Parse CORS origins from environment variable
 */
function parseCorsOrigins(value: string | undefined): string[] {
  if (value) {
    return value.split(',').map(origin => origin.trim());
  }
  
  // Default CORS origins for development
  return [
    'http://localhost:3000',
    'http://localhost:4285',
    'http://127.0.0.1:4285',
    'http://127.0.0.1:9000',
    'http://localhost:9000',
  ];
}

/**
 * Create and validate server configuration
 */
function createServerConfig(): ServerConfig {
  const port = parseInteger(process.env.PORT, 3000, 'PORT');
  const host = process.env.HOST || '0.0.0.0';
  const environment = parseEnvironment(process.env.NODE_ENV);
  const shutdownTimeout = parseInteger(process.env.SHUTDOWN_TIMEOUT, 10000, 'SHUTDOWN_TIMEOUT');

  // Validate port range
  if (port < 1 || port > 65535) {
    throw new Error(`Invalid port number: ${port}. Must be between 1 and 65535.`);
  }

  // Validate host format (basic validation)
  if (!host || host.trim().length === 0) {
    throw new Error('Host cannot be empty');
  }

  const config: ServerConfig = {
    port,
    host,
    environment,
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
    isTest: environment === 'test',
    cors: {
      origin: parseCorsOrigins(process.env.CLIENT_ORIGIN),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    shutdownTimeout,
  };

  return config;
}

/**
 * Server configuration instance
 */
export const serverConfig: ServerConfig = createServerConfig();

/**
 * Configuration validation and logging
 */
export function logServerConfig(): void {
  console.log('\n📋 Server Configuration:');
  console.log(`   🌍 Environment: ${serverConfig.environment}`);
  console.log(`   🏠 Host: ${serverConfig.host}`);
  console.log(`   🚪 Port: ${serverConfig.port}`);
  console.log(`   🌐 CORS Origins: ${serverConfig.cors.origin.join(', ')}`);
  console.log(`   🚀 Transports: ${serverConfig.transports.join(', ')}`);
  console.log(`   ⏱️  Shutdown Timeout: ${serverConfig.shutdownTimeout}ms`);
}

/**
 * Get server URL for logging and health checks
 */
export function getServerUrl(): string {
  return `http://${serverConfig.host}:${serverConfig.port}`;
}

/**
 * Environment-specific feature flags
 */
export const features = {
  /** Enable detailed logging in development */
  verboseLogging: serverConfig.isDevelopment,
  /** Enable seed data initialization */
  enableSeedData: !serverConfig.isProduction,
  /** Enable development endpoints */
  enableDevEndpoints: serverConfig.isDevelopment,
  /** Enable request logging */
  enableRequestLogging: !serverConfig.isProduction,
} as const;

export default serverConfig;
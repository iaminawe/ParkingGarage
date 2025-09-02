/**
 * Configuration Integration Test
 * Tests that the configuration module integrates properly with server components
 */

describe('Server Configuration Integration', () => {
  // Store original env
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore environment
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  test('should load configuration successfully', async () => {
    // Set test environment variables
    process.env.PORT = '4000';
    process.env.HOST = 'localhost';
    process.env.NODE_ENV = 'development';
    process.env.CLIENT_ORIGIN = 'http://localhost:3000';
    
    const { serverConfig, getServerUrl, features } = await import('../../../src/config');
    
    // Verify configuration is loaded
    expect(serverConfig).toBeDefined();
    expect(serverConfig.port).toBe(4000);
    expect(serverConfig.host).toBe('localhost');
    expect(serverConfig.environment).toBe('development');
    expect(serverConfig.isDevelopment).toBe(true);
    
    // Test utility function
    expect(getServerUrl()).toBe('http://localhost:4000');
    
    // Test feature flags
    expect(features.enableSeedData).toBe(true);
    expect(features.verboseLogging).toBe(true);
    expect(features.enableDevEndpoints).toBe(true);
  });

  test('should handle production environment correctly', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '8080';
    
    const { serverConfig, features } = await import('../../../src/config');
    
    expect(serverConfig.environment).toBe('production');
    expect(serverConfig.isProduction).toBe(true);
    expect(serverConfig.isDevelopment).toBe(false);
    
    // Production features should be disabled
    expect(features.enableSeedData).toBe(false);
    expect(features.verboseLogging).toBe(false);
    expect(features.enableDevEndpoints).toBe(false);
    expect(features.enableRequestLogging).toBe(false);
  });

  test('should export all required interfaces', async () => {
    const config = await import('../../../src/config');
    
    // Check all exports are available
    expect(config.serverConfig).toBeDefined();
    expect(config.logServerConfig).toBeDefined();
    expect(config.getServerUrl).toBeDefined();
    expect(config.features).toBeDefined();
    expect(config.default).toBeDefined(); // Default export
  });

  test('should parse CORS origins correctly', async () => {
    process.env.CLIENT_ORIGIN = 'http://example.com,https://api.example.com,http://localhost:9000';
    
    const { serverConfig } = await import('../../../src/config');
    
    expect(serverConfig.cors.origin).toEqual([
      'http://example.com',
      'https://api.example.com',
      'http://localhost:9000'
    ]);
    expect(serverConfig.cors.methods).toEqual(['GET', 'POST']);
    expect(serverConfig.cors.credentials).toBe(true);
  });

  test('should handle invalid configuration gracefully', () => {
    process.env.PORT = '99999'; // Invalid port range
    
    expect(async () => {
      await import('../../../src/config');
    }).rejects.toThrow('Invalid port number: 99999');
  });
});
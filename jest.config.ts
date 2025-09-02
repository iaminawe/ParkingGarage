import type { Config } from 'jest';

const config: Config = {
  // Test environment
  testEnvironment: 'node',

  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/server.{js,ts}',
    '!src/**/*.test.{js,ts}',
    '!src/**/*.spec.{js,ts}',
    '!src/**/*.d.ts',
    '!src/generated/**/*',
    '!src/types/**/*',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**'
  ],
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary',
    'cobertura'
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/controllers/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/services/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/repositories/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/middleware/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/utils/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // Test patterns - support both JS and TS tests
  testMatch: [
    '**/tests/**/*.test.{js,ts}',
    '**/tests/**/*.spec.{js,ts}'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
  globalSetup: '<rootDir>/tests/helpers/global-setup.js',
  globalTeardown: '<rootDir>/tests/helpers/global-teardown.js',

  // Transform settings for mixed JS/TS codebase
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        allowJs: true,
        esModuleInterop: true,
        skipLibCheck: true,
        module: 'commonjs',
        target: 'es2020',
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true
      }
    }],
    '^.+\\.jsx?$': ['ts-jest', {
      tsconfig: {
        allowJs: true,
        esModuleInterop: true,
        skipLibCheck: true,
        module: 'commonjs',
        target: 'es2020'
      }
    }]
  },

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Support both JS and TS file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Timing
  testTimeout: 10000,
  slowTestThreshold: 5,

  // Output
  verbose: true,
  silent: false,

  // Mocking
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Watch mode
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/.git/'
  ],

  // Reporters
  reporters: ['default'],

  // Global settings
  globals: {
    'NODE_ENV': 'test'
  },

  // Test environments
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js', '<rootDir>/tests/helpers/setup-database.js']
    },
    {
      displayName: 'database',
      testMatch: ['<rootDir>/tests/database/**/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js', '<rootDir>/tests/helpers/setup-database.js']
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js', '<rootDir>/tests/helpers/setup-database.js'],
      // testTimeout: 30000 // testTimeout should be at root level
    },
    {
      displayName: 'security',
      testMatch: ['<rootDir>/tests/security/**/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js', '<rootDir>/tests/helpers/setup-database.js']
    }
  ],

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Bail on first test failure
  bail: false,

  // Cache
  cache: true,
  cacheDirectory: '/tmp/jest_cache'
};

export default config;
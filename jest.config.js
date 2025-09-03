module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/generated/**',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/helpers/setup.js'],
  testTimeout: 30000,
  verbose: true,
  // Commented out projects to focus on src/tests
  // projects: [
  //   {
  //     displayName: 'unit',
  //     testMatch: ['<rootDir>/tests/unit/**/*.test.{ts,js}'],
  //     testEnvironment: 'node'
  //   },
  //   {
  //     displayName: 'integration', 
  //     testMatch: ['<rootDir>/tests/integration/**/*.test.{ts,js}'],
  //     testEnvironment: 'node'
  //   },
  //   {
  //     displayName: 'e2e',
  //     testMatch: ['<rootDir>/tests/e2e/**/*.test.{ts,js}'],
  //     testEnvironment: 'node'
  //   }
  // ]
};
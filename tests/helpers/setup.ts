// Test setup and configuration
import { Server } from 'http';

declare global {
  namespace NodeJS {
    interface Global {
      server?: Server;
    }
  }
  var server: Server | undefined;
}

beforeEach(() => {
  // Reset any global state before each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Clean up any resources after all tests
  if (global.server) {
    global.server.close();
  }
});

// Increase timeout for integration tests
jest.setTimeout(10000);

// Suppress console errors during tests unless explicitly needed
if (process.env.NODE_ENV === 'test' && !process.env.DEBUG_TESTS) {
  global.console.error = jest.fn();
  global.console.warn = jest.fn();
}
import { Request, Response } from 'express';
import { faker } from '@faker-js/faker';

export class TestUtils {
  // Mock Express request/response objects
  static createMockRequest(overrides: any = {}): Partial<Request> {
    const req = {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
      ip: faker.internet.ip(),
      method: 'GET',
      url: '/test',
      originalUrl: '/test',
      baseUrl: '',
      path: '/test',
      protocol: 'http',
      secure: false,
      ...overrides
    };

    // Add commonly used methods
    Object.assign(req, {
      get: jest.fn((name: string) => req.headers[name.toLowerCase()]),
      header: jest.fn((name: string) => req.headers[name.toLowerCase()]),
    });

    return req;
  }

  static createMockResponse(): Partial<Response> {
    const res: any = {
      statusCode: 200,
      headersSent: false,
      locals: {}
    };

    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    res.header = jest.fn().mockReturnValue(res);
    res.type = jest.fn().mockReturnValue(res);
    res.location = jest.fn().mockReturnValue(res);

    return res;
  }

  static createAuthenticatedRequest(userId: string, role: string = 'USER', overrides: any = {}): Partial<Request> {
    return this.createMockRequest({
      user: {
        id: userId,
        role,
        email: faker.internet.email(),
        name: faker.person.fullName()
      },
      headers: {
        authorization: 'Bearer mock-jwt-token',
        'content-type': 'application/json'
      },
      ...overrides
    });
  }

  // JWT Token utilities
  static createMockJwtPayload(userId: string, role: string = 'USER') {
    return {
      userId,
      role,
      email: faker.internet.email(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };
  }

  static createExpiredJwtPayload(userId: string, role: string = 'USER') {
    return {
      userId,
      role,
      email: faker.internet.email(),
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 3600  // 1 hour ago (expired)
    };
  }

  // Date utilities
  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  static addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  static addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  static subtractHours(date: Date, hours: number): Date {
    return new Date(date.getTime() - hours * 60 * 60 * 1000);
  }

  // Assertion helpers
  static expectResponseSuccess(response: any, statusCode: number = 200) {
    expect(response.status).toHaveBeenCalledWith(statusCode);
    expect(response.json).toHaveBeenCalled();
  }

  static expectResponseError(response: any, statusCode: number) {
    expect(response.status).toHaveBeenCalledWith(statusCode);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String)
      })
    );
  }

  static expectValidationError(response: any, field?: string) {
    expect(response.status).toHaveBeenCalledWith(400);
    if (field) {
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining(field)
        })
      );
    }
  }

  // Database assertion helpers
  static async expectRecordExists(model: any, id: string) {
    const record = await model.findUnique({ where: { id } });
    expect(record).toBeTruthy();
    return record;
  }

  static async expectRecordNotExists(model: any, id: string) {
    const record = await model.findUnique({ where: { id } });
    expect(record).toBeNull();
  }

  static async expectRecordCount(model: any, expectedCount: number, where?: any) {
    const count = await model.count({ where });
    expect(count).toBe(expectedCount);
  }

  // Async utilities
  static async waitFor(condition: () => Promise<boolean>, timeout: number = 5000, interval: number = 100): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await this.sleep(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock service utilities
  static createMockService<T>(methods: Array<keyof T>): jest.Mocked<T> {
    const mock = {} as jest.Mocked<T>;
    
    methods.forEach(method => {
      (mock as any)[method] = jest.fn();
    });
    
    return mock;
  }

  // Error simulation utilities
  static simulateNetworkError() {
    return Promise.reject(new Error('Network request failed'));
  }

  static simulateDatabaseError() {
    return Promise.reject(new Error('Database connection failed'));
  }

  static simulateTimeout() {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 100);
    });
  }

  // Performance testing utilities
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    return { result, duration };
  }

  static expectExecutionTime<T>(maxDuration: number) {
    return async (fn: () => Promise<T>): Promise<T> => {
      const { result, duration } = await this.measureExecutionTime(fn);
      expect(duration).toBeLessThan(maxDuration);
      return result;
    };
  }

  // Memory testing utilities
  static getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  static expectMemoryIncrease(initialMemory: NodeJS.MemoryUsage, maxIncrease: number) {
    const currentMemory = this.getMemoryUsage();
    const heapIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
    expect(heapIncrease).toBeLessThan(maxIncrease);
  }

  // Concurrent testing utilities
  static async runConcurrently<T>(operations: Array<() => Promise<T>>, maxConcurrency: number = 10): Promise<T[]> {
    const results: T[] = [];
    const errors: Error[] = [];
    
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency);
      const promises = batch.map(async (op, index) => {
        try {
          return await op();
        } catch (error) {
          errors.push(error as Error);
          throw error;
        }
      });
      
      const batchResults = await Promise.allSettled(promises);
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
    }
    
    if (errors.length > 0) {
      throw new Error(`${errors.length} operations failed: ${errors.map(e => e.message).join(', ')}`);
    }
    
    return results;
  }

  // Cleanup utilities
  static createCleanupStack() {
    const cleanupTasks: Array<() => Promise<void> | void> = [];
    
    return {
      add: (task: () => Promise<void> | void) => {
        cleanupTasks.push(task);
      },
      cleanup: async () => {
        // Execute cleanup tasks in reverse order
        for (let i = cleanupTasks.length - 1; i >= 0; i--) {
          try {
            await cleanupTasks[i]();
          } catch (error) {
            console.warn(`Cleanup task ${i} failed:`, error);
          }
        }
        cleanupTasks.length = 0;
      }
    };
  }

  // Random data utilities
  static randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomFloat(min: number, max: number, decimals: number = 2): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
  }

  // Validation utilities
  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static isValidUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
  }

  static isValidLicensePlate(plate: string): boolean {
    return /^[A-Z0-9]{2,8}$/.test(plate);
  }
}
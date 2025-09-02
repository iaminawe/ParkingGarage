/**
 * Unit Tests for TimeCalculator Utility
 * 
 * Tests time calculation functions for parking duration and billing.
 */

import {
  calculateParkingDuration,
  calculateBillableHours,
  applyGracePeriod,
  getCurrentTimestamp,
  formatDuration
} from '../../../src/utils/timeCalculator.ts';

describe('TimeCalculator', () => {
  describe('calculateParkingDuration', () => {
    test('should calculate duration in minutes correctly', () => {
      const checkIn = '2024-01-15T10:00:00.000Z';
      const checkOut = '2024-01-15T12:30:00.000Z';
      
      const duration = calculateParkingDuration(checkIn, checkOut);
      
      expect(duration.totalMinutes).toBe(150);
      expect(duration.breakdown.hours).toBe(2);
      expect(duration.breakdown.minutes).toBe(30);
      expect(duration.billableHours).toBe(3); // Rounded up from 2.5
    });

    test('should handle overnight parking', () => {
      const checkIn = '2024-01-15T22:00:00.000Z';
      const checkOut = '2024-01-16T08:30:00.000Z';
      
      const duration = calculateParkingDuration(checkIn, checkOut);
      
      expect(duration.totalMinutes).toBe(630); // 10.5 hours
      expect(duration.breakdown.hours).toBe(10);
      expect(duration.breakdown.minutes).toBe(30);
      expect(duration.billableHours).toBe(11); // Rounded up from 10.5
    });

    test('should handle multi-day parking', () => {
      const checkIn = '2024-01-15T14:00:00.000Z';
      const checkOut = '2024-01-17T16:30:00.000Z';
      
      const duration = calculateParkingDuration(checkIn, checkOut);
      
      expect(duration.totalMinutes).toBe(3030); // 50.5 hours
      expect(duration.breakdown.hours).toBe(50);
      expect(duration.breakdown.minutes).toBe(30);
      expect(duration.billableHours).toBe(51); // Rounded up from 50.5
    });

    test('should handle same minute check-in/check-out', () => {
      const checkIn = '2024-01-15T10:00:00.000Z';
      const checkOut = '2024-01-15T10:00:30.000Z'; // 30 seconds later
      
      const duration = calculateParkingDuration(checkIn, checkOut);
      
      expect(duration.totalMinutes).toBe(0); // Floor to 0 minutes for <1min
      expect(duration.breakdown.hours).toBe(0);
      expect(duration.breakdown.minutes).toBe(0);
      expect(duration.billableHours).toBe(1); // Minimum 1 hour charge
    });

    test('should handle invalid dates', () => {
      expect(() => {
        calculateParkingDuration('invalid', '2024-01-15T10:00:00.000Z');
      }).toThrow('Invalid check-in time format');
      
      expect(() => {
        calculateParkingDuration('2024-01-15T10:00:00.000Z', 'invalid');
      }).toThrow('Invalid check-out time format');
    });

    test('should handle checkout before checkin', () => {
      const checkIn = '2024-01-15T10:00:00.000Z';
      const checkOut = '2024-01-15T09:00:00.000Z';
      
      expect(() => {
        calculateParkingDuration(checkIn, checkOut);
      }).toThrow('Check-out time cannot be before check-in time');
    });
  });

  describe('calculateBillableHours', () => {
    test('should round up partial hours', () => {
      expect(calculateBillableHours(90)).toBe(2); // 1.5 hours -> 2 hours
      expect(calculateBillableHours(121)).toBe(3); // 2.02 hours -> 3 hours
      expect(calculateBillableHours(60)).toBe(1); // Exactly 1 hour
    });

    test('should handle minimum billing (1 hour)', () => {
      expect(calculateBillableHours(30)).toBe(1);
      expect(calculateBillableHours(15)).toBe(1);
      expect(calculateBillableHours(1)).toBe(1);
    });

    test('should handle zero minutes', () => {
      expect(calculateBillableHours(0)).toBe(1); // Minimum 1 hour billing
    });

    test('should handle large durations', () => {
      const tenDaysInMinutes = 10 * 24 * 60; // 14,400 minutes
      expect(calculateBillableHours(tenDaysInMinutes)).toBe(240); // 240 hours
    });
  });

  describe('applyGracePeriod', () => {
    test('should apply grace period for short stays', () => {
      const result = applyGracePeriod(10, 15); // 10 minutes with 15-minute grace
      
      expect(result).toBe(0); // Returns 0 billable hours within grace period
    });

    test('should not apply grace period for longer stays', () => {
      const result = applyGracePeriod(90, 15); // 90 minutes with 15-minute grace
      
      expect(result).toBe(2); // Returns billable hours (90min = 1.5h -> 2h)
    });

    test('should handle exact grace period duration', () => {
      const result = applyGracePeriod(15, 15);
      
      expect(result).toBe(0); // Exactly at grace period limit
    });

    test('should handle zero grace period', () => {
      const result = applyGracePeriod(30, 0);
      
      expect(result).toBe(1); // No grace period, 30min -> 1 billable hour minimum
    });

    test('should handle longer durations after grace period', () => {
      const result = applyGracePeriod(120, 10); // 2 hours with 10-minute grace
      
      expect(result).toBe(2); // 2 hours billable
    });
  });

  describe('getCurrentTimestamp', () => {
    test('should return valid ISO string', () => {
      const timestamp = getCurrentTimestamp();
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    test('should return current time', () => {
      const before = Date.now();
      const timestamp = getCurrentTimestamp();
      const after = Date.now();
      
      const timestampMs = new Date(timestamp).getTime();
      
      expect(timestampMs).toBeGreaterThanOrEqual(before);
      expect(timestampMs).toBeLessThanOrEqual(after);
    });
  });

  describe('formatDuration', () => {
    test('should format short durations correctly', () => {
      const formatted = formatDuration(150); // 2h 30m
      
      expect(formatted).toBe('2 hours and 30 minutes');
    });

    test('should format single hour correctly', () => {
      const formatted = formatDuration(60); // 1h
      
      expect(formatted).toBe('1 hour');
    });

    test('should format single minute correctly', () => {
      const formatted = formatDuration(1); // 1m
      
      expect(formatted).toBe('1 minute');
    });

    test('should format multiple hours without minutes', () => {
      const formatted = formatDuration(120); // 2h
      
      expect(formatted).toBe('2 hours');
    });

    test('should handle zero duration', () => {
      const formatted = formatDuration(0);
      
      expect(formatted).toBe('0 minutes');
    });

    test('should handle only minutes', () => {
      const formatted = formatDuration(45);
      
      expect(formatted).toBe('45 minutes');
    });

    test('should format large durations correctly', () => {
      const formatted = formatDuration(3015); // 50h 15m
      
      expect(formatted).toBe('50 hours and 15 minutes');
    });
  });

  describe('edge cases', () => {
    test('should handle daylight saving time transitions', () => {
      // Spring forward (2:00 AM becomes 3:00 AM)
      const springCheckIn = '2024-03-10T01:30:00.000Z';
      const springCheckOut = '2024-03-10T03:30:00.000Z';
      
      const springDuration = calculateParkingDuration(springCheckIn, springCheckOut);
      expect(springDuration.totalMinutes).toBe(120); // 2 hours
    });

    test('should handle leap year dates', () => {
      const checkIn = '2024-02-28T23:00:00.000Z';
      const checkOut = '2024-02-29T01:00:00.000Z'; // 2024 is a leap year
      
      const duration = calculateParkingDuration(checkIn, checkOut);
      expect(duration.totalMinutes).toBe(120); // 2 hours
    });

    test('should handle year boundary', () => {
      const checkIn = '2023-12-31T23:30:00.000Z';
      const checkOut = '2024-01-01T00:30:00.000Z';
      
      const duration = calculateParkingDuration(checkIn, checkOut);
      expect(duration.totalMinutes).toBe(60); // 1 hour
    });

    test('should handle very large durations', () => {
      const checkIn = '2024-01-01T00:00:00.000Z';
      const checkOut = '2024-12-31T23:59:59.999Z';
      
      const duration = calculateParkingDuration(checkIn, checkOut);
      expect(duration.days).toBeGreaterThan(360);
    });

    test('should handle microsecond precision', () => {
      const checkIn = '2024-01-15T10:00:00.000Z';
      const checkOut = '2024-01-15T10:00:00.999Z'; // Less than 1 second later
      
      const duration = calculateParkingDuration(checkIn, checkOut);
      expect(duration.totalMinutes).toBe(1); // Rounded up to 1 minute
    });
  });
});
/**
 * Time calculation utilities for parking duration
 * 
 * This module provides utility functions for calculating parking duration,
 * converting between time units, and handling billing-related time calculations
 * including rounding up to nearest hour for billing purposes.
 * 
 * @module TimeCalculator
 */

// Additional types for time calculations
export interface ParkingDuration {
  totalMinutes: number;
  totalHours: number;
  billableHours: number;
  breakdown: {
    hours: number;
    minutes: number;
  };
  checkInTime: string;
  checkOutTime: string;
}

export interface HoursMinutesBreakdown {
  hours: number;
  minutes: number;
}

export interface CostEstimation {
  duration: ParkingDuration;
  estimatedCost: number;
  hourlyRate: number;
}

/**
 * Custom error class for time calculation errors
 */
export class TimeCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeCalculationError';
  }
}

/**
 * Type guard to check if a value is a valid timestamp
 */
export function isValidTimestamp(timestamp: unknown): timestamp is string {
  if (!timestamp || typeof timestamp !== 'string') {
    return false;
  }
  
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Calculate parking duration between two timestamps
 * @param checkInTime - ISO timestamp of check-in
 * @param checkOutTime - ISO timestamp of check-out (optional, defaults to now)
 * @returns Duration breakdown
 */
export function calculateParkingDuration(
  checkInTime: string, 
  checkOutTime?: string | null
): ParkingDuration {
  if (!checkInTime) {
    throw new TimeCalculationError('Check-in time is required');
  }

  const checkIn = new Date(checkInTime);
  const checkOut = checkOutTime ? new Date(checkOutTime) : new Date();

  if (isNaN(checkIn.getTime())) {
    throw new TimeCalculationError('Invalid check-in time format');
  }

  if (checkOutTime && isNaN(checkOut.getTime())) {
    throw new TimeCalculationError('Invalid check-out time format');
  }

  if (checkOut < checkIn) {
    throw new TimeCalculationError('Check-out time cannot be before check-in time');
  }

  const totalMilliseconds = checkOut.getTime() - checkIn.getTime();
  const totalMinutes = Math.floor(totalMilliseconds / (1000 * 60));
  const totalHours = totalMinutes / 60;
  const billableHours = Math.ceil(totalHours); // Round up for billing

  const hours = Math.floor(totalHours);
  const minutes = totalMinutes % 60;

  return {
    totalMinutes,
    totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
    billableHours: Math.max(1, billableHours), // Minimum 1 hour charge
    breakdown: {
      hours,
      minutes
    },
    checkInTime,
    checkOutTime: checkOut.toISOString()
  };
}

/**
 * Calculate billable hours with minimum charge
 * @param totalMinutes - Total parking time in minutes
 * @param minimumHours - Minimum billable hours (default: 1)
 * @returns Billable hours
 */
export function calculateBillableHours(totalMinutes: number, minimumHours: number = 1): number {
  if (totalMinutes < 0) {
    throw new TimeCalculationError('Total minutes cannot be negative');
  }

  const totalHours = totalMinutes / 60;
  const roundedHours = Math.ceil(totalHours);
  
  return Math.max(minimumHours, roundedHours);
}

/**
 * Convert minutes to hours and minutes breakdown
 * @param totalMinutes - Total minutes
 * @returns Hours and minutes breakdown
 */
export function minutesToHoursAndMinutes(totalMinutes: number): HoursMinutesBreakdown {
  if (totalMinutes < 0) {
    throw new TimeCalculationError('Total minutes cannot be negative');
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { hours, minutes };
}

/**
 * Convert milliseconds to minutes
 * @param milliseconds - Time in milliseconds
 * @returns Time in minutes
 */
export function millisecondsToMinutes(milliseconds: number): number {
  return Math.floor(milliseconds / (1000 * 60));
}

/**
 * Convert hours to minutes
 * @param hours - Time in hours
 * @returns Time in minutes
 */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

/**
 * Format duration as human-readable string
 * @param totalMinutes - Total minutes
 * @returns Formatted duration string
 */
export function formatDuration(totalMinutes: number): string {
  const { hours, minutes } = minutesToHoursAndMinutes(totalMinutes);
  
  if (hours === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Calculate if parking duration qualifies for grace period
 * @param totalMinutes - Total parking time in minutes
 * @param gracePeriodMinutes - Grace period in minutes (default: 5)
 * @returns Whether grace period applies
 */
export function isWithinGracePeriod(totalMinutes: number, gracePeriodMinutes: number = 5): boolean {
  return totalMinutes <= gracePeriodMinutes;
}

/**
 * Apply grace period to billable hours if applicable
 * @param totalMinutes - Total parking time in minutes
 * @param gracePeriodMinutes - Grace period in minutes (default: 5)
 * @param minimumHours - Minimum billable hours (default: 1)
 * @returns Billable hours after grace period consideration
 */
export function applyGracePeriod(
  totalMinutes: number, 
  gracePeriodMinutes: number = 5, 
  minimumHours: number = 1
): number {
  if (isWithinGracePeriod(totalMinutes, gracePeriodMinutes)) {
    return 0; // Free within grace period
  }
  
  return calculateBillableHours(totalMinutes, minimumHours);
}

/**
 * Get current timestamp in ISO format
 * @returns Current timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Calculate time elapsed since check-in for currently parked vehicle
 * @param checkInTime - ISO timestamp of check-in
 * @returns Current parking duration
 */
export function getCurrentParkingDuration(checkInTime: string): ParkingDuration {
  return calculateParkingDuration(checkInTime);
}

/**
 * Calculate estimated cost based on current parking duration
 * @param checkInTime - ISO timestamp of check-in
 * @param hourlyRate - Rate per hour
 * @returns Cost estimation with duration
 */
export function calculateEstimatedCost(checkInTime: string, hourlyRate: number = 5.00): CostEstimation {
  const duration = getCurrentParkingDuration(checkInTime);
  const estimatedCost = duration.billableHours * hourlyRate;
  
  return {
    duration,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    hourlyRate
  };
}

/**
 * Convert duration to different time units
 * @param minutes - Duration in minutes
 * @returns Duration in various units
 */
export function convertDuration(minutes: number): {
  minutes: number;
  hours: number;
  days: number;
  weeks: number;
  seconds: number;
  milliseconds: number;
} {
  return {
    minutes,
    hours: minutes / 60,
    days: minutes / (60 * 24),
    weeks: minutes / (60 * 24 * 7),
    seconds: minutes * 60,
    milliseconds: minutes * 60 * 1000
  };
}

/**
 * Calculate parking duration from timestamps with validation
 * @param startTime - Start timestamp
 * @param endTime - End timestamp
 * @returns Duration in minutes, or null if invalid
 */
export function safeDurationCalculation(startTime: unknown, endTime: unknown): number | null {
  try {
    if (!isValidTimestamp(startTime) || !isValidTimestamp(endTime)) {
      return null;
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (end < start) {
      return null;
    }
    
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  } catch {
    return null;
  }
}

/**
 * Parse time string into minutes (supports various formats)
 * @param timeString - Time string (e.g., "2h 30m", "150m", "2.5h")
 * @returns Minutes, or null if invalid
 */
export function parseTimeString(timeString: string): number | null {
  if (!timeString || typeof timeString !== 'string') {
    return null;
  }
  
  const cleaned = timeString.toLowerCase().trim();
  
  // Pattern: "2h 30m" or "2h30m"
  const hoursMinutesMatch = cleaned.match(/^(\d+(?:\.\d+)?)h\s*(\d+)m?$/);
  if (hoursMinutesMatch) {
    const hours = parseFloat(hoursMinutesMatch[1]);
    const minutes = parseInt(hoursMinutesMatch[2]);
    return Math.round(hours * 60 + minutes);
  }
  
  // Pattern: "150m"
  const minutesMatch = cleaned.match(/^(\d+)m?$/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1]);
  }
  
  // Pattern: "2.5h"
  const hoursMatch = cleaned.match(/^(\d+(?:\.\d+)?)h$/);
  if (hoursMatch) {
    return Math.round(parseFloat(hoursMatch[1]) * 60);
  }
  
  return null;
}

/**
 * Get time zone offset for a given date
 * @param date - Date to get offset for
 * @returns Offset in minutes from UTC
 */
export function getTimezoneOffset(date?: Date): number {
  return (date || new Date()).getTimezoneOffset();
}

/**
 * Check if two timestamps are on the same day
 * @param timestamp1 - First timestamp
 * @param timestamp2 - Second timestamp
 * @returns True if same day, false otherwise
 */
export function isSameDay(timestamp1?: string, timestamp2?: string): boolean {
  if (!timestamp1 || !timestamp2) return false;
  
  try {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  } catch {
    return false;
  }
}
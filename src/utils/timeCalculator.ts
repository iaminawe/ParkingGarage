/**
 * Time calculation utilities for parking duration
 *
 * This module provides utility functions for calculating parking duration,
 * converting between time units, and handling billing-related time calculations
 * including rounding up to nearest hour for billing purposes.
 */

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

export interface HoursAndMinutes {
  hours: number;
  minutes: number;
}

export interface EstimatedCost {
  duration: ParkingDuration;
  estimatedCost: number;
  hourlyRate: number;
}

/**
 * Calculate parking duration between two timestamps
 */
export function calculateParkingDuration(
  checkInTime: string, 
  checkOutTime: string | null = null
): ParkingDuration {
  if (!checkInTime) {
    throw new Error('Check-in time is required');
  }

  const checkIn = new Date(checkInTime);
  const checkOut = checkOutTime ? new Date(checkOutTime) : new Date();

  if (isNaN(checkIn.getTime())) {
    throw new Error('Invalid check-in time format');
  }

  if (checkOutTime && isNaN(checkOut.getTime())) {
    throw new Error('Invalid check-out time format');
  }

  if (checkOut < checkIn) {
    throw new Error('Check-out time cannot be before check-in time');
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
 */
export function calculateBillableHours(totalMinutes: number, minimumHours: number = 1): number {
  if (totalMinutes < 0) {
    throw new Error('Total minutes cannot be negative');
  }

  const totalHours = totalMinutes / 60;
  const roundedHours = Math.ceil(totalHours);

  return Math.max(minimumHours, roundedHours);
}

/**
 * Convert minutes to hours and minutes breakdown
 */
export function minutesToHoursAndMinutes(totalMinutes: number): HoursAndMinutes {
  if (totalMinutes < 0) {
    throw new Error('Total minutes cannot be negative');
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { hours, minutes };
}

/**
 * Convert milliseconds to minutes
 */
export function millisecondsToMinutes(milliseconds: number): number {
  return Math.floor(milliseconds / (1000 * 60));
}

/**
 * Convert hours to minutes
 */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

/**
 * Format duration as human-readable string
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
 */
export function isWithinGracePeriod(totalMinutes: number, gracePeriodMinutes: number = 5): boolean {
  return totalMinutes <= gracePeriodMinutes;
}

/**
 * Apply grace period to billable hours if applicable
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
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Validate timestamp format
 */
export function isValidTimestamp(timestamp: string): boolean {
  if (!timestamp || typeof timestamp !== 'string') {
    return false;
  }

  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Calculate time elapsed since check-in for currently parked vehicle
 */
export function getCurrentParkingDuration(checkInTime: string): ParkingDuration {
  return calculateParkingDuration(checkInTime);
}

/**
 * Calculate estimated cost based on current parking duration
 */
export function calculateEstimatedCost(checkInTime: string, hourlyRate: number = 5.00): EstimatedCost {
  const duration = getCurrentParkingDuration(checkInTime);
  const estimatedCost = duration.billableHours * hourlyRate;

  return {
    duration,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    hourlyRate
  };
}
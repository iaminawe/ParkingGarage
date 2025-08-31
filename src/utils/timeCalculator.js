/**
 * Time calculation utilities for parking duration
 * 
 * This module provides utility functions for calculating parking duration,
 * converting between time units, and handling billing-related time calculations
 * including rounding up to nearest hour for billing purposes.
 * 
 * @module TimeCalculator
 */

/**
 * Calculate parking duration between two timestamps
 * @param {string} checkInTime - ISO timestamp of check-in
 * @param {string} checkOutTime - ISO timestamp of check-out (optional, defaults to now)
 * @returns {Object} Duration breakdown
 */
function calculateParkingDuration(checkInTime, checkOutTime = null) {
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

  const totalMilliseconds = checkOut - checkIn;
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
 * @param {number} totalMinutes - Total parking time in minutes
 * @param {number} minimumHours - Minimum billable hours (default: 1)
 * @returns {number} Billable hours
 */
function calculateBillableHours(totalMinutes, minimumHours = 1) {
  if (totalMinutes < 0) {
    throw new Error('Total minutes cannot be negative');
  }

  const totalHours = totalMinutes / 60;
  const roundedHours = Math.ceil(totalHours);
  
  return Math.max(minimumHours, roundedHours);
}

/**
 * Convert minutes to hours and minutes breakdown
 * @param {number} totalMinutes - Total minutes
 * @returns {Object} Hours and minutes breakdown
 */
function minutesToHoursAndMinutes(totalMinutes) {
  if (totalMinutes < 0) {
    throw new Error('Total minutes cannot be negative');
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { hours, minutes };
}

/**
 * Convert milliseconds to minutes
 * @param {number} milliseconds - Time in milliseconds
 * @returns {number} Time in minutes
 */
function millisecondsToMinutes(milliseconds) {
  return Math.floor(milliseconds / (1000 * 60));
}

/**
 * Convert hours to minutes
 * @param {number} hours - Time in hours
 * @returns {number} Time in minutes
 */
function hoursToMinutes(hours) {
  return Math.round(hours * 60);
}

/**
 * Format duration as human-readable string
 * @param {number} totalMinutes - Total minutes
 * @returns {string} Formatted duration string
 */
function formatDuration(totalMinutes) {
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
 * @param {number} totalMinutes - Total parking time in minutes
 * @param {number} gracePeriodMinutes - Grace period in minutes (default: 5)
 * @returns {boolean} Whether grace period applies
 */
function isWithinGracePeriod(totalMinutes, gracePeriodMinutes = 5) {
  return totalMinutes <= gracePeriodMinutes;
}

/**
 * Apply grace period to billable hours if applicable
 * @param {number} totalMinutes - Total parking time in minutes
 * @param {number} gracePeriodMinutes - Grace period in minutes (default: 5)
 * @param {number} minimumHours - Minimum billable hours (default: 1)
 * @returns {number} Billable hours after grace period consideration
 */
function applyGracePeriod(totalMinutes, gracePeriodMinutes = 5, minimumHours = 1) {
  if (isWithinGracePeriod(totalMinutes, gracePeriodMinutes)) {
    return 0; // Free within grace period
  }
  
  return calculateBillableHours(totalMinutes, minimumHours);
}

/**
 * Get current timestamp in ISO format
 * @returns {string} Current timestamp
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Validate timestamp format
 * @param {string} timestamp - Timestamp to validate
 * @returns {boolean} Whether timestamp is valid
 */
function isValidTimestamp(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') {
    return false;
  }
  
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Calculate time elapsed since check-in for currently parked vehicle
 * @param {string} checkInTime - ISO timestamp of check-in
 * @returns {Object} Current parking duration
 */
function getCurrentParkingDuration(checkInTime) {
  return calculateParkingDuration(checkInTime);
}

/**
 * Calculate estimated cost based on current parking duration
 * @param {string} checkInTime - ISO timestamp of check-in
 * @param {number} hourlyRate - Rate per hour
 * @returns {Object} Cost estimation with duration
 */
function calculateEstimatedCost(checkInTime, hourlyRate = 5.00) {
  const duration = getCurrentParkingDuration(checkInTime);
  const estimatedCost = duration.billableHours * hourlyRate;
  
  return {
    duration,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    hourlyRate
  };
}

module.exports = {
  calculateParkingDuration,
  calculateBillableHours,
  minutesToHoursAndMinutes,
  millisecondsToMinutes,
  hoursToMinutes,
  formatDuration,
  isWithinGracePeriod,
  applyGracePeriod,
  getCurrentTimestamp,
  isValidTimestamp,
  getCurrentParkingDuration,
  calculateEstimatedCost
};
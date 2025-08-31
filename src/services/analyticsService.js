/**
 * Analytics service for comprehensive garage statistics
 *
 * This module provides statistical analysis and reporting capabilities
 * for parking garage operations, including occupancy rates, duration
 * analytics, revenue tracking, and performance metrics.
 *
 * @module AnalyticsService
 */

const GarageRepository = require('../repositories/garageRepository');
const SpotRepository = require('../repositories/spotRepository');
const VehicleRepository = require('../repositories/vehicleRepository');

class AnalyticsService {
  constructor() {
    this.garageRepository = new GarageRepository();
    this.spotRepository = new SpotRepository();
    this.vehicleRepository = new VehicleRepository();
  }

  /**
   * Get comprehensive garage statistics
   * @returns {Object} Complete garage analytics
   */
  async getGarageStats() {
    try {
      const garage = this.garageRepository.getDefault();
      if (!garage) {
        throw new Error('Garage not initialized');
      }

      const spots = this.spotRepository.findAll();
      const parkedVehicles = this.vehicleRepository.findParked();
      const allVehicles = this.vehicleRepository.findAll();

      const totalSpots = spots.length;
      const occupiedSpots = spots.filter(spot => spot.status === 'occupied').length;
      const availableSpots = totalSpots - occupiedSpots;
      const occupancyRate = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 10000) / 100 : 0;

      return {
        garage: {
          name: garage.name,
          totalFloors: garage.floors.length,
          totalBays: garage.floors.reduce((sum, floor) => sum + floor.bays, 0)
        },
        totalSpots,
        occupiedSpots,
        availableSpots,
        occupancyRate,
        byType: this._calculateStatsByType(spots),
        byFloor: this._calculateStatsByFloor(spots),
        averageDuration: this._calculateAverageDuration(allVehicles),
        currentSessions: parkedVehicles.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get garage statistics: ${error.message}`);
    }
  }

  /**
   * Get floor-specific statistics
   * @param {number} floorId - Floor number to analyze
   * @returns {Object} Floor-specific analytics
   */
  async getFloorStats(floorId) {
    try {
      const garage = this.garageRepository.getDefault();
      if (!garage) {
        throw new Error('Garage not initialized');
      }

      const floor = parseInt(floorId);
      const garageFloor = garage.floors.find(f => f.number === floor);

      if (!garageFloor) {
        throw new Error(`Floor ${floor} not found`);
      }

      const floorSpots = this.spotRepository.findByFloor(floor);
      const occupiedFloorSpots = floorSpots.filter(spot => spot.status === 'occupied');
      const availableFloorSpots = floorSpots.filter(spot => spot.status === 'available');

      const totalSpots = floorSpots.length;
      const occupiedSpots = occupiedFloorSpots.length;
      const availableSpots = availableFloorSpots.length;
      const occupancyRate = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 10000) / 100 : 0;

      // Get vehicles on this floor
      const floorVehicles = occupiedFloorSpots
        .map(spot => this.vehicleRepository.findById(spot.currentVehicle))
        .filter(vehicle => vehicle);

      return {
        floor: {
          number: floor,
          bays: garageFloor.bays,
          spotsPerBay: garageFloor.spotsPerBay,
          totalCapacity: garageFloor.bays * garageFloor.spotsPerBay
        },
        totalSpots,
        occupiedSpots,
        availableSpots,
        occupancyRate,
        byType: this._calculateStatsByType(floorSpots),
        byBay: this._calculateStatsByBay(floorSpots),
        averageDuration: this._calculateAverageDuration(floorVehicles),
        currentSessions: floorVehicles.length,
        peakOccupancy: this._calculatePeakOccupancy(floorVehicles),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get floor statistics: ${error.message}`);
    }
  }

  /**
   * Get occupancy trends over time
   * @param {Object} options - Analysis options
   * @param {number} options.hours - Hours to analyze (default 24)
   * @returns {Object} Occupancy trend analysis
   */
  async getOccupancyTrends(options = {}) {
    try {
      const { hours = 24 } = options;
      const now = new Date();
      const startTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));

      const allVehicles = this.vehicleRepository.findAll();
      const recentVehicles = allVehicles.filter(vehicle => {
        const checkInTime = new Date(vehicle.checkInTime);
        return checkInTime >= startTime;
      });

      // Create hourly buckets
      const hourlyData = [];
      for (let i = 0; i < hours; i++) {
        const bucketStart = new Date(now.getTime() - ((hours - i) * 60 * 60 * 1000));
        const bucketEnd = new Date(bucketStart.getTime() + (60 * 60 * 1000));

        const checkIns = recentVehicles.filter(vehicle => {
          const checkInTime = new Date(vehicle.checkInTime);
          return checkInTime >= bucketStart && checkInTime < bucketEnd;
        }).length;

        const checkOuts = recentVehicles.filter(vehicle => {
          if (!vehicle.checkOutTime) {return false;}
          const checkOutTime = new Date(vehicle.checkOutTime);
          return checkOutTime >= bucketStart && checkOutTime < bucketEnd;
        }).length;

        hourlyData.push({
          hour: bucketStart.getHours(),
          timestamp: bucketStart.toISOString(),
          checkIns,
          checkOuts,
          netChange: checkIns - checkOuts
        });
      }

      return {
        period: {
          hours,
          startTime: startTime.toISOString(),
          endTime: now.toISOString()
        },
        trends: hourlyData,
        summary: {
          totalCheckIns: hourlyData.reduce((sum, hour) => sum + hour.checkIns, 0),
          totalCheckOuts: hourlyData.reduce((sum, hour) => sum + hour.checkOuts, 0),
          peakCheckInHour: hourlyData.reduce((max, hour) =>
            hour.checkIns > max.checkIns ? hour : max, hourlyData[0]),
          peakCheckOutHour: hourlyData.reduce((max, hour) =>
            hour.checkOuts > max.checkOuts ? hour : max, hourlyData[0])
        }
      };
    } catch (error) {
      throw new Error(`Failed to get occupancy trends: ${error.message}`);
    }
  }

  /**
   * Get revenue analytics
   * @param {Object} options - Analysis options
   * @param {number} options.days - Days to analyze (default 7)
   * @returns {Object} Revenue analysis
   */
  async getRevenueAnalytics(options = {}) {
    try {
      const { days = 7 } = options;
      const now = new Date();
      const startTime = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

      const allVehicles = this.vehicleRepository.findAll();
      const recentVehicles = allVehicles.filter(vehicle => {
        const checkInTime = new Date(vehicle.checkInTime);
        return checkInTime >= startTime;
      });

      const completedSessions = recentVehicles.filter(v => v.isPaid);
      const pendingSessions = recentVehicles.filter(v => v.checkOutTime && !v.isPaid);
      const activeSessions = recentVehicles.filter(v => !v.checkOutTime);

      const totalRevenue = completedSessions.reduce((sum, v) => sum + v.totalAmount, 0);
      const pendingRevenue = pendingSessions.reduce((sum, v) => sum + v.totalAmount, 0);

      return {
        period: {
          days,
          startTime: startTime.toISOString(),
          endTime: now.toISOString()
        },
        revenue: {
          total: Math.round(totalRevenue * 100) / 100,
          pending: Math.round(pendingRevenue * 100) / 100,
          average: completedSessions.length > 0
            ? Math.round((totalRevenue / completedSessions.length) * 100) / 100
            : 0
        },
        sessions: {
          completed: completedSessions.length,
          pending: pendingSessions.length,
          active: activeSessions.length,
          total: recentVehicles.length
        },
        byVehicleType: this._calculateRevenueByType(completedSessions),
        byRateType: this._calculateRevenueByRate(completedSessions)
      };
    } catch (error) {
      throw new Error(`Failed to get revenue analytics: ${error.message}`);
    }
  }

  /**
   * Get usage patterns and peak times
   * @returns {Object} Usage pattern analysis
   */
  async getUsagePatterns() {
    try {
      const allVehicles = this.vehicleRepository.findAll();

      // Analyze by hour of day
      const hourlyUsage = Array(24).fill(0);
      const dailyUsage = Array(7).fill(0); // Sunday = 0, Monday = 1, etc.

      allVehicles.forEach(vehicle => {
        const checkInTime = new Date(vehicle.checkInTime);
        hourlyUsage[checkInTime.getHours()]++;
        dailyUsage[checkInTime.getDay()]++;
      });

      const peakHour = hourlyUsage.indexOf(Math.max(...hourlyUsage));
      const peakDay = dailyUsage.indexOf(Math.max(...dailyUsage));
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      return {
        hourlyDistribution: hourlyUsage.map((count, hour) => ({
          hour,
          sessions: count,
          percentage: allVehicles.length > 0 ? Math.round((count / allVehicles.length) * 100) : 0
        })),
        dailyDistribution: dailyUsage.map((count, day) => ({
          day: dayNames[day],
          dayNumber: day,
          sessions: count,
          percentage: allVehicles.length > 0 ? Math.round((count / allVehicles.length) * 100) : 0
        })),
        peaks: {
          hour: { time: peakHour, sessions: hourlyUsage[peakHour] },
          day: { name: dayNames[peakDay], sessions: dailyUsage[peakDay] }
        },
        totalSessions: allVehicles.length
      };
    } catch (error) {
      throw new Error(`Failed to get usage patterns: ${error.message}`);
    }
  }

  /**
   * Calculate statistics by spot type
   * @private
   * @param {Array} spots - Array of spots to analyze
   * @returns {Object} Statistics by type
   */
  _calculateStatsByType(spots) {
    const types = ['compact', 'standard', 'oversized'];
    const stats = {};

    types.forEach(type => {
      const typeSpots = spots.filter(spot => spot.type === type);
      const occupied = typeSpots.filter(spot => spot.status === 'occupied').length;
      const available = typeSpots.length - occupied;

      stats[type] = {
        total: typeSpots.length,
        occupied,
        available,
        occupancyRate: typeSpots.length > 0 ? Math.round((occupied / typeSpots.length) * 100) : 0
      };
    });

    return stats;
  }

  /**
   * Calculate statistics by floor
   * @private
   * @param {Array} spots - Array of spots to analyze
   * @returns {Array} Statistics by floor
   */
  _calculateStatsByFloor(spots) {
    const floorMap = new Map();

    spots.forEach(spot => {
      if (!floorMap.has(spot.floor)) {
        floorMap.set(spot.floor, { total: 0, occupied: 0, available: 0 });
      }

      const floorStats = floorMap.get(spot.floor);
      floorStats.total++;

      if (spot.status === 'occupied') {
        floorStats.occupied++;
      } else {
        floorStats.available++;
      }
    });

    return Array.from(floorMap.entries()).map(([floor, stats]) => ({
      floor,
      ...stats,
      occupancyRate: stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0
    })).sort((a, b) => a.floor - b.floor);
  }

  /**
   * Calculate statistics by bay within a floor
   * @private
   * @param {Array} spots - Array of spots to analyze
   * @returns {Array} Statistics by bay
   */
  _calculateStatsByBay(spots) {
    const bayMap = new Map();

    spots.forEach(spot => {
      if (!bayMap.has(spot.bay)) {
        bayMap.set(spot.bay, { total: 0, occupied: 0, available: 0 });
      }

      const bayStats = bayMap.get(spot.bay);
      bayStats.total++;

      if (spot.status === 'occupied') {
        bayStats.occupied++;
      } else {
        bayStats.available++;
      }
    });

    return Array.from(bayMap.entries()).map(([bay, stats]) => ({
      bay,
      ...stats,
      occupancyRate: stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0
    })).sort((a, b) => a.bay - b.bay);
  }

  /**
   * Calculate average parking duration
   * @private
   * @param {Array} vehicles - Array of vehicles to analyze
   * @returns {Object} Average duration in hours and minutes
   */
  _calculateAverageDuration(vehicles) {
    if (!vehicles || vehicles.length === 0) {
      return { hours: 0, minutes: 0, totalMinutes: 0 };
    }

    const completedVehicles = vehicles.filter(v => v.checkOutTime);

    if (completedVehicles.length === 0) {
      // For currently parked vehicles, calculate current duration
      const totalMinutes = vehicles.reduce((sum, vehicle) => {
        const checkInTime = new Date(vehicle.checkInTime);
        const now = new Date();
        const durationMs = now - checkInTime;
        return sum + Math.floor(durationMs / (1000 * 60));
      }, 0);

      const avgMinutes = Math.round(totalMinutes / vehicles.length);
      return {
        hours: Math.floor(avgMinutes / 60),
        minutes: avgMinutes % 60,
        totalMinutes: avgMinutes
      };
    }

    const totalMinutes = completedVehicles.reduce((sum, vehicle) => {
      return sum + vehicle.getParkingDurationMinutes();
    }, 0);

    const avgMinutes = Math.round(totalMinutes / completedVehicles.length);

    return {
      hours: Math.floor(avgMinutes / 60),
      minutes: avgMinutes % 60,
      totalMinutes: avgMinutes
    };
  }

  /**
   * Calculate peak occupancy for analysis
   * @private
   * @param {Array} vehicles - Array of vehicles to analyze
   * @returns {Object} Peak occupancy information
   */
  _calculatePeakOccupancy(vehicles) {
    if (!vehicles || vehicles.length === 0) {
      return { current: 0, estimated: 0 };
    }

    const current = vehicles.filter(v => !v.checkOutTime).length;
    const estimated = Math.max(current, vehicles.length);

    return {
      current,
      estimated,
      utilizationRate: estimated > 0 ? Math.round((current / estimated) * 100) : 0
    };
  }

  /**
   * Calculate revenue by vehicle type
   * @private
   * @param {Array} vehicles - Completed vehicle sessions
   * @returns {Object} Revenue breakdown by vehicle type
   */
  _calculateRevenueByType(vehicles) {
    const typeRevenue = {};

    vehicles.forEach(vehicle => {
      if (!typeRevenue[vehicle.vehicleType]) {
        typeRevenue[vehicle.vehicleType] = { revenue: 0, sessions: 0 };
      }

      typeRevenue[vehicle.vehicleType].revenue += vehicle.totalAmount;
      typeRevenue[vehicle.vehicleType].sessions++;
    });

    // Round revenue values
    Object.keys(typeRevenue).forEach(type => {
      typeRevenue[type].revenue = Math.round(typeRevenue[type].revenue * 100) / 100;
      typeRevenue[type].average = typeRevenue[type].sessions > 0
        ? Math.round((typeRevenue[type].revenue / typeRevenue[type].sessions) * 100) / 100
        : 0;
    });

    return typeRevenue;
  }

  /**
   * Calculate revenue by rate type
   * @private
   * @param {Array} vehicles - Completed vehicle sessions
   * @returns {Object} Revenue breakdown by rate type
   */
  _calculateRevenueByRate(vehicles) {
    const rateRevenue = {};

    vehicles.forEach(vehicle => {
      if (!rateRevenue[vehicle.rateType]) {
        rateRevenue[vehicle.rateType] = { revenue: 0, sessions: 0 };
      }

      rateRevenue[vehicle.rateType].revenue += vehicle.totalAmount;
      rateRevenue[vehicle.rateType].sessions++;
    });

    // Round revenue values
    Object.keys(rateRevenue).forEach(rate => {
      rateRevenue[rate].revenue = Math.round(rateRevenue[rate].revenue * 100) / 100;
      rateRevenue[rate].average = rateRevenue[rate].sessions > 0
        ? Math.round((rateRevenue[rate].revenue / rateRevenue[rate].sessions) * 100) / 100
        : 0;
    });

    return rateRevenue;
  }
}

module.exports = AnalyticsService;

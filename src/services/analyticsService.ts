/**
 * Analytics service for comprehensive garage statistics
 *
 * This module provides statistical analysis and reporting capabilities
 * for parking garage operations, including occupancy rates, duration
 * analytics, revenue tracking, and performance metrics.
 *
 * @module AnalyticsService
 */

import {
  IAnalyticsService,
  GarageAnalytics,
  FloorAnalytics,
  OccupancyTrends,
  RevenueAnalytics,
  UsagePatterns,
  HourlyUsageData,
  DailyUsageData,
  UsageDistribution,
  PeakTimes,
  SpotType,
  VehicleType,
  RateType,
  Duration,
  OccupancyStats,
  Currency,
  ServiceOperationError
} from '../types/index.js';

// Import repositories (keeping CommonJS imports for now)
const GarageRepository = require('../repositories/garageRepository');
const SpotRepository = require('../repositories/spotRepository');
const VehicleRepository = require('../repositories/vehicleRepository');

export class AnalyticsService implements IAnalyticsService {
  private garageRepository: any;
  private spotRepository: any;
  private vehicleRepository: any;

  constructor() {
    this.garageRepository = new GarageRepository();
    this.spotRepository = new SpotRepository();
    this.vehicleRepository = new VehicleRepository();
  }

  /**
   * Get comprehensive garage statistics
   */
  async getGarageStats(): Promise<GarageAnalytics> {
    try {
      const garage = this.garageRepository.getDefault();
      if (!garage) {
        throw new ServiceOperationError('Garage not initialized', 'getGarageStats');
      }

      const spots = this.spotRepository.findAll();
      const parkedVehicles = this.vehicleRepository.findParked();
      const allVehicles = this.vehicleRepository.findAll();

      const totalSpots = spots.length;
      const occupiedSpots = spots.filter((spot: any) => spot.status === 'occupied').length;
      const availableSpots = totalSpots - occupiedSpots;
      const occupancyRate = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 10000) / 100 : 0;

      return {
        garage: {
          name: garage.name,
          totalFloors: garage.floors.length,
          totalBays: garage.floors.reduce((sum: number, floor: any) => sum + floor.bays, 0)
        },
        totalSpots,
        occupiedSpots,
        availableSpots,
        occupancyRate,
        byType: this.calculateStatsByType(spots),
        byFloor: this.calculateStatsByFloor(spots),
        averageDuration: this.calculateAverageDuration(allVehicles),
        currentSessions: parkedVehicles.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof ServiceOperationError) {
        throw error;
      }
      throw new ServiceOperationError(`Failed to get garage statistics: ${(error as Error).message}`, 'getGarageStats');
    }
  }

  /**
   * Get floor-specific statistics
   */
  async getFloorStats(floorId: number): Promise<FloorAnalytics> {
    try {
      const garage = this.garageRepository.getDefault();
      if (!garage) {
        throw new ServiceOperationError('Garage not initialized', 'getFloorStats');
      }

      const floor = parseInt(floorId.toString());
      const garageFloor = garage.floors.find((f: any) => f.number === floor);

      if (!garageFloor) {
        throw new ServiceOperationError(`Floor ${floor} not found`, 'getFloorStats');
      }

      const floorSpots = this.spotRepository.findByFloor(floor);
      const occupiedFloorSpots = floorSpots.filter((spot: any) => spot.status === 'occupied');
      const availableFloorSpots = floorSpots.filter((spot: any) => spot.status === 'available');

      const totalSpots = floorSpots.length;
      const occupiedSpots = occupiedFloorSpots.length;
      const availableSpots = availableFloorSpots.length;
      const occupancyRate = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 10000) / 100 : 0;

      // Get vehicles on this floor
      const floorVehicles = occupiedFloorSpots
        .map((spot: any) => this.vehicleRepository.findById(spot.currentVehicle))
        .filter((vehicle: any) => vehicle);

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
        byType: this.calculateStatsByType(floorSpots),
        byBay: this.calculateStatsByBay(floorSpots),
        averageDuration: this.calculateAverageDuration(floorVehicles),
        currentSessions: floorVehicles.length,
        peakOccupancy: this.calculatePeakOccupancy(floorVehicles),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof ServiceOperationError) {
        throw error;
      }
      throw new ServiceOperationError(`Failed to get floor statistics: ${(error as Error).message}`, 'getFloorStats');
    }
  }

  /**
   * Get occupancy trends over time
   */
  async getOccupancyTrends(options: { hours?: number } = {}): Promise<OccupancyTrends> {
    try {
      const { hours = 24 } = options;
      const now = new Date();
      const startTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));

      const allVehicles = this.vehicleRepository.findAll();
      const recentVehicles = allVehicles.filter((vehicle: any) => {
        const checkInTime = new Date(vehicle.checkInTime);
        return checkInTime >= startTime;
      });

      // Create hourly buckets
      const hourlyData: HourlyUsageData[] = [];
      for (let i = 0; i < hours; i++) {
        const bucketStart = new Date(now.getTime() - ((hours - i) * 60 * 60 * 1000));
        const bucketEnd = new Date(bucketStart.getTime() + (60 * 60 * 1000));

        const checkIns = recentVehicles.filter((vehicle: any) => {
          const checkInTime = new Date(vehicle.checkInTime);
          return checkInTime >= bucketStart && checkInTime < bucketEnd;
        }).length;

        const checkOuts = recentVehicles.filter((vehicle: any) => {
          if (!vehicle.checkOutTime) return false;
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

      const summary = {
        totalCheckIns: hourlyData.reduce((sum, hour) => sum + hour.checkIns, 0),
        totalCheckOuts: hourlyData.reduce((sum, hour) => sum + hour.checkOuts, 0),
        peakCheckInHour: hourlyData.reduce((max, hour) =>
          hour.checkIns > max.checkIns ? hour : max, hourlyData[0]),
        peakCheckOutHour: hourlyData.reduce((max, hour) =>
          hour.checkOuts > max.checkOuts ? hour : max, hourlyData[0])
      };

      return {
        period: {
          hours,
          startTime: startTime.toISOString(),
          endTime: now.toISOString()
        },
        trends: hourlyData,
        summary
      };
    } catch (error) {
      throw new ServiceOperationError(`Failed to get occupancy trends: ${(error as Error).message}`, 'getOccupancyTrends');
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(options: { days?: number } = {}): Promise<RevenueAnalytics> {
    try {
      const { days = 7 } = options;
      const now = new Date();
      const startTime = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

      const allVehicles = this.vehicleRepository.findAll();
      const recentVehicles = allVehicles.filter((vehicle: any) => {
        const checkInTime = new Date(vehicle.checkInTime);
        return checkInTime >= startTime;
      });

      const completedSessions = recentVehicles.filter((v: any) => v.isPaid);
      const pendingSessions = recentVehicles.filter((v: any) => v.checkOutTime && !v.isPaid);
      const activeSessions = recentVehicles.filter((v: any) => !v.checkOutTime);

      const totalRevenue = completedSessions.reduce((sum: number, v: any) => sum + v.totalAmount, 0);
      const pendingRevenue = pendingSessions.reduce((sum: number, v: any) => sum + v.totalAmount, 0);

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
        byVehicleType: this.calculateRevenueByType(completedSessions),
        byRateType: this.calculateRevenueByRate(completedSessions)
      };
    } catch (error) {
      throw new ServiceOperationError(`Failed to get revenue analytics: ${(error as Error).message}`, 'getRevenueAnalytics');
    }
  }

  /**
   * Get usage patterns and peak times
   */
  async getUsagePatterns(): Promise<UsagePatterns> {
    try {
      const allVehicles = this.vehicleRepository.findAll();

      // Analyze by hour of day
      const hourlyUsage = Array(24).fill(0);
      const dailyUsage = Array(7).fill(0); // Sunday = 0, Monday = 1, etc.

      allVehicles.forEach((vehicle: any) => {
        const checkInTime = new Date(vehicle.checkInTime);
        hourlyUsage[checkInTime.getHours()]++;
        dailyUsage[checkInTime.getDay()]++;
      });

      const peakHour = hourlyUsage.indexOf(Math.max(...hourlyUsage));
      const peakDay = dailyUsage.indexOf(Math.max(...dailyUsage));
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      const hourlyDistribution: UsageDistribution[] = hourlyUsage.map((count, hour) => ({
        hour,
        sessions: count,
        percentage: allVehicles.length > 0 ? Math.round((count / allVehicles.length) * 100) : 0
      }));

      const dailyDistribution: DailyUsageData[] = dailyUsage.map((count, day) => ({
        day: dayNames[day],
        dayNumber: day,
        sessions: count,
        percentage: allVehicles.length > 0 ? Math.round((count / allVehicles.length) * 100) : 0
      }));

      const peaks: PeakTimes = {
        hour: { time: peakHour, sessions: hourlyUsage[peakHour] },
        day: { name: dayNames[peakDay], sessions: dailyUsage[peakDay] }
      };

      return {
        hourlyDistribution,
        dailyDistribution,
        peaks,
        totalSessions: allVehicles.length
      };
    } catch (error) {
      throw new ServiceOperationError(`Failed to get usage patterns: ${(error as Error).message}`, 'getUsagePatterns');
    }
  }

  /**
   * Calculate statistics by spot type
   */
  private calculateStatsByType(spots: any[]): Record<SpotType, OccupancyStats> {
    const types: SpotType[] = ['compact', 'standard', 'oversized'];
    const stats: Record<SpotType, OccupancyStats> = {} as Record<SpotType, OccupancyStats>;

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
   */
  private calculateStatsByFloor(spots: any[]): Array<{
    floor: number;
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  }> {
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

    return Array.from(floorMap.entries()).map(([floor, stats]: [number, any]) => ({
      floor,
      ...stats,
      occupancyRate: stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0
    })).sort((a, b) => a.floor - b.floor);
  }

  /**
   * Calculate statistics by bay within a floor
   */
  private calculateStatsByBay(spots: any[]): Array<{
    bay: number;
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  }> {
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

    return Array.from(bayMap.entries()).map(([bay, stats]: [number, any]) => ({
      bay,
      ...stats,
      occupancyRate: stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0
    })).sort((a, b) => a.bay - b.bay);
  }

  /**
   * Calculate average parking duration
   */
  private calculateAverageDuration(vehicles: any[]): Duration {
    if (!vehicles || vehicles.length === 0) {
      return { hours: 0, minutes: 0, totalMinutes: 0 };
    }

    const completedVehicles = vehicles.filter((v: any) => v.checkOutTime);

    if (completedVehicles.length === 0) {
      // For currently parked vehicles, calculate current duration
      const totalMinutes = vehicles.reduce((sum: number, vehicle: any) => {
        const checkInTime = new Date(vehicle.checkInTime);
        const now = new Date();
        const durationMs = now.getTime() - checkInTime.getTime();
        return sum + Math.floor(durationMs / (1000 * 60));
      }, 0);

      const avgMinutes = Math.round(totalMinutes / vehicles.length);
      return {
        hours: Math.floor(avgMinutes / 60),
        minutes: avgMinutes % 60,
        totalMinutes: avgMinutes
      };
    }

    const totalMinutes = completedVehicles.reduce((sum: number, vehicle: any) => {
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
   */
  private calculatePeakOccupancy(vehicles: any[]): {
    current: number;
    estimated: number;
    utilizationRate: number;
  } {
    if (!vehicles || vehicles.length === 0) {
      return { current: 0, estimated: 0, utilizationRate: 0 };
    }

    const current = vehicles.filter((v: any) => !v.checkOutTime).length;
    const estimated = Math.max(current, vehicles.length);

    return {
      current,
      estimated,
      utilizationRate: estimated > 0 ? Math.round((current / estimated) * 100) : 0
    };
  }

  /**
   * Calculate revenue by vehicle type
   */
  private calculateRevenueByType(vehicles: any[]): Record<VehicleType, {
    revenue: Currency;
    sessions: number;
    average: Currency;
  }> {
    const typeRevenue: Record<string, { revenue: Currency; sessions: number; average?: Currency }> = {};

    vehicles.forEach((vehicle: any) => {
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

    return typeRevenue as Record<VehicleType, { revenue: Currency; sessions: number; average: Currency }>;
  }

  /**
   * Calculate revenue by rate type
   */
  private calculateRevenueByRate(vehicles: any[]): Record<RateType, {
    revenue: Currency;
    sessions: number;
    average: Currency;
  }> {
    const rateRevenue: Record<string, { revenue: Currency; sessions: number; average?: Currency }> = {};

    vehicles.forEach((vehicle: any) => {
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

    return rateRevenue as Record<RateType, { revenue: Currency; sessions: number; average: Currency }>;
  }
}

export default AnalyticsService;
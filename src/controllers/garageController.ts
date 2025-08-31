/**
 * Garage controller for handling garage management API endpoints
 *
 * This controller handles HTTP requests for garage configuration,
 * initialization, and management operations. It orchestrates between
 * the request/response layer and the garage service layer.
 *
 * @module GarageController
 */

import { NextFunction } from 'express';
import { 
  TypedRequest, 
  TypedResponse, 
  ApiResponse,
  GarageInitializationRequest,
  GarageConfiguration,
  GarageRates,
  GarageConfigUpdateRequest,
  GarageStatistics,
  AsyncControllerMethod
} from '../types/api';

const GarageService = require('../services/garageService');

interface GarageQueryParams {
  includeStats?: string;
  includeSpots?: string;
}

/**
 * Controller class for garage management endpoints
 */
class GarageController {
  private garageService: any;

  constructor() {
    this.garageService = new GarageService();
  }

  /**
   * GET /api/v1/garage - Get current garage configuration
   */
  async getGarageConfiguration(
    req: TypedRequest<never> & { query: GarageQueryParams }, 
    res: TypedResponse<GarageConfiguration>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { includeStats, includeSpots } = req.query;

      const configuration = await this.garageService.getGarageConfiguration({
        includeStats: includeStats === 'true',
        includeSpots: includeSpots === 'true'
      });

      res.json({
        success: true,
        data: configuration
      });
    } catch (error: any) {
      if (error.message?.includes('not initialized')) {
        res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first using POST /api/v1/garage/initialize'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve garage configuration',
        message: error.message || 'Unknown error occurred'
      });
    }
  }

  /**
   * POST /api/v1/garage/initialize - Initialize garage with floors, bays, and spots
   */
  async initializeGarage(
    req: TypedRequest<GarageInitializationRequest>, 
    res: TypedResponse<GarageConfiguration>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { name, floors } = req.body;

      const result = await this.garageService.initializeGarage({
        name,
        floors
      });

      res.status(201).json({
        success: true,
        message: 'Garage initialized successfully',
        data: result
      });
    } catch (error: any) {
      if (error.message?.includes('already initialized')) {
        res.status(409).json({
          success: false,
          error: 'Garage already exists',
          message: 'Garage is already initialized. Use update endpoints to modify configuration.'
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Garage initialization failed',
        message: error.message || 'Unknown error occurred'
      });
    }
  }

  /**
   * PUT /api/v1/garage/rates - Update garage pricing rates
   */
  async updateGarageRates(
    req: TypedRequest<Partial<GarageRates>>, 
    res: TypedResponse<{ updatedRates: Partial<GarageRates>; currentRates: GarageRates; updatedAt: string }>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const rateUpdates = req.body;

      const result = await this.garageService.updateGarageRates(rateUpdates);

      res.json({
        success: true,
        message: result.message,
        data: {
          updatedRates: result.updatedRates,
          currentRates: result.currentRates,
          updatedAt: result.updatedAt
        }
      });
    } catch (error: any) {
      if (error.message?.includes('not initialized')) {
        res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first using POST /api/v1/garage/initialize'
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Rate update failed',
        message: error.message || 'Unknown error occurred'
      });
    }
  }

  /**
   * PUT /api/v1/garage/config - Update garage configuration (name, etc.)
   */
  async updateGarageConfiguration(
    req: TypedRequest<GarageConfigUpdateRequest>, 
    res: TypedResponse<GarageConfiguration>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const configUpdates = req.body;

      const result = await this.garageService.updateGarageConfiguration(configUpdates);

      res.json({
        success: true,
        message: result.message,
        data: result.configuration
      });
    } catch (error: any) {
      if (error.message?.includes('not initialized')) {
        res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first using POST /api/v1/garage/initialize'
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Configuration update failed',
        message: error.message || 'Unknown error occurred'
      });
    }
  }

  /**
   * GET /api/v1/garage/statistics - Get comprehensive garage statistics
   */
  async getGarageStatistics(
    req: TypedRequest<never>, 
    res: TypedResponse<GarageStatistics>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const statistics = await this.garageService.getGarageStatistics();

      res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      if (error.message?.includes('not initialized')) {
        res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first using POST /api/v1/garage/initialize'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve garage statistics',
        message: error.message || 'Unknown error occurred'
      });
    }
  }

  /**
   * GET /api/v1/garage/status - Get garage initialization status
   */
  async getGarageStatus(
    req: TypedRequest<never>, 
    res: TypedResponse<{ initialized: boolean; message: string }>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const isInitialized = this.garageService.isGarageInitialized();

      res.json({
        success: true,
        data: {
          initialized: isInitialized,
          message: isInitialized
            ? 'Garage is initialized and ready for operations'
            : 'Garage is not initialized. Please initialize using POST /api/v1/garage/initialize'
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to check garage status',
        message: error.message || 'Unknown error occurred'
      });
    }
  }

  /**
   * DELETE /api/v1/garage/reset - Reset garage (clear all data)
   */
  async resetGarage(
    req: TypedRequest<never>, 
    res: TypedResponse<{ resetAt: string }>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const result = await this.garageService.resetGarage();

      res.json({
        success: true,
        message: result.message,
        data: {
          resetAt: result.timestamp
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to reset garage',
        message: error.message || 'Unknown error occurred'
      });
    }
  }

  /**
   * GET /api/v1/garage/rates - Get current garage rates
   */
  async getGarageRates(
    req: TypedRequest<never>, 
    res: TypedResponse<{ rates: GarageRates; lastUpdated: string }>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const configuration = await this.garageService.getGarageConfiguration();

      res.json({
        success: true,
        data: {
          rates: configuration.rates,
          lastUpdated: configuration.lastUpdated
        }
      });
    } catch (error: any) {
      if (error.message?.includes('not initialized')) {
        res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first using POST /api/v1/garage/initialize'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve garage rates',
        message: error.message || 'Unknown error occurred'
      });
    }
  }

  /**
   * GET /api/v1/garage/capacity - Get garage capacity information
   */
  async getGarageCapacity(
    req: TypedRequest<never>, 
    res: TypedResponse<{
      name: string;
      totalCapacity: number;
      totalFloors: number;
      floorsConfiguration: any[];
      occupancy: GarageStatistics;
    }>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const configuration = await this.garageService.getGarageConfiguration({ includeStats: true });

      res.json({
        success: true,
        data: {
          name: configuration.name,
          totalCapacity: configuration.totalCapacity,
          totalFloors: configuration.totalFloors,
          floorsConfiguration: configuration.floorsConfiguration,
          occupancy: configuration.statistics
        }
      });
    } catch (error: any) {
      if (error.message?.includes('not initialized')) {
        res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first using POST /api/v1/garage/initialize'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve garage capacity',
        message: error.message || 'Unknown error occurred'
      });
    }
  }
}

export = GarageController;
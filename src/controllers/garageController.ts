/**
 * Garage controller for handling garage management API endpoints
 * 
 * This controller handles HTTP requests for garage configuration,
 * initialization, and management operations. It orchestrates between
 * the request/response layer and the garage service layer.
 * 
 * @module GarageController
 */

import { Request, Response } from 'express';
const GarageService = require('../services/garageService');
import { 
  UpdateGarageConfigRequest,
  ApiResponse 
} from '../types/api';
import { GarageRecord } from '../types/models';

interface GarageInitRequest {
  name: string;
  floors: Array<{
    number: number;
    bays: number;
    spotsPerBay: number;
  }>;
}

interface GarageConfigQuery {
  includeStats?: string;
  includeSpots?: string;
}

/**
 * Controller class for garage management endpoints
 */
export class GarageController {
  private garageService: GarageService;

  constructor() {
    this.garageService = new GarageService();
  }

  /**
   * GET /api/v1/garage - Get current garage configuration
   */
  getGarageConfiguration = async (req: Request<{}, ApiResponse<GarageRecord>, {}, GarageConfigQuery>, res: Response<ApiResponse<GarageRecord>>): Promise<void> => {
    try {
      const { includeStats, includeSpots } = req.query;
      
      const configuration = await this.garageService.getGarageConfiguration({
        includeStats: includeStats === 'true',
        includeSpots: includeSpots === 'true'
      });

      res.json({
        success: true,
        data: configuration,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if ((error as Error).message.includes('not initialized')) {
        res.status(404).json({
          success: false,
          message: 'Garage not initialized',
          errors: ['Please initialize the garage first using POST /api/v1/garage/initialize'],
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve garage configuration',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /api/v1/garage/initialize - Initialize garage with floors, bays, and spots
   */
  initializeGarage = async (req: Request<{}, ApiResponse<GarageRecord>, GarageInitRequest>, res: Response<ApiResponse<GarageRecord>>): Promise<void> => {
    try {
      const { name, floors } = req.body;

      const result = await this.garageService.initializeGarage({
        name,
        floors
      });

      res.status(201).json({
        success: true,
        message: 'Garage initialized successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if ((error as Error).message.includes('already initialized')) {
        res.status(409).json({
          success: false,
          message: 'Garage already exists',
          errors: ['Garage is already initialized. Use update endpoints to modify configuration.'],
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: 'Garage initialization failed',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /api/v1/garage/rates - Update garage pricing rates
   */
  updateGarageRates = async (req: Request<{}, ApiResponse, Record<string, number>>, res: Response<ApiResponse>): Promise<void> => {
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
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if ((error as Error).message.includes('not initialized')) {
        res.status(404).json({
          success: false,
          message: 'Garage not initialized',
          errors: ['Please initialize the garage first using POST /api/v1/garage/initialize'],
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: 'Rate update failed',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /api/v1/garage/config - Update garage configuration (name, etc.)
   */
  updateGarageConfiguration = async (req: Request<{}, ApiResponse<GarageRecord>, UpdateGarageConfigRequest>, res: Response<ApiResponse<GarageRecord>>): Promise<void> => {
    try {
      const configUpdates = req.body;

      const result = await this.garageService.updateGarageConfiguration(configUpdates);

      res.json({
        success: true,
        message: result.message,
        data: result.configuration,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if ((error as Error).message.includes('not initialized')) {
        res.status(404).json({
          success: false,
          message: 'Garage not initialized',
          errors: ['Please initialize the garage first using POST /api/v1/garage/initialize'],
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: 'Configuration update failed',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/v1/garage/statistics - Get comprehensive garage statistics
   */
  getGarageStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const statistics = await this.garageService.getGarageStatistics();

      res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if ((error as Error).message.includes('not initialized')) {
        res.status(404).json({
          success: false,
          message: 'Garage not initialized',
          errors: ['Please initialize the garage first using POST /api/v1/garage/initialize'],
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve garage statistics',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/v1/garage/status - Get garage initialization status
   */
  getGarageStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const isInitialized = this.garageService.isGarageInitialized();

      res.json({
        success: true,
        data: {
          initialized: isInitialized,
          message: isInitialized 
            ? 'Garage is initialized and ready for operations'
            : 'Garage is not initialized. Please initialize using POST /api/v1/garage/initialize'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to check garage status',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * DELETE /api/v1/garage/reset - Reset garage (clear all data)
   */
  resetGarage = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.garageService.resetGarage();

      res.json({
        success: true,
        message: result.message,
        data: {
          resetAt: result.timestamp
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to reset garage',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/v1/garage/rates - Get current garage rates
   */
  getGarageRates = async (req: Request, res: Response): Promise<void> => {
    try {
      const configuration = await this.garageService.getGarageConfiguration();

      res.json({
        success: true,
        data: {
          rates: configuration.rates,
          lastUpdated: configuration.lastUpdated
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if ((error as Error).message.includes('not initialized')) {
        res.status(404).json({
          success: false,
          message: 'Garage not initialized',
          errors: ['Please initialize the garage first using POST /api/v1/garage/initialize'],
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve garage rates',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/v1/garage/capacity - Get garage capacity information
   */
  getGarageCapacity = async (req: Request, res: Response): Promise<void> => {
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
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if ((error as Error).message.includes('not initialized')) {
        res.status(404).json({
          success: false,
          message: 'Garage not initialized',
          errors: ['Please initialize the garage first using POST /api/v1/garage/initialize'],
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve garage capacity',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };
}
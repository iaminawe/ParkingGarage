/**
 * Garage controller for handling garage management API endpoints
 * 
 * This controller handles HTTP requests for garage configuration,
 * initialization, and management operations. It orchestrates between
 * the request/response layer and the garage service layer.
 * 
 * @module GarageController
 */

const GarageService = require('../services/garageService');

/**
 * Controller class for garage management endpoints
 */
class GarageController {
  constructor() {
    this.garageService = new GarageService();
  }

  /**
   * GET /api/v1/garage - Get current garage configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGarageConfiguration(req, res) {
    try {
      const { includeStats, includeSpots } = req.query;
      
      const configuration = await this.garageService.getGarageConfiguration({
        includeStats,
        includeSpots
      });

      res.json({
        success: true,
        data: configuration
      });
    } catch (error) {
      if (error.message.includes('not initialized')) {
        return res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first using POST /api/v1/garage/initialize'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve garage configuration',
        message: error.message
      });
    }
  }

  /**
   * POST /api/v1/garage/initialize - Initialize garage with floors, bays, and spots
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async initializeGarage(req, res) {
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
    } catch (error) {
      if (error.message.includes('already initialized')) {
        return res.status(409).json({
          success: false,
          error: 'Garage already exists',
          message: 'Garage is already initialized. Use update endpoints to modify configuration.'
        });
      }

      res.status(400).json({
        success: false,
        error: 'Garage initialization failed',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/v1/garage/rates - Update garage pricing rates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateGarageRates(req, res) {
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
    } catch (error) {
      if (error.message.includes('not initialized')) {
        return res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first using POST /api/v1/garage/initialize'
        });
      }

      res.status(400).json({
        success: false,
        error: 'Rate update failed',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/v1/garage/config - Update garage configuration (name, etc.)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateGarageConfiguration(req, res) {
    try {
      const configUpdates = req.body;

      const result = await this.garageService.updateGarageConfiguration(configUpdates);

      res.json({
        success: true,
        message: result.message,
        data: result.configuration
      });
    } catch (error) {
      if (error.message.includes('not initialized')) {
        return res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first using POST /api/v1/garage/initialize'
        });
      }

      res.status(400).json({
        success: false,
        error: 'Configuration update failed',
        message: error.message
      });
    }
  }

  /**
   * GET /api/v1/garage/statistics - Get comprehensive garage statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGarageStatistics(req, res) {
    try {
      const statistics = await this.garageService.getGarageStatistics();

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      if (error.message.includes('not initialized')) {
        return res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first using POST /api/v1/garage/initialize'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve garage statistics',
        message: error.message
      });
    }
  }

  /**
   * GET /api/v1/garage/status - Get garage initialization status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGarageStatus(req, res) {
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
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to check garage status',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/v1/garage/reset - Reset garage (clear all data)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetGarage(req, res) {
    try {
      const result = await this.garageService.resetGarage();

      res.json({
        success: true,
        message: result.message,
        data: {
          resetAt: result.timestamp
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to reset garage',
        message: error.message
      });
    }
  }

  /**
   * GET /api/v1/garage/rates - Get current garage rates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGarageRates(req, res) {
    try {
      const configuration = await this.garageService.getGarageConfiguration();

      res.json({
        success: true,
        data: {
          rates: configuration.rates,
          lastUpdated: configuration.lastUpdated
        }
      });
    } catch (error) {
      if (error.message.includes('not initialized')) {
        return res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first using POST /api/v1/garage/initialize'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve garage rates',
        message: error.message
      });
    }
  }

  /**
   * GET /api/v1/garage/capacity - Get garage capacity information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGarageCapacity(req, res) {
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
    } catch (error) {
      if (error.message.includes('not initialized')) {
        return res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first using POST /api/v1/garage/initialize'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve garage capacity',
        message: error.message
      });
    }
  }
}

module.exports = GarageController;
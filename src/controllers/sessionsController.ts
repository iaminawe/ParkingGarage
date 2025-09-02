/**
 * Sessions Controller
 *
 * Handles HTTP requests for parking session management operations.
 * This includes session listing, lifecycle management, analytics,
 * and data export functionality.
 *
 * @module SessionsController
 */

import { Request, Response } from 'express';
import { SessionsService } from '../services/sessionsService';
import { ApiResponse, PaginatedResponse, ParkingSession } from '../types/api';

export class SessionsController {
  private sessionsService: SessionsService;

  constructor() {
    this.sessionsService = new SessionsService();
  }

  /**
   * GET /api/sessions
   * Get all parking sessions with filtering and pagination
   */
  async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const {
        status = 'all',
        dateRange = 'all',
        search = '',
        limit = '50',
        offset = '0',
        sort = 'createdAt',
        order = 'desc',
      } = req.query;

      // Validate parameters
      const limitNum = Math.min(Math.max(parseInt(limit as string, 10) || 50, 1), 100);
      const offsetNum = Math.max(parseInt(offset as string, 10) || 0, 0);

      const validStatuses = ['all', 'active', 'completed', 'cancelled'];
      const validDateRanges = ['all', 'today', 'week', 'month', 'year'];
      const validSortFields = ['createdAt', 'endTime', 'duration', 'cost', 'licensePlate'];
      const validOrders = ['asc', 'desc'];

      if (!validStatuses.includes(status as string)) {
        res.status(400).json({
          success: false,
          message: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!validDateRanges.includes(dateRange as string)) {
        res.status(400).json({
          success: false,
          message: `Invalid dateRange filter. Must be one of: ${validDateRanges.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!validSortFields.includes(sort as string)) {
        res.status(400).json({
          success: false,
          message: `Invalid sort field. Must be one of: ${validSortFields.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!validOrders.includes(order as string)) {
        res.status(400).json({
          success: false,
          message: `Invalid order. Must be one of: ${validOrders.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get sessions from service
      const result = await this.sessionsService.getSessions({
        status: status as any,
        dateRange: dateRange as any,
        search: search as string,
        limit: limitNum,
        sort: sort as any,
        order: order as 'asc' | 'desc',
      });

      const response: ApiResponse<PaginatedResponse<ParkingSession[]>> = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('SessionsController.getSessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching sessions',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/sessions/stats
   * Get session statistics and analytics
   */
  async getSessionStats(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'all' } = req.query;

      const validPeriods = ['today', 'week', 'month', 'year', 'all'];
      if (!validPeriods.includes(period as string)) {
        res.status(400).json({
          success: false,
          message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const stats = await this.sessionsService.getSessionStats(period as any);

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('SessionsController.getSessionStats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching session statistics',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/sessions/analytics
   * Get detailed session analytics
   */
  async getSessionAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { type = 'revenue', period = 'week' } = req.query;

      const validTypes = ['revenue', 'duration', 'peak', 'trends'];
      const validPeriods = ['day', 'week', 'month', 'year'];

      if (!validTypes.includes(type as string)) {
        res.status(400).json({
          success: false,
          message: `Invalid analytics type. Must be one of: ${validTypes.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!validPeriods.includes(period as string)) {
        res.status(400).json({
          success: false,
          message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const analytics = await this.sessionsService.getSessionAnalytics(type as any, period as any);

      const response: ApiResponse<typeof analytics> = {
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('SessionsController.getSessionAnalytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching session analytics',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/sessions/:id
   * Get specific session details
   */
  async getSessionById(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Session ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const session = await this.sessionsService.getSessionById(id);

      if (!session) {
        res.status(404).json({
          success: false,
          message: `Session with ID '${id}' not found`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const response: ApiResponse<ParkingSession> = {
        success: true,
        data: session,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('SessionsController.getSessionById error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching session',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/sessions/:id/end
   * End an active parking session
   */
  async endSession(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason = 'Manual end' } = req.body;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Session ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.sessionsService.endSession(id, reason);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Session ended successfully',
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('SessionsController.endSession error:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (error.message.includes('not active')) {
          res.status(400).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error while ending session',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/sessions/:id/cancel
   * Cancel an active parking session
   */
  async cancelSession(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason = 'Manual cancellation' } = req.body;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Session ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.sessionsService.cancelSession(id, reason);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Session cancelled successfully',
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('SessionsController.cancelSession error:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error while cancelling session',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/sessions/:id/extend
   * Extend an active parking session
   */
  async extendSession(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { additionalHours } = req.body;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Session ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!additionalHours || typeof additionalHours !== 'number' || additionalHours <= 0) {
        res.status(400).json({
          success: false,
          message: 'Additional hours must be a positive number',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.sessionsService.extendSession(id, additionalHours);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: `Session extended by ${additionalHours} hour(s)`,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('SessionsController.extendSession error:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (error.message.includes('not active')) {
          res.status(400).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error while extending session',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/sessions/export/csv
   * Export sessions data as CSV
   */
  async exportSessionsCSV(req: Request, res: Response): Promise<void> {
    try {
      const { status = 'all', dateRange = 'all', search = '' } = req.query;

      const csvData = await this.sessionsService.exportSessionsCSV({
        status: status as any,
        dateRange: dateRange as any,
        search: search as string,
      });

      // Set headers for CSV download
      const filename = `parking-sessions-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csvData));

      res.send(csvData);
    } catch (error) {
      console.error('SessionsController.exportSessionsCSV error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while exporting sessions',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

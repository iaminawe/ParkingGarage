/**
 * Sessions management routes
 *
 * This module defines routes for parking session operations,
 * including listing sessions, managing session lifecycle,
 * and generating session analytics.
 *
 * @module SessionsRoutes
 */

import { Router, Request, Response } from 'express';
import { SessionsController } from '../controllers/sessionsController';
import {
  validateSessionId,
  validateSessionQuery,
  validateEndSessionRequest,
  validateCancelSessionRequest,
  validateExtendSessionRequest,
  validateSessionContentType,
  validateSessionRequestBody,
  sanitizeSessionRequest,
} from '../middleware/validation';

const router: Router = Router();
const sessionsController = new SessionsController();

/**
 * @route   GET /api/sessions
 * @desc    Get all parking sessions with filtering and pagination
 * @access  Public
 * @query   {string} [status] - Filter by session status (active|completed|cancelled)
 * @query   {string} [dateRange] - Filter by date range (today|week|month|all)
 * @query   {string} [search] - Search by license plate or vehicle info
 * @query   {number} [limit=50] - Number of sessions to return (1-100)
 * @query   {number} [offset=0] - Offset for pagination
 * @query   {string} [sort=createdAt] - Sort field (createdAt|endTime|duration|cost)
 * @query   {string} [order=desc] - Sort order (asc|desc)
 */
router.get(
  '/',
  sanitizeSessionRequest,
  validateSessionQuery,
  async (req: Request, res: Response): Promise<void> => {
    await sessionsController.getSessions(req, res);
  }
);

/**
 * @route   GET /api/sessions/stats
 * @desc    Get session statistics and analytics
 * @access  Public
 * @query   {string} [period] - Time period for stats (today|week|month|year|all)
 */
router.get(
  '/stats',
  sanitizeSessionRequest,
  validateSessionQuery,
  async (req: Request, res: Response): Promise<void> => {
    await sessionsController.getSessionStats(req, res);
  }
);

/**
 * @route   GET /api/sessions/analytics
 * @desc    Get detailed session analytics
 * @access  Public
 * @query   {string} [type] - Analytics type (revenue|duration|peak|trends)
 * @query   {string} [period] - Time period (day|week|month|year)
 */
router.get(
  '/analytics',
  sanitizeSessionRequest,
  validateSessionQuery,
  async (req: Request, res: Response): Promise<void> => {
    await sessionsController.getSessionAnalytics(req, res);
  }
);

/**
 * @route   GET /api/sessions/:id
 * @desc    Get specific session details
 * @access  Public
 * @param   {string} id - Session ID
 */
router.get(
  '/:id',
  validateSessionId,
  async (req: Request<{ id: any }>, res: Response): Promise<void> => {
    await sessionsController.getSessionById(req, res);
  }
);

/**
 * @route   POST /api/sessions/:id/end
 * @desc    End an active parking session
 * @access  Public
 * @param   {string} id - Session ID
 * @body    {string} [reason] - Optional reason for ending session
 */
router.post(
  '/:id/end',
  validateSessionContentType,
  validateSessionId,
  sanitizeSessionRequest,
  validateEndSessionRequest,
  async (req: Request<{ id: any }>, res: Response): Promise<void> => {
    await sessionsController.endSession(req, res);
  }
);

/**
 * @route   POST /api/sessions/:id/cancel
 * @desc    Cancel an active parking session
 * @access  Public
 * @param   {string} id - Session ID
 * @body    {string} [reason] - Optional reason for cancellation
 */
router.post(
  '/:id/cancel',
  validateSessionContentType,
  validateSessionId,
  sanitizeSessionRequest,
  validateCancelSessionRequest,
  async (req: Request<{ id: any }>, res: Response): Promise<void> => {
    await sessionsController.cancelSession(req, res);
  }
);

/**
 * @route   POST /api/sessions/:id/extend
 * @desc    Extend an active parking session
 * @access  Public
 * @param   {string} id - Session ID
 * @body    {number} additionalHours - Hours to extend the session
 */
router.post(
  '/:id/extend',
  validateSessionContentType,
  validateSessionId,
  sanitizeSessionRequest,
  validateSessionRequestBody,
  validateExtendSessionRequest,
  async (req: Request<{ id: any }>, res: Response): Promise<void> => {
    await sessionsController.extendSession(req, res);
  }
);

/**
 * @route   GET /api/sessions/export/csv
 * @desc    Export sessions data as CSV
 * @access  Public
 * @query   {string} [status] - Filter by session status
 * @query   {string} [dateRange] - Filter by date range
 * @query   {string} [search] - Search filter
 */
router.get(
  '/export/csv',
  sanitizeSessionRequest,
  validateSessionQuery,
  async (req: Request, res: Response): Promise<void> => {
    await sessionsController.exportSessionsCSV(req, res);
  }
);

export default router;

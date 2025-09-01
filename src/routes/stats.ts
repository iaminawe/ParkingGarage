/**
 * Statistics and analytics routes
 * 
 * This module defines routes for garage statistics, occupancy reports,
 * revenue analytics, usage patterns, and operational insights.
 * 
 * @module StatsRoutes
 */

import { Router, Request, Response } from 'express';
import { AsyncRouteHandler } from '../types/express';
import { StatsController } from '../controllers/statsController';

const router: Router = Router();
const statsController = new StatsController();

/**
 * @route   GET /api/v1/stats
 * @desc    Get comprehensive garage statistics
 * @access  Public
 * @returns {Object} Complete garage analytics including occupancy, types, floors
 * @example GET /api/v1/stats
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  await statsController.getGarageStats(req, res);
});

/**
 * @route   GET /api/v1/stats/occupancy
 * @desc    Get real-time occupancy summary
 * @access  Public
 * @returns {Object} Current occupancy statistics
 * @example GET /api/v1/stats/occupancy
 */
router.get('/occupancy', async (req: Request, res: Response): Promise<void> => {
  await statsController.getOccupancySummary(req, res);
});

/**
 * @route   GET /api/v1/stats/dashboard
 * @desc    Get dashboard summary with key metrics
 * @access  Public
 * @returns {Object} Dashboard overview with key performance indicators
 * @example GET /api/v1/stats/dashboard
 */
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  await statsController.getDashboardStats(req, res);
});

/**
 * @route   GET /api/v1/stats/trends
 * @desc    Get occupancy trends over time
 * @access  Public
 * @query   {number} [hours=24] - Hours to analyze (1-168, max 1 week)
 * @returns {Object} Occupancy trend analysis with hourly data
 * @example GET /api/v1/stats/trends?hours=48
 */
router.get('/trends', async (req: Request, res: Response): Promise<void> => {
  await statsController.getOccupancyTrends(req, res);
});

/**
 * @route   GET /api/v1/stats/revenue
 * @desc    Get revenue analytics
 * @access  Public
 * @query   {number} [days=7] - Days to analyze (1-365, max 1 year)
 * @returns {Object} Revenue analytics with breakdowns by type and rate
 * @example GET /api/v1/stats/revenue?days=30
 */
router.get('/revenue', async (req: Request, res: Response): Promise<void> => {
  await statsController.getRevenueAnalytics(req, res);
});

/**
 * @route   GET /api/v1/stats/usage
 * @desc    Get usage patterns and peak times
 * @access  Public
 * @returns {Object} Usage pattern analysis with hourly/daily distributions
 * @example GET /api/v1/stats/usage
 */
router.get('/usage', async (req: Request, res: Response): Promise<void> => {
  await statsController.getUsagePatterns(req, res);
});

/**
 * @route   GET /api/v1/stats/compare
 * @desc    Get comparative statistics (current vs previous period)
 * @access  Public
 * @query   {string} [period=day] - Period to compare (day|week|month)
 * @returns {Object} Comparative analytics showing growth trends
 * @example GET /api/v1/stats/compare?period=week
 */
router.get('/compare', async (req: Request, res: Response): Promise<void> => {
  await statsController.getComparativeStats(req, res);
});

/**
 * @route   GET /api/v1/stats/export
 * @desc    Export statistics data
 * @access  Public
 * @query   {string} [type=garage] - Data type to export (garage|revenue|usage)
 * @query   {string} [format=json] - Export format (json)
 * @returns {Object} Downloadable statistics data
 * @example GET /api/v1/stats/export?type=revenue&format=json
 */
router.get('/export', async (req: Request, res: Response): Promise<void> => {
  await statsController.exportStats(req, res);
});

/**
 * @route   GET /api/v1/stats/health
 * @desc    Get health check information
 * @access  Public
 * @returns {Object} Service health status and diagnostics
 * @example GET /api/v1/stats/health
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  await statsController.getHealthCheck(req, res);
});

/**
 * @route   GET /api/v1/stats/floor/:id
 * @desc    Get floor-specific statistics
 * @access  Public
 * @param   {number} id - Floor number
 * @returns {Object} Floor-specific analytics including occupancy and usage
 * @example GET /api/v1/stats/floor/1
 * @example GET /api/v1/stats/floor/2
 */
router.get('/floor/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  await statsController.getFloorStats(req, res);
});

export default router;

/**
 * Analytics routes
 *
 * This module defines routes for system analytics, including
 * system-wide statistics, garage analytics, and dashboard data.
 *
 * @module AnalyticsRoutes
 */

import { Router, Request, Response } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';

const router: Router = Router();
const analyticsController = new AnalyticsController();

/**
 * @route   GET /api/analytics/system
 * @desc    Get system-wide analytics and statistics
 * @access  Public
 * @returns {Object} System analytics including occupancy, revenue, utilization
 */
router.get('/system', async (req: Request, res: Response): Promise<void> => {
  await analyticsController.getSystemAnalytics(req, res);
});

/**
 * @route   GET /api/analytics/garages/:id
 * @desc    Get analytics for a specific garage
 * @access  Public
 * @param   {string} id - Garage ID
 */
router.get('/garages/:id', async (req: Request, res: Response): Promise<void> => {
  await analyticsController.getGarageAnalytics(req, res);
});

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard analytics summary
 * @access  Public
 * @returns {Object} Dashboard overview with key performance indicators
 */
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  await analyticsController.getDashboardAnalytics(req, res);
});

/**
 * @route   GET /api/analytics/occupancy-trends
 * @desc    Get occupancy trends over time
 * @access  Public
 * @query   {string} startDate - Start date for trend analysis
 * @query   {string} endDate - End date for trend analysis
 * @query   {string} period - Period grouping (hourly|daily|weekly|monthly)
 */
router.get('/occupancy-trends', async (req: Request, res: Response): Promise<void> => {
  await analyticsController.getOccupancyTrends(req, res);
});

/**
 * @route   GET /api/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Public
 * @query   {string} startDate - Start date for revenue analysis
 * @query   {string} endDate - End date for revenue analysis
 * @query   {string} groupBy - Group revenue data by (day|week|month|garage)
 */
router.get('/revenue', async (req: Request, res: Response): Promise<void> => {
  await analyticsController.getRevenueData(req, res);
});

/**
 * @route   GET /api/analytics/vehicle-types
 * @desc    Get vehicle type distribution analytics
 * @access  Public
 */
router.get('/vehicle-types', async (req: Request, res: Response): Promise<void> => {
  await analyticsController.getVehicleTypeDistribution(req, res);
});

/**
 * @route   GET /api/analytics/durations
 * @desc    Get parking duration analytics
 * @access  Public
 */
router.get('/durations', async (req: Request, res: Response): Promise<void> => {
  await analyticsController.getDurationDistribution(req, res);
});

/**
 * @route   GET /api/analytics/peak-hours
 * @desc    Get peak hours analytics
 * @access  Public
 */
router.get('/peak-hours', async (req: Request, res: Response): Promise<void> => {
  await analyticsController.getPeakHoursData(req, res);
});

/**
 * @route   GET /api/analytics/spot-utilization
 * @desc    Get spot utilization analytics
 * @access  Public
 */
router.get('/spot-utilization', async (req: Request, res: Response): Promise<void> => {
  await analyticsController.getSpotUtilization(req, res);
});

/**
 * @route   GET /api/analytics/export
 * @desc    Export analytics data
 * @access  Public
 * @query   {string} format - Export format (csv|pdf|excel)
 * @query   {string} startDate - Start date for export
 * @query   {string} endDate - End date for export
 */
router.get('/export', async (req: Request, res: Response): Promise<void> => {
  await analyticsController.exportAnalyticsReport(req, res);
});

export default router;
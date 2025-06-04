import express from 'express';
import asyncHandler from 'express-async-handler';
import { storage } from './storage';
import { apiResponse } from './api-response';
import { requireAuth } from './auth-middleware';
import { logger } from './logger';

const router = express.Router();

/**
 * Get favourites analytics data
 * GET /api/analytics/favourites
 */
router.get('/favourites', requireAuth, asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const category = req.query.category as string;
  
  try {
    // Get total favourites count
    const totalFavourites = await storage.getFavouritesCount();
    
    // Get unique users with favourites
    const totalUsers = await storage.getUsersWithFavouritesCount();
    
    // Calculate average favourites per user
    const avgFavouritesPerUser = totalUsers > 0 ? totalFavourites / totalUsers : 0;
    
    // Get growth rate (comparing with previous period)
    const previousPeriodFavourites = await storage.getFavouritesCountForPeriod(days * 2, days);
    const currentPeriodFavourites = await storage.getFavouritesCountForPeriod(days, 0);
    
    const favoritesGrowthRate = previousPeriodFavourites > 0 
      ? ((currentPeriodFavourites - previousPeriodFavourites) / previousPeriodFavourites) * 100
      : 0;

    const analyticsData = {
      totalFavourites,
      totalUsers,
      avgFavouritesPerUser,
      favoritesGrowthRate,
      period: `${days} days`
    };

    logger.info('Favourites analytics retrieved', { 
      userId: req.user?.id,
      period: days,
      totalFavourites,
      totalUsers
    });

    res.json(apiResponse.success(analyticsData));
  } catch (error) {
    logger.error('Failed to retrieve favourites analytics', { error, userId: req.user?.id });
    res.status(500).json(apiResponse.error('Failed to retrieve analytics data'));
  }
}));

/**
 * Get interaction analytics data
 * GET /api/analytics/interactions
 */
router.get('/interactions', requireAuth, asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  
  try {
    const interactionsByType = await storage.getInteractionsByType(days);
    const dailyInteractions = await storage.getDailyInteractions(days);
    
    const analyticsData = {
      interactionsByType,
      dailyInteractions,
      period: `${days} days`
    };

    logger.info('Interaction analytics retrieved', { 
      userId: req.user?.id,
      period: days,
      interactionTypes: interactionsByType.length
    });

    res.json(apiResponse.success(analyticsData));
  } catch (error) {
    logger.error('Failed to retrieve interaction analytics', { error, userId: req.user?.id });
    res.status(500).json(apiResponse.error('Failed to retrieve interaction analytics'));
  }
}));

/**
 * Export favourites analytics as CSV
 * GET /api/analytics/favourites/export
 */
router.get('/favourites/export', requireAuth, asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const format = req.query.format as string || 'csv';
  
  try {
    if (format !== 'csv') {
      return res.status(400).json(apiResponse.error('Only CSV format is supported'));
    }

    // Get detailed favourites data for export
    const favouritesData = await storage.getFavouritesForExport(days);
    
    // Generate CSV headers
    const csvHeaders = [
      'Product ID',
      'Product Name',
      'Category',
      'Favourite Count',
      'User ID',
      'User Email',
      'Date Added'
    ].join(',');

    // Generate CSV rows
    const csvRows = favouritesData.map(fav => [
      fav.productId,
      `"${fav.productName}"`,
      `"${fav.categoryName || 'N/A'}"`,
      fav.favouriteCount || 1,
      fav.userId,
      `"${fav.userEmail || 'N/A'}"`,
      fav.createdAt
    ].join(','));

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="favourites-analytics-${new Date().toISOString().split('T')[0]}.csv"`);
    
    logger.info('Favourites analytics exported', { 
      userId: req.user?.id,
      period: days,
      recordCount: csvRows.length
    });

    res.send(csvContent);
  } catch (error) {
    logger.error('Failed to export favourites analytics', { error, userId: req.user?.id });
    res.status(500).json(apiResponse.error('Failed to export analytics data'));
  }
}));

/**
 * Get abandoned cart analytics
 * GET /api/analytics/abandoned-carts
 */
router.get('/abandoned-carts', requireAuth, asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  
  try {
    const abandonedCarts = await storage.getAbandonedCartsAnalytics(days);
    
    const analyticsData = {
      totalAbandonedCarts: abandonedCarts.length,
      emailsSent: abandonedCarts.filter(cart => cart.emailSent).length,
      discountsApplied: abandonedCarts.filter(cart => cart.discountApplied).length,
      recoveryRate: abandonedCarts.length > 0 
        ? (abandonedCarts.filter(cart => cart.recovered).length / abandonedCarts.length) * 100 
        : 0,
      period: `${days} days`
    };

    logger.info('Abandoned cart analytics retrieved', { 
      userId: req.user?.id,
      period: days,
      totalCarts: analyticsData.totalAbandonedCarts
    });

    res.json(apiResponse.success(analyticsData));
  } catch (error) {
    logger.error('Failed to retrieve abandoned cart analytics', { error, userId: req.user?.id });
    res.status(500).json(apiResponse.error('Failed to retrieve abandoned cart analytics'));
  }
}));

export default router;
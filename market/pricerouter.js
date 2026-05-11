/**
 * Express Routes for Price Engine (Refactored)
 * 
 * ✅ INCLUDED ENDPOINTS:
 * - GET /api/market/prices - All current prices
 * - GET /api/market/prices/:symbol - Single price
 * - GET /api/market/assets - Available assets
 * - GET /api/market/history/:symbol - Price history
 * - GET /api/market/indicators/:symbol - Technical indicators
 * - GET /api/market/health - Engine status
 * 
 * ❌ REMOVED ENDPOINTS:
 * - POST /api/market/admin/start ✗
 * - POST /api/market/admin/stop ✗
 * - POST /api/market/admin/reset ✗
 * 
 * The Price Engine is now a system service and cannot be controlled via API.
 */

import express from 'express';
const router = express.Router();

/**
 * Initialize routes with price engine instance
 * Usage: const routes = require('./priceRoutes')(priceEngine);
 */
 export default (priceEngine) => {
  /**
   * GET /api/market/prices
   * Get all current prices
   */
  router.get('/prices', (req, res) => {
    try {
      const prices = priceEngine.getAllPrices();
      res.json({
        success: true,
        data: prices,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/market/prices/:symbol
   * Get price for a specific symbol
   */
  router.get('/prices/:symbol', (req, res) => {
    try {
      const { symbol } = req.params;
      const price = priceEngine.getPrice(symbol);
      
      res.json({
        success: true,
        data: price
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/market/assets
   * Get all available assets
   */
  router.get('/assets', (req, res) => {
    try {
      const assets = priceEngine.getAvailableAssets();
      res.json({
        success: true,
        data: assets
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/market/assets/:symbol
   * Get detailed asset info
   */
  router.get('/assets/:symbol', (req, res) => {
    try {
      const { symbol } = req.params;
      const assetInfo = priceEngine.getAssetInfo(symbol);
      
      res.json({
        success: true,
        data: assetInfo
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/market/history/:symbol
   * Get price history for a symbol
   * Query params: ?limit=100
   */
  router.get('/history/:symbol', (req, res) => {
    try {
      const { symbol } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      
      const history = priceEngine.getHistory(symbol, limit);
      
      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  });

  // === INDICATOR CODE (commented out - enable when needed) ===
  // /**
  //  * GET /api/market/indicators/:symbol
  //  * Get technical indicators
  //  * Query params: ?period=20
  //  */
  // router.get('/indicators/:symbol', (req, res) => {
  //   try {
  //     const { symbol } = req.params;
  //     const period = req.query.period ? parseInt(req.query.period) : 20;
  //     
  //     const indicators = priceEngine.getTechnicalIndicators(symbol, period);
  //     
  //     if (!indicators) {
  //       return res.status(400).json({
  //         success: false,
  //         error: 'Not enough data for indicators'
  //       });
  //     }
  //     
  //     res.json({
  //       success: true,
  //       data: indicators
  //     });
  //   } catch (error) {
  //     res.status(404).json({
  //       success: false,
  //       error: error.message
  //     });
  //   }
  // });
  // === END INDICATOR CODE ===

  /**
   * GET /api/market/health
   * Check if price engine is running and get status
   */
  router.get('/health', (req, res) => {
    try {
      const status = priceEngine.getStatus();
      res.json({
        success: true,
        status: status,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};

/**
 * REMOVED ADMIN ROUTES
 * 
 * The following endpoints have been removed for security and stability:
 * 
 * ❌ POST /api/market/admin/start
 *    Reason: Engine starts automatically with server
 * 
 * ❌ POST /api/market/admin/stop
 *    Reason: Engine cannot be stopped - it's a core service
 * 
 * ❌ POST /api/market/admin/reset
 *    Reason: Engine maintains continuous state - no reset
 * 
 * ---
 * 
 * The Price Engine is now treated as a system service:
 * - Automatically starts when server starts
 * - Runs continuously throughout application lifetime
 * - Cannot be controlled, stopped, or reset via API
 * - Only way to stop is to restart the server
 */
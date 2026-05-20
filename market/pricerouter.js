
import express from 'express';
const router = express.Router();


 export default (priceEngine) => {
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

  router.get('/candles/:symbol', (req, res) => {
    try {
      const { symbol } = req.params;
      const interval = req.query.interval ? parseInt(req.query.interval) : 300;
      const limit = req.query.limit ? parseInt(req.query.limit) : 200;
      
      const candles = priceEngine.getCandles(symbol, interval, limit);
      
      res.json({
        success: true,
        data: candles,
        count: candles.length
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  });

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

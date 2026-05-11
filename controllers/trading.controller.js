import * as TradingService from "../services/trading.service.js";

export const createTradingController = (priceEngine) => {
  const buy = async (req, res) => {
    try {
      const userId = req.user.id;
      const { symbol, quantity } = req.body;

      if (!symbol || !quantity) {
        return res.status(400).json({ error: "symbol and quantity are required" });
      }

      const priceData = priceEngine.getPrice(symbol);

      const currentPrice = priceData.last;
      const result = await TradingService.buyAsset(userId, symbol, quantity, currentPrice);

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  const sell = async (req, res) => {
    try {
      const userId = req.user.id;
      const { symbol, quantity } = req.body;

      if (!symbol || !quantity) {
        return res.status(400).json({ error: "symbol and quantity are required" });
      }

      const priceData = priceEngine.getPrice(symbol);

      const currentPrice = priceData.last;
      const result = await TradingService.sellAsset(userId, symbol, quantity, currentPrice);

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  const portfolio = async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await TradingService.getPortfolio(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const tradeHistory = async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const result = await TradingService.getTradeHistory(userId, limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const closedTrades = async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const result = await TradingService.getClosedTrades(userId, limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const performance = async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await TradingService.getPerformanceMetrics(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const statistics = async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await TradingService.getTradeStatistics(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  return {
    buy,
    sell,
    portfolio,
    tradeHistory,
    closedTrades,
    performance,
    statistics
  };
};

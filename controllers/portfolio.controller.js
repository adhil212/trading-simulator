import * as PortfolioService from "../services/portfolio.service.js";

export const createPortfolioController = (priceEngine) => {
  const dashboard = async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await PortfolioService.getPortfolioDashboard(priceEngine, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const portfolio = async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await PortfolioService.getPortfolioWithPrices(priceEngine, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const performance = async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await PortfolioService.getPortfolioPerformance(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const allocation = async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await PortfolioService.getPortfolioAllocation(priceEngine, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const dailyStats = async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await PortfolioService.getDailyStats(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const growth = async (req, res) => {
    try {
      const userId = req.user.id;
      const days = parseInt(req.query.days) || 7;
      const result = await PortfolioService.getPortfolioGrowth(userId, days);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const topAssets = async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 5;
      const result = await PortfolioService.getTopPerformingAssets(userId, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const worstAssets = async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 5;
      const result = await PortfolioService.getWorstPerformingAssets(userId, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const summary = async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await PortfolioService.getPortfolioSummary(priceEngine, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  return {
    dashboard,
    portfolio,
    performance,
    allocation,
    dailyStats,
    growth,
    topAssets,
    worstAssets,
    summary
  };
};

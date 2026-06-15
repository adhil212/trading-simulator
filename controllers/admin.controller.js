import * as AdminService from "../services/admin.service.js";

const SYMBOL_PATTERN = /^[A-Z][A-Z0-9_]{1,19}$/;

export function createAdminController(priceEngine) {
  const MAX_LIMIT = 1000;

  const getUsers = async (req, res) => {
    try {
      const search = req.query.search || "";
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, MAX_LIMIT);
      const offset = parseInt(req.query.offset, 10) || 0;
      const result = await AdminService.getUsers(search, limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const getUserById = async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await AdminService.getUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const wallet = await AdminService.getUserWallet(userId);
      const portfolio = await AdminService.getUserPortfolio(userId);
      const trades = await AdminService.getUserTrades(userId, 50, 0);
      const transactionsRes = await AdminService.getUserTransactions(userId, 50, 0);

      res.json({ user, wallet, portfolio, trades, transactions: transactionsRes });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };


  const getAllTrades = async (req, res) => {
    try {
      const filters = {
        user_id: req.query.user_id || null,
        symbol: req.query.symbol || null,
        type: req.query.type || null,
        date_from: req.query.date_from || null,
        date_to: req.query.date_to || null,
      };
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, MAX_LIMIT);
      const offset = parseInt(req.query.offset, 10) || 0;
      const result = await AdminService.getAllTrades(filters, limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const getStats = async (req, res) => {
    try {
      const stats = await AdminService.getPlatformStats();
      const topTraders = await AdminService.getTopTraders(10);
      const engineStatus = priceEngine ? priceEngine.getStatus() : null;
      const totalCommissions = await AdminService.getTotalCommissions();

      res.json({ ...stats, totalCommissions, topTraders, engineStatus });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };


  const getMarketStatus = async (req, res) => {
    try {
      if (!priceEngine) {
        return res.status(500).json({ error: "Price engine not available" });
      }
      const status = priceEngine.getStatus();
      const prices = priceEngine.getAllPrices();
      res.json({ status, prices });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const createAsset = async (req, res) => {
    try {
      const { symbol, name, type, basePrice, volatility, trend, maxTrend, minTrend, spread, trending, trendStrength } = req.body;
      if (!symbol || !name || !type || basePrice === undefined || volatility === undefined || maxTrend === undefined || minTrend === undefined || spread === undefined) {
        return res.status(400).json({ error: 'Missing required fields: symbol, name, type, basePrice, volatility, maxTrend, minTrend, spread' });
      }
      if (!SYMBOL_PATTERN.test(symbol)) {
        return res.status(400).json({ error: 'Symbol must start with uppercase letter, contain only uppercase letters, numbers, and underscores (max 20 chars)' });
      }
      if (!['forex', 'commodity', 'crypto', 'index'].includes(type)) {
        return res.status(400).json({ error: 'Type must be one of: forex, commodity, crypto, index' });
      }
      const result = await priceEngine.addAsset(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  const updateAsset = async (req, res) => {
    try {
      const result = await priceEngine.updateAsset(req.params.symbol, req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  const removeAsset = async (req, res) => {
    try {
      const result = await priceEngine.removeAsset(req.params.symbol);
      res.json(result);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  };

  const listAssets = async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const assets = await AdminService.getAssetsFromDB(includeInactive);
      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const getCommissions = async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, MAX_LIMIT);
      const offset = parseInt(req.query.offset, 10) || 0;
      const result = await AdminService.getCommissionHistory(limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const getTransactions = async (req, res) => {
    try {
      const filters = {
        type: req.query.type || null,
        status: req.query.status || null,
        user_id: req.query.user_id || null,
        date_from: req.query.date_from || null,
        date_to: req.query.date_to || null,
      };
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, MAX_LIMIT);
      const offset = parseInt(req.query.offset, 10) || 0;
      const result = await AdminService.getAllTransactions(filters, limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const getWithdrawalRequests = async (req, res) => {
    try {
      const status = req.query.status || "PENDING";
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, MAX_LIMIT);
      const offset = parseInt(req.query.offset, 10) || 0;
      const result = await AdminService.getWithdrawalRequests(status, limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const approveWithdrawal = async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const adminId = req.user.id;
      const result = await AdminService.approveWithdrawal(id, adminId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const rejectWithdrawal = async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await AdminService.rejectWithdrawal(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const getUserTransactions = async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, MAX_LIMIT);
      const offset = parseInt(req.query.offset, 10) || 0;
      const result = await AdminService.getUserTransactions(userId, limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const deleteUser = async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const result = await AdminService.deleteUser(userId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  return {
    getUsers,
    getUserById,
    getAllTrades,
    getStats,
    getCommissions,
    getTransactions,
    getWithdrawalRequests,
    approveWithdrawal,
    rejectWithdrawal,
    getUserTransactions,
    deleteUser,
    getMarketStatus,
    createAsset,
    updateAsset,
    removeAsset,
    listAssets,
  };
}

import EventEmitter from "events";
const ASSETS = {
  EUR_USD: {
    name: 'EUR/USD',
    type: 'forex',
    basePrice: 1.0850,
    volatility: 0.008,      
    trend: 0.0002,
    maxTrend: 0.0008,
    minTrend: -0.0008,
    spread: 0.0003,
    trending: true,
    trendStrength: 0.5
  },
  GOLD_USD: {
    name: 'Gold (XAU/USD)',
    type: 'commodity',
    basePrice: 2050,
    volatility: 0.002,     
    trend: 0.0001,
    maxTrend: 0.0006,
    minTrend: -0.0006,
    spread: 0.05,
    trending: false,
    trendStrength: 0.3
  },
  BTC_USD: {
    name: 'Bitcoin (BTC/USD)',
    type: 'crypto',
    basePrice: 45000,
    volatility: 0.005,      
    trend: 0.0003,
    maxTrend: 0.002,
    minTrend: -0.002,
    spread: 5,
    trending: true,
    trendStrength: 0.7
  },
  SPX: {
    name: 'S&P 500 Index',
    type: 'index',
    basePrice: 5200,
    volatility: 0.015,      
    trend: 0.00008,
    maxTrend: 0.0005,
    minTrend: -0.0005,
    spread: 0.5,
    trending: true,
    trendStrength: 0.4
  },
  OIL_USD: {
    name: 'Crude Oil (WTI)',
    type: 'commodity',
    basePrice: 82.5,
    volatility: 0.025,      
    trend: 0.0002,
    maxTrend: 0.0012,
    minTrend: -0.0012,
    spread: 0.02,
    trending: false,
    trendStrength: 0.45
  }
};

class PriceEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.assets = JSON.parse(JSON.stringify(ASSETS)); // Deep copy
    this.priceHistory = {}; // Store price history for each asset
    this.maxHistoryLength = options.maxHistoryLength || 1440; // 24 hours of 1-min data
    this.updateInterval = options.updateInterval || 1000; // 1 second updates
    this.simulationSpeed = options.simulationSpeed || 1; // Speed multiplier
    
    
    Object.keys(this.assets).forEach(assetsymbol => {
      this.priceHistory[assetsymbol] = [];
    });
    
   
    this.isRunning = false;
    this.timer = null;
    this._startAttempts = 0;
    
    // Store current prices with bid/ask
    this.currentPrices = {};
    this.initializePrices();
  }

 
  initializePrices() {
    Object.keys(this.assets).forEach(symbol => {
      const asset = this.assets[symbol];
      this.currentPrices[symbol] = {
        symbol,
        name: asset.name,
        bid: asset.basePrice - (asset.spread / 2),
        ask: asset.basePrice + (asset.spread / 2),
        last: asset.basePrice,
        change: 0,
        changePercent: 0,
        high: asset.basePrice,
        low: asset.basePrice,
        volume: 0,
        timestamp: new Date(),
        volatility: asset.volatility
      };
    });
  }
   
 
  updateAssetPrice(symbol) {
    const asset = this.assets[symbol];
    const currentPrice = this.currentPrices[symbol];
    
   
    const trendChange = (Math.random() - 0.5) * 0.0002 * this.simulationSpeed;
    const meanReversion = asset.basePrice - currentPrice.last;
    asset.trend += trendChange;
    asset.trend = Math.max(asset.minTrend, Math.min(asset.maxTrend, asset.trend));
    asset.trend *= 0.98; 
    
    // 2. VOLATILITY COMPONENT
    // Use Gaussian distribution for realistic price movements
    const volatilityAdjusted = asset.volatility * (0.8 + Math.random() * 0.4); 
    const randomMove = this.gaussianRandom() * volatilityAdjusted;
    
    // 3. DEMAND/MOMENTUM COMPONENT (optional spike)
    let demandFactor = 0;
    if (Math.random() > 0.95) { // 5% chance of demand spike
      demandFactor = (Math.random() - 0.5) * 0.002 * this.simulationSpeed;
    }
    
    // 4. COMBINE ALL COMPONENTS
    const priceChange = (asset.trend + randomMove + demandFactor) * currentPrice.last;
    const newPrice = currentPrice.last + priceChange;
    
    // 5. CALCULATE NEW PRICES WITH SPREAD
    const bid = newPrice - (asset.spread / 2);
    const ask = newPrice + (asset.spread / 2);
    
    // Update metrics
    const previousPrice = currentPrice.last;
    const change = newPrice - asset.basePrice;
    const changePercent = (change / asset.basePrice) * 100;
    
    currentPrice.bid = bid;
    currentPrice.ask = ask;
    currentPrice.last = newPrice;
    currentPrice.change = change;
    currentPrice.changePercent = changePercent;
    currentPrice.high = Math.max(currentPrice.high, newPrice);
    currentPrice.low = Math.min(currentPrice.low, newPrice);
    currentPrice.volume += Math.floor(Math.random() * 100000);
    currentPrice.timestamp = new Date();
    currentPrice.volatility = volatilityAdjusted;
    
    // Store in history
    this.priceHistory[symbol].push({
      time: currentPrice.timestamp,
      open: previousPrice,
      high: currentPrice.high,
      low: currentPrice.low,
      close: newPrice,
      bid,
      ask,
      volume: Math.floor(Math.random() * 100000)
    });
    
    // Keep history within limit
    if (this.priceHistory[symbol].length > this.maxHistoryLength) {
      this.priceHistory[symbol].shift();
    }
    
    return currentPrice;
  }

  /**
   * Box-Muller transform for Gaussian random numbers
   */
  gaussianRandom() {
    let u1 = 0 
    let u2 = 0
    while (u1 === 0) u1 = Math.random(); // Converting [0,1) to (0,1)
    while (u2 === 0) u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0;
  }

  /**
   * Update all asset prices
   */
  updateAllPrices() {
    const updates = {};
    
    Object.keys(this.assets).forEach(symbol => {
      updates[symbol] = this.updateAssetPrice(symbol);
    });
    
    // Emit price update event
    this.emit('priceUpdate', updates);
    
    return updates;
  }

  /**
   * Start the price engine (INTERNAL USE ONLY)
   * 
   * ⚠️ PROTECTED METHOD - DO NOT CALL EXTERNALLY
   * This is automatically called by the system on startup.
   * Multiple calls are safely handled (idempotent).
   * 
   * @private
   */
  start() {
    // Prevent multiple starts
    if (this.isRunning) {
      console.log('ℹ️  Price Engine already running');
      return;
    }
    
    // Guard against external calls
    this._startAttempts++;
    if (this._startAttempts > 1) {
      console.warn('⚠️  Attempted to start Price Engine multiple times. Ignoring.');
      return;
    }
    
    this.isRunning = true;
    console.log(' Price Engine Started');
    console.log(' Market Simulation: EUR/USD, Gold, Bitcoin, S&P 500, Crude Oil');
    console.log('⏱ Update Interval: ' + this.updateInterval + 'ms');
    
    this.timer = setInterval(() => {
      this.updateAllPrices();
    }, this.updateInterval);
  }

  /**
   * Stop the price engine (DISABLED - NO-OP)
   * 
   * ❌ This method is disabled and does nothing.
   * The Price Engine is a core system service and cannot be stopped.
   * It will run continuously for the lifetime of the application.
   * 
   * @deprecated - Not supported in production mode
   */
  stop() {
    console.warn('⚠️  Price Engine cannot be manually stopped.');
    console.warn('ℹ️  The engine is a core system service.');
    console.log('💡 To shut down, restart the application server.');
    // Intentionally does nothing
  }

  /**
   * Reset the price engine (DISABLED - NO-OP)
   * 
   * ❌ This method is disabled and does nothing.
   * The Price Engine maintains continuous state and cannot be reset.
   * 
   * @deprecated - Not supported in production mode
   */
  reset() {
    console.warn('⚠️  Price Engine cannot be reset.');
    console.warn('ℹ️  Historical data and price state are continuous and persistent.');
    // Intentionally does nothing
  }

  /**
   * Get current price for a symbol
   */
  getPrice(symbol) {
    if (!this.currentPrices[symbol]) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    return { ...this.currentPrices[symbol] };
  }

  /**
   * Get all current prices
   */
  getAllPrices() {
    const prices = {};
    Object.keys(this.currentPrices).forEach(symbol => {
      prices[symbol] = { ...this.currentPrices[symbol] };
    });
    return prices;
  }

  /**
   * Get price history for a symbol
   */
  getHistory(symbol, limit = 100) {
    if (!this.priceHistory[symbol]) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    return this.priceHistory[symbol].slice(-limit);
  }

  /**
   * Get asset info
   */
  getAssetInfo(symbol) {
    if (!this.assets[symbol]) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    return {
      symbol,
      name: this.assets[symbol].name,
      type: this.assets[symbol].type,
      basePrice: this.assets[symbol].basePrice,
      volatility: this.assets[symbol].volatility
    };
  }

  /**
   * Get all available assets
   */
  getAvailableAssets() {
    return Object.keys(this.assets).map(symbol => ({
      symbol,
      name: this.assets[symbol].name,
      type: this.assets[symbol].type
    }));
  }

  /**
   * Get engine status (read-only)
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      updateInterval: this.updateInterval,
      simulationSpeed: this.simulationSpeed,
      assetsCount: Object.keys(this.assets).length,
      historySize: Object.keys(this.priceHistory).reduce(
        (sum, symbol) => sum + this.priceHistory[symbol].length,
        0
      ),
      uptime: process.uptime()
    };
  }

  /**
   * Calculate technical indicators
   */
  getTechnicalIndicators(symbol, period = 20) {
    const history = this.getHistory(symbol, period);
    if (history.length === 0) return null;
    
    const closes = history.map(h => h.close);
    const sma = closes.reduce((a, b) => a + b) / closes.length;
    
    const variance = closes.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / closes.length;
    const stdDev = Math.sqrt(variance);
    
    // RSI calculation (simplified)
    let gains = 0, losses = 0;
    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    const rs = (gains / closes.length) / (losses / closes.length);
    const rsi = 100 - (100 / (1 + rs));
    
    return {
      sma,
      stdDev,
      rsi: isNaN(rsi) ? 50 : rsi,
      volume: history[history.length - 1].volume,
      trend: this.assets[symbol].trend
    };
  }
}

 export default PriceEngine
import EventEmitter from "events";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SNAPSHOT_PATH = join(__dirname, 'price_snapshot.json');

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

    this.assets = JSON.parse(JSON.stringify(ASSETS));
    this.priceHistory = {};
    this.maxHistoryLength = options.maxHistoryLength || 27600;
    this.updateInterval = options.updateInterval || 1000;
    this.simulationSpeed = options.simulationSpeed || 1;

    Object.keys(this.assets).forEach(symbol => {
      this.priceHistory[symbol] = [];
    });

    this.isRunning = false;
    this.timer = null;

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

    this.loadPrices();
  }

  gaussianRandom() {
    let u1 = 0;
    let u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  updateAssetPrice(symbol) {
    const asset = this.assets[symbol];
    const currentPrice = this.currentPrices[symbol];

    const trendChange = (Math.random() - 0.5) * 0.0002 * this.simulationSpeed;
    asset.trend += trendChange;
    asset.trend = Math.max(asset.minTrend, Math.min(asset.maxTrend, asset.trend));
    asset.trend *= 0.98;

    const volatilityAdjusted = asset.volatility * (0.8 + Math.random() * 0.4);
    const randomMove = this.gaussianRandom() * volatilityAdjusted;

    let demandFactor = 0;
    if (Math.random() > 0.95) {
      demandFactor = (Math.random() - 0.5) * 0.002 * this.simulationSpeed;
    }

    const priceChange = (asset.trend + randomMove + demandFactor) * currentPrice.last;
    const newPrice = currentPrice.last + priceChange;

    const bid = newPrice - (asset.spread / 2);
    const ask = newPrice + (asset.spread / 2);

    const previousPrice = currentPrice.last;
    const change = newPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;

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

    this.priceHistory[symbol].push({
      time: currentPrice.timestamp,
      open: previousPrice,
      high: currentPrice.high,
      low: currentPrice.low,
      close: newPrice,
      bid,
      ask,
      volume: currentPrice.volume
    });

    if (this.priceHistory[symbol].length > this.maxHistoryLength) {
      this.priceHistory[symbol].shift();
    }

    return currentPrice;
  }

  updateAllPrices() {
    const updates = {};

    Object.keys(this.assets).forEach(symbol => {
      updates[symbol] = this.updateAssetPrice(symbol);
    });

    this.emit('priceUpdate', updates);

    return updates;
  }

  start() {
    if (this.isRunning) {
      console.log('Price Engine already running');
      return;
    }

    this.isRunning = true;
    console.log('Price Engine Started');
    console.log('Market Simulation: EUR/USD, Gold, Bitcoin, S&P 500, Crude Oil');
    console.log('Update Interval: ' + this.updateInterval + 'ms');

    this.timer = setInterval(() => {
      this.updateAllPrices();
    }, this.updateInterval);
  }

  savePrices() {
    try {
      const snapshot = {};
      Object.keys(this.currentPrices).forEach(symbol => {
        snapshot[symbol] = {
          ...this.currentPrices[symbol],
          timestamp: this.currentPrices[symbol].timestamp.toISOString()
        };
      });
      fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
      console.log('Price snapshot saved');
    } catch (error) {
      console.error('Failed to save price snapshot:', error.message);
    }
  }

  loadPrices() {
    try {
      if (!fs.existsSync(SNAPSHOT_PATH)) return false;

      const data = fs.readFileSync(SNAPSHOT_PATH, 'utf-8');
      const snapshot = JSON.parse(data);

      Object.keys(snapshot).forEach(symbol => {
        if (!this.currentPrices[symbol]) return;

        const saved = snapshot[symbol];
        const basePrice = this.assets[symbol].basePrice;

        this.currentPrices[symbol] = {
          ...this.currentPrices[symbol],
          bid: saved.bid,
          ask: saved.ask,
          last: saved.last,
          high: saved.high,
          low: saved.low,
          volume: saved.volume,
          timestamp: new Date(saved.timestamp),
          volatility: saved.volatility,
          change: saved.last - basePrice,
          changePercent: ((saved.last - basePrice) / basePrice) * 100
        };

        this.priceHistory[symbol].push({
          time: new Date(saved.timestamp),
          open: saved.last,
          high: saved.high,
          low: saved.low,
          close: saved.last,
          bid: saved.bid,
          ask: saved.ask,
          volume: saved.volume
        });
      });

      fs.unlinkSync(SNAPSHOT_PATH);
      console.log('Price snapshot loaded');
      return true;
    } catch (error) {
      console.error('Failed to load price snapshot:', error.message);
      return false;
    }
  }

  stop() {
    console.warn('Price Engine cannot be manually stopped.');
  }

  getPrice(symbol) {
    if (!this.currentPrices[symbol]) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    return { ...this.currentPrices[symbol] };
  }

  getAllPrices() {
    const prices = {};
    Object.keys(this.currentPrices).forEach(symbol => {
      prices[symbol] = { ...this.currentPrices[symbol] };
    });
    return prices;
  }

  getHistory(symbol, limit = 100) {
    if (!this.priceHistory[symbol]) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    return this.priceHistory[symbol].slice(-limit);
  }

  getCandles(symbol, intervalSeconds = 300, limit = 200) {
    if (!this.priceHistory[symbol]) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    const ticks = this.priceHistory[symbol];
    if (ticks.length === 0) return [];

    const buckets = new Map();

    for (let i = 0; i < ticks.length; i++) {
      const tick = ticks[i];
      const tickTime = Math.floor(tick.time.getTime() / 1000);
      const bucket = Math.floor(tickTime / intervalSeconds) * intervalSeconds;
      const tickHigh = Math.max(tick.open, tick.close);
      const tickLow = Math.min(tick.open, tick.close);
      const volDelta = i > 0 ? tick.volume - ticks[i - 1].volume : tick.volume;

      if (!buckets.has(bucket)) {
        buckets.set(bucket, {
          time: bucket,
          open: tick.open,
          high: tickHigh,
          low: tickLow,
          close: tick.close,
          volume: volDelta,
        });
      } else {
        const c = buckets.get(bucket);
        c.high = Math.max(c.high, tickHigh);
        c.low = Math.min(c.low, tickLow);
        c.close = tick.close;
        c.volume += volDelta;
      }
    }

    return Array.from(buckets.values()).sort((a, b) => a.time - b.time).slice(-limit);
  }

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

  getAvailableAssets() {
    return Object.keys(this.assets).map(symbol => ({
      symbol,
      name: this.assets[symbol].name,
      type: this.assets[symbol].type
    }));
  }

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
}

export default PriceEngine
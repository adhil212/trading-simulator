import EventEmitter from "events";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import * as AdminService from "../services/admin.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SNAPSHOT_PATH = join(__dirname, 'price_snapshot.json');



class PriceEngine extends EventEmitter {
  constructor(options = {}) {
    super();

    this.assets = {};
    this.priceHistory = {};
    this.currentPrices = {};
    this.maxHistoryLength = options.maxHistoryLength || 27600;
    this.updateInterval = options.updateInterval || 1000;
    this.simulationSpeed = options.simulationSpeed || 1;
    this.isRunning = false;
    this.timer = null;
  }

  async init() {
    await this.loadAssetsFromDB();
    this.initializePrices();
  }

  async loadAssetsFromDB() {
    try {
      const dbAssets = await AdminService.getAssetsFromDB();
      this.assets = {};
      for (const row of dbAssets) {
        this.assets[row.symbol] = {
          name: row.name,
          type: row.type,
          basePrice: parseFloat(row.base_price),
          volatility: parseFloat(row.volatility),
          trend: parseFloat(row.trend),
          maxTrend: parseFloat(row.max_trend),
          minTrend: parseFloat(row.min_trend),
          spread: parseFloat(row.spread),
          trending: row.trending,
          trendStrength: parseFloat(row.trend_strength)
        };
        this.priceHistory[row.symbol] = [];
      }
      if (dbAssets.length === 0) {
        console.warn('Assets table is empty. Add assets via admin UI.');
      }
      console.log(`Loaded ${Object.keys(this.assets).length} assets from DB`);
    } catch (err) {
      console.error('Failed to load assets from DB:', err.message);
      this.assets = {};
    }
  }

  initializePrices() {
    Object.keys(this.assets).forEach(symbol => this.initializePriceForSymbol(symbol));
    this.loadPrices();
  }

  initializePriceForSymbol(symbol) {
    const asset = this.assets[symbol];
    if (!asset) return;
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
  }

  async addAsset(data) {
    if (this.assets[data.symbol]) {
      throw new Error(`Symbol ${data.symbol} already exists`);
    }
    const row = await AdminService.insertAsset({
      symbol: data.symbol,
      name: data.name,
      type: data.type,
      base_price: data.basePrice,
      volatility: data.volatility,
      trend: data.trend || 0,
      max_trend: data.maxTrend,
      min_trend: data.minTrend,
      spread: data.spread,
      trending: data.trending || false,
      trend_strength: data.trendStrength != null ? data.trendStrength : 0.5
    });
    if (!row) throw new Error(`Symbol ${data.symbol} already exists in DB`);

    this.assets[data.symbol] = {
      name: row.name,
      type: row.type,
      basePrice: parseFloat(row.base_price),
      volatility: parseFloat(row.volatility),
      trend: parseFloat(row.trend),
      maxTrend: parseFloat(row.max_trend),
      minTrend: parseFloat(row.min_trend),
      spread: parseFloat(row.spread),
      trending: row.trending,
      trendStrength: parseFloat(row.trend_strength)
    };
    this.priceHistory[data.symbol] = [];
    this.initializePriceForSymbol(data.symbol);
    return { symbol: data.symbol, ...this.assets[data.symbol] };
  }

  async updateAsset(symbol, data) {
    if (!this.assets[symbol]) throw new Error(`Symbol ${symbol} not found`);
    const dbData = {};
    const fieldMap = {
      name: 'name', type: 'type', basePrice: 'base_price',
      volatility: 'volatility', trend: 'trend',
      maxTrend: 'max_trend', minTrend: 'min_trend',
      spread: 'spread', trending: 'trending',
      trendStrength: 'trend_strength'
    };
    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) dbData[dbKey] = data[key];
    }
    await AdminService.updateAssetInDB(symbol, dbData);
    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) this.assets[symbol][key] = data[key];
    }
    return { symbol, ...this.assets[symbol] };
  }

  async removeAsset(symbol) {
    if (!this.assets[symbol]) throw new Error(`Symbol ${symbol} not found`);
    await AdminService.deleteAsset(symbol);
    delete this.assets[symbol];
    delete this.currentPrices[symbol];
    delete this.priceHistory[symbol];
    return { symbol, removed: true };
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
    console.log(`Simulating ${Object.keys(this.assets).length} assets`);
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
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('Price Engine stopped.');
  }

  setPrice(symbol, price) {
    if (!this.currentPrices[symbol]) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    const current = this.currentPrices[symbol];
    const asset = this.assets[symbol];
    current.last = price;
    current.bid = price - (asset.spread / 2);
    current.ask = price + (asset.spread / 2);
    current.timestamp = new Date();
    return current;
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
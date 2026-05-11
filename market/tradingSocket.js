import * as TradingService from "../services/trading.service.js";

export default (io, priceEngine) => {
  io.on('connection', (socket) => {
    socket.on('buy', async (data, callback) => {
      try {
        const { token, symbol, quantity } = data;
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        const priceData = priceEngine.getPrice(symbol);
        const result = await TradingService.buyAsset(decoded.id, symbol, quantity, priceData.last);
        callback(result);
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('sell', async (data, callback) => {
      try {
        const { token, symbol, quantity } = data;
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        const priceData = priceEngine.getPrice(symbol);
        const result = await TradingService.sellAsset(decoded.id, symbol, quantity, priceData.last);
        callback(result);
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('getPortfolio', async (data, callback) => {
      try {
        const { token } = data;
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        const result = await TradingService.getPortfolio(decoded.id);
        callback(result);
      } catch (error) {
        callback({ error: error.message });
      }
    });
  });
};
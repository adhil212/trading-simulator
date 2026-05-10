/**
 * Socket.io Integration for Real-Time Price Updates
 * Handles WebSocket connections and broadcasts price updates
 */

 export default (io, priceEngine) =>  {
  // Store connected clients and their subscriptions
  const clientSubscriptions = new Map();

  /**
   * Listen for price updates and broadcast to connected clients
   */
  priceEngine.on('priceUpdate', (updates) => {
    io.emit('priceUpdate', updates);
  });

  /**
   * Handle WebSocket connections
   */
  io.on('connection', (socket) => {
    console.log(`📱 Client connected: ${socket.id}`);

    // Initialize client subscriptions
    clientSubscriptions.set(socket.id, new Set());

    /**
     * EVENT: subscribePrices
     * Client subscribes to specific symbols
     * Expected data: { symbols: ['EUR_USD', 'BTC_USD'] }
     */
    socket.on('subscribePrices', (data) => {
      try {
        const { symbols } = data;
        const clientSubs = clientSubscriptions.get(socket.id);

        symbols.forEach(symbol => {
          clientSubs.add(symbol);
        });

        socket.emit('subscriptionConfirmed', {
          success: true,
          symbols: Array.from(clientSubs),
          message: `Subscribed to ${symbols.length} assets`
        });

        console.log(`✅ Client ${socket.id} subscribed to: ${symbols.join(', ')}`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * EVENT: unsubscribePrices
     * Client unsubscribes from specific symbols
     */
    socket.on('unsubscribePrices', (data) => {
      try {
        const { symbols } = data;
        const clientSubs = clientSubscriptions.get(socket.id);

        symbols.forEach(symbol => {
          clientSubs.delete(symbol);
        });

        socket.emit('unsubscriptionConfirmed', {
          success: true,
          symbols: Array.from(clientSubs)
        });

        console.log(`❌ Client ${socket.id} unsubscribed from: ${symbols.join(', ')}`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * EVENT: getPrice
     * Client requests current price for a symbol
     */
    socket.on('getPrice', (data) => {
      try {
        const { symbol } = data;
        const price = priceEngine.getPrice(symbol);

        socket.emit('priceData', {
          success: true,
          data: price
        });
      } catch (error) {
        socket.emit('error', {
          success: false,
          message: error.message
        });
      }
    });

    /**
     * EVENT: getAllPrices
     * Client requests all current prices
     */
    socket.on('getAllPrices', () => {
      try {
        const prices = priceEngine.getAllPrices();
        const assets = priceEngine.getAvailableAssets();

        socket.emit('allPrices', {
          success: true,
          prices,
          assets
        });
      } catch (error) {
        socket.emit('error', {
          success: false,
          message: error.message
        });
      }
    });

    /**
     * EVENT: getHistory
     * Client requests price history for a symbol
     */
    socket.on('getHistory', (data) => {
      try {
        const { symbol, limit = 100 } = data;
        const history = priceEngine.getHistory(symbol, limit);

        socket.emit('historyData', {
          success: true,
          symbol,
          data: history,
          count: history.length
        });
      } catch (error) {
        socket.emit('error', {
          success: false,
          message: error.message
        });
      }
    });

    /**
     * EVENT: getIndicators
     * Client requests technical indicators
     */
    socket.on('getIndicators', (data) => {
      try {
        const { symbol, period = 20 } = data;
        const indicators = priceEngine.getTechnicalIndicators(symbol, period);

        if (!indicators) {
          return socket.emit('error', {
            success: false,
            message: 'Not enough data for indicators'
          });
        }

        socket.emit('indicatorsData', {
          success: true,
          symbol,
          period,
          data: indicators
        });
      } catch (error) {
        socket.emit('error', {
          success: false,
          message: error.message
        });
      }
    });

    /**
     * EVENT: getAssets
     * Client requests list of available assets
     */
    socket.on('getAssets', () => {
      try {
        const assets = priceEngine.getAvailableAssets();

        socket.emit('assetsData', {
          success: true,
          data: assets
        });
      } catch (error) {
        socket.emit('error', {
          success: false,
          message: error.message
        });
      }
    });

    /**
     * EVENT: disconnect
     * Handle client disconnect
     */
    socket.on('disconnect', () => {
      clientSubscriptions.delete(socket.id);
      console.log(`👋 Client disconnected: ${socket.id}`);
    });

    /**
     * Handle any errors
     */
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  /**
   * Broadcast price updates to subscribed clients
   */
  const broadcastToSubscribed = (updates) => {
    io.sockets.sockets.forEach((socket) => {
      const clientSubs = clientSubscriptions.get(socket.id);
      if (clientSubs && clientSubs.size > 0) {
        const filtered = {};
        clientSubs.forEach(symbol => {
          if (updates[symbol]) {
            filtered[symbol] = updates[symbol];
          }
        });

        if (Object.keys(filtered).length > 0) {
          socket.emit('priceUpdate', filtered);
        }
      }
    });
  };

  // Override the broadcast behavior if needed
  priceEngine.removeAllListeners('priceUpdate');
  priceEngine.on('priceUpdate', broadcastToSubscribed);

  return {
    clientSubscriptions,
    broadcastToSubscribed
  };
};
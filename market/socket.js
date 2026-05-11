export default (io, priceEngine) => {
  priceEngine.on('priceUpdate', (updates) => {
    io.emit('priceUpdate', updates);
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('getPrice', (data) => {
      const price = priceEngine.getPrice(data.symbol);
      socket.emit('priceData', price);
    });

    socket.on('getAllPrices', () => {
      socket.emit('allPrices', priceEngine.getAllPrices());
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};
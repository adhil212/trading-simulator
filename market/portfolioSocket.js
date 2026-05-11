import * as PortfolioService from "../services/portfolio.service.js";

export default (io, priceEngine) => {
  io.on('connection', (socket) => {
    socket.on('getPortfolioData', async (data, callback) => {
      try {
        const { token } = data;
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        const result = await PortfolioService.getPortfolioDashboard(priceEngine, decoded.id);
        callback(result);
      } catch (error) {
        callback({ error: error.message });
      }
    });
  });
};
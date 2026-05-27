import jwt from "jsonwebtoken";
import * as PortfolioService from "../services/portfolio.service.js";

export default (io, priceEngine) => {
  io.on('connection', (socket) => {
    socket.on('getPortfolioData', async (data, callback) => {
      try {
        const { token } = data;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await PortfolioService.getPortfolioDashboard(priceEngine, decoded.id);
        if (callback) callback(result);
      } catch (error) {
        if (callback) callback({ error: error.message });
      }
    });
  });
};
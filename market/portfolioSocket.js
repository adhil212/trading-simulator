import jwt from "jsonwebtoken";
import * as PortfolioService from "../services/portfolio.service.js";

export default (io, priceEngine) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on('connection', (socket) => {
    socket.on('getPortfolioData', async (data, callback) => {
      try {
        const result = await PortfolioService.getPortfolioDashboard(priceEngine, socket.user.id);
        if (callback) callback(result);
      } catch (error) {
        if (callback) callback({ error: error.message });
      }
    });
  });
};
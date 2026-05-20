import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import authRoutes from "./routers/auth.routes.js";
import walletRoutes from "./routers/wallet.routes.js";
import PriceEngine from "./market/priceEngin.js";
import priceRouter from "./market/pricerouter.js";
import setupSocket from "./market/socket.js";
import setupTradingSocket from "./market/tradingSocket.js";
import setupPortfolioSocket from "./market/portfolioSocket.js";
import { createTradingController } from "./controllers/trading.controller.js";
import createTradingRouter from "./routers/trading.routes.js";
import { createPortfolioController } from "./controllers/portfolio.controller.js";
import createPortfolioRouter from "./routers/portfolio.routes.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
// Market  integration
const priceEngine = new PriceEngine();
priceEngine.start();

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(' Shutting down server...');
  priceEngine.savePrices();
};
process.on('SIGINT', () => { shutdown(); process.exit(0); });
process.on('SIGTERM', () => { shutdown(); process.exit(0); });
process.on('exit', shutdown);

app.use("/api/market", priceRouter(priceEngine));

const tradingController = createTradingController(priceEngine);
app.use("/api/trading", createTradingRouter(tradingController));

const portfolioController = createPortfolioController(priceEngine);
app.use("/api/portfolio", createPortfolioRouter(portfolioController));

app.get("/", (req, res) => {
  res.send("Server running...");
});
// Start server with Socket.io support
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Setup real-time WebSocket updates for market data
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
setupSocket(io, priceEngine);
setupTradingSocket(io, priceEngine);
setupPortfolioSocket(io, priceEngine);
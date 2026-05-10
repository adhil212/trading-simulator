import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import authRoutes from "./routers/auth.routes.js";
import walletRoutes from "./routers/wallet.routes.js";
import PriceEngine from "./market/priceEngin.js";
import priceRouter from "./market/pricerouter.js";
import setupSocket from "./market/socket.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
// Existing routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
// Market section integration
const priceEngine = new PriceEngine();
priceEngine.start();
app.use("/api/market", priceRouter(priceEngine));
// Root route
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
    origin: "*", // Restrict to frontend URL in production
    methods: ["GET", "POST"]
  }
});
setupSocket(io, priceEngine);
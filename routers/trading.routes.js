import express from "express";
import rateLimit from "express-rate-limit";
import authmiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

const tradeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Too many trading requests. Try again later." }
});

export default (controller) => {
  router.post("/buy", authmiddleware, tradeLimiter, controller.buy);
  router.post("/sell", authmiddleware, tradeLimiter, controller.sell);
  router.get("/portfolio", authmiddleware, controller.portfolio);
  router.get("/history", authmiddleware, controller.tradeHistory);
  router.get("/closed", authmiddleware, controller.closedTrades);
  router.get("/performance", authmiddleware, controller.performance);
  router.get("/statistics", authmiddleware, controller.statistics);
  
  return router;
};

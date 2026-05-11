import express from "express";
import authmiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

export default (controller) => {
  router.post("/buy", authmiddleware, controller.buy);
  router.post("/sell", authmiddleware, controller.sell);
  router.get("/portfolio", authmiddleware, controller.portfolio);
  router.get("/history", authmiddleware, controller.tradeHistory);
  router.get("/closed", authmiddleware, controller.closedTrades);
  router.get("/performance", authmiddleware, controller.performance);
  router.get("/statistics", authmiddleware, controller.statistics);
  
  return router;
};

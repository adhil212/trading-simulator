import express from "express";
import authmiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

export default (controller) => {
  router.get("/dashboard", authmiddleware, controller.dashboard);
  router.get("/positions", authmiddleware, controller.portfolio);
  router.get("/performance", authmiddleware, controller.performance);
  router.get("/allocation", authmiddleware, controller.allocation);
  router.get("/daily-stats", authmiddleware, controller.dailyStats);
  router.get("/growth", authmiddleware, controller.growth);
  router.get("/top", authmiddleware, controller.topAssets);
  router.get("/worst", authmiddleware, controller.worstAssets);
  router.get("/summary", authmiddleware, controller.summary);

  return router;
};

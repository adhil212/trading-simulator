import express from "express";
import adminMiddleware from "../middleware/admin.middleware.js";

const router = express.Router();

export default (controller) => {
  router.get("/users", adminMiddleware, controller.getUsers);
  router.get("/users/:id", adminMiddleware, controller.getUserById);

  router.get("/trades", adminMiddleware, controller.getAllTrades);
  router.get("/stats", adminMiddleware, controller.getStats);

  router.get("/market/status", adminMiddleware, controller.getMarketStatus);

  router.post("/assets", adminMiddleware, controller.createAsset);
  router.put("/assets/:symbol", adminMiddleware, controller.updateAsset);
  router.delete("/assets/:symbol", adminMiddleware, controller.removeAsset);
  router.get("/assets", adminMiddleware, controller.listAssets);

  return router;
};

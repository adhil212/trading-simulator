import express from "express";
import adminMiddleware from "../middleware/admin.middleware.js";

const router = express.Router();

export default (controller) => {
  router.get("/users", adminMiddleware, controller.getUsers);
  router.get("/users/:id", adminMiddleware, controller.getUserById);

  router.get("/trades", adminMiddleware, controller.getAllTrades);
  router.get("/stats", adminMiddleware, controller.getStats);

  router.get("/commissions", adminMiddleware, controller.getCommissions);
  router.get("/transactions", adminMiddleware, controller.getTransactions);
  router.get("/withdrawal-requests", adminMiddleware, controller.getWithdrawalRequests);
  router.post("/withdrawal-requests/:id/approve", adminMiddleware, controller.approveWithdrawal);
  router.post("/withdrawal-requests/:id/reject", adminMiddleware, controller.rejectWithdrawal);
  router.get("/users/:id/transactions", adminMiddleware, controller.getUserTransactions);
  router.delete("/users/:id", adminMiddleware, controller.deleteUser);
  router.get("/market/status", adminMiddleware, controller.getMarketStatus);

  router.post("/assets", adminMiddleware, controller.createAsset);
  router.put("/assets/:symbol", adminMiddleware, controller.updateAsset);
  router.delete("/assets/:symbol", adminMiddleware, controller.removeAsset);
  router.get("/assets", adminMiddleware, controller.listAssets);

  return router;
};

import express from "express";
import rateLimit from "express-rate-limit";
import authmiddleware from "../middleware/auth.middleware.js";
import { getWallet, getTransactions } from "../controllers/wallet.service.js";
import { createDepositOrder, verifyDeposit, withdraw } from "../controllers/wallet.controller.js";

const router = express.Router();

const walletMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many requests. Try again later." }
});

router.get("/", authmiddleware, getWallet);
router.post("/deposit/create-order", authmiddleware, walletMutationLimiter, createDepositOrder);
router.post("/deposit/verify", authmiddleware, walletMutationLimiter, verifyDeposit);
router.get("/transactions", authmiddleware, getTransactions);
router.post("/withdraw", authmiddleware, walletMutationLimiter, withdraw);

export default router;

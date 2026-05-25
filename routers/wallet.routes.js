import express from "express";
import authmiddleware from "../middleware/auth.middleware.js";
import { getWallet, getTransactions } from "../controllers/wallet.service.js";
import { createDepositOrder, verifyDeposit, withdraw } from "../controllers/wallet.controller.js";

const router = express.Router();

router.get("/", authmiddleware, getWallet);
router.post("/deposit/create-order", authmiddleware, createDepositOrder);
router.post("/deposit/verify", authmiddleware, verifyDeposit);
router.get("/transactions", authmiddleware, getTransactions);
router.post("/withdraw", authmiddleware, withdraw);

export default router;

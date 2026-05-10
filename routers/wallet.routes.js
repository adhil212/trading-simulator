import express from "express";
import authmiddleware from "../middleware/auth.middleware.js";
import { getWallet } from "../controllers/wallet.service.js";

const router = express.Router();

router.get("/", authmiddleware, getWallet);

export default router;

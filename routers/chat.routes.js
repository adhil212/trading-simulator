import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { chat } from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/", authMiddleware, chat);

export default router;

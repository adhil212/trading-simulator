import express from "express"
import rateLimit from "express-rate-limit"
import { register, login, googleAuth } from "../controllers/auth.service.js"
import { refresh, logout } from "../controllers/refresh.controller.js"

const router = express.Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts. Try again later." }
})

router.post("/register", authLimiter, register)
router.post("/login", authLimiter, login)
router.post("/google", authLimiter, googleAuth)
router.post("/refresh", refresh)
router.post("/logout", logout)

export default router

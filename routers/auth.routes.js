import express from "express"
import {register,login,googleAuth} from "../controllers/auth.service.js"

const router=express.Router()

router.post("/register",register)
router.post("/login", login);
router.post("/google", googleAuth);

export default router;





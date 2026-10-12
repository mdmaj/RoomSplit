
import express from "express";
import rateLimit from "express-rate-limit";

import {
  register,
  login,
  logout,
  me,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again after 15 minutes.",
  },
});

// Public routes
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// Protected / session routes
router.post("/logout", logout);
router.get("/me", protect, me);

export default router;
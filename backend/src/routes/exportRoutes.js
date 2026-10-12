
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { exportGroupExpenses } from "../controllers/exportController.js";

const router = express.Router();

router.use(protect);

router.get("/groups/:groupId/excel", exportGroupExpenses);

export default router;
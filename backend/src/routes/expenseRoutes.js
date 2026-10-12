
import express from "express";

import { protect } from "../middleware/authMiddleware.js";

import {
  createExpense,
  getGroupExpenses,
  getExpenseById,
  deleteExpense,
} from "../controllers/expenseController.js";

const router = express.Router();

router.use(protect);

router.post("/groups/:groupId", createExpense);
router.get("/groups/:groupId", getGroupExpenses);
router.get("/:expenseId", getExpenseById);
router.delete("/:expenseId", deleteExpense);

export default router;
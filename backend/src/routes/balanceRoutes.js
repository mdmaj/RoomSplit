import express from "express";

import { protect } from "../middleware/authMiddleware.js";

import {
  getGroupBalances,
  createSettlement,
  getGroupSettlements,
} from "../controllers/balanceController.js";

const router = express.Router();

router.use(protect);

router.get("/groups/:groupId", getGroupBalances);
router.post("/groups/:groupId/settlements", createSettlement);
router.get("/groups/:groupId/settlements", getGroupSettlements);

export default router;


 

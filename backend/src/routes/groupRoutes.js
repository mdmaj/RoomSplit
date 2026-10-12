
import express from "express";

import {
  createGroup,
  getMyGroups,
  joinGroup,
} from "../controllers/groupController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createGroup);
router.get("/", getMyGroups);
router.post("/join", joinGroup);

export default router;
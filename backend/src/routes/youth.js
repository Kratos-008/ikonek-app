const express = require("express");

const router = express.Router();

const {
  getYouth,
  getYouthById,
  createYouth,
  updateYouth,
  deleteYouth,
} = require("../controllers/youth");

const {
  authenticateToken,
  requireAdmin,
} = require("../middleware/auth");

// Get all youth profiles
// Any logged-in user can view youth profiles
router.get("/", authenticateToken, getYouth);

// Get one youth profile
// Any logged-in user can view a youth profile
router.get("/:id", authenticateToken, getYouthById);

// Create youth profile
// ADMIN only
router.post("/", authenticateToken, requireAdmin, createYouth);

// Update youth profile
// ADMIN only
router.put("/:id", authenticateToken, requireAdmin, updateYouth);

// Delete youth profile
// ADMIN only
router.delete("/:id", authenticateToken, requireAdmin, deleteYouth);

module.exports = router;
const express = require("express");

const router = express.Router();

const {
  getYouth,
  getYouthById,
  createYouth,
  updateYouth,
  deleteYouth,
  issueRegistrationCode,
} = require("../controllers/youth");

const {
  authenticateToken,
  requireAdmin,
  requireLeaderOrAdmin,
} = require("../middleware/auth");

// Get all youth profiles
// Admins see all profiles; Leaders see assigned profiles; Youth see their own linked profile.
router.get("/", authenticateToken, getYouth);

// Get one youth profile
// Controller enforces role and assignment scope.
router.get("/:id", authenticateToken, getYouthById);

// Issue/reissue a one-time code for an existing unlinked member (Admin only).
router.post("/:id/registration-code", authenticateToken, requireAdmin, issueRegistrationCode);

// Create youth profile
// ADMIN only
router.post("/", authenticateToken, requireLeaderOrAdmin, createYouth);

// Update youth profile
// ADMIN only
router.put("/:id", authenticateToken, requireLeaderOrAdmin, updateYouth);

// Delete youth profile
// ADMIN only
router.delete("/:id", authenticateToken, requireLeaderOrAdmin, deleteYouth);

module.exports = router;
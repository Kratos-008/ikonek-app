const express = require("express");

const router = express.Router();

const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/users");

const {
  authenticateToken,
  requireAdmin,
} = require("../middleware/auth");

// Get all users
// Any logged-in user can access this
router.get("/", authenticateToken, getUsers);

// Get a specific user
// Any logged-in user can access this
router.get("/:id", authenticateToken, getUserById);

// Create a user
// ADMIN only
router.post("/", authenticateToken, requireAdmin, createUser);

// Update a user
// ADMIN only
router.put("/:id", authenticateToken, requireAdmin, updateUser);

// Delete a user
// ADMIN only
router.delete("/:id", authenticateToken, requireAdmin, deleteUser);

module.exports = router;
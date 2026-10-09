const express = require("express");
const router = express.Router();

const {
  checkIn,
  getAttendance,
  deleteAttendance,
  clearAttendance,
} = require("../controllers/attendance");

const {
  authenticateToken,
  requireAdmin,
} = require("../middleware/auth");

// Logged-in users can view attendance history.
router.get("/", authenticateToken, getAttendance);

// Admins can record/undo/clear attendance from the attendance screen.
router.post("/check-in", authenticateToken, requireAdmin, checkIn);
router.delete("/:id", authenticateToken, requireAdmin, deleteAttendance);
router.delete("/clear/all", authenticateToken, requireAdmin, clearAttendance);

module.exports = router;
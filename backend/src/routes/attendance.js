const express = require("express");
const router = express.Router();

const {
  checkIn,
  getAttendance,
  deleteAttendance,
  finalizeAttendance,
  clearAttendance,
} = require("../controllers/attendance");

const {
  authenticateToken,
  requireAdmin,
  requireLeaderOrAdmin,
} = require("../middleware/auth");

// Attendance history is scoped by the controller: Admin all, Leader assigned members, Youth own profile.
router.get("/", authenticateToken, getAttendance);

// Leaders can record/undo attendance for assigned members; only Admins can clear all history.
router.post("/check-in", authenticateToken, requireLeaderOrAdmin, checkIn);
router.post("/events/:eventId/finalize", authenticateToken, requireLeaderOrAdmin, finalizeAttendance);
router.delete("/clear/all", authenticateToken, requireAdmin, clearAttendance);
router.delete("/:id", authenticateToken, requireLeaderOrAdmin, deleteAttendance);

module.exports = router;
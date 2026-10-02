const express = require("express");
const router = express.Router();

const {
  checkIn,
  getAttendance,
} = require("../controllers/attendance");

// Record attendance
router.post("/check-in", checkIn);

// Get attendance records
router.get("/", getAttendance);

module.exports = router;
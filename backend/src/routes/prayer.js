const express = require("express");
const router = express.Router();

const {
  createPrayerRequest,
  getPrayerRequests,
  updatePrayerRequest,
  deletePrayerRequest,
} = require("../controllers/prayer");

const { authenticateToken } = require("../middleware/auth");

// Submit a prayer request
router.post("/", authenticateToken, createPrayerRequest);

// Get prayer requests
router.get("/", authenticateToken, getPrayerRequests);

// Update a prayer request
router.put("/:id", authenticateToken, updatePrayerRequest);

// Delete a prayer request
router.delete("/:id", authenticateToken, deletePrayerRequest);

module.exports = router;
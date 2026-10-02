const express = require("express");
const router = express.Router();

const {
  createPrayerRequest,
  getPrayerRequests,
  updatePrayerRequest,
  deletePrayerRequest,
} = require("../controllers/prayer");

// Submit a prayer request
router.post("/", createPrayerRequest);

// Get prayer requests
router.get("/", getPrayerRequests);

// Update a prayer request
router.put("/:id", updatePrayerRequest);

// Delete a prayer request
router.delete("/:id", deletePrayerRequest);

module.exports = router;
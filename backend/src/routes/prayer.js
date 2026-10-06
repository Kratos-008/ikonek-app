const express = require("express");

const router = express.Router();

const {
  createPrayerRequest,
  getPrayerRequests,
  updatePrayerRequest,
  deletePrayerRequest,
} = require("../controllers/prayer");

const { authenticateToken } = require("../middleware/auth");
const prayerImageUpload = require("../middleware/prayerUpload");

console.log("prayerImageUpload:", prayerImageUpload);

router.post(
  "/",
  authenticateToken,
  prayerImageUpload.single("image"),
  createPrayerRequest
);

router.get("/", authenticateToken, getPrayerRequests);

router.put(
  "/:id",
  authenticateToken,
  prayerImageUpload.single("image"),
  updatePrayerRequest
);

router.delete("/:id", authenticateToken, deletePrayerRequest);

module.exports = router;

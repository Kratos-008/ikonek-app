const express = require("express");

const router = express.Router();

const {
  createPrayerRequest,
  getPrayerRequests,
  updatePrayerRequest,
  deletePrayerRequest,
  setPrayerReaction,
  createPrayerComment,
  updatePrayerComment,
  deletePrayerComment,
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
router.put("/:id/reaction", authenticateToken, setPrayerReaction);
router.post("/:id/comments", authenticateToken, createPrayerComment);
router.put("/:id/comments/:commentId", authenticateToken, updatePrayerComment);
router.delete("/:id/comments/:commentId", authenticateToken, deletePrayerComment);

module.exports = router;

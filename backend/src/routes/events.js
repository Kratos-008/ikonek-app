const express = require("express");
const router = express.Router();

const {
  getEvents,
  getEventById,
  signupForEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/events");

const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Event listing and details remain available as before.
router.get("/", getEvents);
router.get("/:id", getEventById);

// Signed-up youth can sign themselves up; Leaders can register only their assigned youth.
router.post("/:id/signup", authenticateToken, signupForEvent);

// Event management remains Admin-only.
router.post("/", authenticateToken, requireAdmin, createEvent);
router.put("/:id", authenticateToken, requireAdmin, updateEvent);
router.delete("/:id", authenticateToken, requireAdmin, deleteEvent);

module.exports = router;

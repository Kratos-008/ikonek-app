const express = require("express");
const router = express.Router();

const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/events");

const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Get all events
router.get("/", getEvents);

// Get a specific event
router.get("/:id", getEventById);

// Create an event
router.post("/", authenticateToken, requireAdmin, createEvent);

// Update an event
router.put("/:id", authenticateToken, requireAdmin, updateEvent);

// Delete an event
router.delete("/:id", authenticateToken, requireAdmin, deleteEvent);

module.exports = router;
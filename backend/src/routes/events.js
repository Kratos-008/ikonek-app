const express = require("express");
const router = express.Router();

const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/events");

// Get all events
router.get("/", getEvents);

// Get a specific event
router.get("/:id", getEventById);

// Create an event
router.post("/", createEvent);

// Update an event
router.put("/:id", updateEvent);

// Delete an event
router.delete("/:id", deleteEvent);

module.exports = router;
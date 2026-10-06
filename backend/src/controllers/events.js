const prisma = require("../lib/prisma");

// Get all events
const getEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        date: "asc",
      },
    });

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("Get events error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get events",
    });
  }
};

// Get one event
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: {
        id,
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Get event error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get event",
    });
  }
};

// Create event
const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      location,
      category,
      flowOfProgram,
      attendees,
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({
        success: false,
        message: "Title and date are required",
      });
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid event date",
      });
    }

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        date: parsedDate,
        location: location?.trim() || null,

        category: category?.trim() || "Upcoming",

        flowOfProgram:
          flowOfProgram?.trim() || null,

        attendees: Array.isArray(attendees)
          ? attendees
          : [],
      },
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error("Create event error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create event",
    });
  }
};

// Update event
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      date,
      location,
      category,
      flowOfProgram,
      attendees,
    } = req.body;

    const existingEvent = await prisma.event.findUnique({
      where: {
        id,
      },
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const updateData = {};

    if (title !== undefined) {
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description =
        description?.trim() || null;
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid event date",
        });
      }

      updateData.date = parsedDate;
    }

    if (location !== undefined) {
      updateData.location =
        location?.trim() || null;
    }

    if (category !== undefined) {
      updateData.category =
        category?.trim() || "Upcoming";
    }

    if (flowOfProgram !== undefined) {
      updateData.flowOfProgram =
        flowOfProgram?.trim() || null;
    }

    if (attendees !== undefined) {
      if (!Array.isArray(attendees)) {
        return res.status(400).json({
          success: false,
          message: "Attendees must be an array",
        });
      }

      updateData.attendees = attendees;
    }

    const event = await prisma.event.update({
      where: {
        id,
      },
      data: updateData,
    });

    res.json({
      success: true,
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    console.error("Update event error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update event",
    });
  }
};

// Delete event
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const existingEvent = await prisma.event.findUnique({
      where: {
        id,
      },
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    await prisma.event.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};
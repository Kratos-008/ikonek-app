const prisma = require("../lib/prisma");

async function notifyLinkedMembers(type, title, message, relatedId) {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ["YOUTH", "LEADER"] } },
      select: { id: true },
    });
    if (users.length) await prisma.notification.createMany({ data: users.map(({ id }) => ({ userId: id, type, title, message, relatedId: relatedId || null })) });
  } catch (error) {
    // Notification failure must not undo a successful event save.
    console.error("Event notification error:", error.message);
  }
}

// Get all events
const getEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: "asc" },
      include: { attendanceRecords: { include: { youth: { select: { name: true } } } } },
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
      where: { id },
      include: { attendanceRecords: { include: { youth: { select: { name: true } } } } },
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

// Sign up a youth account for itself, or let a Leader sign up assigned youth.
// Signup remains stored in Event.attendees (names) to avoid a schema migration.
const signupForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const role = String(req.user?.role || '').toUpperCase();
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (event.attendanceFinalized) {
      return res.status(409).json({ success: false, message: "Signup is closed because attendance has been finalized." });
    }

    const dateParts = (value) => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(new Date(value));
      const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
      return `${values.year}-${values.month}-${values.day}`;
    };
    if (dateParts(event.date) < dateParts(new Date())) {
      return res.status(400).json({ success: false, message: "Signup is only available before or on the event date." });
    }

    let profiles = [];
    if (role === 'YOUTH') {
      const profile = await prisma.youthProfile.findUnique({ where: { userId: req.user.userId } });
      if (!profile) {
        return res.status(400).json({ success: false, message: "Your account is not linked to a youth profile. Please contact an Admin." });
      }
      profiles = [profile];
    } else if (role === 'LEADER') {
      const ids = Array.isArray(req.body?.youthIds) ? [...new Set(req.body.youthIds.filter((value) => typeof value === 'string'))] : [];
      if (!ids.length) return res.status(400).json({ success: false, message: "Select at least one assigned youth." });
      profiles = await prisma.youthProfile.findMany({ where: { id: { in: ids } } });
      const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const leaderName = normalize(req.user.name);
      if (profiles.length !== ids.length || profiles.some((profile) => normalize(profile.cellLeader) !== leaderName)) {
        return res.status(403).json({ success: false, message: "You can only sign up youth assigned to you." });
      }
    } else {
      return res.status(403).json({ success: false, message: "Only youth and Leaders can use event signup." });
    }

    const existingNames = Array.isArray(event.attendees) ? event.attendees : [];
    const seen = new Set(existingNames.map((name) => String(name || '').trim().toLowerCase()));
    const addedNames = [];
    for (const profile of profiles) {
      const name = String(profile.name || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        existingNames.push(name);
        seen.add(key);
        addedNames.push(name);
      }
    }

    const updated = addedNames.length
      ? await prisma.event.update({ where: { id }, data: { attendees: existingNames }, include: { attendanceRecords: { include: { youth: { select: { name: true } } } } } })
      : await prisma.event.findUnique({ where: { id }, include: { attendanceRecords: { include: { youth: { select: { name: true } } } } } });

    if (addedNames.length) {
      try {
        const recipients = profiles.filter((profile) => addedNames.some((name) => name.toLowerCase() === String(profile.name || "").trim().toLowerCase()) && profile.userId);
        if (recipients.length) await prisma.notification.createMany({ data: recipients.map((profile) => ({ userId: profile.userId, type: "EVENT_SIGNUP", title: "Event signup confirmed", message: `Your signup for ${event.title} is confirmed.`, relatedId: event.id })) });
      } catch (notificationError) { console.error("Event signup notification error:", notificationError.message); }
    }
    return res.json({
      success: true,
      message: addedNames.length ? "Signup saved successfully" : "The selected youth are already signed up",
      event: updated,
      addedNames,
    });
  } catch (error) {
    console.error("Event signup error:", error);
    return res.status(500).json({ success: false, message: "Failed to sign up for event" });
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
      message,
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

        message: message?.trim() || null,

        attendees: Array.isArray(attendees)
          ? attendees
          : [],
      },
    });

    await notifyLinkedMembers("EVENT_CREATED", "New iKonek event", `${event.title} has been added to upcoming events.`, event.id);
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
      message,
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

    if (message !== undefined) {
      updateData.message = message?.trim() || null;
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

    await notifyLinkedMembers("EVENT_UPDATED", "Event updated", `${event.title} has been updated. Please check the event details.`, event.id);
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
  signupForEvent,
  createEvent,
  updateEvent,
  deleteEvent,
};
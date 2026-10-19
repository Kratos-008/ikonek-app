const express = require("express");
const prisma = require("../lib/prisma");
const {
  authenticateToken,
  requireAdmin,
} = require("../middleware/auth");
const { sendPushToUsers } = require("../lib/push");

const router = express.Router();

// All notification routes require a signed-in user.
router.use(authenticateToken);

// Associate the signed-in user with this app installation's Expo push token.
router.post("/device-token", async (req, res) => {
  const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
  const platform = typeof req.body.platform === "string" ? req.body.platform : "unknown";
  if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
    return res.status(400).json({ success: false, message: "A valid Expo push token is required." });
  }
  try {
    await prisma.pushToken.upsert({
      where: { token },
      create: { token, platform, userId: req.user.id },
      update: { platform, userId: req.user.id },
    });
    return res.json({ success: true });
  } catch (error) {
    console.error("Register push token failed:", error);
    return res.status(500).json({ success: false, message: "Unable to register this device." });
  }
});

router.delete("/device-token", async (req, res) => {
  const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
  try {
    if (token) await prisma.pushToken.deleteMany({ where: { token, userId: req.user.id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Remove push token failed:", error);
    return res.status(500).json({ success: false, message: "Unable to remove this device." });
  }
});

// =====================================================
// ADMIN: SEND CHURCH-WIDE ANNOUNCEMENT
// POST /api/notifications/announcements
// =====================================================
router.post("/announcements", requireAdmin, async (req, res) => {
  try {
    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : "";

    const message =
      typeof req.body.message === "string" ? req.body.message.trim() : "";

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Announcement title and message are required.",
      });
    }

    // Send a personal notification to every Youth and Leader account.
    const recipients = await prisma.user.findMany({
      where: {
        role: {
          in: ["YOUTH", "LEADER"],
        },
      },
      select: {
        id: true,
      },
    });

    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((user) => ({
          userId: user.id,
          type: "ANNOUNCEMENT",
          title,
          message,
        })),
      });
      await sendPushToUsers(recipients.map((user) => user.id), {
        type: "ANNOUNCEMENT", title, message,
      });
    }

    return res.status(201).json({
      success: true,
      message: `Announcement sent to ${recipients.length} account(s).`,
      recipientCount: recipients.length,
    });
  } catch (error) {
    console.error("Create announcement failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send announcement.",
    });
  }
});

// =====================================================
// ADMIN: SEND ATTENDANCE REMINDERS
// POST /api/notifications/events/:eventId/remind
// =====================================================
router.post(
  "/events/:eventId/remind",
  requireAdmin,
  async (req, res) => {
    try {
      const event = await prisma.event.findUnique({
        where: {
          id: req.params.eventId,
        },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found.",
        });
      }

      const names = Array.isArray(event.attendees) ? event.attendees : [];

      // Attendees are stored by name, so match names the way the signup flow does:
      // ignoring capitalization and extra spaces (the old exact match missed these).
      const normalizeName = (value) =>
        String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
      const attendeeKeys = new Set(names.map(normalizeName).filter(Boolean));

      const linkedProfiles = attendeeKeys.size
        ? await prisma.youthProfile.findMany({
            where: { userId: { not: null } },
            select: { name: true, userId: true },
          })
        : [];

      const accountsByName = new Map();
      for (const profile of linkedProfiles) {
        const key = normalizeName(profile.name);
        if (!attendeeKeys.has(key)) continue;
        if (!accountsByName.has(key)) accountsByName.set(key, []);
        accountsByName.get(key).push(profile);
      }

      // If two linked members share a name we cannot tell which one signed up,
      // so skip them instead of reminding the wrong person.
      const userIds = [];
      const skippedNames = [];
      for (const profiles of accountsByName.values()) {
        if (profiles.length === 1) userIds.push(profiles[0].userId);
        else skippedNames.push(String(profiles[0].name || "").trim());
      }

      if (userIds.length > 0) {
        await prisma.notification.createMany({
          data: userIds.map((userId) => ({
            userId,
            type: "ATTENDANCE_REMINDER",
            title: "Attendance reminder",
            message: `Reminder: ${event.title} is coming up. Please check the event details and your signup.`,
            relatedId: event.id,
          })),
        });
        await sendPushToUsers(userIds, {
          type: "ATTENDANCE_REMINDER",
          title: "Attendance reminder",
          message: `Reminder: ${event.title} is coming up. Please check the event details and your signup.`,
          relatedId: event.id,
        });
      }

      const skippedNote = skippedNames.length
        ? ` Skipped ${skippedNames.length} name(s) shared by more than one member: ${skippedNames.join(", ")}.`
        : "";

      return res.json({
        success: true,
        message: `Reminder sent to ${userIds.length} linked attendee account(s).${skippedNote}`,
        recipientCount: userIds.length,
        skippedNames,
      });
    } catch (error) {
      console.error("Send attendance reminder failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to send attendance reminders.",
      });
    }
  }
);

// =====================================================
// YOUTH/LEADER: SAVE AN EVENT REMINDER TO THE IN-APP BELL
// POST /api/notifications/event-reminders
// =====================================================
router.post("/event-reminders", async (req, res) => {
  try {
    const eventId = typeof req.body.eventId === "string" ? req.body.eventId.trim() : "";
    if (!eventId) {
      return res.status(400).json({ success: false, message: "Event ID is required." });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    const existing = await prisma.notification.findFirst({
      where: {
        userId: req.user.id,
        type: "EVENT_REMINDER",
        relatedId: event.id,
        readAt: null,
      },
      select: { id: true },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          userId: req.user.id,
          type: "EVENT_REMINDER",
          title: "Event reminder set",
          message: `You'll be reminded about "${event.title}" before the event and on the event day.`,
          relatedId: event.id,
        },
      });
    }

    return res.status(201).json({ success: true, message: "Event reminder saved to notifications." });
  } catch (error) {
    console.error("Save event reminder notification failed:", error);
    return res.status(500).json({ success: false, message: "Unable to save event reminder notification." });
  }
});

// =====================================================
// GET THE SIGNED-IN USER'S NOTIFICATIONS
// GET /api/notifications
// GET /api/notifications?unread=true
// =====================================================
router.get("/", async (req, res) => {
  try {
    const unreadOnly = req.query.unread === "true";

    const where = {
      userId: req.user.id,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      }),

      prisma.notification.count({
        where: {
          userId: req.user.id,
          readAt: null,
        },
      }),
    ]);

    return res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Load notifications failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load notifications.",
    });
  }
});

// =====================================================
// MARK ONE NOTIFICATION AS READ
// PATCH /api/notifications/:id/read
// =====================================================
router.patch("/:id/read", async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    if (result.count === 0) {
      const owned = await prisma.notification.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
        select: {
          id: true,
        },
      });

      if (!owned) {
        return res.status(404).json({
          success: false,
          message: "Notification not found.",
        });
      }
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error("Mark notification read failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notification.",
    });
  }
});

// =====================================================
// MARK ALL OF THE SIGNED-IN USER'S NOTIFICATIONS AS READ
// PATCH /api/notifications/read-all
// =====================================================
router.patch("/read-all", async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error("Mark all notifications read failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notifications.",
    });
  }
});

module.exports = router;

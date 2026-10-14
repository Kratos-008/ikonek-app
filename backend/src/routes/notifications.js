const express = require("express");
const prisma = require("../lib/prisma");
const {
  authenticateToken,
  requireAdmin,
} = require("../middleware/auth");

const router = express.Router();

// All notification routes require a signed-in user.
router.use(authenticateToken);

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

      const names = Array.isArray(event.attendees)
        ? event.attendees
        : [];

      const profiles = names.length
        ? await prisma.youthProfile.findMany({
            where: {
              name: {
                in: names,
              },
              userId: {
                not: null,
              },
            },
            select: {
              userId: true,
            },
          })
        : [];

      // Avoid notifying the same account more than once.
      const userIds = [
        ...new Set(
          profiles
            .map((profile) => profile.userId)
            .filter(Boolean)
        ),
      ];

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
      }

      return res.json({
        success: true,
        message: `Reminder sent to ${userIds.length} linked attendee account(s).`,
        recipientCount: userIds.length,
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
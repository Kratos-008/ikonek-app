const express = require("express");
const prisma = require("../lib/prisma");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);

// List only the signed-in user's notifications.
router.get("/", async (req, res) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const where = { userId: req.user.id, ...(unreadOnly ? { readAt: null } : {}) };
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
    ]);
    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error("Load notifications failed:", error);
    res.status(500).json({ success: false, message: "Unable to load notifications." });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    if (!result.count) {
      const owned = await prisma.notification.findFirst({
        where: { id: req.params.id, userId: req.user.id },
        select: { id: true },
      });
      if (!owned) return res.status(404).json({ success: false, message: "Notification not found." });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Mark notification read failed:", error);
    res.status(500).json({ success: false, message: "Unable to update notification." });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Mark all notifications read failed:", error);
    res.status(500).json({ success: false, message: "Unable to update notifications." });
  }
});

module.exports = router;

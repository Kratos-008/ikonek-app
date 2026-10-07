const prisma = require("../lib/prisma");

const toDateKey = (value) => {
  if (!value) {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const dateFromKey = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);
const MANILA_TIME_ZONE = "Asia/Manila";

const getManilaDateKey = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${map.year}-${map.month}-${map.day}`;
};


// Create/update today's attendance record for a youth.
const checkIn = async (req, res) => {
  try {
    const { youthId, eventId, date, status = "PRESENT" } = req.body;
    const dateKey = toDateKey(date);

    if (!youthId || !dateKey || !eventId) {
      return res.status(400).json({
        success: false,
        message: "youthId, eventId and a valid date are required",
      });
    }

    const youth = await prisma.youthProfile.findUnique({
      where: { id: youthId },
    });

    if (!youth) {
      return res.status(404).json({
        success: false,
        message: "Youth profile not found",
      });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Attendance is only valid on the exact event date (Philippine time).
    const eventDateKey = getManilaDateKey(event.date);
    const todayKey = getManilaDateKey();
    if (eventDateKey !== todayKey || dateKey !== eventDateKey) {
      return res.status(400).json({
        success: false,
        message: `Attendance is only available on the event date (${eventDateKey}).`,
      });
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        youthId_dateKey: {
          youthId,
          dateKey,
        },
      },
      create: {
        youthId,
        userId: req.user?.id || null,
        eventId: eventId || null,
        attendanceDate: dateFromKey(dateKey),
        dateKey,
        status: String(status).toUpperCase(),
      },
      update: {
        userId: req.user?.id || null,
        ...(eventId !== undefined ? { eventId: eventId || null } : {}),
        attendanceDate: dateFromKey(dateKey),
        status: String(status).toUpperCase(),
      },
      include: {
        youth: true,
        event: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Attendance recorded successfully",
      attendance,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record attendance",
    });
  }
};

// Get attendance records. With no date filter, this returns the full history.
const getAttendance = async (req, res) => {
  try {
    const { date, youthId } = req.query;
    const dateKey = date ? toDateKey(date) : null;

    if (date && !dateKey) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    const attendance = await prisma.attendance.findMany({
      where: {
        ...(dateKey ? { dateKey } : {}),
        ...(youthId ? { youthId } : {}),
      },
      include: {
        youth: true,
        event: true,
      },
      orderBy: [
        { attendanceDate: "desc" },
        { createdAt: "desc" },
      ],
    });

    res.json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get attendance records",
    });
  }
};

// Remove one attendance record, normally used to undo a Present mark.
const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    await prisma.attendance.delete({ where: { id } });

    res.json({
      success: true,
      message: "Attendance record removed",
    });
  } catch (error) {
    console.error("Delete attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove attendance record",
    });
  }
};

// Clear the entire attendance history. Kept admin-only by the route.
const clearAttendance = async (req, res) => {
  try {
    const result = await prisma.attendance.deleteMany({});
    res.json({
      success: true,
      message: "Attendance history cleared",
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Clear attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear attendance history",
    });
  }
};

module.exports = {
  checkIn,
  getAttendance,
  deleteAttendance,
  clearAttendance,
};

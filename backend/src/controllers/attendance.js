const prisma = require("../lib/prisma");

// Record attendance
const checkIn = async (req, res) => {
  try {
    const { userId, eventId } = req.body;

    if (!userId || !eventId) {
      return res.status(400).json({
        success: false,
        message: "userId and eventId are required",
      });
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        eventId,
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

// Get attendance records
const getAttendance = async (req, res) => {
  try {
    const attendance = await prisma.attendance.findMany({
      include: {
        user: true,
        event: true,
      },
      orderBy: {
        createdAt: "desc",
      },
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

module.exports = {
  checkIn,
  getAttendance,
};
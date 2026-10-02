const prisma = require("../lib/prisma");

// Submit a prayer request
const createPrayerRequest = async (req, res) => {
  try {
    const { userId, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Prayer request is required",
      });
    }

    const prayerRequest = await prisma.prayerRequest.create({
      data: {
        userId: userId || null,
        content: content.trim(),
      },
    });

    res.status(201).json({
      success: true,
      message: "Prayer request submitted successfully",
      prayerRequest,
    });
  } catch (error) {
    console.error("Create prayer request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to submit prayer request",
    });
  }
};

// Get prayer requests
const getPrayerRequests = async (req, res) => {
  try {
    const prayerRequests = await prisma.prayerRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      prayerRequests,
    });
  } catch (error) {
    console.error("Get prayer requests error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get prayer requests",
    });
  }
};

// Update a prayer request
const updatePrayerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, status } = req.body;

    const existingRequest = await prisma.prayerRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Prayer request not found",
      });
    }

    const prayerRequest = await prisma.prayerRequest.update({
      where: { id },
      data: {
        ...(content !== undefined && {
          content: content.trim(),
        }),
        ...(status !== undefined && {
          status,
        }),
      },
    });

    res.json({
      success: true,
      message: "Prayer request updated successfully",
      prayerRequest,
    });
  } catch (error) {
    console.error("Update prayer request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update prayer request",
    });
  }
};

// Delete a prayer request
const deletePrayerRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const existingRequest = await prisma.prayerRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Prayer request not found",
      });
    }

    await prisma.prayerRequest.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Prayer request deleted successfully",
    });
  } catch (error) {
    console.error("Delete prayer request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete prayer request",
    });
  }
};

module.exports = {
  createPrayerRequest,
  getPrayerRequests,
  updatePrayerRequest,
  deletePrayerRequest,
};
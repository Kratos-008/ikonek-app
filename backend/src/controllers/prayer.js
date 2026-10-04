const prisma = require("../lib/prisma");

// Submit a prayer request
const createPrayerRequest = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Prayer request is required",
      });
    }

    const prayerRequest = await prisma.prayerRequest.create({
      data: {
        userId: req.user.userId,
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
// YOUTH → only their own requests
// ADMIN → all requests
const getPrayerRequests = async (req, res) => {
  try {
    const isAdmin = req.user.role === "ADMIN";

    const prayerRequests = await prisma.prayerRequest.findMany({
      where: isAdmin
        ? {}
        : {
            userId: req.user.userId,
          },
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
// YOUTH → can update their own request
// ADMIN → can update any request
const updatePrayerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, status } = req.body;

    const isAdmin = req.user.role === "ADMIN";

    const existingRequest = await prisma.prayerRequest.findFirst({
      where: isAdmin
        ? { id }
        : {
            id,
            userId: req.user.userId,
          },
    });

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Prayer request not found",
      });
    }

    const prayerRequest = await prisma.prayerRequest.update({
      where: {
        id,
      },
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
// YOUTH → can delete their own request
// ADMIN → can delete any request
const deletePrayerRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const isAdmin = req.user.role === "ADMIN";

    const existingRequest = await prisma.prayerRequest.findFirst({
      where: isAdmin
        ? { id }
        : {
            id,
            userId: req.user.userId,
          },
    });

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Prayer request not found",
      });
    }

    await prisma.prayerRequest.delete({
      where: {
        id,
      },
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
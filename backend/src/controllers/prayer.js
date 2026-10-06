const prisma = require("../lib/prisma");
const fs = require("fs");
const path = require("path");

// Get the physical path of an uploaded prayer image
const getImagePath = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") {
    return null;
  }

  const filename = path.basename(imageUrl);

  return path.join(__dirname, "../uploads/prayer", filename);
};

// Delete a physical prayer image if it exists
const deleteImageFile = (imageUrl) => {
  try {
    const imagePath = getImagePath(imageUrl);

    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  } catch (error) {
    console.error("Delete prayer image error:", error);
  }
};


// Submit a prayer request
const createPrayerRequest = async (req, res) => {
  try {
    const {
      senderName,
      devotionTitle,
      biblePassage,
      content,
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Prayer request is required",
      });
    }

    // If an image was uploaded, create its public URL
    const imageUrl = req.file
      ? `/uploads/prayer/${req.file.filename}`
      : null;

    const prayerRequest = await prisma.prayerRequest.create({
      data: {
        user: {
  connect: {
    id: req.user.userId,
  },
},

        senderName:
          senderName !== undefined && senderName !== null
            ? senderName.trim()
            : null,

        devotionTitle:
          devotionTitle !== undefined && devotionTitle !== null
            ? devotionTitle.trim()
            : null,

        biblePassage:
          biblePassage !== undefined && biblePassage !== null
            ? biblePassage.trim()
            : null,

        content: content.trim(),

        imageUrl,
      },
    });

    res.status(201).json({
      success: true,
      message: "Prayer request submitted successfully",
      prayerRequest,
    });
  } catch (error) {
    console.error("Create prayer request error:", error);

    // If database creation fails after the image was uploaded,
    // remove the uploaded image so it doesn't become an orphan file.
    if (req.file) {
      try {
        const uploadedPath = path.join(
          __dirname,
          "../uploads/prayer",
          req.file.filename
        );

        if (fs.existsSync(uploadedPath)) {
          fs.unlinkSync(uploadedPath);
        }
      } catch (fileError) {
        console.error("Cleanup uploaded image error:", fileError);
      }
    }

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

    const {
      senderName,
      devotionTitle,
      biblePassage,
      content,
      imageUrl,
      status,
    } = req.body;

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
      // If an image was uploaded but the request doesn't exist,
      // clean up the newly uploaded file.
      if (req.file) {
        const uploadedPath = path.join(
          __dirname,
          "../uploads/prayer",
          req.file.filename
        );

        if (fs.existsSync(uploadedPath)) {
          fs.unlinkSync(uploadedPath);
        }
      }

      return res.status(404).json({
        success: false,
        message: "Prayer request not found",
      });
    }

    let newImageUrl = existingRequest.imageUrl;

    // If a new image was uploaded, replace the old image
    if (req.file) {
      newImageUrl = `/uploads/prayer/${req.file.filename}`;

      if (existingRequest.imageUrl) {
        deleteImageFile(existingRequest.imageUrl);
      }
    } else if (imageUrl !== undefined) {
      // Preserve support for manually setting imageUrl to null
      // or another existing value.
      newImageUrl =
        imageUrl === null ? null : imageUrl.trim();

      // If the image was explicitly removed, delete the old file.
      if (
        imageUrl === null &&
        existingRequest.imageUrl
      ) {
        deleteImageFile(existingRequest.imageUrl);
      }
    }

    const prayerRequest = await prisma.prayerRequest.update({
      where: {
        id,
      },

      data: {
        ...(senderName !== undefined && {
          senderName:
            senderName === null
              ? null
              : senderName.trim(),
        }),

        ...(devotionTitle !== undefined && {
          devotionTitle:
            devotionTitle === null
              ? null
              : devotionTitle.trim(),
        }),

        ...(biblePassage !== undefined && {
          biblePassage:
            biblePassage === null
              ? null
              : biblePassage.trim(),
        }),

        ...(content !== undefined && {
          content: content.trim(),
        }),

        imageUrl: newImageUrl,

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

    // Clean up newly uploaded image if update failed
    if (req.file) {
      const uploadedPath = path.join(
        __dirname,
        "../uploads/prayer",
        req.file.filename
      );

      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    }

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

    // Delete the database record
    await prisma.prayerRequest.delete({
      where: {
        id,
      },
    });

    // Delete the associated image from uploads/prayer/
    if (existingRequest.imageUrl) {
      deleteImageFile(existingRequest.imageUrl);
    }

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
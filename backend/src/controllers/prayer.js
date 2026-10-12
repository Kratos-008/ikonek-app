const prisma = require("../lib/prisma");
const fs = require("fs");
const path = require("path");

const VALID_POST_TYPES = new Set(["DEVOTION", "PRAYER_REQUEST"]);
const VALID_VISIBILITIES = new Set(["PRIVATE", "CHURCH"]);
const VALID_STATUSES = new Set(["PENDING", "ANSWERED"]);

const getImagePath = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  return path.join(__dirname, "../uploads/prayer", path.basename(imageUrl));
};

const deleteImageFile = (imageUrl) => {
  try {
    const imagePath = getImagePath(imageUrl);
    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  } catch (error) {
    console.error("Delete prayer image error:", error);
  }
};

const cleanupUploadedFile = (req) => {
  if (!req.file) return;
  try {
    const uploadedPath = path.join(__dirname, "../uploads/prayer", req.file.filename);
    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
  } catch (error) {
    console.error("Cleanup uploaded image error:", error);
  }
};

const cleanOptionalString = (value) => {
  if (value === undefined || value === null) return null;
  return String(value).trim() || null;
};

const createPrayerRequest = async (req, res) => {
  try {
    const postType = String(req.body.postType || "PRAYER_REQUEST").toUpperCase();
    const visibility = String(req.body.visibility || "PRIVATE").toUpperCase();
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";

    if (!VALID_POST_TYPES.has(postType)) {
      cleanupUploadedFile(req);
      return res.status(400).json({ success: false, message: "Invalid journal post type" });
    }
    if (!VALID_VISIBILITIES.has(visibility)) {
      cleanupUploadedFile(req);
      return res.status(400).json({ success: false, message: "Invalid post visibility" });
    }
    if (!content) {
      cleanupUploadedFile(req);
      return res.status(400).json({ success: false, message: postType === "DEVOTION" ? "Reflection is required" : "Prayer request is required" });
    }

    const imageUrl = req.file ? `/uploads/prayer/${req.file.filename}` : null;
    const author = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { name: true },
    });
    const prayerRequest = await prisma.prayerRequest.create({
      data: {
        userId: req.user.userId,
        // Use the authenticated account name rather than trusting client-supplied text.
        senderName: author?.name || null,
        devotionTitle: cleanOptionalString(req.body.devotionTitle),
        biblePassage: cleanOptionalString(req.body.biblePassage),
        content,
        imageUrl,
        postType,
        visibility,
        status: "PENDING",
        testimony: null,
      },
    });

    return res.status(201).json({ success: true, message: "Journal post submitted successfully", prayerRequest });
  } catch (error) {
    console.error("Create prayer request error:", error);
    cleanupUploadedFile(req);
    return res.status(500).json({ success: false, message: "Failed to submit journal post" });
  }
};

const getPrayerRequests = async (req, res) => {
  try {
    // Private entries are visible only to their author. ADMIN does not bypass privacy.
    const prayerRequests = await prisma.prayerRequest.findMany({
      where: {
        OR: [
          { userId: req.user.userId },
          { visibility: "CHURCH" },
        ],
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, prayerRequests });
  } catch (error) {
    console.error("Get prayer requests error:", error);
    return res.status(500).json({ success: false, message: "Failed to get journal posts" });
  }
};

const updatePrayerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    // Only the author can edit their post or change its visibility/status.
    const existingRequest = await prisma.prayerRequest.findFirst({ where: { id, userId: req.user.userId } });
    if (!existingRequest) {
      cleanupUploadedFile(req);
      return res.status(404).json({ success: false, message: "Journal post not found" });
    }

    const existingType = String(existingRequest.postType || "PRAYER_REQUEST").toUpperCase();
    const existingStatus = String(existingRequest.status || "PENDING").toUpperCase();
    const hasContentEdit = ["senderName", "devotionTitle", "biblePassage", "content", "imageUrl", "postType", "visibility"].some((key) => req.body[key] !== undefined) || Boolean(req.file);

    // Once a prayer request is answered, its content and visibility are locked.
    // The owner may still save an optional testimony.
    if (existingType !== "DEVOTION" && existingStatus === "ANSWERED" && hasContentEdit) {
      cleanupUploadedFile(req);
      return res.status(403).json({
        success: false,
        message: "Answered prayer requests cannot be edited. You may still update the testimony.",
      });
    }

    const data = {};
    const { senderName, devotionTitle, biblePassage, content, imageUrl, status, postType, visibility, testimony } = req.body;

    if (senderName !== undefined) data.senderName = cleanOptionalString(senderName);
    if (devotionTitle !== undefined) data.devotionTitle = cleanOptionalString(devotionTitle);
    if (biblePassage !== undefined) data.biblePassage = cleanOptionalString(biblePassage);
    if (content !== undefined) {
      if (typeof content !== "string" || !content.trim()) {
        cleanupUploadedFile(req);
        return res.status(400).json({ success: false, message: "Post content cannot be empty" });
      }
      data.content = content.trim();
    }
    if (postType !== undefined) {
      const normalized = String(postType).toUpperCase();
      if (!VALID_POST_TYPES.has(normalized)) {
        cleanupUploadedFile(req);
        return res.status(400).json({ success: false, message: "Invalid journal post type" });
      }
      data.postType = normalized;
    }
    if (visibility !== undefined) {
      const normalized = String(visibility).toUpperCase();
      if (!VALID_VISIBILITIES.has(normalized)) {
        cleanupUploadedFile(req);
        return res.status(400).json({ success: false, message: "Invalid post visibility" });
      }
      data.visibility = normalized;
    }
    if (status !== undefined) {
      const normalized = String(status).toUpperCase();
      if (!VALID_STATUSES.has(normalized)) {
        cleanupUploadedFile(req);
        return res.status(400).json({ success: false, message: "Invalid prayer status" });
      }
      if (existingType === "DEVOTION" || (postType && String(postType).toUpperCase() === "DEVOTION")) {
        cleanupUploadedFile(req);
        return res.status(400).json({ success: false, message: "Devotions do not have prayer status" });
      }
      if (existingStatus === "ANSWERED" && normalized !== "ANSWERED") {
        cleanupUploadedFile(req);
        return res.status(403).json({ success: false, message: "Answered prayer requests cannot be changed back to Pending" });
      }
      data.status = normalized;
    }
    if (testimony !== undefined) data.testimony = cleanOptionalString(testimony);

    let newImageUrl = existingRequest.imageUrl;
    if (req.file) {
      newImageUrl = `/uploads/prayer/${req.file.filename}`;
      data.imageUrl = newImageUrl;
    } else if (imageUrl !== undefined) {
      newImageUrl = imageUrl === null || imageUrl === "" ? null : String(imageUrl).trim();
      data.imageUrl = newImageUrl;
    }

    const prayerRequest = await prisma.prayerRequest.update({ where: { id }, data });
    if (data.status && data.status !== existingStatus && existingRequest.userId) {
      try {
        await prisma.notification.create({ data: {
          userId: existingRequest.userId,
          type: "PRAYER_STATUS",
          title: data.status === "ANSWERED" ? "Answered prayer marked" : "Prayer request updated",
          message: data.status === "ANSWERED" ? "You marked your prayer request as answered. May this testimony encourage the church!" : "Your prayer request status has changed.",
          relatedId: existingRequest.id,
        } });
      } catch (notificationError) { console.error("Prayer notification error:", notificationError.message); }
    }
    if (newImageUrl !== existingRequest.imageUrl && existingRequest.imageUrl) deleteImageFile(existingRequest.imageUrl);
    return res.json({ success: true, message: "Journal post updated successfully", prayerRequest });
  } catch (error) {
    console.error("Update prayer request error:", error);
    cleanupUploadedFile(req);
    return res.status(500).json({ success: false, message: "Failed to update journal post" });
  }
};

const deletePrayerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    // Private and shared posts can only be deleted by their author.
    const existingRequest = await prisma.prayerRequest.findFirst({ where: { id, userId: req.user.userId } });
    if (!existingRequest) return res.status(404).json({ success: false, message: "Journal post not found" });
    await prisma.prayerRequest.delete({ where: { id } });
    if (existingRequest.imageUrl) deleteImageFile(existingRequest.imageUrl);
    return res.json({ success: true, message: "Journal post deleted successfully" });
  } catch (error) {
    console.error("Delete prayer request error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete journal post" });
  }
};

module.exports = { createPrayerRequest, getPrayerRequests, updatePrayerRequest, deletePrayerRequest };

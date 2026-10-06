const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads/prayer");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname).toLowerCase();

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp/;
  const extension = path.extname(file.originalname).toLowerCase();
  const isExtensionValid = allowedExtensions.test(extension);
  const isMimeValid = allowedExtensions.test(file.mimetype);

  if (isExtensionValid && isMimeValid) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, PNG, and WebP images are allowed."));
  }
};

const prayerImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = prayerImageUpload;

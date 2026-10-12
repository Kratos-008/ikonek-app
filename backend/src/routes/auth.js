const express = require("express");
const router = express.Router();
const {
  register,
  verifyEmail,
  resendVerification,
  login,
  linkExistingMember,
  requestPasswordReset,
  verifyPasswordReset,
  resetPassword,
} = require("../controllers/auth");

const { authenticateToken } = require("../middleware/auth");

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/login", login);
router.post("/request-password-reset", requestPasswordReset);
router.post("/verify-password-reset", verifyPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/link-member", authenticateToken, linkExistingMember);

module.exports = router;

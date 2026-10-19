const prisma = require("../lib/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// How long a login token lasts. /api/auth/me hands out a fresh one every time the app
// opens, so people who use the app regularly are never signed out by expiry.
// Set JWT_EXPIRES_IN (for example "30d") on Render to change it without editing code.
const SESSION_EXPIRY = process.env.JWT_EXPIRES_IN || "7d";
const crypto = require("crypto");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../lib/email");

function hashRegistrationCode(code) {
  return crypto.createHash("sha256").update(String(code).trim().toUpperCase()).digest("hex");
}

function normalizePersonName(name) {
  return String(name || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

const VERIFICATION_MINUTES = 10;

function createVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function createAndSendVerification(user) {
  const code = createVerificationCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + VERIFICATION_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationCodeHash: codeHash,
      verificationExpiresAt: expiresAt,
    },
  });

  await sendVerificationEmail(user.email, user.name, code);
}

// Register
const register = async (req, res) => {
  try {
    const { name, email, password, linkingCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (!existingUser.emailVerified) {
        const codeIsStillActive =
          existingUser.verificationExpiresAt &&
          new Date() < existingUser.verificationExpiresAt;

        // If the previous code is still valid, do not generate another one.
        // The app will show the remaining countdown and enable resend only
        // after this expiration time.
        if (codeIsStillActive) {
          return res.status(409).json({
            success: false,
            code: "EMAIL_NOT_VERIFIED",
            message: "This email is registered but not verified. Please enter the verification code that was sent to your email.",
            verificationExpiresAt: existingUser.verificationExpiresAt,
          });
        }

        // The old code has expired (or there is no usable code). Treat this
        // registration attempt as a request for a fresh verification code.
        try {
          await createAndSendVerification(existingUser);
        } catch (emailError) {
          console.error("Verification email error for existing user:", emailError);
          return res.status(503).json({
            success: false,
            code: "VERIFICATION_EMAIL_FAILED",
            message: "Your account already exists, but we could not send a new verification email. Please try again later.",
          });
        }

        const verificationExpiresAt = new Date(
          Date.now() + VERIFICATION_MINUTES * 60 * 1000
        );

        return res.status(200).json({
          success: true,
          code: "VERIFICATION_EMAIL_SENT",
          message: "Your previous verification code expired. A new verification code has been sent to your email.",
          email: existingUser.email,
          verificationExpiresAt,
        });
      }

      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    let pendingMemberLinkCodeHash = null;
    if (linkingCode !== undefined && String(linkingCode).trim()) {
      const normalizedLinkingCode = String(linkingCode).trim().toUpperCase();
      if (!/^IK-[A-F0-9]{8}-[A-F0-9]{8}$/.test(normalizedLinkingCode)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_LINKING_CODE",
          message: "Enter a valid iKonek member registration code.",
        });
      }

      const member = await prisma.youthProfile.findUnique({
        where: { registrationCodeHash: hashRegistrationCode(normalizedLinkingCode) },
        select: { id: true, name: true, userId: true },
      });
      if (!member || member.userId || normalizePersonName(member.name) !== normalizePersonName(name)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_MEMBER_LINK",
          message: "The code could not be matched to this name, or the member is already linked. Please check the code or ask an Admin for help.",
        });
      }
      pendingMemberLinkCodeHash = hashRegistrationCode(normalizedLinkingCode);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "YOUTH",
        pendingMemberLinkCodeHash,
        emailVerified: false,
      },
    });

    try {
      await createAndSendVerification(user);
    } catch (emailError) {
      // Keep the account so the user can retry with the resend-verification endpoint.
      // Previously the account was deleted when email delivery failed.
      console.error("Verification email error:", emailError);

      return res.status(503).json({
        success: false,
        code: "VERIFICATION_EMAIL_FAILED",
        message: "Your account was created, but we could not send the verification email. Please try sending the verification code again.",
      });
    }

    res.status(201).json({
      success: true,
      message: "Verification code sent to your email",
      email: user.email,
      verificationExpiresAt: new Date(Date.now() + VERIFICATION_MINUTES * 60 * 1000),
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create account",
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const verificationCode = String(code || "").trim();

    if (!normalizedEmail || !/^\d{6}$/.test(verificationCode)) {
      return res.status(400).json({
        success: false,
        message: "Email and a valid 6-digit verification code are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    if (user.emailVerified) {
      return res.json({
        success: true,
        message: "Email is already verified",
      });
    }

    if (!user.verificationCodeHash || !user.verificationExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No active verification code. Please request a new code.",
      });
    }

    if (new Date() > user.verificationExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code.",
      });
    }

    const validCode = await bcrypt.compare(
      verificationCode,
      user.verificationCodeHash
    );

    if (!validCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    await prisma.$transaction(async (tx) => {
      let linkedRole = user.role;
      if (user.pendingMemberLinkCodeHash) {
        const member = await tx.youthProfile.findUnique({
          where: { registrationCodeHash: user.pendingMemberLinkCodeHash },
          select: { id: true, userId: true, name: true, accountRole: true },
        });

        if (!member || member.userId || normalizePersonName(member.name) !== normalizePersonName(user.name)) {
          const linkError = new Error("This member code has already been used or is no longer valid. Please contact an Admin.");
          linkError.code = "MEMBER_LINK_UNAVAILABLE";
          throw linkError;
        }

        linkedRole = member.accountRole === "LEADER" ? "LEADER" : "YOUTH";
        const claimed = await tx.youthProfile.updateMany({
          where: {
            id: member.id,
            userId: null,
            registrationCodeHash: user.pendingMemberLinkCodeHash,
          },
          data: { userId: user.id, registrationCodeHash: null },
        });
        if (claimed.count !== 1) {
          const linkError = new Error("This member code has already been used. Please contact an Admin.");
          linkError.code = "MEMBER_LINK_UNAVAILABLE";
          throw linkError;
        }
      }

      const userUpdate = {
        emailVerified: true,
        verificationCodeHash: null,
        verificationExpiresAt: null,
        pendingMemberLinkCodeHash: null,
      };
      if (user.pendingMemberLinkCodeHash) userUpdate.role = linkedRole;
      await tx.user.update({
        where: { id: user.id },
        data: userUpdate,
      });
      if (user.pendingMemberLinkCodeHash) {
        await tx.notification.create({ data: {
          userId: user.id,
          type: "ACCOUNT_LINKED",
          title: "Congratulations! 🎉",
          message: "Your account has been successfully linked to your existing iKonek member record. Welcome! You're all set to continue your journey with us.",
        } });
      }
    });

    res.json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error) {
    if (error.code === "MEMBER_LINK_UNAVAILABLE") {
      return res.status(409).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify email",
    });
  }
};

// Resend verification code
const resendVerification = async (req, res) => {
  try {
    const normalizedEmail = String(req.body.email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.emailVerified) {
      return res.json({
        success: true,
        message: "If the account requires verification, a new code has been sent.",
      });
    }

    if (user.verificationExpiresAt && new Date() < user.verificationExpiresAt) {
      const secondsRemaining = Math.ceil((user.verificationExpiresAt.getTime() - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        code: "VERIFICATION_CODE_ACTIVE",
        message: `Please wait ${secondsRemaining} second${secondsRemaining === 1 ? '' : 's'} before requesting a new verification code.`,
        verificationExpiresAt: user.verificationExpiresAt,
      });
    }

    try {
      await createAndSendVerification(user);
    } catch (emailError) {
      console.error("Resend verification email error:", emailError);
      return res.status(503).json({
        success: false,
        message: "We could not send the verification email. Please try again later.",
      });
    }

    res.json({
      success: true,
      message: "A new verification code has been sent to your email.",
      verificationExpiresAt: new Date(Date.now() + VERIFICATION_MINUTES * 60 * 1000),
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend verification code",
    });
  }
};

// Link an already-created login account to an existing member profile.
// Useful for members who registered before the linking-code feature existed.
const linkExistingMember = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const linkingCode = String(req.body.linkingCode || "").trim().toUpperCase();

    if (!userId || !linkingCode) {
      return res.status(400).json({
        success: false,
        message: "A member registration code is required.",
      });
    }
    if (!/^IK-[A-F0-9]{8}-[A-F0-9]{8}$/.test(linkingCode)) {
      return res.status(400).json({ success: false, message: "Enter a valid iKonek member registration code." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.emailVerified) {
      return res.status(401).json({ success: false, message: "Please sign in with a verified account." });
    }
    if (user.role === "ADMIN") {
      return res.status(403).json({ success: false, message: "Admin accounts cannot claim a youth member record." });
    }

    const codeHash = hashRegistrationCode(linkingCode);
    const member = await prisma.youthProfile.findUnique({
      where: { registrationCodeHash: codeHash },
      select: { id: true, name: true, userId: true, accountRole: true },
    });
    if (!member || member.userId || normalizePersonName(member.name) !== normalizePersonName(user.name)) {
      return res.status(400).json({
        success: false,
        message: "The code could not be matched to your account name, or the member is already linked. Please ask an Admin for help.",
      });
    }

    const alreadyLinked = await prisma.youthProfile.findUnique({ where: { userId } });
    if (alreadyLinked) {
      return res.status(409).json({ success: false, message: "Your account is already linked to a member profile." });
    }

    const newRole = member.accountRole === "LEADER" ? "LEADER" : "YOUTH";
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.youthProfile.updateMany({
        where: { id: member.id, userId: null, registrationCodeHash: codeHash },
        data: { userId, registrationCodeHash: null },
      });
      if (claimed.count !== 1) {
        const linkError = new Error("This member code has already been used. Please ask an Admin for a new code.");
        linkError.code = "MEMBER_LINK_UNAVAILABLE";
        throw linkError;
      }
      await tx.user.update({ where: { id: userId }, data: { role: newRole } });
    });

    const token = jwt.sign({ userId: user.id, role: newRole }, process.env.JWT_SECRET, { expiresIn: SESSION_EXPIRY });
    return res.json({
      success: true,
      message: "Your account has been linked to your existing member profile.",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: newRole },
    });
  } catch (error) {
    if (error.code === "MEMBER_LINK_UNAVAILABLE") {
      return res.status(409).json({ success: false, message: error.message });
    }
    console.error("Link existing member error:", error);
    return res.status(500).json({ success: false, message: "Failed to link member profile." });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address before signing in.",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: SESSION_EXPIRY }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};


const PASSWORD_RESET_MINUTES = 10;

const requestPasswordReset = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always avoid exposing whether an email is registered. Enforce the resend
    // cooldown server-side using the existing code expiry timestamp (no migration).
    const publicResponse = {
      success: true,
      message: "If an account exists for this email, a recovery code has been sent.",
    };
    if (!user || !user.emailVerified) {
      return res.json({ ...publicResponse, retryAfterSeconds: PASSWORD_RESET_MINUTES * 60 });
    }

    if (user.passwordResetCodeHash && user.passwordResetExpiresAt) {
      const remainingMs = user.passwordResetExpiresAt.getTime() - Date.now();
      if (remainingMs > 0) {
        return res.status(429).json({
          success: false,
          message: "A recovery code was recently requested. Please wait for the countdown to finish before requesting another.",
          retryAfterSeconds: Math.ceil(remainingMs / 1000),
        });
      }
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetCodeHash: codeHash, passwordResetExpiresAt: expiresAt },
    });

    try {
      await sendPasswordResetEmail(user.email, user.name, code);
    } catch (emailError) {
      console.error("Password reset email error:", emailError);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetCodeHash: null, passwordResetExpiresAt: null },
      });
      return res.status(503).json({
        success: false,
        message: "We could not send the recovery email. Please try again later.",
      });
    }

    return res.json({ ...publicResponse, retryAfterSeconds: PASSWORD_RESET_MINUTES * 60 });
  } catch (error) {
    console.error("Request password reset error:", error);
    return res.status(500).json({ success: false, message: "Unable to request password recovery." });
  }
};

const verifyPasswordReset = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: "Enter a valid email and 6-digit code." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.emailVerified || !user.passwordResetCodeHash || !user.passwordResetExpiresAt ||
        Date.now() > user.passwordResetExpiresAt.getTime()) {
      return res.status(400).json({ success: false, message: "The recovery code is invalid or expired. Request a new code." });
    }

    const valid = await bcrypt.compare(code, user.passwordResetCodeHash);
    if (!valid) return res.status(400).json({ success: false, message: "The recovery code is invalid or expired. Request a new code." });

    return res.json({ success: true, message: "Code verified." });
  } catch (error) {
    console.error("Verify password reset error:", error);
    return res.status(500).json({ success: false, message: "Unable to verify the recovery code." });
  }
};

const resetPassword = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code) || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Enter a valid recovery code and a password with at least 8 characters." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.emailVerified || !user.passwordResetCodeHash || !user.passwordResetExpiresAt ||
        Date.now() > user.passwordResetExpiresAt.getTime()) {
      return res.status(400).json({ success: false, message: "The recovery code is invalid or expired. Request a new code." });
    }

    const valid = await bcrypt.compare(code, user.passwordResetCodeHash);
    if (!valid) return res.status(400).json({ success: false, message: "The recovery code is invalid or expired. Request a new code." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return res.json({ success: true, message: "Password updated successfully. You can now sign in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, message: "Unable to reset the password." });
  }
};

// Confirms the saved login is still valid and returns the current profile plus a
// fresh token. Called by the app every time it opens.
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, emailVerified: true },
    });

    if (!user || !user.emailVerified) {
      return res.status(401).json({ success: false, message: "Account not found" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: SESSION_EXPIRY }
    );

    return res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Load current user failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load your account." });
  }
};

module.exports = {
  requestPasswordReset,
  verifyPasswordReset,
  resetPassword,
  register,
  verifyEmail,
  resendVerification,
  login,
  getMe,
  linkExistingMember,
};

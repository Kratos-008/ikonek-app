const prisma = require("../lib/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../lib/email");

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
    const { name, email, password } = req.body;

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
        return res.status(409).json({
          success: false,
          code: "EMAIL_NOT_VERIFIED",
          message: "This email is registered but not verified. Please verify your email or request a new code.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "YOUTH",
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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCodeHash: null,
        verificationExpiresAt: null,
      },
    });

    res.json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error) {
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
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend verification code",
    });
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
      { expiresIn: "7d" }
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

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
};

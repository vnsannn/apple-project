const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const router = express.Router();
const checkEmailAccess = require("../utils/emailAccess");
const logActivity = require("../utils/activityLog");
const normalizePhone = require("../utils/phone");
const { sendResetCode } = require("../utils/email");

const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RESET_MIN_INTERVAL_MS = 60 * 1000; // max one code per email per minute
const RESET_MAX_ATTEMPTS = 5; // wrong-code attempts before a code is invalidated

function hashResetCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateResetCode() {
  // 6-digit numeric code, like a GitHub sudo prompt.
  return crypto.randomInt(100000, 1000000).toString();
}

// Public: tells the frontend if registration is open or domain-restricted
router.get("/registration-policy", async (req, res) => {
  try {
    const enabledSetting = await prisma.setting.findUnique({
      where: { key: "emailAccessEnabled" },
    });
    const domainsSetting = await prisma.setting.findUnique({
      where: { key: "emailAccessDomains" },
    });

    res.json({
      enabled: enabledSetting?.value === "true",
      domains: domainsSetting ? JSON.parse(domainsSetting.value) : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, middleName, phone } =
      req.body;

    const cleanEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const cleanFirst = typeof firstName === "string" ? firstName.trim() : "";
    const cleanLast = typeof lastName === "string" ? lastName.trim() : "";
    const cleanPassword = typeof password === "string" ? password : "";
    const cleanPhone = typeof phone === "string" ? phone.trim() : "";

    if (!cleanFirst && !cleanLast && !cleanEmail && !cleanPassword) {
      return res.status(400).json({ error: "Enter your info" });
    }

    if (!cleanFirst) {
      return res.status(400).json({ error: "Enter first name" });
    }

    if (!cleanLast) {
      return res.status(400).json({ error: "Enter last name" });
    }

    if (!cleanEmail) {
      return res.status(400).json({ error: "Enter email" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const { valid: phoneValid, value: normalizedPhone } =
      normalizePhone(cleanPhone);

    if (!phoneValid) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    if (!cleanPassword) {
      return res.status(400).json({ error: "Enter password" });
    }

    if (cleanPassword.length < 8) {
      return res.status(400).json({ error: "Password too short" });
    }

    const access = await checkEmailAccess(cleanEmail);

    if (access.enabled && !access.allowed) {
      return res.status(403).json({ error: "Not whitelisted domain" });
    }

    const lastBorrower = await prisma.borrower.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });

    const qrCode = `BOR-${String((lastBorrower?.id ?? 0) + 1).padStart(3, "0")}`;

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        role: "borrower",
        borrower: {
          create: {
            firstName: cleanFirst,
            lastName: cleanLast,
            middleName:
              typeof middleName === "string" && middleName.trim()
                ? middleName.trim()
                : null,
            phone: normalizedPhone,
            qrCode,
          },
        },
      },
    });

    await logActivity(
      null,
      "SELF_REGISTER",
      `${cleanFirst} ${cleanLast} (${qrCode})`,
    );

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
      borrower: { qrCode },
    });
  } catch (err) {
    if (err.code === "P2002" && err.meta?.target?.includes("qrCode")) {
      return res.status(409).json({ error: "Registration conflict" });
    }
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const cleanPassword = typeof password === "string" ? password : "";

    if (!cleanEmail && !cleanPassword) {
      return res.status(400).json({ error: "Enter your account" });
    }

    if (!cleanEmail) {
      return res.status(400).json({ error: "Enter your email" });
    }

    if (!cleanPassword) {
      return res.status(400).json({ error: "Enter your password" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      const access = await checkEmailAccess(cleanEmail);

      if (access.enabled && !access.allowed) {
        return res.status(400).json({ error: "Invalid email" });
      }

      return res.status(401).json({ error: "Email not registered" });
    }

    const valid = await bcrypt.compare(cleanPassword, user.password);
    if (!valid) return res.status(401).json({ error: "Wrong password" });

    const borrower = await prisma.borrower.findUnique({
      where: { userId: user.id },
    });

    if (borrower?.status === "banned") {
      return res.status(403).json({ error: "Banned account" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Request a password reset code. Always responds 200 to avoid account
// enumeration: unknown emails and known emails get the same reply. Rate-limited
// (the whole /auth router is behind authLimiter), plus a 1-per-minute cap per
// email so a single address can't be hammered.
router.post("/forgot-password", async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // No such account — still reply 200 to hide that it doesn't exist.
      // Log it server-side, and (in console/dev mode only) surface a flag so
      // Vien isn't left wondering whether a code was really sent.
      console.log("[FORGOT] not found (no send): %s", email);
      return res.json({
        message: "If that email exists, a code was sent.",
        ...((process.env.EMAIL_MODE || "console") !== "smtp"
          ? { devFound: false }
          : {}),
      });
    }

    console.log("[FORGOT] found user %s (id=%s), mode=%s", email, user.id, (process.env.EMAIL_MODE || "console"));

    // One code per minute per account.
    const recent = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (recent && recent.createdAt.getTime() > Date.now() - RESET_MIN_INTERVAL_MS) {
      console.log("[FORGOT] throttled (1/min) for %s", email);
      return res.status(429).json({ error: "Please wait a moment before requesting another code." });
    }

    const code = generateResetCode();
    const tokenHash = hashResetCode(code);

    // Invalidate any prior unused codes for this user, then store the new one.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
      },
    });

    let sendResult;
    try {
      sendResult = await sendResetCode(user.email, code);
    } catch (e) {
      console.error("Email send failed:", e.message);
      // Never let a mail failure leak. The generic message still guards
      // account enumeration; the code just won't appear in console mode.
    }

    res.json({
      message: "If that email exists, a code was sent.",
      // Dev convenience: in console/mock mode, echo the code so you can test
      // without reading server logs. Omitted entirely for real SMTP sends.
      ...(sendResult?.mode === "console"
        ? { devCode: code, devFound: true }
        : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Set a new password using a reset code from /forgot-password.
router.post("/reset-password", async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const code =
      typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const password =
      typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

    if (!email || !code || !password) {
      return res.status(400).json({ error: "Enter your email, code, and new password" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password too short" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    // Find this user's most recent, still-valid code. (We look it up by email
    // rather than just by the submitted hash so we can count wrong attempts on
    // the right token for a brute-force cap.)
    const token = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!token || token.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    if (hashResetCode(code) !== token.tokenHash) {
      // Wrong code — count it, and invalidate after too many tries so a
      // 6-digit code can't be brute-forced within the shared auth window.
      const attempts = token.attempts + 1;
      await prisma.passwordResetToken.update({
        where: { id: token.id },
        data:
          attempts >= RESET_MAX_ATTEMPTS
            ? { attempts, usedAt: new Date() } // burn the token
            : { attempts },
      });
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
    ]);

    // Log the reset as a security-relevant event but don't leak it broadly.
    await logActivity(null, "PASSWORD_RESET", user.email);

    res.json({ message: "Your password has been reset. You can now sign in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Lightweight "does this code match"? check for the OTP input. It does NOT
// change the password or consume the code; it only reports valid/invalid so the
// client can color the boxes correctly. Wrong attempts still count toward the
// brute-force cap (invalidating the code after RESET_MAX_ATTEMPTS wrong tries).
router.post("/verify-reset-code", async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const code =
      typeof req.body?.code === "string" ? req.body.code.trim() : "";

    if (!email || !code) {
      return res.status(400).json({ error: "Enter your email and code" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ valid: false });

    const token = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!token || token.expiresAt.getTime() < Date.now()) {
      return res.json({ valid: false });
    }

    if (hashResetCode(code) === token.tokenHash) {
      return res.json({ valid: true });
    }

    // Wrong code — count it, and invalidate after too many tries.
    const attempts = token.attempts + 1;
    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data:
        attempts >= RESET_MAX_ATTEMPTS
          ? { attempts, usedAt: new Date() }
          : { attempts },
    });
    return res.json({ valid: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const router = express.Router();
const checkEmailAccess = require("../utils/emailAccess");
const logActivity = require("../utils/activityLog");

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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    if (!cleanFirst || !cleanLast) {
      return res
        .status(400)
        .json({ error: "First and last name are required" });
    }

    const access = await checkEmailAccess(cleanEmail);

    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const lastBorrower = await prisma.borrower.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });

    const qrCode = `BOR-${String((lastBorrower?.id ?? 0) + 1).padStart(3, "0")}`;

    const hashedPassword = await bcrypt.hash(password, 10);

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
            phone:
              typeof phone === "string" && phone.trim() ? phone.trim() : null,
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
      return res
        .status(409)
        .json({ error: "Registration conflict, please try again" });
    }
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Email is already registered" });
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

module.exports = router;

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const router = express.Router();
const checkEmailAccess = require("../utils/emailAccess");

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
    const { email, password } = req.body;

    const cleanEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const access = await checkEmailAccess(cleanEmail);

    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: cleanEmail, password: hashedPassword, role: "borrower" },
    });
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }

    if (typeof password !== "string" || password.length === 0) {
      return res.status(400).json({ error: "Enter your password" });
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

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

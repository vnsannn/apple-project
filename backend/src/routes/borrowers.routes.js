const express = require("express");
const bcrypt = require("bcrypt");
const logActivity = require("../utils/activityLog");
const prisma = require("../config/prisma");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const respondError = require("../utils/respondError");
const normalizePhone = require("../utils/phone");
const { isEmail, nonEmpty } = require("../utils/validate");
const router = express.Router();

// Create borrower + login account
router.post(
  "/",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const {
        email,
        password,
        lastName,
        firstName,
        middleName,
        phone,
        qrCode,
      } = req.body;

      const { valid, value: normalizedPhone } = normalizePhone(phone);

      if (!valid) {
        return res.status(400).json({ error: "Invalid phone number" });
      }

      if (!isEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: "Password too short" });
      }

      if (!nonEmpty(firstName) || !nonEmpty(lastName)) {
        return res.status(400).json({ error: "First and last name are required" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const borrower = await prisma.borrower.create({
        data: {
          lastName,
          firstName,
          middleName,
          phone: normalizedPhone,
          qrCode,
          user: {
            create: {
              email,
              password: hashedPassword,
              role: "borrower",
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
        },
      });

      await logActivity(
        req.user.id,
        "ADD_BORROWER",
        `${borrower.firstName} ${borrower.lastName} (${borrower.qrCode})`,
      );

      res.status(201).json(borrower);
    } catch (err) {
      respondError(res, err, { duplicate: "Email or QR Code already in use" });
    }
  },
);

// List borrowers
router.get("/", authenticate, async (req, res) => {
  try {
    const borrowers = await prisma.borrower.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(borrowers);
  } catch (err) {
    respondError(res, err, { duplicate: "Email or QR Code already in use" });
  }
});

// Get one borrower
router.get("/:id", authenticate, async (req, res) => {
  try {
    const borrower = await prisma.borrower.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        transactions: true,
        reservations: true,
      },
    });

    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    res.json(borrower);
  } catch (err) {
    respondError(res, err, { duplicate: "Email or QR Code already in use" });
  }
});

// Update borrower profile
router.put(
  "/:id",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const {
        lastName,
        firstName,
        middleName,
        phone,
        qrCode,
        status,
        violationCount,
      } = req.body;

      const { valid, value: normalizedPhone } = normalizePhone(phone);

      if (!valid) {
        return res.status(400).json({ error: "Invalid phone number" });
      }

      const data = {
        lastName,
        firstName,
        middleName,
        qrCode,
        status,
        violationCount,
      };

      // Only touch phone when the caller sent it; undefined means "leave as-is".
      if (phone !== undefined) {
        data.phone = normalizedPhone;
      }

      const borrower = await prisma.borrower.update({
        where: { id: Number(req.params.id) },
        data,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
        },
      });

      res.json(borrower);
    } catch (err) {
      respondError(res, err, { duplicate: "Email or QR Code already in use" });
    }
  },
);

// Delete borrower + linked user
router.delete(
  "/:id",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const borrower = await prisma.borrower.findUnique({
        where: { id: Number(req.params.id) },
      });

      if (!borrower) {
        return res.status(404).json({ error: "Borrower not found" });
      }

      await prisma.user.delete({
        where: { id: borrower.userId },
      });

      await logActivity(
        req.user.id,
        "DELETE_BORROWER",
        `${borrower.firstName} ${borrower.lastName} (${borrower.qrCode})`,
      );

      res.json({ message: "Borrower deleted" });
    } catch (err) {
      respondError(res, err, { duplicate: "Email or QR Code already in use" });
    }
  },
);

module.exports = router;

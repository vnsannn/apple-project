const express = require("express");

const prisma = require("../config/prisma");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const logActivity = require("../utils/activityLog");

const router = express.Router();

const allowedRoles = ["master", "librarian", "borrower"];

// List users
router.get("/", authenticate, requireRole("master"), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        borrower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            qrCode: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Change user role
router.put(
  "/:id/role",
  authenticate,
  requireRole("master"),
  async (req, res) => {
    try {
      const { role } = req.body;

      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          error: "Invalid role",
          allowedRoles,
        });
      }

      const userId = Number(req.params.id);

      const user = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      await logActivity(
        req.user.id,
        "CHANGE_ROLE",
        `${user.email} -> ${user.role}`,
      );

      res.json(user);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

module.exports = router;

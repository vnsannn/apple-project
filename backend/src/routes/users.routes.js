const express = require("express");
const respondError = require("../utils/respondError");
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
    respondError(res, err);
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
      if (!Number.isInteger(userId)) {
        return res.status(404).json({ error: "User not found" });
      }

      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) {
        return res.status(404).json({ error: "User not found" });
      }

      // Last-master guard: never leave the system with zero masters. If the
      // target is currently a master and is being changed away from master,
      // require at least one OTHER master to remain.
      if (target.role === "master" && role !== "master") {
        const masterCount = await prisma.user.count({ where: { role: "master" } });
        if (masterCount <= 1) {
          return res
            .status(400)
            .json({ error: "Cannot demote the last master account" });
        }
      }

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
      respondError(res, err);
    }
  },
);

module.exports = router;

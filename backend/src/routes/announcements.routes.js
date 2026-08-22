const express = require("express");
const prisma = require("../config/prisma");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const logActivity = require("../utils/activityLog");
const respondError = require("../utils/respondError");
const { nonEmpty } = require("../utils/validate");
const router = express.Router();

// Create an announcement (system-wide notice).
router.post(
  "/",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const { title, body } = req.body;
      if (!nonEmpty(title) || !nonEmpty(body)) {
        return res.status(400).json({ error: "Title and body are required" });
      }

      const announcement = await prisma.announcement.create({
        data: { title: title.trim(), body: body.trim() },
      });

      await logActivity(req.user.id, "ADD_ANNOUNCEMENT", announcement.title);

      res.status(201).json(announcement);
    } catch (err) {
      respondError(res, err);
    }
  },
);

// List announcements (any signed-in user, e.g. the dashboard notice panel).
router.get("/", authenticate, async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(announcements);
  } catch (err) {
    respondError(res, err);
  }
});

// Update an announcement.
router.put(
  "/:id",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      const existing = await prisma.announcement.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      const { title, body } = req.body;
      if (!nonEmpty(title) || !nonEmpty(body)) {
        return res.status(400).json({ error: "Title and body are required" });
      }

      const announcement = await prisma.announcement.update({
        where: { id },
        data: { title: title.trim(), body: body.trim() },
      });

      await logActivity(req.user.id, "UPDATE_ANNOUNCEMENT", announcement.title);

      res.json(announcement);
    } catch (err) {
      respondError(res, err);
    }
  },
);

// Delete an announcement.
router.delete(
  "/:id",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      const announcement = await prisma.announcement.findUnique({ where: { id } });
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      await prisma.announcement.delete({ where: { id } });
      await logActivity(req.user.id, "DELETE_ANNOUNCEMENT", announcement.title);

      res.json({ message: "Announcement deleted" });
    } catch (err) {
      respondError(res, err);
    }
  },
);

module.exports = router;

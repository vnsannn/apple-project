const express = require("express");

const prisma = require("../config/prisma");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// List activity logs
router.get("/", authenticate, requireRole("master"), async (req, res) => {
  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    res.json(logs);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

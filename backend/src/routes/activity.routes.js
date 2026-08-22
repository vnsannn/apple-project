const express = require("express");
const respondError = require("../utils/respondError");
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
    respondError(res, err);
  }
});

module.exports = router;

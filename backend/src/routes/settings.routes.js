const express = require("express");

const prisma = require("../config/prisma");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const logActivity = require("../utils/activityLog");

const router = express.Router();

const DEFAULT_EMAIL_ACCESS = {
  enabled: false,
  domains: [],
  emails: [],
};

async function getSetting(key, fallback) {
  const setting = await prisma.setting.findUnique({
    where: { key },
  });

  return setting ? setting.value : fallback;
}

async function setSetting(key, value) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// Get email access settings
router.get(
  "/email-access",
  authenticate,
  requireRole("master"),
  async (req, res) => {
    try {
      const enabled = await getSetting("emailAccessEnabled", "false");
      const domains = await getSetting("emailAccessDomains", "[]");
      const emails = await getSetting("emailAccessEmails", "[]");

      res.json({
        enabled: enabled === "true",
        domains: JSON.parse(domains),
        emails: JSON.parse(emails),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

// Update email access settings
router.put(
  "/email-access",
  authenticate,
  requireRole("master"),
  async (req, res) => {
    try {
      const { enabled, domains, emails } = req.body;

      const cleanDomains = Array.isArray(domains)
        ? domains.map((domain) => domain.trim().toLowerCase()).filter(Boolean)
        : DEFAULT_EMAIL_ACCESS.domains;

      const cleanEmails = Array.isArray(emails)
        ? emails.map((email) => email.trim().toLowerCase()).filter(Boolean)
        : DEFAULT_EMAIL_ACCESS.emails;

      await setSetting("emailAccessEnabled", enabled ? "true" : "false");
      await setSetting("emailAccessDomains", JSON.stringify(cleanDomains));
      await setSetting("emailAccessEmails", JSON.stringify(cleanEmails));

      await logActivity(
        req.user.id,
        "UPDATE_EMAIL_ACCESS",
        `enabled=${enabled ? "true" : "false"}`,
      );

      res.json({
        enabled: !!enabled,
        domains: cleanDomains,
        emails: cleanEmails,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

module.exports = router;

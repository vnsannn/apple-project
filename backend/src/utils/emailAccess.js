const prisma = require("../config/prisma");

async function getSetting(key, fallback) {
  const setting = await prisma.setting.findUnique({
    where: { key },
  });

  return setting ? setting.value : fallback;
}

async function checkEmailAccess(email) {
  const cleanEmail = email.trim().toLowerCase();
  const domain = cleanEmail.split("@")[1];

  const enabled = await getSetting("emailAccessEnabled", "false");

  if (enabled !== "true") {
    return {
      enabled: false,
      allowed: true,
      reason: "Email access control is disabled",
    };
  }

  const domains = JSON.parse(await getSetting("emailAccessDomains", "[]"));
  const emails = JSON.parse(await getSetting("emailAccessEmails", "[]"));

  if (emails.includes(cleanEmail)) {
    return {
      enabled: true,
      allowed: true,
      reason: "Email is specifically allowed",
    };
  }

  if (domain && domains.includes(domain)) {
    return {
      enabled: true,
      allowed: true,
      reason: "Email domain is allowed",
    };
  }

  return {
    enabled: true,
    allowed: false,
    reason: "Email is not allowed",
  };
}

module.exports = checkEmailAccess;

const prisma = require("../config/prisma");

async function logActivity(userId, action, target) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        target,
      },
    });
  } catch (err) {
    console.error("Activity log failed:", err.message);
  }
}

module.exports = logActivity;

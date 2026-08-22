// Pluggable email sender for account recovery.
//
// EMAIL_MODE controls how a reset code is delivered:
//   "console" (default) — log the code to the server terminal + return it in
//                         dev only. Zero setup; use for building/offline tests.
//   "smtp"              — send a real email via SMTP (e.g. Gmail app password).
//
// The code is deliberately isolated here so you can swap providers without
// touching the reset flow. This is also the seam where future 2FA codes and
// recovery/backup codes will be delivered.
//
// NOTE: this module only receives the plaintext code for the message body;
// hashing lives in the auth route, never here.

function mode() {
  return (process.env.EMAIL_MODE || "console").toLowerCase();
}

function buildTransport() {
  // Lazy import so console mode works without the dependency installed.
  const nodemailer = require("nodemailer");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Returns a human-friendly summary; throws on hard SMTP failure so the caller
// can decide whether to surface it (it should NOT leak to the client).
async function sendResetCode(email, code) {
  const m = mode();

  if (m !== "smtp") {
    // Console/mock mode — never leaves the machine.
    console.log("[RESET][console] %s -> code=%s", email, code);
    return { mode: "console" };
  }

  // SMTP mode. Log what we're about to do so the server terminal tells the story.
  console.log(
    "[RESET][smtp] to=%s host=%s port=%s user=%s",
    email,
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_USER,
  );

  const transport = buildTransport();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  let result;
  try {
    result = await transport.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "BTECH Library"}" <${from}>`,
      to: email,
      subject: "BTECH Library — password reset code",
      text:
        `Your BTECH Library password reset code is:\n\n${code}\n\n` +
        `This code expires in 15 minutes. If you didn't request it, you can ignore this email.\n`,
      html:
        `<p>Your BTECH Library password reset code is:</p>` +
        `<p style="font-size:26px;font-weight:bold;letter-spacing:4px">${code}</p>` +
        `<p>This code expires in <strong>15 minutes</strong>. If you didn't request it, you can ignore this email.</p>`,
    });
  } catch (err) {
    console.error("[RESET][smtp] SEND FAILED:", err.message);
    if (err.response) console.error("  response:", err.response);
    if (err.code) console.error("  code:", err.code);
    throw err;
  }

  console.log("[RESET][smtp] SENT messageId=%s accepted=%j", result.messageId, result.accepted);
  return { mode: "smtp", messageId: result.messageId };
}

module.exports = { sendResetCode };

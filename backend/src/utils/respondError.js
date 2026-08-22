function respondError(res, err, context = {}) {
  // Errors we marked with a status ourselves (like the borrow conflict)
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Prisma unique-constraint violation
  if (err.code === "P2002") {
    return res
      .status(409)
      .json({ error: context.duplicate || "Duplicate value" });
  }

  // Everything else: log the truth for you, hand out a flat line
  console.error(err);
  return res.status(400).json({ error: "Something went wrong" });
}

module.exports = respondError;

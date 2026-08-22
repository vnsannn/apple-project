const express = require("express");
const prisma = require("../config/prisma");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const logActivity = require("../utils/activityLog");
const respondError = require("../utils/respondError");
const { nonEmpty } = require("../utils/validate");
const router = express.Router();

const RESERVATION_STATUSES = ["queued", "active", "claimed", "expired", "cancelled"];

// Create a reservation for a borrower on a book title (queued by default).
router.post(
  "/",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const { bookId, borrowerQrCode } = req.body;

      const bid = Number(bookId);
      if (!Number.isInteger(bid)) {
        return res.status(400).json({ error: "Valid book is required" });
      }
      if (!nonEmpty(borrowerQrCode)) {
        return res.status(400).json({ error: "Borrower QR is required" });
      }

      const book = await prisma.book.findUnique({ where: { id: bid } });
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      const borrower = await prisma.borrower.findUnique({
        where: { qrCode: borrowerQrCode },
      });
      if (!borrower) {
        return res.status(404).json({ error: "Borrower not found" });
      }

      // Skip duplicates: don't let the same borrower queue twice for one title.
      const existing = await prisma.reservation.findFirst({
        where: {
          bookId: bid,
          borrowerId: borrower.id,
          status: { in: ["queued", "active"] },
        },
      });
      if (existing) {
        return res.status(409).json({ error: "Borrower already has an active reservation for this book" });
      }

      const reservation = await prisma.reservation.create({
        data: {
          bookId: bid,
          borrowerId: borrower.id,
          status: "queued",
        },
        include: { book: true, borrower: { include: { user: { select: { id: true, email: true } } } } },
      });

      await logActivity(
        req.user.id,
        "ADD_RESERVATION",
        `${book.title} -> ${borrower.firstName} ${borrower.lastName}`,
      );

      res.status(201).json(reservation);
    } catch (err) {
      respondError(res, err);
    }
  },
);

// List reservations (staff only — a borrower may only see their own via /me)
router.get("/", authenticate, requireRole("librarian", "master"), async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        book: true,
        borrower: { include: { user: { select: { id: true, email: true } } } },
      },
      orderBy: { reservedAt: "desc" },
    });
    res.json(reservations);
  } catch (err) {
    respondError(res, err);
  }
});

// Update a reservation (change status).
router.put(
  "/:id",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      const existing = await prisma.reservation.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: "Reservation not found" });
      }

      const { status } = req.body;
      if (!status || !RESERVATION_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Invalid reservation status" });
      }

      const reservation = await prisma.reservation.update({
        where: { id },
        data: {
          status,
          // Claiming or expiring timestamps the reservation window.
          ...(status === "claimed" || status === "expired"
            ? { expiresAt: new Date() }
            : {}),
        },
        include: { book: true, borrower: { include: { user: { select: { id: true, email: true } } } } },
      });

      await logActivity(req.user.id, "UPDATE_RESERVATION", `${reservation.book.title} -> ${status}`);

      res.json(reservation);
    } catch (err) {
      respondError(res, err);
    }
  },
);

// Delete (cancel) a reservation.
router.delete(
  "/:id",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      const reservation = await prisma.reservation.findUnique({
        where: { id },
        include: { book: true },
      });
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }

      await prisma.reservation.delete({ where: { id } });
      await logActivity(req.user.id, "DELETE_RESERVATION", `${reservation.book.title}`);

      res.json({ message: "Reservation deleted" });
    } catch (err) {
      respondError(res, err);
    }
  },
);

module.exports = router;

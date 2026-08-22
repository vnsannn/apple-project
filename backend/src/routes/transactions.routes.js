const express = require("express");
const logActivity = require("../utils/activityLog");
const prisma = require("../config/prisma");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const respondError = require("../utils/respondError");
const { nonEmpty } = require("../utils/validate");
const router = express.Router();

// Borrow a book copy
// Borrow a book copy
router.post(
  "/borrow",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const { bookCopyQrCode, borrowerQrCode } = req.body;

      if (!nonEmpty(bookCopyQrCode) || !nonEmpty(borrowerQrCode)) {
        return res.status(400).json({ error: "Book copy and borrower QR are required" });
      }

      const bookCopy = await prisma.bookCopy.findUnique({
        where: { qrCode: bookCopyQrCode },
        include: { book: true },
      });

      if (!bookCopy) {
        return res.status(404).json({ error: "Book copy not found" });
      }

      const borrower = await prisma.borrower.findUnique({
        where: { qrCode: borrowerQrCode },
      });

      if (!borrower) {
        return res.status(404).json({ error: "Borrower not found" });
      }

      if (borrower.status === "banned") {
        return res.status(403).json({ error: "Borrower account is banned" });
      }

      if (bookCopy.status !== "available") {
        return res.status(400).json({ error: "Book copy is not available" });
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const transaction = await prisma.$transaction(async (tx) => {
        // Atomic claim: only succeeds if the copy is STILL available
        const claimed = await tx.bookCopy.updateMany({
          where: { id: bookCopy.id, status: "available" },
          data: { status: "borrowed" },
        });

        if (claimed.count === 0) {
          const conflict = new Error("Book copy is not available");
          conflict.status = 400;
          throw conflict;
        }

        return tx.transaction.create({
          data: {
            bookCopyId: bookCopy.id,
            borrowerId: borrower.id,
            dueDate,
          },
          include: {
            bookCopy: { include: { book: true } },
            borrower: {
              include: {
                user: { select: { id: true, email: true, role: true } },
              },
            },
          },
        });
      });

      await logActivity(
        req.user.id,
        "BORROW_BOOK",
        `${bookCopy.book.title} (${bookCopy.qrCode}) -> ${borrower.firstName} ${borrower.lastName}`,
      );

      res.status(201).json(transaction);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error(err);
      res.status(400).json({ error: "Something went wrong" });
    }
  },
);

// Return a book copy
router.post(
  "/return",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const { bookCopyQrCode, condition } = req.body;

      if (!nonEmpty(bookCopyQrCode)) {
        return res.status(400).json({ error: "Book copy QR is required" });
      }

      const bookCopy = await prisma.bookCopy.findUnique({
        where: { qrCode: bookCopyQrCode },
        include: { book: true },
      });

      if (!bookCopy) {
        return res.status(404).json({ error: "Book copy not found" });
      }

      const transaction = await prisma.$transaction(async (tx) => {
        // Atomically close the open loan: only succeeds if returnedAt is still
        // null. Two concurrent returns of the same copy -> exactly one wins.
        const closed = await tx.transaction.updateMany({
          where: { bookCopyId: bookCopy.id, returnedAt: null },
          data: { returnedAt: new Date() },
        });

        if (closed.count === 0) {
          const conflict = new Error("No active loan for this book copy");
          conflict.status = 400;
          throw conflict;
        }

        // Set the copy available inside the same transaction so a borrow can't
        // race in between the close and the status flip.
        await tx.bookCopy.update({
          where: { id: bookCopy.id },
          data: {
            status: "available",
            ...(condition ? { condition } : {}),
          },
        });

        return tx.transaction.findFirst({
          where: { bookCopyId: bookCopy.id, returnedAt: { not: null } },
          orderBy: { returnedAt: "desc" },
          include: {
            bookCopy: { include: { book: true } },
            borrower: {
              include: {
                user: { select: { id: true, email: true, role: true } },
              },
            },
          },
        });
      });

      await logActivity(
        req.user.id,
        "RETURN_BOOK",
        `${bookCopy.book.title} (${bookCopy.qrCode}) <- ${transaction.borrower.firstName} ${transaction.borrower.lastName}`,
      );

      res.json(transaction);
    } catch (err) {
      respondError(res, err);
    }
  },
);

// List transactions
router.get("/", authenticate, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        bookCopy: {
          include: {
            book: true,
          },
        },
        borrower: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        borrowedAt: "desc",
      },
    });

    res.json(transactions);
  } catch (err) {
    respondError(res, err);
  }
});

module.exports = router;

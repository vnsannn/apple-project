const express = require("express");
const logActivity = require("../utils/activityLog");
const prisma = require("../config/prisma");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const respondError = require("../utils/respondError");
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

      const bookCopy = await prisma.bookCopy.findUnique({
        where: { qrCode: bookCopyQrCode },
        include: { book: true },
      });

      if (!bookCopy) {
        return res.status(404).json({ error: "Book copy not found" });
      }

      const activeTransaction = await prisma.transaction.findFirst({
        where: {
          bookCopyId: bookCopy.id,
          returnedAt: null,
        },
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
      });

      if (!activeTransaction) {
        return res
          .status(400)
          .json({ error: "No active loan for this book copy" });
      }

      const transaction = await prisma.transaction.update({
        where: { id: activeTransaction.id },
        data: {
          returnedAt: new Date(),
        },
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
      });

      await prisma.bookCopy.update({
        where: { id: bookCopy.id },
        data: {
          status: "available",
          condition: condition || bookCopy.condition,
        },
      });

      await logActivity(
        req.user.id,
        "RETURN_BOOK",
        `${bookCopy.book.title} (${bookCopy.qrCode}) <- ${activeTransaction.borrower.firstName} ${activeTransaction.borrower.lastName}`,
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

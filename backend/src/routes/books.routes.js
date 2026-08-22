const express = require("express");
const prisma = require("../config/prisma");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const logActivity = require("../utils/activityLog");
const respondError = require("../utils/respondError");
const { nonEmpty, isArrayOfShapes } = require("../utils/validate");
const router = express.Router();

// Create a book (title + its copies)
router.post(
  "/",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const { title, author, isbn, genre, description, copies } = req.body;

      if (!nonEmpty(title) || !nonEmpty(author) || !nonEmpty(isbn)) {
        return res.status(400).json({ error: "Title, author, and ISBN are required" });
      }

      if (!isArrayOfShapes(copies || [], ["qrCode"])) {
        return res.status(400).json({ error: "copies must be an array of copies with a qrCode" });
      }

      const book = await prisma.book.create({
        data: {
          title,
          author,
          isbn,
          genre,
          description,
          copies: {
            create: copies, // [{ qrCode, condition }]
          },
        },
      });

      await logActivity(
        req.user.id,
        "ADD_BOOK",
        `${book.title} (${book.isbn})`,
      );

      res.status(201).json(book);
    } catch (err) {
      respondError(res, err, { duplicate: "A book with this ISBN or QR code already exists" });
    }
  },
);

// List all books (with their copies)
router.get("/", authenticate, async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      include: { copies: true },
    });
    res.json(books);
  } catch (err) {
    respondError(res, err, { duplicate: "A book with this ISBN or QR code already exists" });
  }
});

// Get one book by id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(404).json({ error: "Book not found" });
    }
    const book = await prisma.book.findUnique({
      where: { id },
      include: { copies: true },
    });
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
  } catch (err) {
    respondError(res, err, { duplicate: "A book with this ISBN or QR code already exists" });
  }
});

// Update a book
router.put(
  "/:id",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(404).json({ error: "Book not found" });
      }
      const existing = await prisma.book.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: "Book not found" });
      }
      const { title, author, isbn, genre, description } = req.body;
      const book = await prisma.book.update({
        where: { id },
        data: { title, author, isbn, genre, description },
      });
      res.json(book);
    } catch (err) {
      respondError(res, err, { duplicate: "A book with this ISBN or QR code already exists" });
    }
  },
);

// Delete a book (and its copies)
// Delete a book
router.delete(
  "/:id",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const book = await prisma.book.findUnique({
        where: { id: Number(req.params.id) },
      });

      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      await prisma.book.delete({
        where: { id: Number(req.params.id) },
      });

      await logActivity(
        req.user.id,
        "DELETE_BOOK",
        `${book.title} (${book.isbn})`,
      );

      res.json({ message: "Book deleted" });
    } catch (err) {
      respondError(res, err, { duplicate: "A book with this ISBN or QR code already exists" });
    }
  },
);

module.exports = router;

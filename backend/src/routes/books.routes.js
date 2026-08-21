const express = require("express");
const prisma = require("../config/prisma");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// Create a book (title + its copies)
router.post(
  "/",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const { title, author, isbn, genre, description, copies } = req.body;

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

      res.status(201).json(book);
    } catch (err) {
      res.status(400).json({ error: err.message });
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
    res.status(400).json({ error: err.message });
  }
});

// Get one book by id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: Number(req.params.id) },
      include: { copies: true },
    });
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a book
router.put(
  "/:id",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      const { title, author, isbn, genre, description } = req.body;
      const book = await prisma.book.update({
        where: { id: Number(req.params.id) },
        data: { title, author, isbn, genre, description },
      });
      res.json(book);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

// Delete a book (and its copies)
router.delete(
  "/:id",
  authenticate,
  requireRole("librarian", "master"),
  async (req, res) => {
    try {
      await prisma.book.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: "Book deleted" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

module.exports = router;

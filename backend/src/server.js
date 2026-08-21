const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/auth.routes");
app.use("/api/v1/auth", authRoutes);

const authenticate = require("./middleware/auth");
const requireRole = require("./middleware/requireRole");

app.get("/", (req, res) => {
  res.send("Backend alive");
});

app.get("/api/v1/protected", authenticate, (req, res) => {
  res.json({ message: "You are authenticated", user: req.user });
});

app.get(
  "/api/v1/librarian-area",
  authenticate,
  requireRole("librarian", "master"),
  (req, res) => {
    res.json({ message: "Welcome librarian/master", user: req.user });
  },
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const booksRoutes = require("./routes/books.routes");
app.use("/api/v1/books", booksRoutes);

const borrowersRoutes = require("./routes/borrowers.routes");
app.use("/api/v1/borrowers", borrowersRoutes);

const transactionsRoutes = require("./routes/transactions.routes");
app.use("/api/v1/transactions", transactionsRoutes);

const activityRoutes = require("./routes/activity.routes");
app.use("/api/v1/activity", activityRoutes);

const usersRoutes = require("./routes/users.routes");
app.use("/api/v1/users", usersRoutes);

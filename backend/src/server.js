const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    exposedHeaders: ["Retry-After"],
  }),
);
app.use(express.json());

// Max 20 auth attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "GET" && req.path === "/registration-policy",
  message: { error: "Too many attempts. Try again in 15 minutes." },
});

// Routes
const authRoutes = require("./routes/auth.routes");
const booksRoutes = require("./routes/books.routes");
const borrowersRoutes = require("./routes/borrowers.routes");
const transactionsRoutes = require("./routes/transactions.routes");
const activityRoutes = require("./routes/activity.routes");
const usersRoutes = require("./routes/users.routes");
const settingsRoutes = require("./routes/settings.routes");

app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/books", booksRoutes);
app.use("/api/v1/borrowers", borrowersRoutes);
app.use("/api/v1/transactions", transactionsRoutes);
app.use("/api/v1/activity", activityRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/settings", settingsRoutes);

app.get("/", (req, res) => {
  res.send("Backend alive");
});

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing. Check backend/.env");
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

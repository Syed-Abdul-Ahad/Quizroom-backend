const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const AppError = require("./utils/AppError");
const errorHandler = require("./middlewares/errorHandler");
const rootRouter = require("./routes");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to Quizroom backend" });
});

app.use("/api", rootRouter);

app.all("/{*any}", (req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404));
});

app.use(errorHandler);

module.exports = app;

const AppError = require("../utils/AppError");

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((item) => item.message)
      .join(", ");
    error = new AppError(message || "Validation failed", 400);
  }

  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue || {}).join(", ");
    error = new AppError(`Duplicate value for field: ${duplicateField}`, 409);
  }

  if (!(error instanceof AppError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    error = new AppError(message, statusCode);
  }

  res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
  });
};

module.exports = errorHandler;

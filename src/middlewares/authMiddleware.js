const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const verifyAuth = (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new AppError("No token provided. Please log in", 401));
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Token expired. Please log in again", 401));
    }
    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Invalid token", 401));
    }
    return next(new AppError("Authentication failed", 401));
  }
};

module.exports = { verifyAuth };

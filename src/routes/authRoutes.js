const express = require("express");
const {
  registerStudent,
  registerTeacher,
  loginStudent,
  loginTeacher,
  logout,
  verifyToken,
} = require("../controllers/authController");
const { verifyAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

// Student routes
router.post("/student/register", registerStudent);
router.post("/student/login", loginStudent);

// Teacher routes
router.post("/teacher/register", registerTeacher);
router.post("/teacher/login", loginTeacher);

// Logout (same for both)
router.post("/logout", logout);

// Verify token (protected route)
router.get("/verify", verifyAuth, verifyToken);

module.exports = router;

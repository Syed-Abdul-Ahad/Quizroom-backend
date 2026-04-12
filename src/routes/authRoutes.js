const express = require("express");
const {
  registerStudent,
  registerTeacher,
  loginStudent,
  loginTeacher,
  logout,
} = require("../controllers/authController");

const router = express.Router();

// Student routes
router.post("/student/register", registerStudent);
router.post("/student/login", loginStudent);

// Teacher routes
router.post("/teacher/register", registerTeacher);
router.post("/teacher/login", loginTeacher);

// Logout (same for both)
router.post("/logout", logout);

module.exports = router;

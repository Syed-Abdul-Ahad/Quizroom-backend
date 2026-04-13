const express = require("express");
const courseRoutes = require("./courseRoutes");

const {
  createStudent,
  getPublishedQuizzes,
  getPublishedQuizById,
  submitAttempt,
  getStudentAttempts,
  getStudentNotifications,
  getStudentProfile,
  updateStudentProfile,
} = require("../controllers/studentController");

const router = express.Router();

router.post("/", createStudent);
router.use("/:studentId/courses", courseRoutes);
router.get("/quizzes", getPublishedQuizzes);
router.get("/quizzes/:quizId", getPublishedQuizById);
router.post("/:studentId/quizzes/:quizId/attempts", submitAttempt);
router.get("/:studentId/attempts", getStudentAttempts);
router.get("/:studentId/notifications", getStudentNotifications);
router.get("/:studentId/profile", getStudentProfile);
router.patch("/:studentId/profile", updateStudentProfile);

module.exports = router;

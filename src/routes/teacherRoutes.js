const express = require("express");
const courseRoutes = require("./courseRoutes");

const {
  createTeacher,
  createQuiz,
  addQuestionsToQuiz,
  getTeacherQuizzes,
  getTeacherQuizById,
  updateQuiz,
  publishQuiz,
  getQuizAttempts,
  getTeacherNotifications,
} = require("../controllers/teacherController");

const router = express.Router();

router.post("/", createTeacher);
router.use("/:teacherId/courses", courseRoutes);
router.post("/:teacherId/quizzes", createQuiz);
router.post("/:teacherId/quizzes/:quizId/questions", addQuestionsToQuiz);
router.get("/:teacherId/quizzes", getTeacherQuizzes);
router.get("/:teacherId/quizzes/:quizId", getTeacherQuizById);
router.patch("/:teacherId/quizzes/:quizId", updateQuiz);
router.patch("/:teacherId/quizzes/:quizId/publish", publishQuiz);
router.get("/:teacherId/quizzes/:quizId/attempts", getQuizAttempts);
router.get("/:teacherId/notifications", getTeacherNotifications);

module.exports = router;

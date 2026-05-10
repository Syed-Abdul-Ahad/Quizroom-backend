const express = require("express");
const courseRoutes = require("./courseRoutes");
const upload = require("../middlewares/uploadMiddleware");

const {
  createStudent,
  getPublishedQuizzes,
  getPublishedQuizzes_debug,
  getPublishedQuizById,
  submitAttempt,
  getStudentAttempts,
  getStudentNotifications,
  getStudentProfile,
  updateStudentProfile,
  uploadStudentProfilePicture,
} = require("../controllers/studentController");

const router = express.Router();

router.post("/", createStudent);
router.use("/:studentId/courses", courseRoutes);
router.get("/quizzes", getPublishedQuizzes_debug);
router.get("/quizzes/:quizId", getPublishedQuizById);
router.post("/:studentId/quizzes/:quizId/attempts", submitAttempt);
router.get("/:studentId/attempts", getStudentAttempts);
router.get("/:studentId/notifications", getStudentNotifications);
router.get("/:studentId/profile", getStudentProfile);
router.post("/:studentId/profile/picture", upload.single('profilePicture'), uploadStudentProfilePicture);
router.patch("/:studentId/profile", updateStudentProfile);

module.exports = router;

const express = require("express");
const {
  getCourseDetails,
  getCourseQuizzes,
  getCourseEnrolledStudents,
  getCourseSubmissions,
} = require("../controllers/courseDetailController");

const router = express.Router({ mergeParams: true });

// Get course details
router.get("/", getCourseDetails);

// Get quizzes for a course
router.get("/quizzes", getCourseQuizzes);

// Get enrolled students for a course
router.get("/students", getCourseEnrolledStudents);

// Get submissions for a course
router.get("/submissions", getCourseSubmissions);

module.exports = router;

const express = require("express");
const courseDetailRoutes = require("./courseDetailRoutes");

const {
  createCourse,
  editCourse,
  getTeacherCourses,
  getCourseById,
  joinCourse,
  getStudentCourses,
} = require("../controllers/courseController");

const router = express.Router({ mergeParams: true });

// Student routes - must come BEFORE parameterized routes
router.post("/join", joinCourse);
router.get("/enrolled", getStudentCourses);

// Teacher routes - /teacher/:teacherId/courses
router.post("/", createCourse);
router.patch("/:courseId", editCourse);
router.get("/", getTeacherCourses);

// Course detail routes - /teacher/:teacherId/courses/:courseId/...
router.use("/:courseId", courseDetailRoutes);

// Get course by id - needs to be after courseDetailRoutes
router.get("/:courseId", getCourseById);

module.exports = router;

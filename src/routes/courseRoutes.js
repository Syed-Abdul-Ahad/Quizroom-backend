const express = require("express");

const {
  createCourse,
  editCourse,
  getTeacherCourses,
  getCourseById,
} = require("../controllers/courseController");

const router = express.Router({ mergeParams: true });

router.post("/", createCourse);
router.patch("/:courseId", editCourse);
router.get("/", getTeacherCourses);
router.get("/:courseId", getCourseById);

module.exports = router;

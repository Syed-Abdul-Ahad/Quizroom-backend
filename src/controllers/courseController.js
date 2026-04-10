const Course = require("../models/Course");
const Teacher = require("../models/Teacher");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const createCourse = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const { title, description, status } = req.body;

  if (!title) {
    throw new AppError("title is required", 400);
  }

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  const course = await Course.create({
    teacher: teacherId,
    title,
    description: description || "",
    status: status || "ACTIVE",
  });

  res.status(201).json({
    status: "success",
    data: course,
  });
});

const editCourse = asyncHandler(async (req, res) => {
  const { teacherId, courseId } = req.params;
  const { title, description, status } = req.body;

  const course = await Course.findOne({ _id: courseId, teacher: teacherId });
  if (!course) {
    throw new AppError("Course not found for this teacher", 404);
  }

  if (title !== undefined) {
    course.title = title;
  }

  if (description !== undefined) {
    course.description = description;
  }

  if (status !== undefined) {
    course.status = status;
  }

  await course.save();

  res.status(200).json({
    status: "success",
    data: course,
  });
});

const getTeacherCourses = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  const courses = await Course.find({ teacher: teacherId }).sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: courses.length,
    data: courses,
  });
});

const getCourseById = asyncHandler(async (req, res) => {
  const { teacherId, courseId } = req.params;

  const course = await Course.findOne({ _id: courseId, teacher: teacherId });
  if (!course) {
    throw new AppError("Course not found for this teacher", 404);
  }

  res.status(200).json({
    status: "success",
    data: course,
  });
});

module.exports = {
  createCourse,
  editCourse,
  getTeacherCourses,
  getCourseById,
};

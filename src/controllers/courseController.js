const Course = require("../models/Course");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Quiz = require("../models/Quiz");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { generateCourseCode } = require("../utils/courseCodeGenerator");
const { emitEvent } = require("../services/notificationService");

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

  const courseCode = await generateCourseCode();

  const course = await Course.create({
    teacher: teacherId,
    title,
    description: description || "",
    courseCode,
    status: status || "ACTIVE",
    students: [],
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

  // Aggregate quiz counts for each course
  const courseIds = courses.map(course => course._id);
  
  const quizCounts = await Quiz.aggregate([
    {
      $match: { course: { $in: courseIds } }
    },
    {
      $group: {
        _id: "$course",
        count: { $sum: 1 }
      }
    }
  ]);

  // Create a map for quick lookup
  const quizCountMap = {};
  quizCounts.forEach(item => {
    quizCountMap[item._id.toString()] = item.count;
  });

  // Add quiz count to each course
  const coursesWithCounts = courses.map(course => ({
    ...course.toObject(),
    quizzesCreated: quizCountMap[course._id.toString()] || 0,
    studentsEnrolled: course.students.length,
  }));

  res.status(200).json({
    status: "success",
    results: coursesWithCounts.length,
    data: coursesWithCounts,
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

const joinCourse = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { courseCode } = req.body;

  if (!courseCode) {
    throw new AppError("Course code is required", 400);
  }

  const student = await Student.findById(studentId);
  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const course = await Course.findOne({ courseCode: courseCode.toUpperCase() });
  if (!course) {
    throw new AppError("Invalid course code", 404);
  }

  // Check if student is already enrolled
  if (course.students.includes(studentId)) {
    throw new AppError("Student already enrolled in this course", 400);
  }

  // Add student to course
  course.students.push(studentId);
  await course.save();

  // Emit STUDENT_JOINED event for teacher notification
  try {
    await emitEvent("STUDENT_JOINED", {
      studentId: student._id,
      studentName: student.name,
      courseId: course._id,
      courseTitle: course.title,
      teacherId: course.teacher,
    });
  } catch (err) {
    console.error("Failed to emit STUDENT_JOINED event:", err);
  }

  res.status(200).json({
    status: "success",
    message: "Successfully joined the course",
    data: course,
  });
});

const getStudentCourses = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findById(studentId);
  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const courses = await Course.find({ students: studentId })
    .populate("teacher", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: courses.length,
    data: courses,
  });
});

module.exports = {
  createCourse,
  editCourse,
  getTeacherCourses,
  getCourseById,
  joinCourse,
  getStudentCourses,
};

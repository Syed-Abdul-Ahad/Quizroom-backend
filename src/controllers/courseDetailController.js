const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

// Get course details with enrolled students count
const getCourseDetails = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId)
    .populate("teacher", "name email")
    .populate("students", "name email");

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  res.status(200).json({
    status: "success",
    data: {
      _id: course._id,
      title: course.title,
      description: course.description,
      courseCode: course.courseCode,
      teacher: course.teacher,
      studentsEnrolled: course.students.length,
      students: course.students,
    },
  });
});

// Get all quizzes for a course
const getCourseQuizzes = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  const quizzes = await Quiz.find({ course: courseId })
    .select("title description durationMinutes totalMarks isPublished createdAt questions")
    .lean();

  // Add additional data for each quiz
  const quizzesWithStats = await Promise.all(
    quizzes.map(async (quiz) => {
      const attempts = await Attempt.find({ quiz: quiz._id });
      const avgScore = attempts.length > 0
        ? (attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length)
        : 0;
      
      return {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        durationMinutes: quiz.durationMinutes,
        totalMarks: quiz.totalMarks,
        isPublished: quiz.isPublished,
        questionsCount: quiz.questions?.length || 0,
        attemptsCount: attempts.length,
        avgScore: Number(avgScore.toFixed(2)),
      };
    })
  );

  res.status(200).json({
    status: "success",
    results: quizzesWithStats.length,
    data: quizzesWithStats,
  });
});

// Get enrolled students for a course
const getCourseEnrolledStudents = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId).populate("students", "name email");
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  // Get attempts data for each student
  const studentsWithStats = await Promise.all(
    course.students.map(async (student) => {
      const attempts = await Attempt.find({
        student: student._id,
        quiz: { $in: (await Quiz.find({ course: courseId }).select("_id")).map((q) => q._id) },
      });

      const avgScore = attempts.length > 0
        ? (attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length).toFixed(2)
        : 0;

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        quizzesTaken: attempts.length,
        averageScore: Number(avgScore),
      };
    })
  );

  res.status(200).json({
    status: "success",
    results: studentsWithStats.length,
    data: studentsWithStats,
  });
});

// Get quiz submissions for a course
const getCourseSubmissions = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  const quizzes = await Quiz.find({ course: courseId }).select("_id title totalMarks");
  const quizIds = quizzes.map((q) => q._id);

  const attempts = await Attempt.find({ quiz: { $in: quizIds } })
    .populate("student", "name email")
    .populate("quiz", "title totalMarks")
    .sort({ createdAt: -1 });

  const submissions = attempts.map((attempt) => ({
    _id: attempt._id,
    student: attempt.student,
    studentId: attempt.student._id,
    studentEmail: attempt.student.email,
    quiz: attempt.quiz,
    quizId: attempt.quiz._id,
    obtainedMarks: attempt.score,
    totalMarks: attempt.maxScore || attempt.quiz.totalMarks,
    percentage: attempt.percentage,
    isGraded: attempt.gradedAt !== null && attempt.gradedAt !== undefined,
    createdAt: attempt.createdAt,
  }));

  res.status(200).json({
    status: "success",
    results: submissions.length,
    data: submissions,
  });
});

module.exports = {
  getCourseDetails,
  getCourseQuizzes,
  getCourseEnrolledStudents,
  getCourseSubmissions,
};

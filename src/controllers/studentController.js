const Attempt = require("../models/Attempt");
const Notification = require("../models/Notification");
const Quiz = require("../models/Quiz");
const Student = require("../models/Student");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const {
  buildGradingStrategy,
  buildQuestionOrderStrategy,
  buildAttemptPolicyStrategy,
  gradeQuizAttempt,
} = require("../patterns/strategy/gradingStrategies");
const examConfig = require("../patterns/singleton/examConfig");
const { emitEvent } = require("../services/notificationService");

const createStudent = asyncHandler(async (req, res) => {
  const { name, email, password, institute } = req.body;

  if (!name || !email || !password || !institute) {
    throw new AppError("name, email, password, and institute are required", 400);
  }

  const existingStudent = await Student.findOne({ email });
  if (existingStudent) {
    throw new AppError("Email already registered", 409);
  }

  const student = await Student.create({ name, email, password, institute });

  res.status(201).json({
    status: "success",
    data: student,
  });
});

const getPublishedQuizzes = asyncHandler(async (req, res) => {
  const { courseId } = req.query;
  const filter = { isPublished: true };

  if (courseId) {
    filter.course = courseId;
  }

  const quizzes = await Quiz.find(filter)
    .select(
      "title description teacher course gradingStrategy strategies durationMinutes totalMarks deadline createdAt"
    )
    .populate("teacher", "name email")
    .populate("course", "title description status")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: quizzes.length,
    data: quizzes,
  });
});

// Enhanced handler with logging (kept for debug; can be removed later)
const getPublishedQuizzes_debug = asyncHandler(async (req, res) => {
  const { courseId } = req.query;
  const filter = { isPublished: true };

  console.log('getPublishedQuizzes_debug called with query:', req.query);

  if (courseId) {
    filter.course = courseId;
  }

  try {
    console.log('Query filter for published quizzes:', filter);
    const quizzes = await Quiz.find(filter)
      .select(
        "title description teacher course gradingStrategy strategies durationMinutes totalMarks deadline createdAt"
      )
      .populate("teacher", "name email")
      .populate("course", "title description status")
      .sort({ createdAt: -1 });
    // Normalize quizzes to avoid runtime errors from missing fields or schema virtuals
    const safeQuizzes = (quizzes || []).map((q) => {
      // Convert to plain object without virtuals to avoid virtual getters accessing undefined fields
      const obj = q && typeof q.toObject === 'function' ? q.toObject({ virtuals: false }) : q || {};
      if (!Array.isArray(obj.questions)) obj.questions = [];
      return obj;
    });

    res.status(200).json({
      status: "success",
      results: safeQuizzes.length,
      data: safeQuizzes,
    });
  } catch (err) {
    console.error('Error in getPublishedQuizzes_debug:', err);
    throw err;
  }
});

const getPublishedQuizById = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findOne({ _id: quizId, isPublished: true })
    .populate("teacher", "name email")
    .populate("course", "title description status");

  if (!quiz) {
    throw new AppError("Published quiz not found", 404);
  }

  const questionOrderStrategy = buildQuestionOrderStrategy(
    quiz.strategies?.randomizeQuestions
  );
  const orderedQuestions = questionOrderStrategy.apply(quiz.questions);

  const safeQuestions = orderedQuestions.map((question) => ({
    _id: question._id,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    points: question.points,
    numericTolerance: question.type === "NUMERIC" ? question.numericTolerance : undefined,
    allowedFileTypes:
      question.type === "FILE_UPLOAD" ? question.allowedFileTypes : undefined,
  }));

  res.status(200).json({
    status: "success",
    data: {
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      gradingStrategy: quiz.gradingStrategy,
      strategies: quiz.strategies,
      teacher: quiz.teacher,
      course: quiz.course,
      isPublished: quiz.isPublished,
      durationMinutes: quiz.durationMinutes,
      totalMarks: quiz.totalMarks,
      deadline: quiz.deadline,
      questionCount: safeQuestions.length,
      totalPoints: quiz.totalPoints,
      questions: safeQuestions,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    },
  });
});

const submitAttempt = asyncHandler(async (req, res) => {
  const { studentId, quizId } = req.params;
  const { responses } = req.body;

  const student = await Student.findById(studentId);
  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz || !quiz.isPublished) {
    throw new AppError("Published quiz not found", 404);
  }

  if (!Array.isArray(responses)) {
    throw new AppError("responses must be an array", 400);
  }

  const existingAttempts = await Attempt.countDocuments({ quiz: quizId, student: studentId });
  const attemptPolicy = buildAttemptPolicyStrategy(
    quiz.strategies?.allowMultipleAttempts
  );

  if (!attemptPolicy.validate(existingAttempts)) {
    throw new AppError("Attempt already submitted for this quiz", 409);
  }

  const strategy = buildGradingStrategy(
    quiz.gradingStrategy || examConfig.getDefaultGradingStrategy()
  );

  const graded = gradeQuizAttempt(quiz, responses, strategy);

  const attempt = await Attempt.create({
    quiz: quiz._id,
    student: student._id,
    attemptNumber: existingAttempts + 1,
    responses: graded.responses,
    score: graded.score,
    maxScore: graded.maxScore,
    percentage: graded.percentage,
  });

  await emitEvent("ATTEMPT_SUBMITTED", {
    attemptId: attempt._id,
    quizId: quiz._id,
    quizTitle: quiz.title,
    studentId: student._id,
    teacherId: quiz.teacher,
    score: graded.score,
    maxScore: graded.maxScore,
  });

  res.status(201).json({
    status: "success",
    data: attempt,
  });
});

const getStudentAttempts = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findById(studentId);
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    const attempts = await Attempt.find({ student: studentId })
    .populate("quiz", "title description course totalMarks durationMinutes questions")

    if (!attempts) {
      return res.status(200).json({
        status: "success",
        results: 0,
        data: [],
      });
    }

    res.status(200).json({
      status: "success",
      results: attempts.length,
      data: attempts,
    });
  } catch (error) {
    console.error("Error in getStudentAttempts:", error);
    throw error;
  }
});

const getStudentNotifications = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findById(studentId);
  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const notifications = await Notification.find({
    recipientType: "Student",
    recipientId: studentId,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: notifications.length,
    data: notifications,
  });
});

const getStudentProfile = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findById(studentId).select("-password");
  if (!student) {
    throw new AppError("Student not found", 404);
  }

  res.status(200).json({
    status: "success",
    data: student,
  });
});

const updateStudentProfile = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const {
    name,
    department,
    studentId: studentIdValue,
    profilePicture,
    bio,
    phone,
  } = req.body;

  // Build update object with only provided fields
  const updateData = {};
  if (name) updateData.name = name;
  if (department) updateData.department = department;
  if (studentIdValue) updateData.studentId = studentIdValue;
  if (profilePicture) updateData.profilePicture = profilePicture;
  if (bio) updateData.bio = bio;
  if (phone) updateData.phone = phone;

  const student = await Student.findByIdAndUpdate(
    studentId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  res.status(200).json({
    status: "success",
    message: "Profile updated successfully",
    data: student,
  });
});

module.exports = {
  createStudent,
  getPublishedQuizzes,
  getPublishedQuizzes_debug,
  getPublishedQuizById,
  submitAttempt,
  getStudentAttempts,
  getStudentNotifications,
  getStudentProfile,
  updateStudentProfile,
};

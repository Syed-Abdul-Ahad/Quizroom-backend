const Attempt = require("../models/Attempt");
const Course = require("../models/Course");
const Notification = require("../models/Notification");
const Quiz = require("../models/Quiz");
const Teacher = require("../models/Teacher");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { createQuestion } = require("../patterns/factory/questionFactory");
const examConfig = require("../patterns/singleton/examConfig");
const { emitEvent } = require("../services/notificationService");

const parseBoolean = (value) => value === true || value === "true";

const parseQuizStrategyOptions = (payload = {}) => {
  const randomizeQuestions = parseBoolean(payload.randomizeQuestions);
  const allowMultipleAttempts = parseBoolean(payload.allowMultipleAttempts);
  const negativeMarking = parseBoolean(payload.negativeMarking);

  return {
    randomizeQuestions,
    allowMultipleAttempts,
    negativeMarking,
    gradingStrategy: negativeMarking ? "NEGATIVE_MARKING" : "EXACT_MATCH",
  };
};

const getQuizStatsMap = async (quizIds) => {
  if (!quizIds.length) {
    return new Map();
  }

  const stats = await Attempt.aggregate([
    {
      $match: {
        quiz: { $in: quizIds },
      },
    },
    {
      $group: {
        _id: "$quiz",
        attemptsCount: { $sum: 1 },
        avgScore: { $avg: "$percentage" },
        pendingCount: {
          $sum: { $cond: [{ $eq: ["$reviewedAt", null] }, 1, 0] },
        },
        reviewedAvgScore: {
          $avg: { $cond: [{ $ne: ["$reviewedAt", null] }, "$percentage", null] },
        },
      },
    },
  ]);

  return new Map(
    stats.map((item) => [String(item._id), {
      attemptsCount: item.attemptsCount,
      avgScore: Number((item.avgScore || 0).toFixed(2)),
      pendingCount: item.pendingCount || 0,
      reviewedAvgScore: Number((item.reviewedAvgScore || 0).toFixed(2)),
    }])
  );
};

const createTeacher = asyncHandler(async (req, res) => {
  const { name, email, password, institute } = req.body;

  if (!name || !email || !password || !institute) {
    throw new AppError("name, email, password, and institute are required", 400);
  }

  const existingTeacher = await Teacher.findOne({ email });
  if (existingTeacher) {
    throw new AppError("Email already registered", 409);
  }

  const teacher = await Teacher.create({ name, email, password, institute });

  res.status(201).json({
    status: "success",
    data: teacher,
  });
});

const createQuiz = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const {
    title,
    description,
    courseId,
    durationMinutes,
    totalMarks,
    deadline,
    randomizeQuestions,
    allowMultipleAttempts,
    negativeMarking,
    questions,
  } = req.body;

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  if (!title || !courseId) {
    throw new AppError("title and courseId are required", 400);
  }

  const course = await Course.findOne({ _id: courseId, teacher: teacherId });
  if (!course) {
    throw new AppError("Course not found for this teacher", 404);
  }

  const strategies = parseQuizStrategyOptions({
    randomizeQuestions,
    allowMultipleAttempts,
    negativeMarking,
  });

  let normalizedQuestions = [];
  if (questions !== undefined) {
    if (!Array.isArray(questions) || !questions.length) {
      throw new AppError("questions must be a non-empty array when provided", 400);
    }

    if (questions.length > examConfig.getMaxQuestionsPerQuiz()) {
      throw new AppError("Question limit exceeded for a single quiz", 400);
    }

    normalizedQuestions = questions.map((question) => createQuestion(question));
  }

  const parsedDeadline = deadline ? new Date(deadline) : null;
  if (parsedDeadline && Number.isNaN(parsedDeadline.getTime())) {
    throw new AppError("deadline must be a valid date", 400);
  }

  const derivedTotalMarks = normalizedQuestions.reduce((sum, question) => sum + question.points, 0);

  const quiz = await Quiz.create({
    teacher: teacher._id,
    course: course._id,
    title,
    description: description || "",
    durationMinutes:
      Number(durationMinutes) > 0 ? Number(durationMinutes) : 30,
    totalMarks:
      Number(totalMarks) > 0
        ? Number(totalMarks)
        : derivedTotalMarks,
    deadline: parsedDeadline,
    gradingStrategy: strategies.gradingStrategy || examConfig.getDefaultGradingStrategy(),
    strategies: {
      randomizeQuestions: strategies.randomizeQuestions,
      allowMultipleAttempts: strategies.allowMultipleAttempts,
      negativeMarking: strategies.negativeMarking,
    },
    questions: normalizedQuestions,
  });

  await quiz.populate("course", "title description status");

  res.status(201).json({
    status: "success",
    data: quiz,
  });
});

const addQuestionsToQuiz = asyncHandler(async (req, res) => {
  const { teacherId, quizId } = req.params;
  const payload = req.body.questions || req.body.question || req.body;
  const questionsInput = Array.isArray(payload) ? payload : [payload];

  if (!questionsInput.length || !questionsInput[0] || !questionsInput[0].type) {
    throw new AppError("Provide question or questions with valid type", 400);
  }

  const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherId });
  if (!quiz) {
    throw new AppError("Quiz not found for this teacher", 404);
  }

  if (quiz.isPublished) {
    throw new AppError("Cannot add questions to a published quiz", 400);
  }

  const nextCount = quiz.questions.length + questionsInput.length;
  if (nextCount > examConfig.getMaxQuestionsPerQuiz()) {
    throw new AppError("Question limit exceeded for a single quiz", 400);
  }

  const normalizedQuestions = questionsInput.map((question) => createQuestion(question));
  quiz.questions.push(...normalizedQuestions);

  if (!quiz.totalMarks || quiz.totalMarks <= 0) {
    quiz.totalMarks = quiz.questions.reduce((sum, item) => sum + item.points, 0);
  }

  await quiz.save();

  res.status(200).json({
    status: "success",
    message: "Questions added successfully",
    data: quiz,
  });
});

const getTeacherQuizzes = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const { courseId, isPublished } = req.query;

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  const filter = { teacher: teacherId };

  if (courseId) {
    filter.course = courseId;
  }

  if (isPublished === "true") {
    filter.isPublished = true;
  }

  if (isPublished === "false") {
    filter.isPublished = false;
  }

  const quizzes = await Quiz.find(filter)
    .populate("course", "title status")
    .sort({ createdAt: -1 });

  const quizIds = quizzes.map((quiz) => quiz._id);
  const statsMap = await getQuizStatsMap(quizIds);

  const data = quizzes.map((quiz) => {
    const stats = statsMap.get(String(quiz._id)) || { attemptsCount: 0, avgScore: 0 };
    return {
      ...quiz.toObject(),
      attemptsCount: stats.attemptsCount,
      avgScore: stats.avgScore,
    };
  });

  res.status(200).json({
    status: "success",
    results: data.length,
    data,
  });
});

const getTeacherQuizById = asyncHandler(async (req, res) => {
  const { teacherId, quizId } = req.params;

  const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherId }).populate(
    "course",
    "title description status"
  );
  if (!quiz) {
    throw new AppError("Quiz not found for this teacher", 404);
  }

  const [summary] = await Attempt.aggregate([
    { $match: { quiz: quiz._id } },
    {
      $group: {
        _id: "$quiz",
        attemptsCount: { $sum: 1 },
        avgScore: { $avg: "$percentage" },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      ...quiz.toObject(),
      attemptsCount: summary ? summary.attemptsCount : 0,
      avgScore: summary ? Number((summary.avgScore || 0).toFixed(2)) : 0,
    },
  });
});

const updateQuiz = asyncHandler(async (req, res) => {
  const { teacherId, quizId } = req.params;
  const {
    title,
    description,
    gradingStrategy,
    courseId,
    questions,
    isPublished,
    durationMinutes,
    totalMarks,
    deadline,
    randomizeQuestions,
    allowMultipleAttempts,
    negativeMarking,
  } = req.body;

  const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherId });
  if (!quiz) {
    throw new AppError("Quiz not found for this teacher", 404);
  }

  if (courseId) {
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      throw new AppError("Course not found for this teacher", 404);
    }
    quiz.course = course._id;
  }

  if (title !== undefined) {
    quiz.title = title;
  }

  if (description !== undefined) {
    quiz.description = description;
  }

  if (gradingStrategy !== undefined) {
    quiz.gradingStrategy = gradingStrategy;
  }

  const hasStrategyPatch =
    randomizeQuestions !== undefined ||
    allowMultipleAttempts !== undefined ||
    negativeMarking !== undefined;

  if (hasStrategyPatch) {
    const strategies = parseQuizStrategyOptions({
      randomizeQuestions:
        randomizeQuestions !== undefined
          ? randomizeQuestions
          : quiz.strategies?.randomizeQuestions,
      allowMultipleAttempts:
        allowMultipleAttempts !== undefined
          ? allowMultipleAttempts
          : quiz.strategies?.allowMultipleAttempts,
      negativeMarking:
        negativeMarking !== undefined
          ? negativeMarking
          : quiz.strategies?.negativeMarking,
    });

    quiz.strategies = {
      randomizeQuestions: strategies.randomizeQuestions,
      allowMultipleAttempts: strategies.allowMultipleAttempts,
      negativeMarking: strategies.negativeMarking,
    };
    quiz.gradingStrategy = strategies.gradingStrategy;
  }

  if (durationMinutes !== undefined) {
    const value = Number(durationMinutes);
    if (Number.isNaN(value) || value <= 0) {
      throw new AppError("durationMinutes must be a positive number", 400);
    }
    quiz.durationMinutes = value;
  }

  if (totalMarks !== undefined) {
    const value = Number(totalMarks);
    if (Number.isNaN(value) || value < 0) {
      throw new AppError("totalMarks must be zero or a positive number", 400);
    }
    quiz.totalMarks = value;
  }

  if (deadline !== undefined) {
    if (deadline === null || deadline === "") {
      quiz.deadline = null;
    } else {
      const parsedDeadline = new Date(deadline);
      if (Number.isNaN(parsedDeadline.getTime())) {
        throw new AppError("deadline must be a valid date", 400);
      }
      quiz.deadline = parsedDeadline;
    }
  }

  if (questions !== undefined) {
    if (!Array.isArray(questions) || !questions.length) {
      throw new AppError("questions must be a non-empty array", 400);
    }

    if (questions.length > examConfig.getMaxQuestionsPerQuiz()) {
      throw new AppError("Question limit exceeded for a single quiz", 400);
    }

    quiz.questions = questions.map((question) => createQuestion(question));
  }

  if (isPublished !== undefined) {
    quiz.isPublished = Boolean(isPublished);
  }

  await quiz.save();
  await quiz.populate("course", "title description status");

  res.status(200).json({
    status: "success",
    data: quiz,
  });
});

const publishQuiz = asyncHandler(async (req, res) => {
  const { teacherId, quizId } = req.params;

  const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherId });
  if (!quiz) {
    throw new AppError("Quiz not found for this teacher", 404);
  }

  const shouldNotify = !quiz.isPublished;
  quiz.isPublished = true;
  await quiz.save();

  if (shouldNotify) {
    await emitEvent("QUIZ_PUBLISHED", {
      quizId: quiz._id,
      quizTitle: quiz.title,
      courseId: quiz.course,
    });
  }

  res.status(200).json({
    status: "success",
    data: quiz,
  });
});

const updateQuizAttemptReview = asyncHandler(async (req, res) => {
  const { teacherId, quizId, attemptId } = req.params;
  const { responses } = req.body;

  const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherId });
  if (!quiz) {
    throw new AppError("Quiz not found for this teacher", 404);
  }

  const attempt = await Attempt.findOne({ _id: attemptId, quiz: quizId }).populate(
    "student",
    "name email"
  );
  if (!attempt) {
    throw new AppError("Attempt not found for this quiz", 404);
  }

  if (!Array.isArray(responses)) {
    throw new AppError("responses must be an array", 400);
  }

  const responseMap = new Map(
    responses.map((response) => [String(response.questionId), response])
  );

  attempt.responses = attempt.responses.map((existingResponse) => {
    const update = responseMap.get(String(existingResponse.questionId));

    if (!update) {
      return existingResponse;
    }

    return {
      ...existingResponse.toObject(),
      obtainedPoints:
        update.obtainedPoints !== undefined
          ? Number(update.obtainedPoints)
          : existingResponse.obtainedPoints,
      remarks:
        update.remarks !== undefined
          ? String(update.remarks)
          : existingResponse.remarks || "",
    };
  });

  const totalScore = attempt.responses.reduce(
    (sum, response) => sum + Number(response.obtainedPoints || 0),
    0
  );
  const maxScore = quiz.questions.reduce(
    (sum, question) => sum + Number(question.points || 0),
    0
  );

  attempt.score = Number(totalScore.toFixed(2));
  attempt.maxScore = maxScore;
  attempt.percentage = maxScore > 0 ? Number(((attempt.score / maxScore) * 100).toFixed(2)) : 0;
  attempt.reviewedAt = new Date();

  await attempt.save();

  // Emit ATTEMPT_GRADED event to notify student
  try {
    await emitEvent("ATTEMPT_GRADED", {
      attemptId: attempt._id,
      quizId: quiz._id,
      quizTitle: quiz.title,
      studentId: attempt.student._id,
      score: attempt.score,
      maxScore: attempt.maxScore,
    });
  } catch (err) {
    console.error("[updateQuizAttemptReview] Failed to emit ATTEMPT_GRADED event:", err);
  }

  res.status(200).json({
    status: "success",
    data: attempt,
  });
});

const getQuizAttempts = asyncHandler(async (req, res) => {
  const { teacherId, quizId } = req.params;

  const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherId }).populate(
    "course",
    "title"
  );
  if (!quiz) {
    throw new AppError("Quiz not found for this teacher", 404);
  }

  const attempts = await Attempt.find({ quiz: quizId })
    .populate("student", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: attempts.length,
    data: attempts,
  });
});

const getTeacherNotifications = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const mongoose = require("mongoose");

  console.log('[getTeacherNotifications] Called with teacherId:', teacherId);
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
  console.log('[getTeacherNotifications] Querying with ObjectId:', teacherObjectId);
  const notifications = await Notification.find({
    recipientType: "Teacher",
    recipientId: teacherObjectId,
  }).sort({ createdAt: -1 });

  console.log('[getTeacherNotifications] Found notifications:', notifications.length);

  res.status(200).json({
    status: "success",
    results: notifications.length,
    data: notifications,
  });
});

const getTeacherProfile = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;

  const teacher = await Teacher.findById(teacherId).select("-password");
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  res.status(200).json({
    status: "success",
    data: teacher,
  });
});

const updateTeacherProfile = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const {
    name,
    department,
    employeeId,
    profilePicture,
    phone,
  } = req.body;

  // Build update object with only provided fields
  const updateData = {};
  if (name) updateData.name = name;
  if (department) updateData.department = department;
  if (employeeId) updateData.employeeId = employeeId;
  if (profilePicture) updateData.profilePicture = profilePicture;
  if (phone) updateData.phone = phone;

  const teacher = await Teacher.findByIdAndUpdate(
    teacherId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  res.status(200).json({
    status: "success",
    message: "Profile updated successfully",
    data: teacher,
  });
});

module.exports = {
  createTeacher,
  createQuiz,
  addQuestionsToQuiz,
  getTeacherQuizzes,
  getTeacherQuizById,
  updateQuiz,
  publishQuiz,
  getQuizAttempts,
  updateQuizAttemptReview,
  getTeacherNotifications,
  getTeacherProfile,
  updateTeacherProfile,
};

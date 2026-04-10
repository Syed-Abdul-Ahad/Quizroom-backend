const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "MCQ_SINGLE",
        "MCQ_MULTIPLE",
        "TRUE_FALSE",
        "SHORT_ANSWER",
        "LONG_ANSWER",
        "FILE_UPLOAD",
        "NUMERIC",
      ],
      required: true,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      default: [],
    },
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isAutoGradable: {
      type: Boolean,
      default: true,
    },
    numericTolerance: {
      type: Number,
      default: 0,
      min: 0,
    },
    allowedFileTypes: {
      type: [String],
      default: [],
    },
    points: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: 1,
    },
    totalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    deadline: {
      type: Date,
      default: null,
    },
    gradingStrategy: {
      type: String,
      enum: ["EXACT_MATCH", "NEGATIVE_MARKING"],
      default: "EXACT_MATCH",
    },
    strategies: {
      randomizeQuestions: {
        type: Boolean,
        default: false,
      },
      negativeMarking: {
        type: Boolean,
        default: false,
      },
      allowMultipleAttempts: {
        type: Boolean,
        default: false,
      },
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

quizSchema.virtual("totalQuestions").get(function getTotalQuestions() {
  return this.questions.length;
});

quizSchema.virtual("totalPoints").get(function getTotalPoints() {
  return this.questions.reduce((sum, question) => sum + question.points, 0);
});

module.exports = mongoose.model("Quiz", quizSchema);

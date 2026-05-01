const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    answer: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    obtainedPoints: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    responses: {
      type: [responseSchema],
      default: [],
    },
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    maxScore: {
      type: Number,
      required: true,
      default: 0,
    },
    percentage: {
      type: Number,
      required: true,
      default: 0,
    },
    gradedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

attemptSchema.index({ quiz: 1, student: 1, attemptNumber: 1 }, { unique: true });

module.exports = mongoose.model("Attempt", attemptSchema);

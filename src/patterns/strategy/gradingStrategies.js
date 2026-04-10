class ExactMatchStrategy {
  gradeQuestion(question, answer) {
    if (!question.isAutoGradable) {
      return 0;
    }

    if (question.type === "MCQ_MULTIPLE") {
      const submittedAnswers = normalizeStringArray(answer);
      const correctAnswers = normalizeStringArray(question.correctAnswer);
      return areStringArraysEqual(submittedAnswers, correctAnswers) ? question.points : 0;
    }

    if (question.type === "NUMERIC") {
      const submittedValue = Number(answer);
      const correctValue = Number(question.correctAnswer);
      const tolerance = Number(question.numericTolerance || 0);

      if (Number.isNaN(submittedValue) || Number.isNaN(correctValue)) {
        return 0;
      }

      return Math.abs(submittedValue - correctValue) <= tolerance ? question.points : 0;
    }

    const submitted = normalizeString(answer);
    const correct = normalizeString(question.correctAnswer);
    return submitted === correct ? question.points : 0;
  }
}

class NegativeMarkingStrategy {
  constructor(penaltyRatio = 0.25) {
    this.penaltyRatio = penaltyRatio;
  }

  gradeQuestion(question, answer) {
    if (!question.isAutoGradable) {
      return 0;
    }

    if (question.type === "MCQ_MULTIPLE") {
      const submittedAnswers = normalizeStringArray(answer);
      const correctAnswers = normalizeStringArray(question.correctAnswer);

      if (areStringArraysEqual(submittedAnswers, correctAnswers)) {
        return question.points;
      }

      return -(question.points * this.penaltyRatio);
    }

    if (question.type === "NUMERIC") {
      const submittedValue = Number(answer);
      const correctValue = Number(question.correctAnswer);
      const tolerance = Number(question.numericTolerance || 0);

      if (!Number.isNaN(submittedValue) && !Number.isNaN(correctValue)) {
        if (Math.abs(submittedValue - correctValue) <= tolerance) {
          return question.points;
        }
      }

      return -(question.points * this.penaltyRatio);
    }

    const submitted = normalizeString(answer);
    const correct = normalizeString(question.correctAnswer);

    if (submitted === correct) {
      return question.points;
    }

    return -(question.points * this.penaltyRatio);
  }
}

class KeepOrderStrategy {
  apply(questions) {
    return [...questions];
  }
}

class RandomizeOrderStrategy {
  apply(questions) {
    const randomized = [...questions];

    for (let i = randomized.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [randomized[i], randomized[j]] = [randomized[j], randomized[i]];
    }

    return randomized;
  }
}

class SingleAttemptStrategy {
  validate(existingAttempts) {
    return existingAttempts === 0;
  }
}

class MultipleAttemptStrategy {
  validate() {
    return true;
  }
}

const normalizeString = (value) => String(value || "").trim().toLowerCase();

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .sort();
};

const areStringArraysEqual = (first, second) => {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((item, index) => item === second[index]);
};

const buildGradingStrategy = (strategyName) => {
  if (strategyName === "NEGATIVE_MARKING") {
    return new NegativeMarkingStrategy();
  }

  return new ExactMatchStrategy();
};

const buildQuestionOrderStrategy = (randomizeQuestions) => {
  if (randomizeQuestions) {
    return new RandomizeOrderStrategy();
  }

  return new KeepOrderStrategy();
};

const buildAttemptPolicyStrategy = (allowMultipleAttempts) => {
  if (allowMultipleAttempts) {
    return new MultipleAttemptStrategy();
  }

  return new SingleAttemptStrategy();
};

const gradeQuizAttempt = (quiz, submittedResponses, strategy) => {
  const answerMap = new Map();

  for (const response of submittedResponses || []) {
    answerMap.set(String(response.questionId), response.answer);
  }

  const gradedResponses = [];
  let score = 0;
  let maxScore = 0;

  for (const question of quiz.questions) {
    const questionId = String(question._id);
    const submittedAnswer = answerMap.get(questionId);
    const obtainedPoints = strategy.gradeQuestion(question, submittedAnswer);

    maxScore += question.points;
    score += obtainedPoints;

    gradedResponses.push({
      questionId: question._id,
      answer: submittedAnswer !== undefined ? submittedAnswer : null,
      obtainedPoints,
    });
  }

  const normalizedScore = Math.max(0, Number(score.toFixed(2)));
  const percentage = maxScore > 0 ? Number(((normalizedScore / maxScore) * 100).toFixed(2)) : 0;

  return {
    responses: gradedResponses,
    score: normalizedScore,
    maxScore,
    percentage,
  };
};

module.exports = {
  buildGradingStrategy,
  buildQuestionOrderStrategy,
  buildAttemptPolicyStrategy,
  gradeQuizAttempt,
};

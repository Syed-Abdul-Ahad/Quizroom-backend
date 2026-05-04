const AppError = require("../../utils/AppError");

const toNormalizedString = (value) => String(value || "").trim();
const toLowerTrim = (value) => toNormalizedString(value).toLowerCase();

const toTypeKey = (rawType) => {
  const normalized = toLowerTrim(rawType).replace(/[\s_()-]+/g, " ");

  const typeMap = {
    "mcq": "MCQ_SINGLE",
    "multiple choice single": "MCQ_SINGLE",
    "multiple choice": "MCQ_SINGLE",
    "multiple choice multiple": "MCQ_MULTIPLE",
    "true false": "TRUE_FALSE",
    "short answer": "SHORT_ANSWER",
    "long answer": "LONG_ANSWER",
    "file upload": "FILE_UPLOAD",
    "numeric": "NUMERIC",
    "mcq single": "MCQ_SINGLE",
    "mcq multiple": "MCQ_MULTIPLE",
  };

  if (typeMap[normalized]) {
    return typeMap[normalized];
  }

  const direct = toNormalizedString(rawType).toUpperCase();
  const allowed = [
    "MCQ_SINGLE",
    "MCQ_MULTIPLE",
    "TRUE_FALSE",
    "SHORT_ANSWER",
    "LONG_ANSWER",
    "FILE_UPLOAD",
    "NUMERIC",
  ];

  if (allowed.includes(direct)) {
    return direct;
  }

  throw new AppError(`Unsupported question type: ${rawType}`, 400);
};

const buildBaseQuestion = (question, type) => {
  const prompt = toNormalizedString(question.prompt);
  if (!prompt) {
    throw new AppError(`${type} prompt is required`, 400);
  }

  return {
    type,
    prompt,
    points: Number(question.points) > 0 ? Number(question.points) : 1,
  };
};

// ========== QUESTION TYPE FACTORIES ==========
class QuestionTypeFactory {
  create(question) {
    throw new AppError("create() must be implemented by subclass", 500);
  }
}

class MCQSingleQuestionFactory extends QuestionTypeFactory {
  create(question) {
    const base = buildBaseQuestion(question, "MCQ_SINGLE");
    const correctAnswer = toNormalizedString(question.correctAnswer);
    const options = Array.isArray(question.options)
      ? question.options.map((option) => toNormalizedString(option)).filter(Boolean)
      : [];

    if (options.length < 2) {
      throw new AppError("MCQ_SINGLE requires at least 2 options", 400);
    }

    if (!options.includes(correctAnswer)) {
      throw new AppError("MCQ_SINGLE correctAnswer must be one of the options", 400);
    }

    return {
      ...base,
      options,
      correctAnswer,
      isAutoGradable: true,
    };
  }
}

class MCQMultipleQuestionFactory extends QuestionTypeFactory {
  create(question) {
    const base = buildBaseQuestion(question, "MCQ_MULTIPLE");
    const options = Array.isArray(question.options)
      ? question.options.map((option) => toNormalizedString(option)).filter(Boolean)
      : [];
    const submittedCorrect = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.map((item) => toNormalizedString(item)).filter(Boolean)
      : [];

    if (options.length < 2) {
      throw new AppError("MCQ_MULTIPLE requires at least 2 options", 400);
    }

    if (!submittedCorrect.length) {
      throw new AppError("MCQ_MULTIPLE requires at least one correct answer", 400);
    }

    const invalid = submittedCorrect.find((answer) => !options.includes(answer));
    if (invalid) {
      throw new AppError("MCQ_MULTIPLE correctAnswer values must exist in options", 400);
    }

    const uniqueCorrect = [...new Set(submittedCorrect)];

    return {
      ...base,
      options,
      correctAnswer: uniqueCorrect,
      isAutoGradable: true,
    };
  }
}

class TrueFalseQuestionFactory extends QuestionTypeFactory {
  create(question) {
    const base = buildBaseQuestion(question, "TRUE_FALSE");
    const rawAnswer = toLowerTrim(question.correctAnswer);

    if (!["true", "false"].includes(rawAnswer)) {
      throw new AppError("TRUE_FALSE correctAnswer must be true or false", 400);
    }

    return {
      ...base,
      options: ["true", "false"],
      correctAnswer: rawAnswer,
      isAutoGradable: true,
    };
  }
}

class ShortAnswerQuestionFactory extends QuestionTypeFactory {
  create(question) {
    const base = buildBaseQuestion(question, "SHORT_ANSWER");
    const correctAnswer = toNormalizedString(question.correctAnswer);
    const isAutoGradable = Boolean(correctAnswer);

    return {
      ...base,
      options: [],
      correctAnswer: correctAnswer || null,
      isAutoGradable,
    };
  }
}

class LongAnswerQuestionFactory extends QuestionTypeFactory {
  create(question) {
    const base = buildBaseQuestion(question, "LONG_ANSWER");

    return {
      ...base,
      options: [],
      correctAnswer: null,
      isAutoGradable: false,
    };
  }
}

class FileUploadQuestionFactory extends QuestionTypeFactory {
  create(question) {
    const base = buildBaseQuestion(question, "FILE_UPLOAD");
    const allowedFileTypes = Array.isArray(question.allowedFileTypes)
      ? question.allowedFileTypes.map((item) => toNormalizedString(item)).filter(Boolean)
      : [];

    return {
      ...base,
      options: [],
      correctAnswer: null,
      isAutoGradable: false,
      allowedFileTypes,
    };
  }
}

class NumericQuestionFactory extends QuestionTypeFactory {
  create(question) {
    const base = buildBaseQuestion(question, "NUMERIC");
    const value = Number(question.correctAnswer);
    const tolerance = Number(question.numericTolerance || 0);

    if (Number.isNaN(value)) {
      throw new AppError("NUMERIC correctAnswer must be a number", 400);
    }

    if (Number.isNaN(tolerance) || tolerance < 0) {
      throw new AppError("NUMERIC numericTolerance must be a non-negative number", 400);
    }

    return {
      ...base,
      options: [],
      correctAnswer: value,
      isAutoGradable: true,
      numericTolerance: tolerance,
    };
  }
}

// ========== FACTORY REGISTRY (No more if-else!) ==========
class QuestionFactoryRegistry {
  constructor() {
    this.factories = new Map();
    this.registerDefaults();
  }

  registerDefaults() {
    this.register("MCQ_SINGLE", new MCQSingleQuestionFactory());
    this.register("MCQ_MULTIPLE", new MCQMultipleQuestionFactory());
    this.register("TRUE_FALSE", new TrueFalseQuestionFactory());
    this.register("SHORT_ANSWER", new ShortAnswerQuestionFactory());
    this.register("LONG_ANSWER", new LongAnswerQuestionFactory());
    this.register("FILE_UPLOAD", new FileUploadQuestionFactory());
    this.register("NUMERIC", new NumericQuestionFactory());
  }

  register(type, factory) {
    if (!factory || typeof factory.create !== "function") {
      throw new AppError("Factory must implement create() method", 500);
    }
    this.factories.set(type, factory);
  }

  createQuestion(question) {
    const type = toTypeKey(question.type);
    const factory = this.factories.get(type);

    if (!factory) {
      throw new AppError(`No factory registered for question type: ${type}`, 400);
    }

    return factory.create(question);
  }
}

// ========== SINGLETON REGISTRY INSTANCE ==========
const questionFactoryRegistry = new QuestionFactoryRegistry();

const createQuestion = (question) => {
  return questionFactoryRegistry.createQuestion(question);
};

module.exports = {
  createQuestion,
  QuestionFactoryRegistry,
  // Export factories for testing/extensibility
  MCQSingleQuestionFactory,
  MCQMultipleQuestionFactory,
  TrueFalseQuestionFactory,
  ShortAnswerQuestionFactory,
  LongAnswerQuestionFactory,
  FileUploadQuestionFactory,
  NumericQuestionFactory,
};

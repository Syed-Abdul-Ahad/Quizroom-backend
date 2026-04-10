class ExamConfig {
  constructor() {
    if (ExamConfig.instance) {
      return ExamConfig.instance;
    }

    this.defaultGradingStrategy = process.env.DEFAULT_GRADING_STRATEGY || "EXACT_MATCH";
    this.maxQuestionsPerQuiz = Number(process.env.MAX_QUESTIONS_PER_QUIZ || 100);

    ExamConfig.instance = this;
  }

  getDefaultGradingStrategy() {
    return this.defaultGradingStrategy;
  }

  getMaxQuestionsPerQuiz() {
    return this.maxQuestionsPerQuiz;
  }
}

module.exports = new ExamConfig();

const Course = require("../models/Course");

/**
 * Generate a unique course code
 * Format: XXXX-YYYY (e.g., WEB-2026)
 */
const generateCourseCode = async () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code;
  let isUnique = false;

  while (!isUnique) {
    // Generate random 4-letter prefix
    const prefix = Array(4)
      .fill(0)
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join("");

    // Use current year as suffix
    const year = new Date().getFullYear();
    code = `${prefix}-${year}`;

    // Check if code already exists
    const existingCourse = await Course.findOne({ courseCode: code });
    if (!existingCourse) {
      isUnique = true;
    }
  }

  return code;
};

module.exports = { generateCourseCode };

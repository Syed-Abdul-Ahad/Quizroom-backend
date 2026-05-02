const Notification = require("../../models/Notification");
const Student = require("../../models/Student");

class StudentObserver {
  async update(eventName, payload) {
    if (eventName === "QUIZ_PUBLISHED") {
      const students = await Student.find({}, "_id").lean();
      if (!students.length) {
        return;
      }

      const bulkNotifications = students.map((student) => ({
        recipientType: "Student",
        recipientId: student._id,
        eventType: eventName,
        message: `A new quiz \"${payload.quizTitle}\" is now available.`,
        metadata: {
          quizId: payload.quizId,
        },
      }));

      await Notification.insertMany(bulkNotifications);
      return;
    }

    if (eventName === "ATTEMPT_SUBMITTED") {
      await Notification.create({
        recipientType: "Student",
        recipientId: payload.studentId,
        eventType: eventName,
        message: `Your attempt for \"${payload.quizTitle}\" was graded. Score: ${payload.score}/${payload.maxScore}.`,
        metadata: {
          quizId: payload.quizId,
          attemptId: payload.attemptId,
        },
      });
    }
  }
}

class TeacherObserver {
  async update(eventName, payload) {
    if (eventName === "ATTEMPT_SUBMITTED") {
      await Notification.create({
        recipientType: "Teacher",
        recipientId: payload.teacherId,
        eventType: eventName,
        message: `A student submitted \"${payload.quizTitle}\". Score: ${payload.score}/${payload.maxScore}.`,
        metadata: {
          quizId: payload.quizId,
          attemptId: payload.attemptId,
          studentId: payload.studentId,
        },
      });
      return;
    }

    if (eventName === "STUDENT_JOINED") {
      await Notification.create({
        recipientType: "Teacher",
        recipientId: payload.teacherId,
        eventType: eventName,
        message: `${payload.studentName} has enrolled in \"${payload.courseTitle}\".`,
        metadata: {
          courseId: payload.courseId,
          studentId: payload.studentId,
        },
      });
      return;
    }
  }
}

module.exports = {
  StudentObserver,
  TeacherObserver,
};

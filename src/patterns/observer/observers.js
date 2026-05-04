const Notification = require("../../models/Notification");
const Student = require("../../models/Student");
const Course = require("../../models/Course");
const mongoose = require("mongoose");

class StudentObserver {
  async update(eventName, payload) {
    try {
      if (eventName === "QUIZ_PUBLISHED") {
        console.log("[StudentObserver] QUIZ_PUBLISHED event received:", payload);
        
        // Fetch the course and only notify enrolled students
        const course = await Course.findById(payload.courseId).lean();
        if (!course || !course.students || course.students.length === 0) {
          console.log("[StudentObserver] Course not found or no students enrolled");
          return;
        }

        const bulkNotifications = course.students.map((studentId) => ({
          recipientType: "Student",
          recipientId: new mongoose.Types.ObjectId(studentId),
          eventType: eventName,
          message: `A new quiz "${payload.quizTitle}" is now available in your course.`,
          metadata: {
            quizId: payload.quizId,
            courseId: payload.courseId,
          },
        }));

        const result = await Notification.insertMany(bulkNotifications);
        console.log(`[StudentObserver] Created ${result.length} notifications for QUIZ_PUBLISHED`);
        return;
      }

      if (eventName === "ATTEMPT_SUBMITTED") {
        console.log("[StudentObserver] ATTEMPT_SUBMITTED event received - NOT notifying student yet (waiting for teacher grading)");
        // Don't notify student on submission - wait for ATTEMPT_GRADED event
        return;
      }

      if (eventName === "ATTEMPT_GRADED") {
        console.log("[StudentObserver] ATTEMPT_GRADED event received:", payload);
        
        const notification = await Notification.create({
          recipientType: "Student",
          recipientId: new mongoose.Types.ObjectId(payload.studentId),
          eventType: eventName,
          message: `Your attempt for "${payload.quizTitle}" has been graded. Score: ${payload.score}/${payload.maxScore}.`,
          metadata: {
            quizId: payload.quizId,
            attemptId: payload.attemptId,
          },
        });
        console.log("[StudentObserver] Created notification for student grading:", notification._id);
        return;
      }
    } catch (error) {
      console.error("[StudentObserver] Error handling event:", eventName, error);
    }
  }
}

class TeacherObserver {
  async update(eventName, payload) {
    try {
      if (eventName === "ATTEMPT_SUBMITTED") {
        console.log("[TeacherObserver] ATTEMPT_SUBMITTED event received:", payload);
        
        const notification = await Notification.create({
          recipientType: "Teacher",
          recipientId: new mongoose.Types.ObjectId(payload.teacherId),
          eventType: eventName,
          message: `A student submitted "${payload.quizTitle}".`,
          metadata: {
            quizId: payload.quizId,
            attemptId: payload.attemptId,
            studentId: payload.studentId,
          },
        });
        console.log("[TeacherObserver] Created notification for teacher:", notification._id);
        return;
      }

      if (eventName === "STUDENT_JOINED") {
        console.log("[TeacherObserver] STUDENT_JOINED event received:", payload);
        
        const notification = await Notification.create({
          recipientType: "Teacher",
          recipientId: new mongoose.Types.ObjectId(payload.teacherId),
          eventType: eventName,
          message: `${payload.studentName} has enrolled in "${payload.courseTitle}".`,
          metadata: {
            courseId: payload.courseId,
            studentId: payload.studentId,
          },
        });
        console.log("[TeacherObserver] Created notification for teacher enrollment:", notification._id);
        return;
      }
    } catch (error) {
      console.error("[TeacherObserver] Error handling event:", eventName, error);
    }
  }
}

module.exports = {
  StudentObserver,
  TeacherObserver,
};

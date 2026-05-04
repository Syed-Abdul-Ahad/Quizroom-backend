const notificationCenter = require("../patterns/observer/notificationCenter");
const { StudentObserver, TeacherObserver } = require("../patterns/observer/observers");

let initialized = false;

const initializeObservers = () => {
  if (initialized) {
    return;
  }
  console.log("[NotificationService] Initializing observers...");

  notificationCenter.subscribe("QUIZ_PUBLISHED", new StudentObserver());
  notificationCenter.subscribe("ATTEMPT_GRADED", new StudentObserver());

  const teacherObserver = new TeacherObserver();
  notificationCenter.subscribe("ATTEMPT_SUBMITTED", teacherObserver);
  notificationCenter.subscribe("STUDENT_JOINED", teacherObserver);

  initialized = true;
  console.log("[NotificationService] Observers initialized.");
};

const emitEvent = async (eventName, payload) => {
  initializeObservers();
  try {
    console.log(`[NotificationService] Emitting event: ${eventName}`, payload);
    await notificationCenter.notify(eventName, payload);
  } catch (err) {
    console.error(`[NotificationService] Failed to notify observers for ${eventName}:`, err);
    throw err;
  }
};

module.exports = {
  emitEvent,
};

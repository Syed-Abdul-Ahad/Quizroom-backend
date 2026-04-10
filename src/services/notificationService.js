const notificationCenter = require("../patterns/observer/notificationCenter");
const { StudentObserver, TeacherObserver } = require("../patterns/observer/observers");

let initialized = false;

const initializeObservers = () => {
  if (initialized) {
    return;
  }

  notificationCenter.subscribe("QUIZ_PUBLISHED", new StudentObserver());
  notificationCenter.subscribe("ATTEMPT_SUBMITTED", new StudentObserver());
  notificationCenter.subscribe("ATTEMPT_SUBMITTED", new TeacherObserver());

  initialized = true;
};

const emitEvent = async (eventName, payload) => {
  initializeObservers();
  await notificationCenter.notify(eventName, payload);
};

module.exports = {
  emitEvent,
};

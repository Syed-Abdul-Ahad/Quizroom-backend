const Notification = require("../models/Notification");
const Student = require("../models/Student");
const Course = require("../models/Course");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const { recipientId } = req.body;

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  // Basic ownership check
  if (String(notification.recipientId) !== String(recipientId)) {
    throw new AppError("Not authorized to modify this notification", 403);
  }

  notification.read = true;
  await notification.save();

  res.status(200).json({ status: "success", data: notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  const { recipientType, recipientId } = req.body;
  if (!recipientType || !recipientId) {
    throw new AppError("recipientType and recipientId are required", 400);
  }

  await Notification.updateMany({ recipientType, recipientId, read: false }, { $set: { read: true } });

  res.status(200).json({ status: "success", message: "Marked all as read" });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const { recipientId } = req.body;

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  if (String(notification.recipientId) !== String(recipientId)) {
    throw new AppError("Not authorized to delete this notification", 403);
  }

  await notification.remove();

  res.status(200).json({ status: "success", message: "Deleted" });
});

const announce = asyncHandler(async (req, res) => {
  const { teacherId, audience, courseId, message, subject, recipients } = req.body;

  if (!teacherId || !message) {
    throw new AppError("teacherId and message are required", 400);
  }

  let targets = [];

  if (audience === "all") {
    const students = await Student.find({}, "_id").lean();
    targets = students.map((s) => s._id);
  } else if (audience === "course") {
    if (!courseId) {
      throw new AppError("courseId is required for course audience", 400);
    }
    const course = await Course.findById(courseId).lean();
    if (!course) {
      throw new AppError("Course not found", 404);
    }
    targets = course.students || [];
  } else if (Array.isArray(recipients)) {
    targets = recipients;
  } else {
    throw new AppError("Invalid audience or recipients", 400);
  }

  if (!targets.length) {
    return res.status(200).json({ status: "success", results: 0, data: [] });
  }

  const bulk = targets.map((t) => ({
    recipientType: "Student",
    recipientId: t,
    eventType: "ANNOUNCEMENT",
    message: subject ? `${subject} - ${message}` : message,
    metadata: { teacherId, courseId: courseId || null },
  }));

  await Notification.insertMany(bulk);

  res.status(201).json({ status: "success", results: bulk.length });
});

module.exports = {
  markAsRead,
  markAllRead,
  deleteNotification,
  announce,
};

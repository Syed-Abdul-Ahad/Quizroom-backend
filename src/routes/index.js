const express = require("express");
const authRoutes = require("./authRoutes");
const teacherRoutes = require("./teacherRoutes");
const studentRoutes = require("./studentRoutes");
const notificationRoutes = require("./notificationRoutes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is running",
  });
});

router.use("/auth", authRoutes);
router.use("/teachers", teacherRoutes);
router.use("/students", studentRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;

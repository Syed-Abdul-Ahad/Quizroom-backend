const express = require("express");
const authRoutes = require("./authRoutes");
const teacherRoutes = require("./teacherRoutes");
const studentRoutes = require("./studentRoutes");

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

module.exports = router;

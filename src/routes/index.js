const express = require("express");
const teacherRoutes = require("./teacherRoutes");
const studentRoutes = require("./studentRoutes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is running",
  });
});

router.use("/teachers", teacherRoutes);
router.use("/students", studentRoutes);

module.exports = router;

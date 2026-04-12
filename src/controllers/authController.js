const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

// Helper function to generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

// Register Student
const registerStudent = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword, institute } = req.body;

  // Validation
  if (!name || !email || !password || !institute) {
    throw new AppError(
      "name, email, password, and institute are required",
      400
    );
  }

  if (password !== confirmPassword) {
    throw new AppError("Passwords do not match", 400);
  }

  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  // Check if student already exists
  const existingStudent = await Student.findOne({ email });
  if (existingStudent) {
    throw new AppError("Email already registered", 409);
  }

  // Create student (password will be hashed by pre-save hook)
  const student = await Student.create({
    name,
    email,
    password,
    institute,
  });

  // Generate token
  const token = generateToken(student._id, "student");

  // Set cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json({
    status: "success",
    message: "Student registered successfully",
    data: {
      id: student._id,
      name: student.name,
      email: student.email,
      institute: student.institute,
      role: "student",
    },
    token,
  });
});

// Register Teacher
const registerTeacher = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword, institute } = req.body;

  // Validation
  if (!name || !email || !password || !institute) {
    throw new AppError(
      "name, email, password, and institute are required",
      400
    );
  }

  if (password !== confirmPassword) {
    throw new AppError("Passwords do not match", 400);
  }

  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  // Check if teacher already exists
  const existingTeacher = await Teacher.findOne({ email });
  if (existingTeacher) {
    throw new AppError("Email already registered", 409);
  }

  // Create teacher (password will be hashed by pre-save hook)
  const teacher = await Teacher.create({
    name,
    email,
    password,
    institute,
  });

  // Generate token
  const token = generateToken(teacher._id, "teacher");

  // Set cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json({
    status: "success",
    message: "Teacher registered successfully",
    data: {
      id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      institute: teacher.institute,
      role: "teacher",
    },
    token,
  });
});

// Login Student
const loginStudent = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new AppError("email and password are required", 400);
  }

  // Find student by email and include password field
  const student = await Student.findOne({ email }).select("+password");
  if (!student) {
    throw new AppError("Invalid email or password", 401);
  }

  // Compare passwords
  const isPasswordValid = await student.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  // Generate token
  const token = generateToken(student._id, "student");

  // Set cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json({
    status: "success",
    message: "Student logged in successfully",
    data: {
      id: student._id,
      name: student.name,
      email: student.email,
      institute: student.institute,
      role: "student",
    },
    token,
  });
});

// Login Teacher
const loginTeacher = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new AppError("email and password are required", 400);
  }

  // Find teacher by email and include password field
  const teacher = await Teacher.findOne({ email }).select("+password");
  if (!teacher) {
    throw new AppError("Invalid email or password", 401);
  }

  // Compare passwords
  const isPasswordValid = await teacher.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  // Generate token
  const token = generateToken(teacher._id, "teacher");

  // Set cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json({
    status: "success",
    message: "Teacher logged in successfully",
    data: {
      id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      institute: teacher.institute,
      role: "teacher",
    },
    token,
  });
});

// Logout
const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

module.exports = {
  registerStudent,
  registerTeacher,
  loginStudent,
  loginTeacher,
  logout,
};

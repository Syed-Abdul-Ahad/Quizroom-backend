const express = require("express");
const {
  markAsRead,
  markAllRead,
  deleteNotification,
  announce,
} = require("../controllers/notificationController");

const router = express.Router();

router.patch("/:notificationId/read", markAsRead);
router.patch("/mark-all-read", markAllRead);
router.delete("/:notificationId", deleteNotification);
router.post("/announce", announce);

module.exports = router;

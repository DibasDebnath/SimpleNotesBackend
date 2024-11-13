// authRoutes.js
const express = require("express");
const {
  login,
  register,
  getUserData,
  renewToken,
  deleteUser,
  updateUsername,
  updatePassword, // Import the updatePassword controller
} = require("../controllers/authController");
const protect = require("../middlewares/protect");
const authenticateToken = require("../middlewares/authenticateToken"); // Import your middleware
const router = express.Router();

// Protect the route for fetching user data
router.get("/", protect, getUserData);

// Renew token
router.post("/renew", protect, renewToken);

// Login route
router.post("/login", login);

// Register route
router.post("/register", register);

// Delete user route
router.delete("/delete", protect, deleteUser);

// Update username route
router.patch("/update-username", authenticateToken, updateUsername);

// Update password route (add this line)
router.patch("/update-password", authenticateToken, updatePassword); // Protect this route to ensure only logged-in users can change the password

module.exports = router;

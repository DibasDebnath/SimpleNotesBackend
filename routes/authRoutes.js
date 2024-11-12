// authRoutes.js
const express = require("express");
const { login, register,getUserData } = require("../controllers/authController");
const protect = require("../middlewares/protect");
const router = express.Router();



// You might want to protect this route to fetch user data
router.get("/", protect, getUserData);

router.post("/login", login);
router.post("/register", register);



module.exports = router;

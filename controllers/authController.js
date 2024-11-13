const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel"); // Assuming you have a User model
const validator = require("validator");
// Sign-up: Register a new user
const register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Validate input (you can use express-validator)
    if (!email || !password || !username) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (username.length > 20) {
      return res
        .status(400)
        .json({ error: "Username Must be less than 20 characters " });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// Sign-in: Authenticate user
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(200).json({ message: "User logged in successfully", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};


// Function to get user data after authentication
const getUserData = async (req, res) => {
  try {
    // The user is already decoded from the token and attached to req.user by the 'protect' middleware
    const user = await User.findById(req.user.id); // Retrieve user data from the database
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user); // Send the user data in the response
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Token renewal
const renewToken = async (req, res) => {
  const oldToken = req.headers.authorization?.split(" ")[1];

  if (!oldToken) {
    return res.status(400).json({ error: "No token provided" });
  }

  try {
    // Decode the existing token to get the payload
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);

    // Check expiration date
    const now = Date.now() / 1000; // Current time in seconds
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;

    if (decoded.exp - now > sevenDaysInSeconds) {
      return res.status(400).json({ error: "Token does not need renewal yet" });
    }

    // Generate a new token
    const newToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(200).json({ message: "Token renewed successfully", token: newToken });
  } catch (error) {
    console.error("Error renewing token:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};


const deleteUser = async (req, res) => {
  const { password } = req.body; // Get the password from the request body

  try {
    const userId = req.user.id; // Get the user ID from the authenticated user
    //console.log("TEsting ");
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    // Delete the user if password matches
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Function to update the username of the authenticated user
const updateUsername = async (req, res) => {
  
  const { username } = req.body; // Get the new username from the request body
  
  try {
    const userId = req.user.id; // Get the user ID from the authenticated user
    
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    if (username.length > 20) {
      return res
        .status(400)
        .json({ error: "Username Must be less than 20 characters " });
    }

    // Find the user and update the username
    const user = await User.findByIdAndUpdate(
      userId,
      { username }, // Update the username
      { new: true } // Return the updated user
    );
    //console.log("Testing here " + user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Username updated successfully", user });
  } catch (error) {
    console.error("Error updating username:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Function to update the password of the authenticated user
const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body; // Get current and new passwords from the request body
  
  try {
    const userId = req.user.id; // Get the user ID from the authenticated user
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both current and new passwords are required" });
    }

    // Find the user by their ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the current password matches the stored password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash the new password before saving it
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedPassword;

    // Save the updated user document
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = {
  register,
  login,
  getUserData,
  renewToken,
  deleteUser,
  updateUsername,
  updatePassword,
};




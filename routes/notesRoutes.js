const express = require("express");
const notesController = require("../controllers/notesController");
const authenticateToken = require("../middlewares/authenticateToken"); // Import your middleware

const router = express.Router();

// Get all notes for the authenticated user
router.get("/", authenticateToken, notesController.GetNotes);

// Create a new note for the authenticated user
router.post("/", authenticateToken, notesController.CreateNote);

// Search notes by title (you can use this for the authenticated user only)
router.get("/search", authenticateToken, notesController.GetNotesByTitle);

// Get a single note by ID (check if the note belongs to the current user)
router.get("/:id", authenticateToken, notesController.GetSingleNote);

// Delete a note by ID (ensure it belongs to the current user)
router.delete("/:id", authenticateToken, notesController.DeleteSingleNote);

// Update a note by ID (ensure it belongs to the current user)
router.patch("/:id", authenticateToken, notesController.UpdateSingleNote);

module.exports = router;

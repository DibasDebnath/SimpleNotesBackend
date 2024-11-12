const { default: mongoose } = require("mongoose");
const Note = require("../models/noteModel");





const GetNotes = async (req, res) => {
  try {
    // Check if the user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const limit = parseInt(req.query.limit) || 5; // Number of notes per page, default to 5
    const page = parseInt(req.query.page) || 1; // Page number, default to 1
    const skip = (page - 1) * limit; // Calculate the number of records to skip

    const userId = req.user.id; // Get the authenticated user's ID

    //console.log(userId);
    // Query notes for the authenticated user, with pagination
    const notes = await Note.find({ userId })
      .sort({ updatedAt: -1 }) // Sort by the most recent note first
      .skip(skip) // Skip notes based on pagination
      .limit(limit); // Limit the number of notes to the defined limit

    if (!notes) {
      return res.status(404).json({ message: "No notes found for this user" });
    }

    // Return the notes to the client
    res.status(200).json(notes);
  } catch (error) {
    // Catch any errors and send a response with status 500
    console.error(error);
    res.status(500).json({ message: "Error retrieving notes", error });
  }
};



const CreateNote = async (req, res) => {
  // Get the userId from the authenticated user (provided by the authenticateToken middleware)
  const userId = req.user.id;
  const { title, details } = req.body;

  let emptyFields = [];

  // Check if required fields are provided
  if (!title) {
    emptyFields.push("title");
  }
  if (!details) {
    emptyFields.push("details");
  }

  // If there are any empty fields, return an error response
  if (emptyFields.length > 0) {
    return res
      .status(400)
      .json({ error: "Please fill in all fields", emptyFields });
  }

  // Validate the length of the fields
  if (title.length > 20) {
    return res
      .status(400)
      .json({ error: "Title cannot be more than 20 characters" });
  }
  if (details.length > 1000) {
    return res
      .status(400)
      .json({ error: "Details cannot be more than 1000 characters" });
  }

  // Create the note with the authenticated user's ID
  try {
    const note = await Note.create({
      userId, // Attach the userId to the note
      title,
      details,
    });

    res.status(201).json(note); // Return the created note
  } catch (error) {
    res.status(400).json({ error: error.message }); // Handle errors
  }
};



const GetSingleNote = async (req, res) => {
  const { id } = req.params;

  // Validate if the note ID is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "No such Note Found" });
  }

  try {
    // Find the note by ID and ensure it's associated with the logged-in user
    const note = await Note.findOne({ _id: id, userId: req.user._id });

    // If the note doesn't exist or doesn't belong to the user
    if (!note) {
      return res
        .status(404)
        .json({ error: "No such note found or not authorized" });
    }

    res.status(200).json(note);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error retrieving note", details: error.message });
  }
};


const GetNotesByTitle = async (req, res) => {
  const { title } = req.query; // Access title from the query string

  if (!title) {
    return res.status(400).json({ error: "Title query parameter is required" });
  }

  try {
    // Find notes with matching title and belonging to the logged-in user
    const notes = await Note.find({
      title: { $regex: title, $options: "i" }, // Case-insensitive search for the title
      userId: req.user._id, // Filter by userId to ensure the logged-in user's notes
    });

    // If no notes found
    if (notes.length === 0) {
      return res.status(404).json({ error: "No notes found with that title" });
    }

    res.status(200).json(notes);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error retrieving notes", details: error.message });
  }
};



const DeleteSingleNote = async (req, res) => {
  const { id } = req.params;

  // Validate if the note ID is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "No such Note" });
  }

  try {
    // Find the note by ID and ensure it belongs to the logged-in user
    const note = await Note.findOneAndDelete({ _id: id, userId: req.user.id });

    // If no note is found or it doesn't belong to the user
    if (!note) {
      return res
        .status(404)
        .json({ error: "No such Note found or not authorized" });
    }

    res.status(200).json({ message: "Note deleted successfully", note });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error deleting note", details: error.message });
  }
};




const UpdateSingleNote = async (req, res) => {
  const { id } = req.params;

  // Validate if the note ID is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "No such Note" });
  }

  const { title, details } = req.body;

  let emptyFields = [];

  // Validate required fields
  if (!title) {
    emptyFields.push("title");
  }
  if (!details) {
    emptyFields.push("details");
  }

  // Return error if fields are empty
  if (emptyFields.length > 0) {
    return res
      .status(400)
      .json({ error: "Please fill in all fields", emptyFields });
  }

  // Validate title and details length
  if (title.length > 20) {
    return res
      .status(400)
      .json({ error: "Title cannot be more than 20 characters" });
  }
  if (details.length > 1000) {
    return res
      .status(400)
      .json({ error: "Details cannot be more than 1000 characters" });
  }

  try {
    // Find and update the note only if it belongs to the logged-in user
    const note = await Note.findOneAndUpdate(
      { _id: id, userId: req.user.id }, // Check if the note belongs to the logged-in user
      { title, details }, // Only update the title and details
      { new: true } // Return the updated note
    );

    // If no note is found or it doesn't belong to the user
    if (!note) {
      return res
        .status(404)
        .json({ error: "No such Note found or not authorized" });
    }

    res.status(200).json(note);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error updating note", details: error.message });
  }
};










module.exports = {
    GetNotes,
    CreateNote,
    GetSingleNote,
    GetNotesByTitle,
    DeleteSingleNote,
    UpdateSingleNote,
};
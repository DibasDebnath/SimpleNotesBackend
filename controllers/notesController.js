const { default: mongoose } = require("mongoose");
const Note = require("../models/noteModel");
const User = require("../models/userModel");

const bcrypt = require("bcryptjs");
const crypto = require("crypto");

function encrypt(text, userKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(userKey, "hex"),
    iv
  );
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`; // Concatenate IV and encrypted text
}

function decrypt(encryptedText, userKey) {
  try {
    const [ivHex, encryptedData] = encryptedText.split(":");
    const ivBuffer = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(userKey, "hex"),
      ivBuffer
    );
    let decrypted = decipher.update(encryptedData, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
  } catch {
    return encryptedText;
  }
  
}


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
    const userkey = req.user.userKey || process.env.Temp_UserKey;


    //console.log(userId);
    // Query notes for the authenticated user, with pagination
    const notes = await Note.find({ userId })
      .sort({ updatedAt: -1 }) // Sort by the most recent note first
      .skip(skip) // Skip notes based on pagination
      .limit(limit); // Limit the number of notes to the defined limit

    if (!notes) {
      return res.status(404).json({ message: "No notes found for this user" });
    }

    
    // Decrypt each note's content
    const decryptedNotes = notes.map((note) => ({
      ...note.toObject(),
      title: decrypt(note.title, userkey),
      details: decrypt(note.details, userkey),
    }));

    // Return the notes to the client
    res.status(200).json(decryptedNotes);
  } catch (error) {
    // Catch any errors and send a response with status 500
    console.error(error);
    res.status(500).json({ message: "Error retrieving notes", error });
  }
};



const CreateNote = async (req, res) => {
  // Get the userId from the authenticated user (provided by the authenticateToken middleware)
  const userId = req.user.id;
  const userkey = req.user.userKey || process.env.Temp_UserKey;

  
  //console.log("Testing Usrekey retrieval " + userkey);

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

  //Encrypt Title and Details of the Note

  const en_title = encrypt(title, userkey);
  const en_details = encrypt(details, userkey);

  //console.log("Testing here " + en_title);
  // Create the note with the authenticated user's ID
  try {
    const note = await Note.create({
      userId, // Attach the userId to the note
      title: en_title,
      details: en_details,
    });

    // Return the note's database ID and unencrypted title and details
    res.status(201).json({
      _id: note._id,
      userId: note.userId,
      title, // Original, unencrypted title
      details, // Original, unencrypted details
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });


  } catch (error) {
    res.status(400).json({ error: error.message }); // Handle errors
  }
};


// This is depricated, (not using encryption)
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

// This is depricated, (not using encryption)
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
  const userkey = req.user.userKey || process.env.Temp_UserKey;
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

  //Encrypt Title and Details of the Note

  const en_title = encrypt(title, userkey);
  const en_details = encrypt(details, userkey);

  try {
    // Find and update the note only if it belongs to the logged-in user
    const note = await Note.findOneAndUpdate(
      { _id: id, userId: req.user.id }, // Check if the note belongs to the logged-in user
      { title: en_title, details: en_details }, // Only update the title and details
      { new: true } // Return the updated note
    );

    // If no note is found or it doesn't belong to the user
    if (!note) {
      return res
        .status(404)
        .json({ error: "No such Note found or not authorized" });
    }

    // Return the note's database ID and unencrypted title and details
    res.status(201).json({
      _id: note._id,
      userId: note.userId,
      title, // Original, unencrypted title
      details, // Original, unencrypted details
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
    
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error updating note", details: error.message });
  }
};





const DeleteAllNotesForUser = async (req, res) => {
  const { password } = req.body; // Get the password from the request body
  const userId = req.user.id; // Get the userId from the authenticated user
  
  try {
    // Find the user by userId
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    // If password matches, delete all notes for this user
    const result = await Note.deleteMany({ userId });

    // If no notes were deleted, return a 404 response
    if (result.deletedCount === 0) {
      return res.status(200).json({ message: "No notes found for this user" });
    }

    res.status(200).json({
      message: "All notes deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting notes:", error);
    res
      .status(500)
      .json({ message: "Error deleting notes", details: error.message });
  }
};









module.exports = {
  GetNotes,
  CreateNote,
  GetSingleNote,
  GetNotesByTitle,
  DeleteSingleNote,
  UpdateSingleNote,
  DeleteAllNotesForUser,
};
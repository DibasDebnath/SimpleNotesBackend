const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Define the note schema with userId
const noteSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId, // Reference to the User model
      ref: "User", // This links the note to a User
      required: true, // Ensure the userId is provided
    },
    title: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Note = mongoose.model("Note", noteSchema);

module.exports = Note;

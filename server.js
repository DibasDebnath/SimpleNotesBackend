const express = require("express");
require("dotenv").config();
const noteRoutes = require("./routes/notesRoutes");
const authRoutes = require("./routes/authRoutes");
const cors = require("cors");
const protect = require("./middlewares/protect");

const mongoose = require("mongoose");

const app = express();

//middleware
// Use CORS middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Allow only this origin
  })
);

app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});

app.use(express.json());


app.use("/api/notes", noteRoutes);
app.use("/api/auth", authRoutes);


app.get("/", (req, res) => {
  res.json({ answer: "Welcome" });
});

mongoose
  .connect(process.env.MONG_URI)
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("Connected to DB & Listening on Port " + process.env.PORT);
    });
  })
  .catch((err) => {
    console.log(err);
  });

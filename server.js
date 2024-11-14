const express = require("express");
require("dotenv").config();
const noteRoutes = require("./routes/notesRoutes");
const authRoutes = require("./routes/authRoutes");
const cors = require("cors");
const protect = require("./middlewares/protect");

const mongoose = require("mongoose");

const app = express();

//middleware

const allowedOrigins = [
  "http://localhost:3000",
  "https://simplenotes.onrender.com",
];

// Use CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Check if the origin is in the allowed list or allow requests with no origin (for example, mobile apps or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
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

app.get("*", (req, res) => {
  res.status(404).json({ error: "Request Invalid" });
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

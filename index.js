import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import blogRoutes from "./routes/posts.js";
import path from "path";
import dotenv from "dotenv"; // Import dotenv
import postRoutes from "./routes/postRoutes.js";
dotenv.config(); // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 3000;
const DBURI = process.env.DBURI; // Get DBURI from .env

// Connect to MongoDB
mongoose
  .connect(DBURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // Serve static files from the 'public' directory

// Use blog routes
app.use("/api/blogs", blogRoutes);
app.use("/posts", postRoutes);
// Serve the HTML file at the root route
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public", "index.html")); // Serve index.html directly
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

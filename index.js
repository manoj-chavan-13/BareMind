import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import blogRoutes from "./routes/posts.js";
import path from "path";
import dotenv from "dotenv"; // Import dotenv
import postRoutes from "./routes/postRoutes.js";
import Blog from "./models/Post.js";
dotenv.config(); // Load environment variables from .env
import jwt from "jsonwebtoken";
const app = express();
const PORT = process.env.PORT || 3000;
const DBURI = process.env.DBURI; // Get DBURI from .env
const secretKey = "09122022Ber";
const pass = "alwaysbare";
const user = "131104NoDe";
import subscriptionRoutes from "./routes/subscription.js";
// Connect to MongoDB
app.use(
  cors({
    origin: [
      "https://baremind.vercel.app",
      "https://baremind.fun",
      "https://www.baremind.fun",
      "http://localhost:3000",
    ],
  })
);
function authenticate(req, res, next) {
  const password = req.headers["authorization"]; // Get password from Authorization header
  if (!password || password !== process.env.PERSONALPASSWORD) {
    return res.status(403).json({ message: "Forbidden: Invalid password" });
  }
  next();
}

mongoose
  .connect(DBURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware

app.use(bodyParser.json());
app.use(express.static("public")); // Serve static files from the 'public' directory

// Use blog routes
app.use("/", blogRoutes);
app.use("/posts", postRoutes);
app.use("/v1/subscribe", authenticate, subscriptionRoutes);
// Serve the HTML file at the root route
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public", "index.html")); // Serve index.html directly
});
app.get("/posts/:id", authenticate, async (req, res) => {
  const post = await Blog.findById(req.params.id);
  res.json(post);
});

app.put("/posts/:id", authenticate, async (req, res) => {
  const updatedPost = await Blog.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updatedPost);
});

app.delete("/posts/:id", authenticate, async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

app.post("/api/login", authenticate, (req, res) => {
  const { username, password } = req.body;

  // Check if the credentials match
  if (username === pass && password == user) {
    // Generate a JWT token
    const token = jwt.sign({ username }, secretKey, { expiresIn: "1h" }); // Token expires in 1 hour
    return res.json({ success: true, token });
  }

  // If credentials are invalid
  return res
    .status(401)
    .json({ success: false, message: "Invalid credentials" });
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) return res.sendStatus(403); // Forbidden if no token

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) return res.sendStatus(403); // Forbidden if token is invalid
    req.user = decoded; // Save decoded token data to request
    next(); // Proceed to the next middleware/route
  });
};

// Example protected route
app.get("/api/protected", verifyToken, (req, res) => {
  res.json({ message: "This is a protected route.", user: req.user });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

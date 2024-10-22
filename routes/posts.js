import express from "express";
import Blog from "../models/Post.js";
import sendPostUpdate from "./sendPostUpdate.js";

const router = express.Router();

// Create a new blog
router.post("/", async (req, res) => {
  const { title, excerpt, content, image, date } = req.body;

  // Create a new blog instance
  const newBlog = new Blog({
    title,
    excerpt,
    content,
    image,
    date,
  });

  try {
    // Save the blog to the database
    const savedBlog = await newBlog.save();
    await sendPostUpdate(savedBlog._id);
    res.status(201).json(savedBlog); // Return the created blog
  } catch (error) {
    res.status(400).json({ message: error.message }); // Handle errors
  }
});

export default router;

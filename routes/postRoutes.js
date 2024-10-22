import express from "express";
import { getAllPosts, getPostById } from "../controllers/postController.js";
import Post from "../models/Post.js";
const router = express.Router();
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Route to create a new post (for POST requests to `/posts`)
function authenticate(req, res, next) {
  const password = req.headers["authorization"]; // Get password from Authorization header
  if (!password || password !== process.env.PERSONALPASSWORD) {
    return res.status(403).json({ message: "Forbidden: Invalid password" });
  }
  next();
}

// Route to get all posts (for GET requests to `/`)
router.get("/", authenticate, getAllPosts);

// Route to get a specific post by ID (for GET requests to `/posts/:id`)
router.get("/:id", authenticate, getPostById);

router.post("/:id/like", authenticate, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } }, // Directly update the likes field
      { new: true }
    );
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: "Error liking post", error });
  }
});
router.post("/:id/dislike", authenticate, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.likes > 0) {
      post.likes -= 1; // Decrement likes count
    }
    await post.save();
    res.json({ likes: post.likes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error disliking the post" });
  }
});

router.post("/:id/comments", authenticate, async (req, res) => {
  console.log("Request body:", req.body); // Log the entire request body

  const { content } = req.body; // Expect content in the request body

  try {
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { content } } }, // Push content into comments array
      { new: true } // Return the updated post
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const newComment = updatedPost.comments[updatedPost.comments.length - 1]; // Get the last comment added
    res.status(201).json(newComment); // Send the newly created comment back to the client
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Error adding comment", error });
  }
});

// Route to like a post (for POST requests to `/posts/:id/like`)
router.post("/:id/view", authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");
    post.views += 1;
    await post.save();
    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

export default router;

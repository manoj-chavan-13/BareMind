import Post from "../models/Post.js";

// Get all blog posts (for the `/` route)
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find(); // Fetch all posts from MongoDB
    res.status(200).json(posts); // Send all posts as the response
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific post by ID (for the `/posts/:id` route)
export const getPostById = async (req, res) => {
  const { id } = req.params;

  try {
    const post = await Post.findById(id); // Find post by its ID
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Optionally increment view count when the post is retrieved
    post.viewCount += 1;
    await post.save();

    res.status(200).json(post); // Send the post as the response
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

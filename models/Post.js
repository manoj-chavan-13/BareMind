import mongoose from "mongoose";

// Comment schema
const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Blog schema
const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  date: {
    type: String, // Change to String to store date as 'YYYY-MM-DD'
  },
  excerpt: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  image: {
    type: String, // Assuming you're storing URLs or file paths as strings
    required: true,
  },
  likes: {
    type: Number,
    default: 0,
  },
  comments: [commentSchema], // Embed comments schema
  views: {
    type: Number,
    default: 0,
  },
});

// Pre-save hook to format the date
blogSchema.pre("save", function (next) {
  // Format date as 'YYYY-MM-DD'
  const currentDate = new Date();
  this.date = currentDate.toISOString().split("T")[0]; // Store date in 'YYYY-MM-DD' format
  next();
});

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;

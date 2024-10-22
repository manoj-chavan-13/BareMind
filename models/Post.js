// Blog schema
const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  date: {
    type: String, // Storing date as 'YYYY-MM-DD'
    required: true, // Ensure it's required for new posts
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

// Pre-save hook to set the date only if it is not already set
blogSchema.pre("save", function (next) {
  if (!this.date) {
    // Only set the date if it hasn't been set yet
    const currentDate = new Date();
    this.date = currentDate.toISOString().split("T")[0]; // Store date in 'YYYY-MM-DD' format
  }
  next();
});

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;

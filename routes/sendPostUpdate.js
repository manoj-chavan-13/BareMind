import express from "express";
import Blog from "../models/Post.js";
import nodemailer from "nodemailer";
import Subscription from "../models/Subscription.js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: "smtp.titan.email",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // Your email from env
    pass: process.env.EMAIL_PASS, // Your email password (make sure this is secure)
  },
});

// Function to create email template
function createEmailTemplate(post) {
  return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Blog Post Alert</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f8f8f8; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f8f8; padding: 20px;">
        <tr>
            <td>
                <div
                    style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
                    <div
                        style="background-image: url('https://firebasestorage.googleapis.com/v0/b/minta-mn.appspot.com/o/images%2Fbg-neon.jpg?alt=media&token=77140451-cd73-4454-ad9a-f11703d30867'); background-size: cover; color: #ffffff; text-align: center; padding: 20px;">
                        <h1 style="margin: 0;">New Blog Post Alert!</h1>
                    </div>
               
                    <div style="padding: 20px;">
                        <h2 style="font-size: 24px; color: #333333;">${
                          post.title
                        }</h2>
                        <p style="font-size: 14px; color: #999999;">${new Date(
                          post.date
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}</p>
                        <p style="font-size: 12px; color: #666666;">${
                          post.excerpt
                        }</p>
                        <a href="${post.link}"
                            style="display: inline-block; padding: 10px 15px; background-color: rgb(9, 0, 109); color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Read
                            More &rarr;</a>
                    </div>
                    <div
                        style="padding: 10px; background-color: #f5f8ff; text-align: center; font-size: 0.9em; color: #888;">
                        <img src="https://firebasestorage.googleapis.com/v0/b/minta-mn.appspot.com/o/images%2Flogo.jpeg?alt=media&token=9ff24e50-ea4d-40db-896e-9b70a78cb7d2"
                            alt="BareMind Logo" style="border-radius: 8px; max-width: 30px; height: auto;">
                        <p>&copy; 2024 BareMind. All Rights Reserved.</p>
                        <p>You are receiving this email because you subscribed at BareMind. Visit our <a
                                href="https://baremind-in.vercel.app/privacy-policy"
                                style="color: rgb(9, 0, 109); text-decoration: none;">Privacy Policy</a> to learn your
                            rights and how we use your data.</p>
                        <p>BareMind is a product of Minta.in.</p>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>

</html>
  `;
}

// Function to send the email
export default async function sendPostUpdate(id) {
  try {
    // Retrieve the post from the database
    const post = await Blog.findById(id);

    if (!post) {
      console.error("Post not found");
      return;
    }

    const subscribers = await Subscription.find();

    // Create the email template with the post data
    const emailTemplate = createEmailTemplate({
      title: post.title,
      excerpt: post.excerpt,
      image: post.image,
      date: post.date,
      link: `https://baremind-in.vercel.app/posts/${post._id}`, // Update with your blog post link
    });

    // Set up email options
    for (const subscriber of subscribers) {
      const mailOptions = {
        from: "BareMind <hello@minta.in>", // Include your name for the sender
        to: subscriber.email,
        subject: "New Blog Post Alert!",
        html: emailTemplate,
      };

      // Send the email
      await transporter.sendMail(mailOptions);
    }
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

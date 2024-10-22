import nodemailer from "nodemailer";
import fs from "fs/promises"; // Use promises for easier async/await syntax
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Get current directory for relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Function to send thank-you email
export const sendThankYouEmail = async (email) => {
  const filePath = path.join(__dirname, "thanksMail.html"); // Update with your HTML file path

  try {
    // Read HTML content from the file using promises
    const htmlContent = await fs.readFile(filePath, "utf8");

    const mailOptions = {
      from: "BareMind <hello@minta.in>", // Include your name for the sender
      to: email,
      subject: "Thank You for Subscribing!",
      html: htmlContent, // Use the HTML content from the file
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

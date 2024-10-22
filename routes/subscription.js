// routes/subscription.js
import express from "express";
import Subscription from "../models/Subscription.js";
import { sendThankYouEmail } from "../utils/emailService.js"; // Import the send email function

const router = express.Router();

// Subscribe to the newsletter
router.post("/", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const existingSubscription = await Subscription.findOne({ email });
    if (existingSubscription) {
      return res.status(409).json({ error: "Email is already subscribed." });
    }

    const newSubscription = new Subscription({ email });
    await newSubscription.save();

    // Send thank-you email
    sendThankYouEmail(email);

    return res.status(201).json({ message: "Subscription successful!" });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return res.status(500).json({ error: "Failed to subscribe." });
  }
});

export default router;

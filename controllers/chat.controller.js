import jwt from "jsonwebtoken";
import { askGrok } from "../services/chat.service.js";

export const chat = async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const parts = authHeader.split(" ");
        if (parts.length === 2 && parts[1]) {
          const decoded = jwt.verify(parts[1], process.env.JWT_SECRET);
          userId = decoded.id;
        }
      } catch {}
    }

    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: "Message too long (max 1000 characters)" });
    }

    const reply = await askGrok(userId, message.trim());
    res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to get response from AI assistant" });
  }
};

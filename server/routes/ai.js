import express from "express";
import { getAIResponse, calculateScore } from "../services/openai.js";
import { recordSession } from "../services/progress.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { input, userId = "gf_1" } = req.body;

    if (!input || !input.trim()) {
      return res.status(400).json({ error: "Input is required" });
    }

    // Get AI response
    const aiResponse = await getAIResponse(input.trim());

    // Calculate score
    const score = calculateScore(aiResponse);

    // Record session and update stats
    const { session, user } = await recordSession(
      userId,
      input.trim(),
      aiResponse,
      score
    );
    
    // Ensure we always have valid user stats
    const safeUser = user || {
      userId,
      streak: 0,
      accuracy: score,
      level: "Beginner",
      totalSessions: session ? 1 : 0,
      totalScore: score,
    };

    // Return everything the frontend needs
    res.json({
      ...aiResponse,
      score,
      stats: {
        streak: safeUser.streak ?? 0,
        accuracy: safeUser.accuracy ?? score,
        level: safeUser.level ?? "Beginner",
        totalSessions: safeUser.totalSessions ?? (session ? 1 : 0),
      },
    });
  } catch (error) {
    console.error("AI route error:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ 
      error: error.message || "Something went wrong. Please try again."
    });
  }
});

export default router;

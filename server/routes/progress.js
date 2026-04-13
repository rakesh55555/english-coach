import express from "express";
import { getProgress } from "../services/progress.js";

const router = express.Router();

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const progress = await getProgress(userId);

    // Ensure stats exists and return appropriate response
    if (!progress || !progress.stats) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(progress);
  } catch (error) {
    console.error("Progress route error:", error.message);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

export default router;

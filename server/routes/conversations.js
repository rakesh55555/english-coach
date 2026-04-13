import express from "express";
import {
  generateQuestion,
  evaluateConversationAnswer,
  getGreeting,
} from "../services/conversation.js";
import {
  saveSession,
  getRecentSessions,
  getUserStats,
  updateUserStats,
} from "../services/storage.js";

const router = express.Router();

/**
 * Start a new conversation
 * GET /api/conversations/start?userId=gf_1
 */
router.get("/start", async (req, res) => {
  try {
    const { userId = "gf_1" } = req.query;

    // Get user info
    const userStats = await getUserStats(userId);

    if (!userStats) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate greeting and first question
    const { greeting, question, questionOdia } = await getGreeting(
      userStats.name,
      userStats.level
    );

    res.json({
      greeting,
      question,
      questionOdia,
      userLevel: userStats.level,
      accuracy: userStats.accuracy,
    });
  } catch (error) {
    console.error("Conversation start error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Submit answer and get evaluation + next question
 * POST /api/conversations/answer
 * Body: { userId, userAnswer, previousQuestion }
 */
router.post("/answer", async (req, res) => {
  try {
    const { userId = "gf_1", userAnswer, previousQuestion } = req.body;

    if (!userAnswer || !previousQuestion) {
      return res
        .status(400)
        .json({ error: "userAnswer and previousQuestion are required" });
    }

    // Get user level
    const userStats = await getUserStats(userId);
    if (!userStats) {
      return res.status(404).json({ error: "User not found" });
    }

    // Evaluate the answer
    const evaluation = await evaluateConversationAnswer(
      userAnswer,
      previousQuestion,
      userStats.level
    );

    // Save session record (reusing existing session storage)
    const session = await saveSession(
      userId,
      `[CONVERSATION] ${previousQuestion}`,
      {
        userAnswer,
        feedback: evaluation.feedback,
        corrections: evaluation.corrections,
      },
      evaluation.score
    );

    // Update user stats
    const updatedStats = await updateUserStats(userId, evaluation.score);
    
    // Ensure we always have valid stats to return
    const safeStats = updatedStats || {
      userId,
      streak: 0,
      accuracy: evaluation.score,
      level: userStats.level || "Beginner",
      totalSessions: 1,
      totalScore: evaluation.score
    };

    // Return evaluation + next question
    res.json({
      feedback: evaluation.feedback,
      corrections: evaluation.corrections,
      explanation: evaluation.explanation,
      explanationOdia: evaluation.explanationOdia || "",
      score: evaluation.score,
      nextQuestion: evaluation.nextQuestion,
      nextQuestionOdia: evaluation.nextQuestionOdia || "",
      stats: {
        streak: safeStats.streak || 0,
        accuracy: safeStats.accuracy || evaluation.score,
        level: safeStats.level || "Beginner",
        totalSessions: safeStats.totalSessions || 1,
      },
    });
  } catch (error) {
    console.error("Answer evaluation error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get conversation history
 * GET /api/conversations/history?userId=gf_1
 */
router.get("/history", async (req, res) => {
  try {
    const { userId = "gf_1", limit = 10 } = req.query;

    const conversations = await getRecentSessions(userId, parseInt(limit));

    // Filter only conversation sessions
    const conversationSessions = conversations.filter((s) =>
      s.input.startsWith("[CONVERSATION]")
    );

    res.json({
      userId,
      totalConversations: conversationSessions.length,
      conversations: conversationSessions,
    });
  } catch (error) {
    console.error("History fetch error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;

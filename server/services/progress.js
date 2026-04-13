import {
  saveSession,
  getRecentSessions,
  getUserStats,
  updateUserStats,
} from "./storage.js";

export async function recordSession(userId, input, aiResponse, score) {
  try {
    // Save the session
    const session = await saveSession(userId, input, aiResponse, score);

    // Update user stats
    const updatedUser = await updateUserStats(userId, score);

    return { session, user: updatedUser };
  } catch (error) {
    console.error(`❌ Error recording session for ${userId}:`, error.message);
    throw error;
  }
}

export async function getProgress(userId) {
  try {
    const stats = await getUserStats(userId);
    const recentSessions = await getRecentSessions(userId, 20);

    // Ensure stats is always a valid object
    if (!stats) {
      console.warn(`⚠️ Stats not found for user ${userId}, creating default`);
      // This should rarely happen now with auto-creation, but safety first
      return {
        stats: {
          userId,
          name: "Learner",
          streak: 0,
          totalSessions: 0,
          totalScore: 0,
          accuracy: 0,
          level: "Beginner",
          lastActive: null,
        },
        recentSessions: [],
      };
    }

    return {
      stats,
      recentSessions: recentSessions || [],
    };
  } catch (error) {
    console.error(`❌ Error getting progress for ${userId}:`, error.message);
    throw error;
  }
}

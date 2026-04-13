import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

let db = null;
let useFirebase = false;

// This check will be done inside initializeFirebase() to ensure .env is loaded

export function initializeFirebase() {
  // Check if Firebase is properly configured (now that .env is loaded)
  if (!useFirebase && process.env.FIREBASE_PROJECT_ID) {
    useFirebase = true;
  }

  if (!useFirebase) {
    console.log(
      "⚠️  Firebase credentials not found in .env, using JSON database instead"
    );
    return null;
  }

  if (db) return db;

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    db = admin.database();
    console.log("✅ Firebase initialized successfully!");
    return db;
  } catch (error) {
    console.error("❌ Firebase init error:", error.message);
    console.log("⚠️  Falling back to JSON database");
    useFirebase = false;
    return null;
  }
}

export function getDB() {
  // First check if we need to initialize
  if (!useFirebase && !db && process.env.FIREBASE_PROJECT_ID) {
    initializeFirebase();
  }
  return db;
}

// ─── Helper Functions ───────────────────────────────────

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    return filePath.includes("sessions") ? [] : {};
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ─── Sessions ───────────────────────────────────────────

export async function saveSession(userId, input, response, score) {
  const sessionId = Date.now().toString();
  const session = {
    id: sessionId,
    userId,
    input,
    response,
    score,
    date: new Date().toISOString(),
  };

  if (useFirebase && db) {
    try {
      await db.ref(`sessions/${userId}/${sessionId}`).set(session);
      console.log(
        `✅ [FB] Session saved: ${userId}/${sessionId}`
      );
      return session;
    } catch (error) {
      console.error(
        "Firebase save error, falling back to JSON:",
        error.message
      );
    }
  }

  // JSON fallback
  const sessions = readJSON(SESSIONS_FILE);
  sessions.push(session);
  writeJSON(SESSIONS_FILE, sessions);
  return session;
}

export async function getRecentSessions(userId, limit = 20) {
  if (useFirebase && db) {
    try {
      const snapshot = await db
        .ref(`sessions/${userId}`)
        .orderByChild("date")
        .limitToLast(limit)
        .once("value");

      if (!snapshot.exists()) return [];
      const sessions = Object.values(snapshot.val());
      return sessions.reverse();
    } catch (error) {
      console.error(
        "Firebase fetch error, falling back to JSON:",
        error.message
      );
    }
  }

  // JSON fallback
  const sessions = readJSON(SESSIONS_FILE);
  return sessions
    .filter((s) => s.userId === userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

// ─── User Stats ─────────────────────────────────────────

export async function getUserStats(userId) {
  if (useFirebase && db) {
    try {
      const snapshot = await db.ref(`users/${userId}`).once("value");
      return snapshot.val() || null;
    } catch (error) {
      console.error(
        "Firebase fetch error, falling back to JSON:",
        error.message
      );
    }
  }

  // JSON fallback
  const users = readJSON(USERS_FILE);
  return users[userId] || null;
}

export async function updateUserStats(userId, score) {
  if (useFirebase && db) {
    try {
      const result = await db.ref(`users/${userId}`).transaction((user) => {
        if (!user) return user;

        const today = new Date().toISOString().split("T")[0];
        const lastActive = user.lastActive
          ? user.lastActive.split("T")[0]
          : null;

        // Calculate streak
        if (lastActive) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          if (lastActive === today) {
            // Same day, keep streak
          } else if (lastActive === yesterdayStr) {
            user.streak += 1;
          } else {
            user.streak = 1;
          }
        } else {
          user.streak = 1;
        }

        // Update totals
        user.totalSessions += 1;
        user.totalScore += score;
        user.accuracy = Math.round(user.totalScore / user.totalSessions);
        user.lastActive = new Date().toISOString();

        // Calculate level
        if (user.accuracy > 85) {
          user.level = "Intermediate";
        } else if (user.accuracy > 70) {
          user.level = "Basic";
        } else {
          user.level = "Beginner";
        }

        return user;
      });

      console.log(`✅ [FB] User stats updated: ${userId}`);
      return result.committed ? result.snapshot.val() : null;
    } catch (error) {
      console.error(
        "Firebase transaction error, falling back to JSON:",
        error.message
      );
    }
  }

  // JSON fallback
  const users = readJSON(USERS_FILE);
  const user = users[userId];

  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];
  const lastActive = user.lastActive ? user.lastActive.split("T")[0] : null;

  // Calculate streak
  if (lastActive) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastActive === today) {
      // Same day, keep streak
    } else if (lastActive === yesterdayStr) {
      user.streak += 1;
    } else {
      user.streak = 1;
    }
  } else {
    user.streak = 1;
  }

  // Update totals
  user.totalSessions += 1;
  user.totalScore += score;
  user.accuracy = Math.round(user.totalScore / user.totalSessions);
  user.lastActive = new Date().toISOString();

  // Calculate level
  if (user.accuracy > 85) {
    user.level = "Intermediate";
  } else if (user.accuracy > 70) {
    user.level = "Basic";
  } else {
    user.level = "Beginner";
  }

  users[userId] = user;
  writeJSON(USERS_FILE, users);
  return user;
}

// ─── Conversations ──────────────────────────────────────

export async function saveConversation(userId, questionId, userAnswer, score) {
  const conversationId = Date.now().toString();
  const conversation = {
    id: conversationId,
    userId,
    questionId,
    userAnswer,
    score,
    date: new Date().toISOString(),
  };

  if (useFirebase && db) {
    try {
      await db
        .ref(`conversations/${userId}/${conversationId}`)
        .set(conversation);
      console.log(
        `✅ [FB] Conversation saved: ${userId}/${conversationId}`
      );
      return conversation;
    } catch (error) {
      console.error(
        "Firebase save error, falling back to JSON:",
        error.message
      );
    }
  }

  // JSON fallback - store in sessions file with type marker
  const sessions = readJSON(SESSIONS_FILE);
  conversation.type = "conversation";
  sessions.push(conversation);
  writeJSON(SESSIONS_FILE, sessions);
  return conversation;
}

export async function getConversationHistory(userId, limit = 10) {
  if (useFirebase && db) {
    try {
      const snapshot = await db
        .ref(`conversations/${userId}`)
        .orderByChild("date")
        .limitToLast(limit)
        .once("value");

      if (!snapshot.exists()) return [];
      const conversations = Object.values(snapshot.val());
      return conversations.reverse();
    } catch (error) {
      console.error(
        "Firebase fetch error, falling back to JSON:",
        error.message
      );
    }
  }

  // JSON fallback
  const sessions = readJSON(SESSIONS_FILE);
  return sessions
    .filter((s) => s.userId === userId && s.type === "conversation")
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

export { useFirebase };

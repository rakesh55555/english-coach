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

function isFirebaseEnabled() {
  const flag = process.env.USE_FIREBASE?.trim().toLowerCase();

  if (flag === "false" || flag === "0" || flag === "no") {
    return false;
  }

  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
  );
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON(filePath) {
  ensureDataDir();

  if (!fs.existsSync(filePath)) {
    return filePath.includes("sessions") ? [] : {};
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJSON(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function buildDefaultUser(userId, existing = {}) {
  return {
    userId,
    name: existing.name || "Learner",
    streak: existing.streak ?? 0,
    totalSessions: existing.totalSessions ?? 0,
    totalScore: existing.totalScore ?? 0,
    accuracy: existing.accuracy ?? 0,
    level: existing.level || "Beginner",
    lastActive: existing.lastActive || null,
  };
}

function getLocalUsers() {
  return readJSON(USERS_FILE);
}

function saveLocalUser(userId, user) {
  const users = getLocalUsers();
  users[userId] = buildDefaultUser(userId, user);
  writeJSON(USERS_FILE, users);
  return users[userId];
}

function getOrCreateLocalUser(userId) {
  const users = getLocalUsers();
  const existingUser = users[userId];

  if (existingUser) {
    return buildDefaultUser(userId, existingUser);
  }

  return saveLocalUser(userId, { userId });
}

function applyScoreToUser(user, score) {
  const today = new Date().toISOString().split("T")[0];
  const lastActive = user.lastActive ? user.lastActive.split("T")[0] : null;

  if (lastActive) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastActive === today) {
      // Keep streak for multiple same-day sessions.
    } else if (lastActive === yesterdayStr) {
      user.streak += 1;
    } else {
      user.streak = 1;
    }
  } else {
    user.streak = 1;
  }

  user.totalSessions += 1;
  user.totalScore += score;
  user.accuracy = Math.round(user.totalScore / user.totalSessions);
  user.lastActive = new Date().toISOString();

  if (user.accuracy > 85) {
    user.level = "Intermediate";
  } else if (user.accuracy > 70) {
    user.level = "Basic";
  } else {
    user.level = "Beginner";
  }

  return user;
}

async function mirrorSessionToLocal(session) {
  const sessions = readJSON(SESSIONS_FILE);
  sessions.push(session);
  writeJSON(SESSIONS_FILE, sessions);
}

export function initializeFirebase() {
  useFirebase = isFirebaseEnabled();

  if (!useFirebase) {
    console.log("Firebase is disabled or incomplete, using JSON storage");
    return null;
  }

  if (db) return db;

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }

    db = admin.database();
    console.log("Firebase initialized successfully");
    return db;
  } catch (error) {
    console.error("Firebase init error:", error.message);
    console.log("Falling back to JSON storage");
    useFirebase = false;
    return null;
  }
}

export function getDB() {
  if (!useFirebase && !db && isFirebaseEnabled()) {
    initializeFirebase();
  }

  return db;
}

export async function saveSession(userId, input, response, score) {
  const session = {
    id: Date.now().toString(),
    userId,
    input,
    response,
    score,
    date: new Date().toISOString(),
  };

  if (useFirebase && db) {
    try {
      await db.ref(`sessions/${userId}/${session.id}`).set(session);
      await mirrorSessionToLocal(session);
      return session;
    } catch (error) {
      console.error("Firebase save error, falling back to JSON:", error.message);
    }
  }

  await mirrorSessionToLocal(session);
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

      if (snapshot.exists()) {
        const sessions = Object.values(snapshot.val());
        return sessions.reverse();
      }
    } catch (error) {
      console.error("Firebase fetch error, falling back to JSON:", error.message);
    }
  }

  const sessions = readJSON(SESSIONS_FILE);
  return sessions
    .filter((session) => session.userId === userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

export async function getUserStats(userId) {
  if (useFirebase && db) {
    try {
      const snapshot = await db.ref(`users/${userId}`).once("value");

      if (snapshot.exists()) {
        return buildDefaultUser(userId, snapshot.val());
      }

      const localUser = getOrCreateLocalUser(userId);
      await db.ref(`users/${userId}`).set(localUser);
      return localUser;
    } catch (error) {
      console.error("Firebase fetch error, falling back to JSON:", error.message);
    }
  }

  return getOrCreateLocalUser(userId);
}

export async function updateUserStats(userId, score) {
  try {
    if (useFirebase && db) {
      try {
        const result = await db.ref(`users/${userId}`).transaction((user) =>
          applyScoreToUser(
            buildDefaultUser(userId, user || getOrCreateLocalUser(userId)),
            score
          )
        );

        const updatedUser = result.committed
          ? buildDefaultUser(userId, result.snapshot.val())
          : buildDefaultUser(userId, getOrCreateLocalUser(userId));

        // Always ensure we save to local JSON as backup
        saveLocalUser(userId, updatedUser);
        console.log(`✅ User stats updated via Firebase: ${userId}`);
        return updatedUser;
      } catch (error) {
        console.error(
          "Firebase transaction error, falling back to JSON:",
          error.message
        );
      }
    }

    // JSON fallback or when Firebase is disabled
    const user = applyScoreToUser(getOrCreateLocalUser(userId), score);
    const savedUser = saveLocalUser(userId, user);
    console.log(`✅ User stats updated via JSON: ${userId}`);
    return savedUser;
  } catch (error) {
    console.error(`❌ Critical error updating stats for ${userId}:`, error.message);
    // Last resort - return a safe default user object
    return buildDefaultUser(userId, { userId });
  }
}

export async function saveConversation(userId, questionId, userAnswer, score) {
  const conversation = {
    id: Date.now().toString(),
    userId,
    questionId,
    userAnswer,
    score,
    date: new Date().toISOString(),
    type: "conversation",
  };

  if (useFirebase && db) {
    try {
      await db.ref(`conversations/${userId}/${conversation.id}`).set(conversation);
      await mirrorSessionToLocal(conversation);
      return conversation;
    } catch (error) {
      console.error("Firebase save error, falling back to JSON:", error.message);
    }
  }

  await mirrorSessionToLocal(conversation);
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

      if (snapshot.exists()) {
        const conversations = Object.values(snapshot.val());
        return conversations.reverse();
      }
    } catch (error) {
      console.error("Firebase fetch error, falling back to JSON:", error.message);
    }
  }

  const sessions = readJSON(SESSIONS_FILE);
  return sessions
    .filter((session) => session.userId === userId && session.type === "conversation")
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

export { useFirebase };

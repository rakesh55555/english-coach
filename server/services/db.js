import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, "[]");
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(
    USERS_FILE,
    JSON.stringify({
      gf_1: {
        userId: "gf_1",
        name: "Anu",
        streak: 0,
        totalSessions: 0,
        totalScore: 0,
        accuracy: 0,
        level: "Beginner",
        lastActive: null,
      },
    })
  );
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ─── Sessions ───────────────────────────────────────────

export function saveSession(userId, input, response, score) {
  const sessions = readJSON(SESSIONS_FILE);
  const session = {
    id: Date.now().toString(),
    userId,
    input,
    response,
    score,
    date: new Date().toISOString(),
  };
  sessions.push(session);
  writeJSON(SESSIONS_FILE, sessions);
  return session;
}

export function getRecentSessions(userId, limit = 20) {
  const sessions = readJSON(SESSIONS_FILE);
  return sessions
    .filter((s) => s.userId === userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

// ─── User Stats ─────────────────────────────────────────

export function getUserStats(userId) {
  const users = readJSON(USERS_FILE);
  return users[userId] || null;
}

export function updateUserStats(userId, score) {
  const users = readJSON(USERS_FILE);
  const user = users[userId];

  if (!user) return null;

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
      user.streak = 1; // Reset streak
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

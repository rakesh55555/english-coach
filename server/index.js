import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeFirebase } from "./services/storage.js";
import aiRoute from "./routes/ai.js";
import progressRoute from "./routes/progress.js";
import conversationRoute from "./routes/conversations.js";

dotenv.config();

// Initialize Firebase (optional - if credentials are provided)
initializeFirebase();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/ai", aiRoute);
app.use("/api/progress", progressRoute);
app.use("/api/conversations", conversationRoute);

app.get("/", (req, res) => {
  res.json({ status: "English Coach AI Server running 🚀" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

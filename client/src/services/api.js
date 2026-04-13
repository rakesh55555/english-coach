const API_BASE = "http://localhost:5000/api";

export async function sendMessage(input, userId = "gf_1") {
  const response = await fetch(`${API_BASE}/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, userId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to get response");
  }

  return response.json();
}

export async function getProgress(userId = "gf_1") {
  const response = await fetch(`${API_BASE}/progress/${userId}`);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch progress");
  }

  return response.json();
}

export async function startConversation(userId = "gf_1") {
  const response = await fetch(
    `${API_BASE}/conversations/start?userId=${encodeURIComponent(userId)}`
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to start conversation");
  }

  return response.json();
}

export async function submitConversationAnswer(
  userAnswer,
  previousQuestion,
  userId = "gf_1"
) {
  const response = await fetch(`${API_BASE}/conversations/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, userAnswer, previousQuestion }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to evaluate answer");
  }

  return response.json();
}

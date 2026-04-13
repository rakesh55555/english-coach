import { useEffect, useRef, useState } from "react";
import VoiceInput from "./VoiceInput.jsx";
import { sendMessage } from "../services/api";
import {
  canUseSpeechSynthesis,
  speakText,
  stopSpeaking,
} from "../utils/speech.js";

const actionButtonStyle = {
  marginLeft: "auto",
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-glass)",
  color: "var(--text-primary)",
  borderRadius: "999px",
  padding: "0.2rem 0.65rem",
  fontSize: "0.75rem",
  cursor: "pointer",
};

export default function ChatBoxEnhanced({ onStatsUpdate }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const speechSupported = canUseSpeechSynthesis();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => stopSpeaking, []);

  const appendAiMessage = (data) => {
    setMessages((prev) => [
      ...prev,
      {
        type: "ai",
        corrected: data.corrected,
        explanation: data.explanation,
        translation: data.translation,
        nextQuestion: data.nextQuestion,
        score: data.score,
      },
    ]);

    if (data.stats && onStatsUpdate) {
      onStatsUpdate(data.stats);
    }
  };

  const submitText = async (text) => {
    setError(null);
    setMessages((prev) => [...prev, { type: "user", text }]);
    setLoading(true);

    try {
      const data = await sendMessage(text);
      appendAiMessage(data);
    } catch (err) {
      setError(err.message || "Failed to get response. Please try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    await submitText(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceResult = (transcript) => {
    setInput(transcript);

    setTimeout(() => {
      setInput("");
      submitText(transcript);
    }, 600);
  };

  const getScoreClass = (score) => {
    if (score >= 90) return "perfect";
    if (score >= 70) return "good";
    return "needs-work";
  };

  return (
    <div className="chat-container">
      <div className="response-container">
        {messages.length === 0 && !loading && (
          <div className="chat-welcome">
            <h2>Hello Krishu! Let&apos;s Practice</h2>
            <p>
              Type or speak an English sentence. I&apos;ll correct it and help
              you learn.
            </p>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.type === "user" ? (
            <div key={i} className="user-message">
              {msg.text}
            </div>
          ) : (
            <div key={i} className="ai-response">
              <div className="card">
                <div className="response-section corrected">
                  <div className="response-label">Corrected</div>
                  <div className="response-text">{msg.corrected}</div>
                </div>

                {msg.explanation && (
                  <div className="response-section explanation">
                    <div
                      className="response-label"
                      style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                    >
                      <span>Explanation</span>
                      {speechSupported && (
                        <button
                          type="button"
                          style={actionButtonStyle}
                          onClick={() =>
                            speakText(
                              [msg.explanation, msg.corrected]
                                .filter(Boolean)
                                .join(". ")
                            )
                          }
                          title="Read explanation aloud"
                        >
                          🔊 Read
                        </button>
                      )}
                    </div>
                    <div className="response-text">{msg.explanation}</div>
                  </div>
                )}

                {msg.translation && (
                  <div className="response-section translation">
                    <div className="response-label">Odia Translation</div>
                    <div className="response-text">{msg.translation}</div>
                  </div>
                )}

                {msg.nextQuestion && (
                  <div className="response-section next-question">
                    <div className="response-label">Try Next</div>
                    <div className="response-text">{msg.nextQuestion}</div>
                  </div>
                )}

                <div className={`score-badge ${getScoreClass(msg.score)}`}>
                  Score: {msg.score}
                </div>
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="input-area">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type an English sentence..."
            disabled={loading}
            autoFocus
            id="chat-input"
          />
          <VoiceInput onResult={handleVoiceResult} disabled={loading} />
          <button
            className="btn-send"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            title="Send"
            aria-label="Send message"
            id="send-btn"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

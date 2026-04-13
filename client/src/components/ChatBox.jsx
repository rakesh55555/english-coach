import { useState, useRef, useEffect } from "react";
import VoiceInput from "./VoiceInput.jsx";
import { sendMessage } from "../services/api";

export default function ChatBox({ onStatsUpdate }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setInput("");

    // Add user message
    setMessages((prev) => [...prev, { type: "user", text }]);
    setLoading(true);

    try {
      const data = await sendMessage(text);

      // Add AI response
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

      // Update parent stats
      if (data.stats && onStatsUpdate) {
        onStatsUpdate(data.stats);
      }
    } catch (err) {
      setError(err.message || "Failed to get response. Please try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceResult = (transcript) => {
    setInput(transcript);
    // Auto-send voice input after a short delay so user can see what was transcribed
    setTimeout(() => {
      setInput("");
      setMessages((prev) => [...prev, { type: "user", text: transcript }]);
      setLoading(true);

      sendMessage(transcript)
        .then((data) => {
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
        })
        .catch((err) => {
          setError(err.message || "Failed to get response.");
        })
        .finally(() => {
          setLoading(false);
        });
    }, 600);
  };

  const getScoreClass = (score) => {
    if (score >= 90) return "perfect";
    if (score >= 70) return "good";
    return "needs-work";
  };

  const getScoreEmoji = (score) => {
    if (score >= 90) return "🌟";
    if (score >= 70) return "👍";
    return "💪";
  };

  return (
    <div className="chat-container">
      {/* Messages area */}
      <div className="response-container">
        {messages.length === 0 && !loading && (
          <div className="chat-welcome">
            <h2>Hello Krishu! Let's Practice 💖</h2>
            <p>
              Type or speak an English sentence. I'll correct it and help you
              learn!
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
                  <div className="response-label">
                    <span className="icon">✅</span> Corrected
                  </div>
                  <div className="response-text">{msg.corrected}</div>
                </div>

                {msg.explanation && (
                  <div className="response-section explanation">
                    <div className="response-label">
                      <span className="icon">🧠</span> Explanation
                    </div>
                    <div className="response-text">{msg.explanation}</div>
                  </div>
                )}

                {msg.translation && (
                  <div className="response-section translation">
                    <div className="response-label">
                      <span className="icon">🌐</span> Odia Translation
                    </div>
                    <div className="response-text">{msg.translation}</div>
                  </div>
                )}

                {msg.nextQuestion && (
                  <div className="response-section next-question">
                    <div className="response-label">
                      <span className="icon">➡️</span> Try Next
                    </div>
                    <div className="response-text">{msg.nextQuestion}</div>
                  </div>
                )}

                <div className={`score-badge ${getScoreClass(msg.score)}`}>
                  {getScoreEmoji(msg.score)} Score: {msg.score}
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

      {/* Error */}
      {error && <div className="error-banner">{error}</div>}

      {/* Input area */}
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
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

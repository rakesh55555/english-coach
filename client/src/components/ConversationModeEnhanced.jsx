import { useEffect, useRef, useState } from "react";
import {
  startConversation,
  submitConversationAnswer,
} from "../services/api";
import {
  canUseSpeechSynthesis,
  speakText,
  stopSpeaking,
} from "../utils/speech.js";

const panelStyle = {
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: "12px",
  padding: "0.8rem 1rem",
};

const panelStyleOdia = {
  background: "rgba(255, 165, 0, 0.1)",
  border: "1px solid rgba(255, 165, 0, 0.25)",
  borderRadius: "12px",
  padding: "0.8rem 1rem",
};

const readButtonStyle = {
  border: "1px solid rgba(255, 255, 255, 0.25)",
  background: "rgba(255, 255, 255, 0.12)",
  color: "white",
  borderRadius: "999px",
  padding: "0.3rem 0.75rem",
  fontSize: "0.75rem",
  cursor: "pointer",
};

export default function ConversationModeEnhanced() {
  const [greeting, setGreeting] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState(null);
  const [score, setScore] = useState(null);
  const [stats, setStats] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const speechSupported = canUseSpeechSynthesis();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory, currentQuestion]);

  useEffect(() => stopSpeaking, []);

  useEffect(() => {
    const loadConversation = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await startConversation("gf_1");
        setGreeting(data.greeting);
        setCurrentQuestion(data.question);
        setStats({
          level: data.userLevel,
          accuracy: data.accuracy,
        });
      } catch (err) {
        setError(err.message || "Failed to start conversation");
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, []);

  const readConversationFeedback = (entry) => {
    speakText([entry.feedback, entry.explanation, entry.corrections].filter(Boolean).join(". "));
  };

  const handleSubmitAnswer = async () => {
    const trimmedAnswer = userAnswer.trim();
    if (!trimmedAnswer || answering) return;

    setAnswering(true);
    setError(null);

    try {
      const data = await submitConversationAnswer(
        trimmedAnswer,
        currentQuestion,
        "gf_1"
      );

      const nextEntry = {
        type: "ai",
        feedback: data.feedback,
        explanation: data.explanation,
        explanationOdia: data.explanationOdia,
        corrections: data.corrections,
        score: data.score,
      };

      setConversationHistory((prev) => [
        ...prev,
        { type: "user", text: trimmedAnswer },
        nextEntry,
      ]);

      setScore(data.score);
      setCurrentQuestion(data.nextQuestion);
      setUserAnswer("");
      setStats(data.stats);
    } catch (err) {
      setError(err.message || "Failed to evaluate answer");
    } finally {
      setAnswering(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  if (loading) {
    return (
      <div className="conversation-container loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Starting conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-page">
      {stats && (
        <div className="conversation-stats">
          <div className="stat-badge">
            <span>{stats.level || "Beginner"}</span>
          </div>
          <div className="stat-badge">
            <span>{stats.accuracy ?? 0}% Accuracy</span>
          </div>
        </div>
      )}

      <div className="conversation-container">
        {greeting && conversationHistory.length === 0 && (
          <div className="message ai-message greeting">
            <div className="message-avatar">AI</div>
            <div className="message-content">
              <p>{greeting}</p>
            </div>
          </div>
        )}

        {conversationHistory.map((item, idx) => (
          <div key={idx} className={`message ${item.type}-message`}>
            <div className="message-avatar">{item.type === "user" ? "You" : "AI"}</div>
            <div className="message-content">
              {item.type === "user" ? (
                <p>{item.text}</p>
              ) : (
                <>
                  <p className="feedback">{item.feedback}</p>
                  {item.explanation && (
                    <div style={panelStyle}>
                      <strong>Explanation:</strong> {item.explanation}
                      {speechSupported && (
                        <button
                          type="button"
                          style={{ ...readButtonStyle, marginLeft: "0.5rem" }}
                          onClick={() => speakText(item.explanation)}
                          title="Read explanation aloud"
                        >
                          🔊 Read
                        </button>
                      )}
                    </div>
                  )}
                  {item.explanationOdia && (
                    <div style={panelStyleOdia}>
                      <strong>ଉଡ଼ିଆ:</strong> {item.explanationOdia}
                      {speechSupported && (
                        <button
                          type="button"
                          style={{ ...readButtonStyle, marginLeft: "0.5rem" }}
                          onClick={() => speakText(item.explanationOdia)}
                          title="Read Odia explanation aloud"
                        >
                          🔊 Read
                        </button>
                      )}
                    </div>
                  )}
                  {item.corrections && (
                    <p className="correction">
                      <strong>Better English:</strong> {item.corrections}
                    </p>
                  )}
                  <button
                    type="button"
                    style={{ ...readButtonStyle, marginTop: "0.75rem" }}
                    onClick={() => readConversationFeedback(item)}
                    title="Read all feedback aloud"
                  >
                    🔊 Read Feedback
                  </button>
                  <div
                    className={`score-badge ${
                      item.score >= 80 ? "good" : "needs-work"
                    }`}
                  >
                    Score: {item.score}/100
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {currentQuestion && (
          <div className="message ai-message current-question">
            <div className="message-avatar">AI</div>
            <div className="message-content">
              <p className="question">{currentQuestion}</p>
              {speechSupported && (
                <button
                  type="button"
                  style={{ ...readButtonStyle, marginTop: "0.75rem" }}
                  onClick={() => speakText(currentQuestion)}
                  title="Read question aloud"
                >
                  🔊 Read Question
                </button>
              )}
            </div>
          </div>
        )}

        {typeof score === "number" && (
          <div className={`feedback-banner ${score >= 80 ? "excellent" : "good"}`}>
            <div className="feedback-score">{score}/100</div>
            <div className="feedback-text">
              Keep going. Your next question is ready below.
            </div>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="conversation-input-area">
        <textarea
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer here... Press Shift+Enter for a new line."
          disabled={answering}
          className="conversation-input"
        />
        <button
          onClick={handleSubmitAnswer}
          disabled={answering || !userAnswer.trim()}
          className="btn-submit-answer"
        >
          {answering ? "Checking..." : "Send Answer"}
        </button>
      </div>
    </div>
  );
}

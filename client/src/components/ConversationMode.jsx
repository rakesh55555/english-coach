import { useState, useEffect, useRef } from "react";

export default function ConversationMode() {
  const [greeting, setGreeting] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(null);
  const [stats, setStats] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory]);

  // Load initial greeting and question
  useEffect(() => {
    const startConversation = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          "http://localhost:5000/api/conversations/start?userId=gf_1"
        );

        if (!response.ok) {
          throw new Error("Failed to start conversation");
        }

        const data = await response.json();
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

    startConversation();
  }, []);

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || answering) return;

    setAnswering(true);
    setError(null);
    setFeedback(null);
    setScore(null);

    try {
      const response = await fetch(
        "http://localhost:5000/api/conversations/answer",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "gf_1",
            userAnswer: userAnswer.trim(),
            previousQuestion: currentQuestion,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to evaluate answer");
      }

      const data = await response.json();

      // Add to history
      setConversationHistory((prev) => [
        ...prev,
        {
          type: "user",
          text: userAnswer.trim(),
        },
        {
          type: "ai",
          feedback: data.feedback,
          score: data.score,
          corrections: data.corrections,
        },
      ]);

      // Update state
      setFeedback(data.feedback);
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
      {/* Stats Bar */}
      {stats && (
        <div className="conversation-stats">
          <div className="stat-badge">
            <span className="badge-icon">📈</span>
            <span>{stats.level}</span>
          </div>
          <div className="stat-badge">
            <span className="badge-icon">🎯</span>
            <span>{stats.accuracy}% Accuracy</span>
          </div>
        </div>
      )}

      {/* Conversation Area */}
      <div className="conversation-container">
        {/* Initial Greeting */}
        {greeting && conversationHistory.length === 0 && (
          <div className="message ai-message greeting">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <p>{greeting}</p>
            </div>
          </div>
        )}

        {/* Conversation History */}
        {conversationHistory.map((item, idx) => (
          <div key={idx} className={`message ${item.type}-message`}>
            <div className="message-avatar">
              {item.type === "user" ? "👤" : "🤖"}
            </div>
            <div className="message-content">
              {item.type === "user" ? (
                <p>{item.text}</p>
              ) : (
                <>
                  <p className="feedback">{item.feedback}</p>
                  {item.corrections && (
                    <p className="correction">
                      <strong>Note:</strong> {item.corrections}
                    </p>
                  )}
                  <div className={`score-badge ${item.score >= 80 ? "good" : "needs-work"}`}>
                    Score: {item.score}/100
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Current Question */}
        {currentQuestion && (
          <div className="message ai-message current-question">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <p className="question">{currentQuestion}</p>
            </div>
          </div>
        )}

        {/* Feedback Display */}
        {feedback && (
          <div className={`feedback-banner ${score >= 80 ? "excellent" : "good"}`}>
            <div className="feedback-score">{score}/100</div>
            <div className="feedback-text">{feedback}</div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="conversation-input-area">
        <textarea
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer here... (or press Shift+Enter for new line)"
          disabled={answering}
          className="conversation-input"
        />
        <button
          onClick={handleSubmitAnswer}
          disabled={answering || !userAnswer.trim()}
          className="btn-submit-answer"
        >
          {answering ? "Processing..." : "Send Answer"}
        </button>
      </div>
    </div>
  );
}

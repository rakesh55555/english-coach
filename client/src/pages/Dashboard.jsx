import { useState, useEffect, useCallback } from "react";
import { getProgress } from "../services/api";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    try {
      const result = await getProgress("gf_1");
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load progress");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  const getScoreClass = (score) => {
    if (score >= 90) return "high";
    if (score >= 70) return "mid";
    return "low";
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-banner">{error}</div>
        <button className="btn-refresh" onClick={() => fetchData(true)}>
          🔄 Try Again
        </button>
      </div>
    );
  }

  const { stats, recentSessions } = data;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h2>📊 Progress Dashboard</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div className="user-badge">
            <div className="avatar">A</div>
            <span>{stats.name}</span>
          </div>
          <button
            className={`btn-refresh ${refreshing ? "spinning" : ""}`}
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <span className="refresh-icon">🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="card stat-card streak">
          <div className="stat-label">🔥 Streak</div>
          <div className="stat-number">{stats.streak}</div>
          <div className="stat-detail">day{stats.streak !== 1 ? "s" : ""} in a row</div>
        </div>

        <div className="card stat-card accuracy">
          <div className="stat-label">🎯 Accuracy</div>
          <div className="stat-number">{stats.accuracy}%</div>
          <div className="stat-detail">overall score</div>
        </div>

        <div className="card stat-card sessions">
          <div className="stat-label">📝 Sessions</div>
          <div className="stat-number">{stats.totalSessions}</div>
          <div className="stat-detail">sentences practiced</div>
        </div>

        <div className="card stat-card level">
          <div className="stat-label">📈 Level</div>
          <div className="stat-number">{stats.level}</div>
          <div className="stat-detail">
            Last active: {formatDate(stats.lastActive)}
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="sessions-section">
        <h3>Recent Practice Sessions</h3>

        {recentSessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No sessions yet. Practice will appear here!</p>
          </div>
        ) : (
          <div className="sessions-list">
            {recentSessions.map((session) => (
              <div key={session.id} className="session-item">
                <div className="session-input">
                  "{session.input}"
                </div>
                <span className={`session-score ${getScoreClass(session.score)}`}>
                  {session.score}
                </span>
                <span className="session-date">
                  {formatDate(session.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

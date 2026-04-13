import { useState } from "react";
import ChatBox from "../components/ChatBoxEnhanced.jsx";

export default function Home() {
  const [stats, setStats] = useState(null);

  return (
    <div className="home-page">
      {/* Stats bar at top */}
      {stats && (
        <div className="stats-bar">
          <div className="stat-chip">
            <span className="stat-icon">🔥</span>
            <span>Streak:</span>
            <span className="stat-value">{stats.streak} day{stats.streak !== 1 ? 's' : ''}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-icon">🎯</span>
            <span>Accuracy:</span>
            <span className="stat-value">{stats.accuracy}%</span>
          </div>
          <div className="stat-chip">
            <span className="stat-icon">📝</span>
            <span>Sessions:</span>
            <span className="stat-value">{stats.totalSessions}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-icon">📈</span>
            <span>Level:</span>
            <span className="stat-value">{stats.level}</span>
          </div>
        </div>
      )}

      {/* Chat */}
      <ChatBox onStatsUpdate={setStats} />
    </div>
  );
}

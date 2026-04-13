import { useState } from "react";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ConversationMode from "./components/ConversationModeEnhanced.jsx";
import "./App.css";
import "./styles/ConversationMode.css";

function App() {
  const [activeTab, setActiveTab] = useState("practice");

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="app-logo">
            <span className="logo-icon">💖</span>
            English Coach
          </div>
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === "practice" ? "active" : ""}`}
              onClick={() => setActiveTab("practice")}
              id="tab-practice"
            >
              ✍️ Practice
            </button>
            <button
              className={`nav-tab ${activeTab === "conversation" ? "active" : ""}`}
              onClick={() => setActiveTab("conversation")}
              id="tab-conversation"
            >
              💬 Conversation
            </button>
            <button
              className={`nav-tab ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
              id="tab-dashboard"
            >
              📊 Dashboard
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="app-content">
        {activeTab === "practice" && <Home />}
        {activeTab === "conversation" && <ConversationMode />}
        {activeTab === "dashboard" && <Dashboard />}
      </main>
    </div>
  );
}

export default App;

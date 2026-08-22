import { useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ThemeToggle from "./components/ThemeToggle";
import logo from "./assets/logo.png";
import "./App.css";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

const THEME_KEY = "slims_theme";

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved === "dark";
  } catch {
    // localStorage unavailable (private mode, etc.) — default to light
  }
  return false;
}

function App() {
  const [darkMode, setDarkMode] = useState(getInitialTheme);
  const location = useLocation();

  const isRegister = location.pathname === "/register";
  const isRecovery = location.pathname === "/forgot-password";
  const isDashboard = location.pathname.startsWith("/dashboard");

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      try {
        localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }

  const welcomeLabel = isRegister
    ? "NEW BORROWER ACCOUNT"
    : isRecovery
      ? "ACCOUNT RECOVERY"
      : "MEMBER ACCESS";

  const welcomeHeading = isRegister
    ? "New to the library?"
    : isRecovery
      ? "Let’s get you back in."
      : "Welcome back!";

  const welcomeText = isRegister
    ? "Create your identity and begin your reading journey. Your next chapter starts here."
    : isRecovery
      ? "Use your registered email address to begin recovering access to your account."
      : "Sign in and continue your reading journey. Your next story is waiting.";

  return (
    <div className="app-shell" data-theme={darkMode ? "dark" : "light"}>
      <header className="top-nav">
        <strong className="brand-name">BTECH Library</strong>
        <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
      </header>

      {isDashboard ? (
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      ) : (
        <div
          className={`app-card-wrapper ${
            isRegister ? "register-mode" : "login-mode"
          }`}
        >
          <div className="login-card">
            <div className="auth-page-container">
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Routes>
            </div>
          </div>

          <div className="multi-card">
            <div className="welcome-content">
              <div className="welcome-logo">
                <img src={logo} alt="BTECH Library logo" />
              </div>

              <h1 className="welcome-title">
                Aklatan ng <span>Dalubhasaan</span>
              </h1>

              <div className="welcome-divider" />

              <div key={welcomeLabel} className="welcome-message">
                <span className="welcome-label">{welcomeLabel}</span>
                <h2>{welcomeHeading}</h2>
                <p>{welcomeText}</p>
              </div>

              <div className="welcome-dots" aria-hidden="true">
                <span />
                <span className="active" />
                <span />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EmailPolicyTooltip from "../components/EmailPolicyTooltip.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import { useAuth } from "../context/useAuth.js";
import "./Auth.css";
import useRateLock, { formatCountdown } from "../hooks/useRateLock.js";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [fieldError, setFieldError] = useState(null);
  const [shakeFields, setShakeFields] = useState([]);
  const [btnShake, setBtnShake] = useState(false);
  const [btnState, setBtnState] = useState("");
  const [busy, setBusy] = useState(false);
  const { locked, retrySeconds, startLockdown } = useRateLock();
  const shakeTimer = useRef(null);
  const messageTimer = useRef(null);

  function showError(fields, message) {
    clearTimeout(shakeTimer.current);
    clearTimeout(messageTimer.current);

    setFieldError({ fields, message });
    setShakeFields(fields);
    setBtnShake(true);
    setBtnState("error");

    shakeTimer.current = setTimeout(() => {
      setShakeFields([]);
      setBtnShake(false);
    }, 600);

    messageTimer.current = setTimeout(() => {
      setFieldError(null);
      setBtnState("");
    }, 3000);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (locked) return;

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email && !password) {
      showError(["email", "password"], "Enter your account");
      return;
    }

    if (!email) {
      showError(["email"], "Enter your email");
      return;
    }

    if (!password) {
      showError(["password"], "Enter your password");
      return;
    }

    clearTimeout(shakeTimer.current);
    clearTimeout(messageTimer.current);
    setFieldError(null);
    setBtnState("");
    setBusy(true);

    try {
      await login(email, password);
      setBtnState("success");
      setTimeout(() => navigate("/dashboard"), 600);
    } catch (err) {
      const text = err.message.toLowerCase();

      let fields = [];

      if (text.includes("banned")) {
        fields = ["email", "password"];
      } else if (text.includes("enter your account")) {
        fields = ["email", "password"];
      } else if (text.includes("email")) {
        fields = ["email"];
      } else if (text.includes("password")) {
        fields = ["password"];
      }

      showError(fields, err.message);

      if (err.status === 429) {
        startLockdown(err.retryAfter > 0 ? err.retryAfter : 900);
      }

      setBusy(false);
    }
  }

  return (
    <section className="auth-view login-view">
      <div className="auth-heading">
        <span className="auth-eyebrow">MEMBER ACCESS</span>
        <h1>Sign in</h1>
        <p>Enter your account details to continue your reading journey.</p>
      </div>

      <div className="auth-form-frame">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div
            className={`auth-field${fieldError?.fields?.includes("email") ? " auth-has-error" : ""}${
              shakeFields.includes("email") ? " auth-shake" : ""
            }`}
          >
            <div className="auth-field-header">
              <label htmlFor="login-email">Email address</label>
              <EmailPolicyTooltip />
            </div>

            <input
              id="login-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={locked}
            />
          </div>

          <div
            className={`auth-field${fieldError?.fields?.includes("password") ? " auth-has-error" : ""}${
              shakeFields.includes("password") ? " auth-shake" : ""
            }`}
          >
            <label htmlFor="login-password">Password</label>
            <PasswordInput
              id="login-password"
              name="password"
              placeholder="Library@2026"
              autoComplete="current-password"
              required
              disabled={locked}
            />
          </div>

          <button
            className={`auth-submit${locked || btnState === "error" ? " btn-error" : ""}${
              btnState === "success" ? " btn-success" : ""
            }${btnShake ? " btn-shake" : ""}`}
            type="submit"
            disabled={busy || locked}
          >
            {locked
              ? `Too many attempts. Retry in ${formatCountdown(retrySeconds)}`
              : btnState === "success"
                ? "Success"
                : busy
                  ? "Signing in..."
                  : btnState === "error" && fieldError
                    ? fieldError.message
                    : "Sign in"}
          </button>

          <div className="auth-account-options">
            <p>Need help signing in, or new to the library?</p>

            <div className="auth-account-actions">
              <Link className="auth-account-link" to="/forgot-password">
                Recover account
              </Link>

              <Link
                className="auth-account-link auth-account-link-primary"
                to="/register"
              >
                Create account
              </Link>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

export default Login;

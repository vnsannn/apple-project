import { Link } from "react-router-dom";
import EmailPolicyTooltip from "../components/EmailPolicyTooltip.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import "./Auth.css";

function Login() {
  function handleSubmit(event) {
    event.preventDefault();

    // Login API logic will go here later.
  }

  return (
    <section className="auth-view login-view">
      <div className="auth-heading">
        <span className="auth-eyebrow">MEMBER ACCESS</span>
        <h1>Sign in</h1>
        <p>Enter your account details to continue your reading journey.</p>
      </div>

      <div className="auth-form-frame">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
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
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <PasswordInput
              id="login-password"
              name="password"
              placeholder="Library@2026"
              autoComplete="current-password"
              required
            />
          </div>

          <button className="auth-submit" type="submit">
            Sign in
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

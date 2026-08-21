import { Link } from "react-router-dom";
import "./Auth.css";

function ForgotPassword() {
  function handleSubmit(event) {
    event.preventDefault();

    // Password recovery API logic will go here later.
  }

  return (
    <section className="auth-view recovery-view">
      <div className="auth-heading">
        <span className="auth-eyebrow">ACCOUNT RECOVERY</span>
        <h1>Recover your account</h1>
        <p>Enter your email address and we will help you regain access.</p>
      </div>

      <div className="auth-form-frame">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="recovery-email">Email address</label>
            <input
              id="recovery-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <button className="auth-submit" type="submit">
            Send recovery instructions
          </button>

          <div className="auth-account-options">
            <p>Remembered your account details?</p>

            <div className="auth-account-actions auth-account-actions-single">
              <Link className="auth-account-link" to="/login">
                Return to sign in
              </Link>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

export default ForgotPassword;

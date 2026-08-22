import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EmailPolicyTooltip from "../components/EmailPolicyTooltip.jsx";
import InfoTooltip from "../components/InfoTooltip.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import { useAuth } from "../context/useAuth.js";
import "./Auth.css";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const form = Object.fromEntries(formData.entries());

    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);

    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-view register-view">
      <div className="auth-heading">
        <span className="auth-eyebrow">NEW BORROWER ACCOUNT</span>
        <h1>Create an account</h1>
        <p>Tell us who you are to begin your library journey.</p>
      </div>

      <div className="auth-form-frame">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="register-first-name">First name</label>
            <input
              id="register-first-name"
              name="firstName"
              type="text"
              placeholder="Juan"
              autoComplete="given-name"
              required
            />
          </div>

          <div className="auth-two-column">
            <div className="auth-field">
              <div className="auth-field-header">
                <label htmlFor="register-middle-name">Middle name</label>
                <InfoTooltip label="About middle name">
                  Optional. If provided, your complete middle name can be shown
                  in full or shortened to its first initial.
                </InfoTooltip>
              </div>

              <input
                id="register-middle-name"
                name="middleName"
                type="text"
                placeholder="Santos"
                autoComplete="additional-name"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-last-name">Last name</label>
              <input
                id="register-last-name"
                name="lastName"
                type="text"
                placeholder="Dela Cruz"
                autoComplete="family-name"
                required
              />
            </div>
          </div>

          <div className="auth-two-column">
            <div className="auth-field">
              <div className="auth-field-header">
                <label htmlFor="register-email">Email address</label>
                <EmailPolicyTooltip />
              </div>

              <input
                id="register-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <div className="auth-field-header">
                <label htmlFor="register-phone">Phone number</label>
                <InfoTooltip label="About phone number">
                  Optional. It may later be used for important notices and
                  account recovery.
                </InfoTooltip>
              </div>

              <input
                id="register-phone"
                name="phone"
                type="tel"
                placeholder="+63 912 345 6789"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>
          </div>

          <div className="auth-two-column">
            <div className="auth-field">
              <label htmlFor="register-password">Password</label>
              <PasswordInput
                id="register-password"
                name="password"
                placeholder="Library@2026"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-confirm-password">
                Confirm password
              </label>
              <PasswordInput
                id="register-confirm-password"
                name="confirmPassword"
                placeholder="Library@2026"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>

          {error && (
            <p className="auth-form-error" role="alert">
              {error}
            </p>
          )}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Creating account..." : "Create account"}
          </button>

          <div className="auth-account-options">
            <p>Already registered?</p>

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

export default Register;

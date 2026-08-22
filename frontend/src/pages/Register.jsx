import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EmailPolicyTooltip from "../components/EmailPolicyTooltip.jsx";
import InfoTooltip from "../components/InfoTooltip.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import { useAuth } from "../context/useAuth.js";
import useRateLock, { formatCountdown } from "../hooks/useRateLock.js";
import "./Auth.css";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { locked, retrySeconds, startLockdown } = useRateLock();
  const [fieldError, setFieldError] = useState(null);
  const [shakeFields, setShakeFields] = useState([]);
  const [btnShake, setBtnShake] = useState(false);
  const [btnState, setBtnState] = useState("");
  const [busy, setBusy] = useState(false);

  const shakeTimer = useRef(null);
  const messageTimer = useRef(null);

  function fieldClass(name) {
    return `auth-field${fieldError?.fields?.includes(name) ? " auth-has-error" : ""}${
      shakeFields.includes(name) ? " auth-shake" : ""
    }`;
  }

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

  function isValidPhone(raw) {
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = digits.slice(1);
    return /^9\d{9}$/.test(digits);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (locked) return;

    const form = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    const hasFirst = Boolean(form.firstName?.trim());
    const hasLast = Boolean(form.lastName?.trim());
    const hasEmail = Boolean(form.email?.trim());
    const hasPassword = Boolean(form.password);

    clearTimeout(shakeTimer.current);
    clearTimeout(messageTimer.current);
    setFieldError(null);
    setBtnState("");

    // 0. Nothing but optional middle + phone filled
    if (
      !hasFirst &&
      !hasLast &&
      !hasEmail &&
      !hasPassword &&
      !form.confirmPassword
    ) {
      showError(
        ["firstName", "lastName", "email", "password", "confirmPassword"],
        "Enter your info",
      );
      return;
    }

    // 1. Required empties, in form order
    if (!hasFirst) {
      showError(["firstName"], "Enter first name");
      return;
    }
    if (!hasLast) {
      showError(["lastName"], "Enter last name");
      return;
    }
    if (!hasEmail) {
      showError(["email"], "Enter email");
      return;
    }

    // 2. Email shape — judged BEFORE phone
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email?.trim())) {
      showError(["email"], "Invalid email format");
      return;
    }

    // 3. Phone is optional, only judged when typed
    if (form.phone?.trim() && !isValidPhone(form.phone)) {
      showError(["phone"], "Invalid phone number");
      return;
    }

    // 4. Password block
    if (!hasPassword) {
      showError(["password"], "Enter password");
      return;
    }
    if (!form.confirmPassword) {
      showError(["confirmPassword"], "Enter confirm password");
      return;
    }
    if (form.password !== form.confirmPassword) {
      showError(["confirmPassword"], "Password does not match");
      return;
    }

    setBusy(true);
    try {
      await register(form);
      setBtnState("success");
      setTimeout(() => navigate("/dashboard"), 600);
    } catch (err) {
      const text = err.message.toLowerCase();
      let fields = [];
      if (text.includes("first name")) {
        fields = ["firstName"];
      } else if (text.includes("last name")) {
        fields = ["lastName"];
      } else if (text.includes("phone")) {
        fields = ["phone"];
      } else if (
        text.includes("password too short") ||
        text.includes("enter password")
      ) {
        fields = ["password"];
      } else if (text.includes("email")) {
        fields = ["email"];
      }
      showError(fields, err.message);
      if (err.status === 429) {
        startLockdown(err.retryAfter > 0 ? err.retryAfter : 900);
      }
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
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className={fieldClass("firstName")}>
            <label htmlFor="register-first-name">First name</label>
            <input
              id="register-first-name"
              name="firstName"
              type="text"
              placeholder="Juan"
              autoComplete="given-name"
              required
              disabled={locked}
            />
          </div>

          <div className="auth-two-column">
            <div className={fieldClass("middleName")}>
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
                disabled={locked}
              />
            </div>
            <div className={fieldClass("lastName")}>
              <label htmlFor="register-last-name">Last name</label>
              <input
                id="register-last-name"
                name="lastName"
                type="text"
                placeholder="Dela Cruz"
                autoComplete="family-name"
                required
                disabled={locked}
              />
            </div>
          </div>

          <div className="auth-two-column">
            <div className={fieldClass("email")}>
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
                disabled={locked}
              />
            </div>
            <div className={fieldClass("phone")}>
              <div className="auth-field-header">
                <label htmlFor="register-phone">Phone number</label>
                <InfoTooltip label="About phone number">
                  Optional. It can be used as another means of account recovery.
                </InfoTooltip>
              </div>
              <div className="phone-input-wrap">
                <span className="phone-prefix" aria-hidden="true">
                  +63
                </span>
                <input
                  id="register-phone"
                  name="phone"
                  type="tel"
                  placeholder="912 345 6789"
                  autoComplete="tel-national"
                  inputMode="numeric"
                  maxLength={13}
                  disabled={locked}
                />
              </div>
            </div>
          </div>

          <div className="auth-two-column">
            <div className={fieldClass("password")}>
              <label htmlFor="register-password">Password</label>
              <PasswordInput
                id="register-password"
                name="password"
                placeholder="Library@2026"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={locked}
              />
            </div>
            <div className={fieldClass("confirmPassword")}>
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
                disabled={locked}
              />
            </div>
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
                  ? "Creating account..."
                  : btnState === "error" && fieldError
                    ? fieldError.message
                    : "Create account"}
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

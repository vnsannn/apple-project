import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import InfoTooltip from "../components/InfoTooltip.jsx";
import OtpInput from "../components/OtpInput.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import { request } from "../api/client.js";
import useRateLock, { formatCountdown } from "../hooks/useRateLock.js";
import "./Auth.css";

const RESEND_COOLDOWN_S = 60;

function ForgotPassword() {
  const navigate = useNavigate();
  const { locked, retrySeconds, startLockdown } = useRateLock();

  const [step, setStep] = useState("email"); // email -> code -> done
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState(null);
  const [shakeFields, setShakeFields] = useState([]);
  const [btnShake, setBtnShake] = useState(false);
  const [btnState, setBtnState] = useState("");
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [code, setCode] = useState("");
  const [verifyState, setVerifyState] = useState("idle"); // idle | success | error
  const [verifyShake, setVerifyShake] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const shakeTimer = useRef(null);
  const messageTimer = useRef(null);

  // Resend cooldown countdown (the backend enforces 1-per-minute too).
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

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

  function fieldClass(name) {
    return `auth-field${fieldError?.fields?.includes(name) ? " auth-has-error" : ""}${
      shakeFields.includes(name) ? " auth-shake" : ""
    }`;
  }

  // Takes the email as an argument (NOT the state) so the first click after
  // typing works — the state hasn't flushed yet on the first submit.
  async function sendCode(emailToUse) {
    const data = await request("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailToUse }),
    });
    setDevCode(data.devCode || "");
    setResendIn(RESEND_COOLDOWN_S);
    return data;
  }

  async function handleRequestCode(event) {
    event.preventDefault();
    if (locked) return;

    const rawEmail = new FormData(event.currentTarget).get("email");
    const cleanEmail = String(rawEmail || "").trim().toLowerCase();

    if (!cleanEmail) {
      showError(["email"], "Enter your email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showError(["email"], "Invalid email");
      return;
    }

    clearTimeout(shakeTimer.current);
    clearTimeout(messageTimer.current);
    setFieldError(null);
    setBtnState("");
    setBusy(true);

    try {
      setEmail(cleanEmail);
      await sendCode(cleanEmail);
      setBtnState("success");
      setTimeout(() => {
        setBtnState("");
        setFieldError(null);
        setStep("code");
      }, 600);
    } catch (err) {
      showError(["email"], err.message);
      if (err.status === 429) {
        startLockdown(err.retryAfter > 0 ? err.retryAfter : 900);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0 || busy) return;
    clearTimeout(shakeTimer.current);
    clearTimeout(messageTimer.current);
    setFieldError(null);
    setBtnState("");
    setCode("");
    setVerifyState("idle");
    setBusy(true);
    try {
      await sendCode(email);
    } catch (err) {
      showError(["code"], err.message);
      if (err.status === 429) {
        startLockdown(err.retryAfter > 0 ? err.retryAfter : 900);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(event) {
    event.preventDefault();
    if (locked) return;

    const form = new FormData(event.currentTarget);
    const codeVal = (code || "").trim();
    const password = form.get("newPassword");
    const confirm = form.get("confirmPassword");

    clearTimeout(shakeTimer.current);
    clearTimeout(messageTimer.current);
    setFieldError(null);
    setBtnState("");

    // No code entered (or incomplete): shake the button AND the code boxes.
    if (!codeVal) {
      setVerifyShake(true);
      setBtnShake(true);
      setTimeout(() => {
        setVerifyShake(false);
        setBtnShake(false);
      }, 600);
      showError(["code"], "Enter your code");
      return;
    }

    if (!password) {
      showError(["newPassword"], "Enter a new password");
      return;
    }
    if (String(password).length < 8) {
      showError(["newPassword"], "Password too short");
      return;
    }
    if (!confirm) {
      showError(["confirmPassword"], "Confirm your new password");
      return;
    }
    if (password !== confirm) {
      showError(["confirmPassword"], "Password does not match");
      return;
    }

    setBusy(true);
    setVerifyState("idle");
    try {
      await request("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codeVal, newPassword: password }),
      });
      setVerifyState("success");
      setBtnState("success");
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      const text = err.message.toLowerCase();
      let fields = [];
      const isCodeError = text.includes("code") || text.includes("invalid");
      if (isCodeError) {
        // Wrong code (already turned red on completion): shake too.
        setVerifyState("error");
        setVerifyShake(true);
        setBtnShake(true);
        setTimeout(() => {
          setCode("");
          setVerifyState("idle");
          setVerifyShake(false);
          setBtnShake(false);
        }, 1000);
        showError(["code"], "Invalid code");
      } else {
        if (text.includes("password")) fields = ["newPassword"];
        else if (text.includes("email")) fields = ["email"];
        showError(fields, err.message);
      }
      if (err.status === 429) {
        startLockdown(err.retryAfter > 0 ? err.retryAfter : 900);
      }
    } finally {
      setBusy(false);
    }
  }

  function onCodeChange(value) {
    setCode(value);
    setVerifyState("idle");
    setVerifyShake(false);
  }

  // Telegram-style: when all 6 digits are typed, verify against the server and
  // color the boxes green (correct) or red (wrong), left to right. No shake here.
  async function onCodeComplete(fullCode) {
    setVerifyShake(false);
    try {
      const data = await request("/api/v1/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });
      if (data.valid) {
        setVerifyState("success");
      } else {
        setVerifyState("error");
      }
    } catch {
      // Network/parse hiccup — leave boxes idle; the submit still enforces.
      setVerifyState("idle");
    }
  }

  const refreshLabel =
    resendIn > 0
      ? `${resendIn}s`
      : null;

  return (
    <section className="auth-view recovery-view">
      <div className="auth-heading">
        <span className="auth-eyebrow">ACCOUNT RECOVERY</span>
        <h1>Recover your account</h1>
        <p>Enter your registered email, then use the code we send you to set a new password.</p>
      </div>

      <div className="auth-form-frame">
        {step === "email" ? (
          <form className="auth-form" onSubmit={handleRequestCode} noValidate>
            <div className={fieldClass("email")}>
              <div className="auth-field-header">
                <label htmlFor="recovery-email">Email address</label>
                <InfoTooltip label="About account recovery">
                  For security, we don't reveal whether an email is registered.
                  If the email belongs to an account, a reset code will be sent to it.
                </InfoTooltip>
              </div>
              <input
                id="recovery-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
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
                : busy
                  ? "Sending..."
                  : btnState === "error" && fieldError
                    ? fieldError.message
                    : "Send recovery code"}
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
        ) : (
          <form className="auth-form" onSubmit={handleReset} noValidate>
            {devCode ? (
              <p className="recovery-notice">
                Dev code: <strong className="recovery-devcode">{devCode}</strong>
              </p>
            ) : (
              <p className="recovery-notice">
                A code was sent to <strong>{email}</strong>, please check your inbox.
              </p>
            )}

            <div className={fieldClass("code")}>
              <div className="auth-field-header">
                <label htmlFor="recovery-code">Reset code</label>
                <InfoTooltip label="About the reset code">
                  Enter the 6-digit code from your email. Didn't receive a code?
                  Use the refresh button to resend it (max one per minute).
                </InfoTooltip>
              </div>
              <OtpInput
                name="code"
                length={6}
                value={code}
                onChange={onCodeChange}
                onComplete={onCodeComplete}
                disabled={locked}
                verifyState={verifyState}
                verifyShake={verifyShake}
                trailing={
                  <button
                    type="button"
                    className="otp-refresh"
                    onClick={handleResend}
                    disabled={resendIn > 0 || busy}
                    aria-label="Resend code"
                    title="Resend code"
                  >
                    {refreshLabel ? (
                      <span className="otp-refresh-count">{refreshLabel}</span>
                    ) : (
                      <RefreshCw size={20} strokeWidth={2} />
                    )}
                  </button>
                }
              />
            </div>

            <div className={fieldClass("newPassword")}>
              <label htmlFor="recovery-new-password">New password</label>
              <PasswordInput
                id="recovery-new-password"
                name="newPassword"
                placeholder="Library@2026"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={locked}
              />
            </div>

            <div className={fieldClass("confirmPassword")}>
              <label htmlFor="recovery-confirm-password">Confirm new password</label>
              <PasswordInput
                id="recovery-confirm-password"
                name="confirmPassword"
                placeholder="Library@2026"
                autoComplete="new-password"
                minLength={8}
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
                : busy
                  ? "Resetting..."
                  : btnState === "error" && fieldError
                    ? fieldError.message
                    : "Set new password"}
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
        )}
      </div>
    </section>
  );
}

export default ForgotPassword;

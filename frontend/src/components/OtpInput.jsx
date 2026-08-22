import { useRef } from "react";

// Telegram/GCash-style one-time-code input: N single-character boxes with
// auto-advance, backspace-to-go-back, paste support, and digit-only input.
// `trailing` lets you append a 7th "box" (e.g. a resend button).
// `verifyState` ("success" | "error") animates the boxes green/red, left to right.
function OtpInput({
  name,
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  verifyState = "idle",
  verifyShake = false,
  trailing = null,
}) {
  const refs = useRef([]);

  const digits = Array.from({ length }, (_, i) =>
    String(value || "")[i] || "",
  );

  function handleChange(index, event) {
    const ch = event.target.value.replace(/\D/g, "").slice(-1);
    const next = String(value || "").split("");
    next[index] = ch;
    const joined = next.join("").slice(0, length);
    onChange(joined);

    if (joined.length === length && onComplete) {
      onComplete(joined);
    }

    if (ch && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = String(value || "").split("");
      next[index - 1] = "";
      onChange(next.join(""));
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event, index) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;

    const next = String(value || "").split("");
    for (let i = 0; i < pasted.length; i++) {
      if (index + i < length) next[index + i] = pasted[i];
    }
    onChange(next.join(""));

    const lastFilled = Math.min(index + pasted.length, length - 1);
    refs.current[lastFilled]?.focus();
  }

  const verifyClass =
    verifyState === "success"
      ? " otp-success"
      : verifyState === "error"
        ? " otp-error"
        : "";

  return (
    <div className={`otp-input${verifyShake ? " otp-shake" : ""}`}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digits[i]}
          disabled={disabled}
          style={{ "--i": i }}
          aria-label={`Digit ${i + 1}`}
          className={`otp-box${verifyClass}`}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(e, i)}
          onFocus={(e) => e.target.select()}
        />
      ))}
      {trailing}
      <input type="hidden" name={name} value={value || ""} readOnly />
    </div>
  );
}

export default OtpInput;

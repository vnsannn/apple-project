import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function PasswordInput({
  id,
  name,
  placeholder,
  autoComplete,
  minLength,
  required = false,
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        id={id}
        name={name}
        type={isVisible ? "text" : "password"}
        placeholder={isVisible ? placeholder : "••••••••••••"}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
      />

      <button
        className="password-visibility-toggle"
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
      >
        {isVisible ? (
          <EyeOff size={17} strokeWidth={2} />
        ) : (
          <Eye size={17} strokeWidth={2} />
        )}
      </button>
    </div>
  );
}

export default PasswordInput;

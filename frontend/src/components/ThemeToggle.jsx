import { Moon, Sun } from "lucide-react";

function ThemeToggle({ darkMode, onToggle }) {
  const label = darkMode ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      id="darkLight"
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {darkMode ? (
        <Sun size={24} strokeWidth={2} />
      ) : (
        <Moon size={24} strokeWidth={2} />
      )}
    </button>
  );
}

export default ThemeToggle;

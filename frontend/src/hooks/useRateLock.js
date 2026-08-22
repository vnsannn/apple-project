import { useEffect, useState } from "react";
import { API_URL } from "../api/client.js";

const RETRY_KEY = "slims_retry_until";

function getRemainingSeconds() {
  const until = Number(localStorage.getItem(RETRY_KEY));
  if (!until || until <= Date.now()) {
    localStorage.removeItem(RETRY_KEY);
    return 0;
  }
  return Math.ceil((until - Date.now()) / 1000);
}

function useRateLock() {
  const [retrySeconds, setRetrySeconds] = useState(getRemainingSeconds);
  const locked = retrySeconds > 0;

  // One-shot probe: is the server still blocking us?
  useEffect(() => {
    if (getRemainingSeconds() <= 0) return undefined;

    const controller = new AbortController();

    fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: controller.signal,
    })
      .then((res) => {
        if (res.ok || res.status === 400) {
          localStorage.removeItem(RETRY_KEY);
          setRetrySeconds(0);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  // Countdown ticker
  useEffect(() => {
    if (retrySeconds <= 0) {
      localStorage.removeItem(RETRY_KEY);
      return undefined;
    }

    const timer = setTimeout(
      () => setRetrySeconds((s) => Math.max(0, s - 1)),
      1000,
    );

    return () => clearTimeout(timer);
  }, [retrySeconds]);

  function startLockdown(seconds) {
    localStorage.setItem(RETRY_KEY, String(Date.now() + seconds * 1000));
    setRetrySeconds(seconds);
  }

  return { locked, retrySeconds, startLockdown };
}

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default useRateLock;
export { formatCountdown };

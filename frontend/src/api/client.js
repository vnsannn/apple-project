const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, options);

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || "Request failed");
    error.status = res.status;
    error.retryAfter = Number(res.headers.get("Retry-After")) || 0;
    throw error;
  }

  return data;
}

function withAuth(token, options = {}) {
  return {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  };
}

export { API_URL, request, withAuth };

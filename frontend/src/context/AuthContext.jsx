import { request } from "../api/client.js";
import { useEffect, useState } from "react";
import { AuthContext } from "./useAuth.js";

// Decode a JWT payload. JWTs use URL-safe base64 ("-" and "_" instead of "+"
// and "/"), which a browser's `atob` rejects. Normalize to standard base64,
// pad, then decode to UTF-8. Returns the parsed payload object.
function decodeJwtPayload(token) {
  const b64 = String(token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bytes = atob(padded);
  const json = new TextDecoder().decode(
    new Uint8Array(Array.from(bytes, (c) => c.charCodeAt(0))),
  );
  return JSON.parse(json);
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("slims_token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("slims_user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem("slims_token", token);
    else localStorage.removeItem("slims_token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("slims_user", JSON.stringify(user));
    else localStorage.removeItem("slims_user");
  }, [user]);

  async function login(email, password) {
    const data = await request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const payload = decodeJwtPayload(data.token);

    setToken(data.token);
    setUser({ id: payload.id, email: payload.email, role: payload.role });

    return data.token;
  }

  async function register(form) {
    await request("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName || undefined,
        phone: form.phone || undefined,
      }),
    });

    await login(form.email, form.password);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };

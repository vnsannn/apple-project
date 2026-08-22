import { createContext, useContext, useEffect, useState } from "react";
import { request } from "../api/client.js";

const AuthContext = createContext(null);

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

    const payload = JSON.parse(atob(data.token.split(".")[1]));

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

function useAuth() {
  return useContext(AuthContext);
}

export { AuthProvider, useAuth };

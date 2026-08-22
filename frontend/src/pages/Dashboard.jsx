import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <p>
        Signed in as <strong>{user ? user.email : "?"}</strong>
        {user ? ` (${user.role})` : ""}
      </p>
      <button type="button" onClick={handleLogout}>
        Log out
      </button>
    </main>
  );
}

export default Dashboard;
import { useAuth } from "../context/useAuth.js";

function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <main>
      <h1>Dashboard</h1>
      <p>
        Signed in as <strong>{user ? user.email : "?"}</strong>
        {user ? ` (${user.role})` : ""}
      </p>
      <button type="button" onClick={logout}>
        Log out
      </button>
    </main>
  );
}

export default Dashboard;
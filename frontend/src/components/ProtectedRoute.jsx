import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";

function ProtectedRoute() {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;

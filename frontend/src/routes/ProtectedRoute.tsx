import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    isAuthLoading,
  } = useAuth();

  /*
   * Authentication is still being restored.
   *
   * DO NOT redirect to /login yet.
   *
   * This is the important part that fixes the first-load
   * authentication race condition.
   */
  if (isAuthLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f4f6",
          color: "#374151",
          fontSize: "18px",
          fontWeight: 500,
        }}
      >
        Loading Glisen ERP...
      </div>
    );
  }

  /*
   * Authentication check is complete.
   *
   * Only now are we allowed to redirect an unauthenticated
   * user to the login page.
   */
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  /*
   * User is authenticated.
   */
  return <>{children}</>;
}
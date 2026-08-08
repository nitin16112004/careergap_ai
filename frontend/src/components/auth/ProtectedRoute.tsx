import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/use-auth";
import { FullPageLoader } from "../layout/FullPageLoader";

export const ProtectedRoute = (): JSX.Element => {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader label="Restoring your secure session..." />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <Outlet />;
};

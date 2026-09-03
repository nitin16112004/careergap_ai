import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/use-auth";
import { FullPageLoader } from "../layout/FullPageLoader";

export const ProtectedRoute = (): JSX.Element => {
  const { loading, user, profile } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader label="Restoring your secure session..." />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />;

  const isOnboardingRoute = location.pathname.startsWith("/onboarding");
  const isAdminRoute = location.pathname.startsWith("/admin");
  const emailVerified = Boolean(user.email_confirmed_at || profile?.email_verified);

  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  if (profile && !profile.onboarding_completed && !isOnboardingRoute) return <Navigate to="/onboarding/upload-resume" replace />;
  if (isAdminRoute && profile?.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
};

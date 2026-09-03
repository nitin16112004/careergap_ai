import { useEffect, type PropsWithChildren } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/use-auth";

const destinationFor = (role: string | undefined, onboardingCompleted: boolean | undefined): string => {
  if (role === "admin") return "/admin";
  return onboardingCompleted ? "/dashboard" : "/onboarding/upload-resume";
};

export const SessionHandler = ({ children }: PropsWithChildren): JSX.Element => {
  const { loading, user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    const path = location.pathname;
    const authEntry = path === "/login" || path === "/signup";
    const emailVerified = Boolean(user.email_confirmed_at || profile?.email_verified);
    if ((authEntry || path === "/verify-email") && !emailVerified && path !== "/verify-email") {
      navigate("/verify-email", { replace: true });
      return;
    }
    if (authEntry && emailVerified) {
      const redirect = new URLSearchParams(location.search).get("redirect");
      navigate(redirect || destinationFor(profile?.role, profile?.onboarding_completed), { replace: true });
    }
  }, [loading, location.pathname, location.search, navigate, profile, user]);

  return <>{children}</>;
};

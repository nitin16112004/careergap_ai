import { ArrowRight, Compass, LogOut, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthProgress } from "../components/auth/AuthProgress";
import { Button } from "../components/auth/Button";
import { useAuth } from "../hooks/use-auth";

export const AuthNextStepPage = (): JSX.Element => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const isAdmin = location.pathname.startsWith("/admin");
  return (
    <AuthCard eyebrow={isAdmin ? "Admin access prepared" : "Step 3 of 3"} title={isAdmin ? "Your admin workspace is next" : "Your career workspace is ready"} subtitle={isAdmin ? "Admin tools will be added in the admin phase." : "Authentication is complete. Resume-first onboarding is the next product phase."}>
      {!isAdmin && <AuthProgress activeStep={3} />}
      <div className="next-step-panel"><span className="next-step-icon"><Sparkles size={25} /></span><div><h2>{profile?.full_name ? `Welcome, ${profile.full_name.split(" ")[0]}.` : "Welcome to CareerGuid AI."}</h2><p>{user?.email} is securely connected. Your next action will be to add a resume and let the platform map your strengths.</p></div></div>
      <div className="next-step-actions">
        {!isAdmin && <Link to="/onboarding/upload-resume" className="button button-primary">Continue when onboarding is available <ArrowRight size={16} /></Link>}
        {!isAdmin && <Link to="/roadmap" className="button button-secondary">Open roadmap</Link>}
        <Button variant="secondary" onClick={() => { void signOut(); }}><LogOut size={16} /> Sign out</Button>
      </div>
      <p className="scope-note"><Compass size={14} /> No resume, dashboard, AI, or payment features are activated in this authentication release.</p>
    </AuthCard>
  );
};

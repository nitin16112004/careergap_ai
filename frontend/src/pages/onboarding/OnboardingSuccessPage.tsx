import { ArrowRight, CheckCircle2, LayoutDashboard, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";

export const OnboardingSuccessPage = (): JSX.Element => (
  <AuthCard className="onboarding-card onboarding-success-card" eyebrow="Profile ready" title="Your career profile is complete" subtitle="Your verified profile is now ready to power skill-gap analysis, roadmap planning, progress tracking, and ATS resume improvements.">
    <div className="success-hero-icon"><CheckCircle2 size={34} aria-hidden="true" /></div>
    <div className="onboarding-next-grid">
      <Link className="next-step-card next-step-primary" to="/skill-gap">
        <Target size={22} />
        <div><strong>Analyze your skill gap</strong><span>Compare your current skills with a target role and get a prioritized learning order.</span></div>
        <ArrowRight size={18} />
      </Link>
      <Link className="next-step-card" to="/dashboard">
        <LayoutDashboard size={22} />
        <div><strong>Open dashboard</strong><span>See your profile completion, career readiness, roadmap progress, and next actions.</span></div>
        <ArrowRight size={18} />
      </Link>
    </div>
  </AuthCard>
);

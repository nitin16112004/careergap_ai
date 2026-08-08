import { ArrowUpRight, BrainCircuit, ShieldCheck, Sparkles } from "lucide-react";
import { Outlet } from "react-router-dom";
import { AnimatedBackground } from "../auth/AnimatedBackground";
import { Logo } from "../auth/Logo";

const features = [
  { icon: BrainCircuit, label: "AI-guided career clarity" },
  { icon: ShieldCheck, label: "Private by design with Supabase Auth" },
  { icon: Sparkles, label: "A roadmap built around your goals" },
];

export const AuthLayout = (): JSX.Element => (
  <main className="auth-page-shell">
    <section className="auth-brand-panel">
      <AnimatedBackground />
      <div className="brand-panel-content">
        <Logo />
        <div className="brand-message">
          <span className="brand-kicker"><span className="status-dot" /> AI career intelligence</span>
          <h2>Turn experience into your <em>next advantage.</em></h2>
          <p>CareerGuid AI helps you see the gap, build the plan, and move forward with confidence.</p>
          <div className="brand-features">
            {features.map(({ icon: Icon, label }) => <div className="brand-feature" key={label}><span><Icon size={16} /></span>{label}<ArrowUpRight size={14} /></div>)}
          </div>
        </div>
        <p className="brand-footnote">Built for ambitious learners, builders, and career switchers.</p>
      </div>
    </section>
    <section className="auth-form-panel">
      <div className="mobile-brand"><Logo /></div>
      <Outlet />
      <p className="security-note"><ShieldCheck size={13} /> Your session is protected by Supabase Auth</p>
    </section>
  </main>
);

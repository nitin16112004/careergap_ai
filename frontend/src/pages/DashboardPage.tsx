import { ArrowRight, BarChart3, CheckCircle2, CircleDashed, FileText, Map, Target, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthCard } from "../components/auth/AuthCard";
import { ErrorMessage } from "../components/auth/FeedbackMessage";
import { dashboardService, type DashboardSummary } from "../services/dashboard.service";

const toArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const toNumber = (value: unknown): number => typeof value === "number" && Number.isFinite(value) ? value : 0;
const toText = (value: unknown, fallback = "Not set"): string => typeof value === "string" && value.trim() ? value : fallback;

export const DashboardPage = (): JSX.Element => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void dashboardService.summary()
      .then((data) => { if (active) setSummary(data); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load your dashboard."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const nextAction = useMemo(() => {
    if (!summary) return { to: "/skill-gap", label: "Analyze skill gap" };
    if (!summary.skillAnalysis) return { to: "/skill-gap", label: "Analyze skill gap" };
    if (!summary.roadmap) return { to: "/skill-gap", label: "Build your roadmap" };
    if (summary.pendingTasks > 0) return { to: "/roadmap", label: "Continue roadmap" };
    return { to: "/resume-builder", label: "Improve ATS resume" };
  }, [summary]);

  if (loading) return <AuthCard className="onboarding-card" eyebrow="Career workspace" title="Loading your dashboard" subtitle="Bringing together your profile, skill analysis, roadmap, and resume progress."><div className="review-loading"><CircleDashed className="spin-icon" size={18} /> Loading career progress...</div></AuthCard>;

  if (!summary) return <AuthCard className="onboarding-card" eyebrow="Career workspace" title="Dashboard unavailable" subtitle="We could not load your career workspace."><ErrorMessage>{error || "Please try again."}</ErrorMessage></AuthCard>;

  const profile = summary.profile;
  const analysis = summary.skillAnalysis;
  const roadmap = summary.roadmap;
  const generatedResume = summary.generatedResume;
  const missingSkills = toArray(analysis?.missing_skills);
  const roadmapProgress = toNumber(roadmap?.progress_percentage);
  const displayName = toText(profile.full_name, "there").split(" ")[0];

  return (
    <AuthCard className="onboarding-card dashboard-card" eyebrow="Career workspace" title={`Welcome, ${displayName}`} subtitle="Everything here is based on the profile and progress stored in your account—not demo data.">
      <ErrorMessage>{error}</ErrorMessage>

      <div className="dashboard-hero-row">
        <div>
          <span className="eyebrow">Recommended next step</span>
          <h2>{nextAction.label}</h2>
          <p>Keep moving through the documented career flow one useful action at a time.</p>
        </div>
        <Link className="button button-primary" to={nextAction.to}>{nextAction.label} <ArrowRight size={16} /></Link>
      </div>

      <div className="dashboard-metrics-grid">
        <article className="career-metric-card"><UserRound size={19} /><span>Profile completion</span><strong>{summary.profileCompletion}%</strong><progress max="100" value={summary.profileCompletion} /></article>
        <article className="career-metric-card"><Target size={19} /><span>Target role</span><strong className="metric-text">{toText(profile.target_job_role)}</strong><p>{toText(profile.work_preference, "Preference not set")}</p></article>
        <article className="career-metric-card"><BarChart3 size={19} /><span>Skill match</span><strong>{analysis ? `${toNumber(analysis.match_score)}%` : "—"}</strong><p>{analysis ? `${missingSkills.length} skill gaps` : "Run your first analysis"}</p></article>
        <article className="career-metric-card"><Map size={19} /><span>Roadmap progress</span><strong>{roadmap ? `${roadmapProgress}%` : "—"}</strong><p>{roadmap ? `${summary.pendingTasks} pending · ${summary.completedTasks} complete` : "No roadmap yet"}</p></article>
      </div>

      <div className="dashboard-content-grid">
        <section className="dashboard-panel">
          <div className="section-heading"><div><span className="eyebrow">Readiness</span><h2>Your current skill picture</h2></div><Target size={18} /></div>
          {analysis ? <>
            <div className="dashboard-score-row"><strong>{toNumber(analysis.match_score)}%</strong><span>match for your latest analyzed role</span></div>
            <div className="skill-chip-list">{missingSkills.slice(0, 8).map((skill) => <span className="skill-chip missing" key={skill}>{skill}</span>)}</div>
            {missingSkills.length === 0 && <p className="form-hint">No missing skills were found in the latest configured role requirements.</p>}
            <Link className="text-link dashboard-link" to="/skill-gap">Review skill gap <ArrowRight size={14} /></Link>
          </> : <div className="empty-state-box"><Target size={18} /><div><h3>No skill analysis yet</h3><p>Compare your saved skills with a target role to create a measurable baseline.</p></div><Link className="button button-secondary" to="/skill-gap">Analyze now</Link></div>}
        </section>

        <section className="dashboard-panel">
          <div className="section-heading"><div><span className="eyebrow">Weekly execution</span><h2>Roadmap progress</h2></div><Map size={18} /></div>
          {roadmap ? <>
            <div className="dashboard-score-row"><strong>{roadmapProgress}%</strong><span>{summary.completedTasks} tasks complete</span></div>
            <div className="progress-bar"><span style={{ width: `${Math.max(0, Math.min(100, roadmapProgress))}%` }} /></div>
            <p>{summary.pendingTasks > 0 ? `${summary.pendingTasks} tasks are still pending. Keep the weekly plan moving.` : "Your current roadmap tasks are complete."}</p>
            <Link className="text-link dashboard-link" to="/roadmap">Open roadmap <ArrowRight size={14} /></Link>
          </> : <div className="empty-state-box"><Map size={18} /><div><h3>No roadmap yet</h3><p>Run skill-gap analysis first, then generate a plan from real missing skills.</p></div><Link className="button button-secondary" to="/skill-gap">Start from skill gap</Link></div>}
        </section>

        <section className="dashboard-panel">
          <div className="section-heading"><div><span className="eyebrow">Resume</span><h2>ATS readiness</h2></div><FileText size={18} /></div>
          {generatedResume ? <><div className="dashboard-score-row"><strong>{toNumber(generatedResume.ats_score) || "—"}</strong><span>latest ATS score</span></div><p>{toText(generatedResume.target_role, "Generated resume")}</p><Link className="text-link dashboard-link" to="/resume-builder">Open resume builder <ArrowRight size={14} /></Link></> : <div className="empty-state-box"><FileText size={18} /><div><h3>No ATS version yet</h3><p>Your base profile is ready when you want to tailor a resume for a role.</p></div><Link className="button button-secondary" to="/resume-builder">Build ATS resume</Link></div>}
        </section>

        <section className="dashboard-panel">
          <div className="section-heading"><div><span className="eyebrow">Profile source</span><h2>Resume status</h2></div><CheckCircle2 size={18} /></div>
          {summary.resume ? <><div className="dashboard-status-line"><CheckCircle2 size={17} /><strong>Active resume connected</strong></div><p>{toText(summary.resume.file_name, "Uploaded resume")}</p><Link className="text-link dashboard-link" to="/onboarding/review-profile">Review profile details <ArrowRight size={14} /></Link></> : <div className="empty-state-box"><FileText size={18} /><div><h3>No active resume</h3><p>Upload a PDF or DOCX to reduce manual profile entry.</p></div><Link className="button button-secondary" to="/onboarding/upload-resume">Upload resume</Link></div>}
        </section>
      </div>
    </AuthCard>
  );
};

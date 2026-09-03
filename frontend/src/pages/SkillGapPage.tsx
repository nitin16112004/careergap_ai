import { ArrowRight, CheckCircle2, CircleDashed, Target, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../components/auth/AuthCard";
import { ErrorMessage, SuccessMessage } from "../components/auth/FeedbackMessage";
import { LoadingButton } from "../components/auth/Button";
import { roadmapService } from "../services/roadmap.service";
import { skillGapService, type JobRole, type SkillAnalysis } from "../services/skill-gap.service";

const priorityList = (analysis: SkillAnalysis | null): string[] => {
  if (!analysis) return [];
  const result = analysis.learning_order ?? analysis.analysis_result?.learning_order;
  if (Array.isArray(result)) return result.filter((item): item is string => typeof item === "string");
  return analysis.recommended_skills ?? [];
};

export const SkillGapPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [roleId, setRoleId] = useState("");
  const [analysis, setAnalysis] = useState<SkillAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([skillGapService.listRoles(), skillGapService.latest()])
      .then(([roleData, latest]) => {
        if (!active) return;
        setRoles(roleData);
        setAnalysis(latest);
        if (latest?.role_id) setRoleId(latest.role_id);
        else if (latest?.job_roles?.id) setRoleId(latest.job_roles.id);
      })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load skill-gap data."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedRole = useMemo(() => roles.find((role) => role.id === roleId) ?? analysis?.role ?? analysis?.job_roles ?? null, [analysis, roleId, roles]);
  const learningOrder = priorityList(analysis);

  const analyze = async (): Promise<void> => {
    if (!roleId) { setError("Select a target role before running the analysis."); return; }
    setAnalyzing(true); setError(""); setSuccess("");
    try {
      const next = await skillGapService.analyze(roleId, sessionStorage.getItem("careerguid:last-resume-id") ?? undefined);
      setAnalysis(next);
      setSuccess("Skill-gap analysis updated from your current profile.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not analyze your skill gap.");
    } finally {
      setAnalyzing(false);
    }
  };

  const generateRoadmap = async (): Promise<void> => {
    if (!analysis) { setError("Run a skill-gap analysis before generating a roadmap."); return; }
    setGenerating(true); setError(""); setSuccess("");
    try {
      await roadmapService.generate({
        skillAnalysisId: analysis.id,
        roleId: analysis.role_id || roleId || undefined,
        roleName: selectedRole?.role_name,
      });
      navigate("/roadmap");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate your roadmap.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AuthCard className="onboarding-card" eyebrow="Career readiness" title="Skill Gap Analysis" subtitle="See exactly how your current skills compare with the role you want, then turn the missing skills into a practical learning plan.">
      <ErrorMessage>{error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      {loading ? <div className="review-loading"><CircleDashed className="spin-icon" size={18} /> Loading career roles and your latest analysis...</div> : (
        <>
          <section className="skill-gap-control-card">
            <div>
              <label className="field-label" htmlFor="skill-gap-role">Target job role</label>
              <select id="skill-gap-role" className="auth-input" value={roleId} onChange={(event) => setRoleId(event.target.value)}>
                <option value="">Select a role</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.role_name}</option>)}
              </select>
              {selectedRole?.role_description && <p className="form-hint">{selectedRole.role_description}</p>}
            </div>
            <LoadingButton type="button" loading={analyzing} loadingLabel="Analyzing skills..." onClick={() => { void analyze(); }}><Target size={16} /> Analyze skill gap</LoadingButton>
          </section>

          {!analysis ? (
            <div className="empty-state-box"><TriangleAlert size={18} /><div><h3>No skill analysis yet</h3><p>Select a target role and compare it with the skills saved in your completed profile.</p></div></div>
          ) : (
            <>
              <div className="skill-gap-metrics">
                <article className="career-metric-card"><span>Role match</span><strong>{analysis.match_score}%</strong><p>{selectedRole?.role_name ?? "Target role"}</p></article>
                <article className="career-metric-card"><span>Matched skills</span><strong>{analysis.matched_skills.length}</strong><p>Already working in your favor</p></article>
                <article className="career-metric-card"><span>Missing skills</span><strong>{analysis.missing_skills.length}</strong><p>Prioritize these next</p></article>
              </div>

              <div className="skill-gap-columns">
                <section className="skill-result-card"><div className="section-heading"><div><span className="eyebrow">Strengths</span><h2>Matched skills</h2></div><CheckCircle2 size={18} /></div><div className="skill-chip-list">{analysis.matched_skills.length ? analysis.matched_skills.map((skill) => <span className="skill-chip matched" key={skill}>{skill}</span>) : <p className="form-hint">No required skills matched yet. That is useful baseline information.</p>}</div></section>
                <section className="skill-result-card"><div className="section-heading"><div><span className="eyebrow">Gaps</span><h2>Missing skills</h2></div><TriangleAlert size={18} /></div><div className="skill-chip-list">{analysis.missing_skills.length ? analysis.missing_skills.map((skill) => <span className="skill-chip missing" key={skill}>{skill}</span>) : <p className="form-hint">Great coverage. Keep strengthening depth and practical proof.</p>}</div></section>
              </div>

              <section className="learning-order-card">
                <div className="section-heading"><div><span className="eyebrow">Next actions</span><h2>Recommended learning order</h2></div></div>
                {learningOrder.length ? <ol className="learning-order-list">{learningOrder.map((skill, index) => <li key={`${skill}-${index}`}><span>{index + 1}</span><strong>{skill}</strong></li>)}</ol> : <p className="form-hint">No missing skills need prioritization for this role.</p>}
                {analysis.missing_skills.length > 0 && <div className="skill-gap-roadmap-cta"><div><strong>Turn these gaps into a weekly plan</strong><p>The MVP roadmap uses your real skill analysis and curated knowledge-base content. Full embedding + pgvector + LLM RAG comes in the later RAG phase.</p></div><LoadingButton type="button" loading={generating} loadingLabel="Building roadmap..." onClick={() => { void generateRoadmap(); }}>Generate roadmap <ArrowRight size={16} /></LoadingButton></div>}
              </section>
            </>
          )}
        </>
      )}
    </AuthCard>
  );
};

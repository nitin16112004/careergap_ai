import { ArrowLeft, CheckCircle2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { ErrorMessage, SuccessMessage } from "../../components/auth/FeedbackMessage";
import { Button, LoadingButton } from "../../components/auth/Button";
import { ExtractedDataForm } from "../../components/resume/ExtractedDataForm";
import { ResumePreview } from "../../components/resume/ResumePreview";
import { useAuth } from "../../hooks/use-auth";
import { onboardingService, type WorkPreference } from "../../services/onboarding.service";
import { resumeService } from "../../services/resume.service";
import { skillGapService, type JobRole } from "../../services/skill-gap.service";
import type { ExtractedResumeData, ResumeRecord } from "../../types/resume";

const emptyData = (): ExtractedResumeData => ({ name: "", email: "", phone: "", city: "", education: [], skills: [], experience: [], projects: [], linkedin: "", github: "", portfolio: "" });

const normalize = (record: ResumeRecord): ExtractedResumeData => {
  const source = record.extracted_data && typeof record.extracted_data === "object" ? record.extracted_data : {};
  const value = (key: string): unknown => source[key];
  const sourceSkills = value("skills");
  return {
    ...emptyData(),
    ...source,
    name: String(value("name") ?? value("fullName") ?? ""),
    email: String(value("email") ?? ""),
    phone: String(value("phone") ?? ""),
    city: String(value("city") ?? ""),
    education: Array.isArray(value("education")) ? value("education") as ExtractedResumeData["education"] : [],
    skills: Array.isArray(sourceSkills) ? sourceSkills.filter((skill): skill is string => typeof skill === "string") : record.extracted_skills,
    experience: Array.isArray(value("experience")) ? value("experience") as ExtractedResumeData["experience"] : [],
    projects: Array.isArray(value("projects")) ? value("projects") as ExtractedResumeData["projects"] : [],
    linkedin: String(value("linkedin") ?? value("linkedinUrl") ?? ""),
    github: String(value("github") ?? value("githubUrl") ?? ""),
    portfolio: String(value("portfolio") ?? value("portfolioUrl") ?? ""),
  };
};

export const ReviewProfilePage = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const params = new URLSearchParams(location.search);
  const manual = params.get("manual") === "true";
  const resumeId = params.get("resumeId") || sessionStorage.getItem("careerguid:last-resume-id") || undefined;

  const [data, setData] = useState<ExtractedResumeData>(emptyData());
  const [record, setRecord] = useState<ResumeRecord | null>(null);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [targetJobRole, setTargetJobRole] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [workPreference, setWorkPreference] = useState<WorkPreference>("hybrid");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError("");
      try {
        const [profileResult, rolesResult, resumeResult] = await Promise.allSettled([
          onboardingService.getProfile(),
          skillGapService.listRoles(),
          !manual && resumeId ? resumeService.get(resumeId) : Promise.resolve(null),
        ]);
        if (!active) return;

        if (rolesResult.status === "fulfilled") setRoles(rolesResult.value);

        let nextData = emptyData();
        if (resumeResult.status === "fulfilled" && resumeResult.value) {
          setRecord(resumeResult.value);
          nextData = normalize(resumeResult.value);
        }

        if (profileResult.status === "fulfilled") {
          const profile = profileResult.value;
          nextData = {
            ...nextData,
            name: nextData.name || profile.full_name || "",
            email: nextData.email || profile.email || "",
            phone: nextData.phone || profile.phone || "",
            city: nextData.city || profile.current_city || "",
            skills: nextData.skills.length ? nextData.skills : profile.skills ?? [],
            linkedin: nextData.linkedin || profile.linkedin_url || "",
            github: nextData.github || profile.github_url || "",
            portfolio: nextData.portfolio || profile.portfolio_url || "",
          };
          setTargetJobRole(profile.target_job_role || "");
          setPreferredLocation(profile.preferred_location || "");
          setWorkPreference(profile.work_preference || "hybrid");
          setExpectedSalary(profile.expected_salary || "");
          setNoticePeriod(profile.notice_period || "");
          setCareerGoal(profile.career_goal || "");
        }

        setData(nextData);
        if (resumeResult.status === "rejected" && !manual) {
          setError(resumeResult.reason instanceof Error ? resumeResult.reason.message : "Unable to load your extracted profile.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [manual, resumeId]);

  const validateForCompletion = (): string | null => {
    if (!data.name.trim()) return "Please add your full name.";
    if (!data.email.trim()) return "Please add your email address.";
    if (!data.phone.trim()) return "Please add your phone number.";
    if (!data.skills.length) return "Please add at least one skill.";
    if (!targetJobRole.trim()) return "Please add your target job role.";
    if (!preferredLocation.trim()) return "Please add your preferred work location.";
    return null;
  };

  const saveResumeReview = async (): Promise<void> => {
    if (!resumeId) return;
    const result = await resumeService.update(resumeId, data);
    setRecord(result);
  };

  const save = async (): Promise<void> => {
    if (!resumeId) { setError("There is no uploaded resume draft to save. You can still complete onboarding manually below."); return; }
    if (!data.name.trim() || !data.email.trim()) { setError("Please add your name and email before saving this review."); return; }
    setSaving(true); setError(""); setSaved(false);
    try {
      await saveResumeReview();
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your review.");
    } finally {
      setSaving(false);
    }
  };

  const completeOnboarding = async (): Promise<void> => {
    const validationError = validateForCompletion();
    if (validationError) { setError(validationError); return; }

    setCompleting(true); setError(""); setSaved(false);
    try {
      if (resumeId) await saveResumeReview();
      await onboardingService.complete({
        fullName: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        currentCity: data.city.trim() || null,
        education: data.education,
        workExperience: data.experience,
        skills: data.skills,
        projects: data.projects,
        linkedinUrl: data.linkedin.trim(),
        githubUrl: data.github.trim(),
        portfolioUrl: data.portfolio.trim(),
        targetJobRole: targetJobRole.trim(),
        preferredLocation: preferredLocation.trim(),
        workPreference,
        expectedSalary: expectedSalary.trim() || null,
        noticePeriod: noticePeriod.trim() || null,
        careerGoal: careerGoal.trim() || null,
        ...(resumeId ? { resumeId } : {}),
        fieldSources: {
          full_name: manual ? "manual" : "resume",
          email: manual ? "manual" : "resume",
          phone: manual ? "manual" : "resume",
          current_city: manual ? "manual" : "resume",
          education: manual ? "manual" : "resume",
          work_experience: manual ? "manual" : "resume",
          skills: manual ? "manual" : "resume",
          projects: manual ? "manual" : "resume",
          linkedin_url: manual ? "manual" : "resume",
          github_url: manual ? "manual" : "resume",
          portfolio_url: manual ? "manual" : "resume",
          target_job_role: "manual",
          preferred_location: "manual",
          work_preference: "manual",
          expected_salary: "manual",
          notice_period: "manual",
          career_goal: "manual",
        },
      });
      await refreshAuth();
      navigate("/onboarding/success", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not complete onboarding.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <AuthCard className="onboarding-card" eyebrow="Smart onboarding · step 2" title="Preparing your review" subtitle="We are loading your resume details and career profile."><div className="review-loading"><RefreshCw className="spin-icon" size={22} /> Loading profile details...</div></AuthCard>;

  return <AuthCard className="onboarding-card" eyebrow="Smart onboarding · step 2" title="Review and complete your career profile" subtitle="Confirm your resume details, then tell us the role and work preferences that should drive your skill-gap analysis.">
    <ErrorMessage>{error}</ErrorMessage>
    <SuccessMessage>{saved ? "Resume review saved successfully. Complete the career preferences below when you are ready." : ""}</SuccessMessage>

    <div className="review-layout">
      <div>
        <ExtractedDataForm data={data} onChange={(next) => { setData(next); setSaved(false); }} onSubmit={() => { void save(); }} saving={saving} />
        <div className="review-bottom-actions"><Button type="button" variant="secondary" onClick={() => navigate("/onboarding/upload-resume")}><ArrowLeft size={15} /> Re-upload resume</Button></div>
      </div>
      <ResumePreview data={data} />
    </div>

    <section className="career-preferences-card" aria-labelledby="career-preferences-title">
      <div className="section-heading">
        <div><span className="eyebrow">Career preferences</span><h2 id="career-preferences-title">What should your plan optimize for?</h2></div>
        <span className="source-badge source-manual">You decide</span>
      </div>
      <div className="review-form-grid">
        <label className="field-label">Target job role
          <input className="auth-input" list="target-job-role-options" value={targetJobRole} onChange={(event) => setTargetJobRole(event.target.value)} placeholder="Frontend Developer" required />
          <datalist id="target-job-role-options">{roles.map((role) => <option key={role.id} value={role.role_name} />)}</datalist>
        </label>
        <label className="field-label">Preferred location
          <input className="auth-input" value={preferredLocation} onChange={(event) => setPreferredLocation(event.target.value)} placeholder="Bengaluru, Delhi NCR, Remote" required />
        </label>
        <label className="field-label">Work preference
          <select className="auth-input" value={workPreference} onChange={(event) => setWorkPreference(event.target.value as WorkPreference)}>
            <option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option>
          </select>
        </label>
        <label className="field-label">Expected salary <span className="field-hint">Optional</span>
          <input className="auth-input" value={expectedSalary} onChange={(event) => setExpectedSalary(event.target.value)} placeholder="e.g. 8-12 LPA" />
        </label>
        <label className="field-label">Notice period <span className="field-hint">Optional</span>
          <input className="auth-input" value={noticePeriod} onChange={(event) => setNoticePeriod(event.target.value)} placeholder="Immediate / 30 days" />
        </label>
      </div>
      <label className="field-label" htmlFor="career-goal">Career goal <span className="field-hint">Optional but useful</span></label>
      <textarea id="career-goal" className="resume-textarea" value={careerGoal} onChange={(event) => setCareerGoal(event.target.value)} placeholder="Example: Become job-ready for a frontend role in 4 months and build two production-quality projects." />
      <div className="onboarding-complete-actions">
        <LoadingButton type="button" loading={completing} loadingLabel="Completing onboarding..." onClick={() => { void completeOnboarding(); }}><Sparkles size={16} /> Complete onboarding</LoadingButton>
      </div>
    </section>

    <p className="resume-security-note"><ShieldCheck size={13} /> Resume-derived fields stay editable. Career preferences are saved separately as manual inputs so future AI recommendations remain traceable.</p>
    {record?.parsing_status === "completed" && <span className="review-status"><CheckCircle2 size={14} /> Resume analyzed successfully</span>}
  </AuthCard>;
};

import { ArrowLeft, CheckCircle2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { ErrorMessage, SuccessMessage } from "../../components/auth/FeedbackMessage";
import { Button } from "../../components/auth/Button";
import { ExtractedDataForm } from "../../components/resume/ExtractedDataForm";
import { ResumePreview } from "../../components/resume/ResumePreview";
import { resumeService } from "../../services/resume.service";
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
  const params = new URLSearchParams(location.search);
  const manual = params.get("manual") === "true";
  const resumeId = params.get("resumeId") || sessionStorage.getItem("careerguid:last-resume-id");
  const [data, setData] = useState<ExtractedResumeData>(emptyData());
  const [record, setRecord] = useState<ResumeRecord | null>(null);
  const [loading, setLoading] = useState(!manual && Boolean(resumeId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (manual || !resumeId) return;
    void resumeService.get(resumeId).then((result) => { setRecord(result); setData(normalize(result)); }).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load your extracted profile.")).finally(() => setLoading(false));
  }, [manual, resumeId]);

  const save = async (): Promise<void> => {
    if (!resumeId) { setError("Upload a resume first, or continue manually with the next onboarding step."); return; }
    if (!data.name.trim() || !data.email.trim()) { setError("Please add your name and email before saving this review."); return; }
    setSaving(true); setError(""); setSaved(false);
    try { const result = await resumeService.update(resumeId, data); setRecord(result); setSaved(true); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save your review."); } finally { setSaving(false); }
  };

  if (loading) return <AuthCard className="onboarding-card" eyebrow="Smart onboarding · step 2" title="Preparing your review" subtitle="We are loading the details extracted from your resume." ><div className="review-loading"><RefreshCw className="spin-icon" size={22} /> Loading extracted details...</div></AuthCard>;

  return <AuthCard className="onboarding-card" eyebrow="Smart onboarding · step 2" title="Review your profile details" subtitle="AI did the first pass. Edit anything that needs correction; final onboarding fields will be added next.">
    <ErrorMessage>{error}</ErrorMessage>
    <SuccessMessage>{saved ? "Review saved successfully. Your profile is still editable." : ""}</SuccessMessage>
    <div className="review-layout"><div><ExtractedDataForm data={data} onChange={(next) => { setData(next); setSaved(false); }} onSubmit={() => { void save(); }} saving={saving} /><div className="review-bottom-actions"><Button type="button" variant="secondary" onClick={() => navigate("/onboarding/upload-resume")}><ArrowLeft size={15} /> Re-upload resume</Button><Link className="text-link" to="/dashboard">Save later</Link></div></div><ResumePreview data={data} /></div>
    <p className="resume-security-note"><ShieldCheck size={13} /> Auto-filled details are editable. Target role and final onboarding submission are intentionally not included in this phase.</p>
    {record?.parsing_status === "completed" && <span className="review-status"><CheckCircle2 size={14} /> Resume analyzed successfully</span>}
  </AuthCard>;
};

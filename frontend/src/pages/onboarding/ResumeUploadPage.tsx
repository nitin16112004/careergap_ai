import { ArrowRight, LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { ErrorMessage } from "../../components/auth/FeedbackMessage";
import { LoadingButton } from "../../components/auth/Button";
import { ParsingLoader } from "../../components/resume/ParsingLoader";
import { ResumeUploader } from "../../components/resume/ResumeUploader";
import { UploadProgress, type UploadStage } from "../../components/resume/UploadProgress";
import { resumeService } from "../../services/resume.service";
import type { ResumeRecord } from "../../types/resume";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowed = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

const wait = (duration: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, duration));

export const ResumeUploadPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [error, setError] = useState("");

  const chooseFile = (nextFile: File): void => {
    setError("");
    const extension = nextFile.name.toLowerCase().split(".").pop();
    const validType = allowed.has(nextFile.type) && (extension === "pdf" || extension === "docx");
    if (!validType) { setFile(null); setError("Please upload a PDF or DOCX resume."); return; }
    if (nextFile.size > MAX_FILE_SIZE) { setFile(null); setError("File size must be less than 5 MB."); return; }
    setFile(nextFile);
  };

  const poll = async (resumeId: string): Promise<ResumeRecord> => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await wait(1500);
      const result = await resumeService.get(resumeId);
      if (result.parsing_status === "completed" || result.parsing_status === "failed") return result;
    }
    throw new Error("Resume parsing is taking longer than expected. Please try again shortly.");
  };

  const upload = async (): Promise<void> => {
    if (!file) { setError("Choose a resume before continuing."); return; }
    setError("");
    try {
      setStage("uploading");
      const uploaded = await resumeService.upload(file);
      setStage("processing");
      const queued = await resumeService.process(uploaded.resume.id);
      const result = queued.resume.parsing_status === "completed" ? queued.resume : await poll(uploaded.resume.id);
      if (result.parsing_status === "failed") throw new Error(result.parsing_error || "We could not extract details from your resume. Please retry.");
      sessionStorage.setItem("careerguid:last-resume-id", result.id);
      setStage("ready");
      await wait(350);
      navigate(`/onboarding/review-profile?resumeId=${encodeURIComponent(result.id)}`);
    } catch (caught) {
      setStage("failed");
      setError(caught instanceof Error ? caught.message : "Resume upload failed. Please try again.");
    }
  };

  const busy = stage === "uploading" || stage === "processing";
  return <AuthCard className="onboarding-card" eyebrow="Smart onboarding · step 1" title="Upload your resume to get started" subtitle="We will auto-fill your profile using AI. You can edit or complete missing details before anything is finalized.">
    <div className="onboarding-intro"><span className="onboarding-intro-icon"><ShieldCheck size={20} /></span><p>Your resume stays private in Supabase Storage. You stay in control of every AI-filled field.</p></div>
    <ResumeUploader file={file} onFile={chooseFile} onRemove={() => { setFile(null); setError(""); }} disabled={busy} />
    <ErrorMessage>{error}</ErrorMessage>
    <UploadProgress stage={stage} />
    {busy && <ParsingLoader stage={stage} />}
    <div className="resume-upload-actions resume-upload-action-single"><LoadingButton type="button" onClick={() => { void upload(); }} loading={busy} loadingLabel={stage === "uploading" ? "Uploading..." : "Analyzing..."}><ArrowRight size={16} /> Analyze resume</LoadingButton></div>
    {stage === "failed" && <button type="button" className="link-button retry-link" onClick={() => { setStage("idle"); setError(""); }}><RotateCcw size={14} /> Choose another file</button>}
    <p className="resume-security-note"><LockKeyhole size={13} /> PDF and DOCX only · 5 MB maximum · no final onboarding submission yet</p>
  </AuthCard>;
};

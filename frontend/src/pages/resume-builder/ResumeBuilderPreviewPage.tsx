import { Download, FileText, Pencil, Save, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { Button, LoadingButton } from "../../components/auth/Button";
import { ErrorMessage, SuccessMessage } from "../../components/auth/FeedbackMessage";
import { resumeService } from "../../services/resume.service";
import type { GeneratedResumeContent, GeneratedResumeSnapshot } from "../../types/ats-resume";

const triggerDownload = (url: string, fileName: string): void => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
};

const copyContent = (content: GeneratedResumeContent): GeneratedResumeContent => JSON.parse(JSON.stringify(content)) as GeneratedResumeContent;

export const ResumeBuilderPreviewPage = (): JSX.Element => {
    const params = useParams();
    const [record, setRecord] = useState<GeneratedResumeSnapshot | null>(null);
    const [draft, setDraft] = useState<GeneratedResumeContent | null>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string>();
    const [success, setSuccess] = useState<string>();
    const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);

    useEffect(() => {
        const id = params.id;
        if (!id) {
            setError("No generated resume was selected.");
            return;
        }

        void resumeService.getGeneratedResume(id)
            .then((result) => {
                setRecord(result);
                setDraft(copyContent(result.resume_content));
            })
            .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load the generated resume preview."));
    }, [params.id]);

    const saveEdits = async (): Promise<void> => {
        if (!record || !draft) return;
        setSaving(true); setError(undefined); setSuccess(undefined);
        try {
            const updated = await resumeService.updateGeneratedResume(record.id, { resume_content: draft });
            setRecord(updated);
            setDraft(copyContent(updated.resume_content));
            setEditing(false);
            setSuccess("Resume edits saved. Future exports will use this version.");
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to save resume edits.");
        } finally {
            setSaving(false);
        }
    };

    const download = async (format: "pdf" | "docx"): Promise<void> => {
        if (!record) return;
        if (editing) { setError("Save or cancel your edits before exporting."); return; }
        setExporting(format);
        setError(undefined);
        setSuccess(undefined);
        try {
            const result = await resumeService.exportGeneratedResume(record.id, format);
            triggerDownload(result.url, result.fileName);
            setSuccess(`${format.toUpperCase()} export created. The secure link expires automatically.`);
            setRecord((current) => current ? {
                ...current,
                ...(format === "pdf" ? { pdf_storage_path: result.storagePath } : { docx_storage_path: result.storagePath }),
            } : current);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : `Unable to export the ${format.toUpperCase()} resume.`);
        } finally {
            setExporting(null);
        }
    };

    if (!record || !draft) {
        return <AuthCard className="onboarding-card" eyebrow="ATS preview" title="Preparing your resume preview" subtitle="Loading your factual, role-targeted version and ATS guidance."><ErrorMessage>{error}</ErrorMessage><div className="review-loading"><Sparkles className="spin-icon" size={18} /> Loading preview...</div></AuthCard>;
    }

    const content = editing ? draft : record.resume_content;

    return (
        <AuthCard className="onboarding-card" eyebrow="ATS resume preview" title={content.personalInfo.name || record.target_role} subtitle={`Version: ${record.version_name ?? "ATS v1"} · source-match score ${record.ats_score ?? 0}`}>
            <ErrorMessage>{error}</ErrorMessage>
            <SuccessMessage>{success}</SuccessMessage>

            <div className="resume-builder-actions" style={{ marginBottom: 16 }}>
                {!editing ? (
                    <Button type="button" variant="secondary" onClick={() => { setDraft(copyContent(record.resume_content)); setEditing(true); setSuccess(undefined); }}><Pencil size={15} /> Edit generated version</Button>
                ) : (
                    <>
                        <LoadingButton type="button" loading={saving} loadingLabel="Saving..." onClick={() => { void saveEdits(); }}><Save size={15} /> Save edits</LoadingButton>
                        <Button type="button" variant="secondary" onClick={() => { setDraft(copyContent(record.resume_content)); setEditing(false); setError(undefined); }}>Cancel</Button>
                    </>
                )}
            </div>

            <div className="resume-builder-grid">
                <div className="resume-builder-panel">
                    <div className="resume-preview-card" style={{ position: "relative" }}>
                        <div className="resume-preview-heading">
                            <span className="ai-badge"><FileText size={13} /> ATS formatted</span>
                            <span className="ai-badge">{record.ats_score ?? 0}% source match</span>
                        </div>
                        <h2>{content.personalInfo.name || "Resume"}</h2>
                        <p className="resume-preview-contact">{[content.personalInfo.email, content.personalInfo.phone, content.personalInfo.city].filter(Boolean).join(" · ")}</p>

                        <div className="resume-preview-section">
                            <strong>Professional summary</strong>
                            {editing ? <textarea className="resume-textarea" rows={4} value={draft.summary} onChange={(event) => setDraft((current) => current ? { ...current, summary: event.target.value } : current)} /> : content.summary ? <p>{content.summary}</p> : <p className="form-hint">No summary saved.</p>}
                        </div>

                        <div className="resume-preview-section">
                            <strong>Skills</strong>
                            {editing ? <input className="auth-input" value={draft.skills.join(", ")} onChange={(event) => setDraft((current) => current ? { ...current, skills: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } : current)} placeholder="TypeScript, React, SQL" /> : content.skills.length > 0 ? <div className="skill-chip-list">{content.skills.map((skill) => <span className="skill-chip" key={skill}>{skill}</span>)}</div> : <p className="form-hint">No skills saved.</p>}
                        </div>

                        {content.experience.length > 0 && <div className="resume-preview-section">
                            <strong>Experience</strong>
                            {content.experience.map((role, index) => editing ? (
                                <div className="ats-editor-entry" key={`experience-${index}`}>
                                    <input className="auth-input" aria-label={`Experience ${index + 1} title`} value={draft.experience[index]?.role ?? ""} onChange={(event) => setDraft((current) => current ? { ...current, experience: current.experience.map((item, itemIndex) => itemIndex === index ? { ...item, role: event.target.value } : item) } : current)} placeholder="Role/title" />
                                    <input className="auth-input" aria-label={`Experience ${index + 1} company`} value={draft.experience[index]?.company ?? ""} onChange={(event) => setDraft((current) => current ? { ...current, experience: current.experience.map((item, itemIndex) => itemIndex === index ? { ...item, company: event.target.value || undefined } : item) } : current)} placeholder="Company" />
                                    <input className="auth-input" aria-label={`Experience ${index + 1} period`} value={draft.experience[index]?.period ?? ""} onChange={(event) => setDraft((current) => current ? { ...current, experience: current.experience.map((item, itemIndex) => itemIndex === index ? { ...item, period: event.target.value || undefined } : item) } : current)} placeholder="Period" />
                                    <textarea className="resume-textarea" aria-label={`Experience ${index + 1} details`} rows={3} value={draft.experience[index]?.details ?? ""} onChange={(event) => setDraft((current) => current ? { ...current, experience: current.experience.map((item, itemIndex) => itemIndex === index ? { ...item, details: event.target.value } : item) } : current)} />
                                </div>
                            ) : (
                                <p key={`${role.role}-${index}`}><strong>{role.role}</strong>{role.company ? ` · ${role.company}` : ""}{role.period ? ` · ${role.period}` : ""}{role.details ? <><br />{role.details}</> : null}</p>
                            ))}
                        </div>}

                        {content.projects.length > 0 && <div className="resume-preview-section">
                            <strong>Projects</strong>
                            {content.projects.map((project, index) => editing ? (
                                <div className="ats-editor-entry" key={`project-${index}`}>
                                    <input className="auth-input" aria-label={`Project ${index + 1} name`} value={draft.projects[index]?.name ?? ""} onChange={(event) => setDraft((current) => current ? { ...current, projects: current.projects.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) } : current)} />
                                    <textarea className="resume-textarea" aria-label={`Project ${index + 1} details`} rows={3} value={draft.projects[index]?.details ?? ""} onChange={(event) => setDraft((current) => current ? { ...current, projects: current.projects.map((item, itemIndex) => itemIndex === index ? { ...item, details: event.target.value } : item) } : current)} />
                                </div>
                            ) : <p key={`${project.name}-${index}`}><strong>{project.name}</strong>{project.details ? <><br />{project.details}</> : null}{project.impact ? <><br />{project.impact}</> : null}</p>)}
                        </div>}

                        {content.education.length > 0 && <div className="resume-preview-section">
                            <strong>Education</strong>
                            {content.education.map((entry, index) => editing ? (
                                <div className="ats-editor-entry" key={`education-${index}`}>
                                    <input className="auth-input" aria-label={`Education ${index + 1} institution`} value={draft.education[index]?.institution ?? ""} onChange={(event) => setDraft((current) => current ? { ...current, education: current.education.map((item, itemIndex) => itemIndex === index ? { ...item, institution: event.target.value } : item) } : current)} />
                                    <input className="auth-input" aria-label={`Education ${index + 1} details`} value={draft.education[index]?.details ?? ""} onChange={(event) => setDraft((current) => current ? { ...current, education: current.education.map((item, itemIndex) => itemIndex === index ? { ...item, details: event.target.value } : item) } : current)} />
                                </div>
                            ) : <p key={`${entry.institution}-${index}`}>{[entry.institution, entry.details].filter(Boolean).join(" · ")}</p>)}
                        </div>}

                        {content.certifications.length > 0 && <div className="resume-preview-section"><strong>Certifications</strong>{content.certifications.map((item) => <p key={item}>{item}</p>)}</div>}
                        <div className="resume-preview-links">
                            {content.links.linkedin && <span><FileText size={13} /> {content.links.linkedin}</span>}
                            {content.links.github && <span><FileText size={13} /> {content.links.github}</span>}
                            {content.links.portfolio && <span><FileText size={13} /> {content.links.portfolio}</span>}
                        </div>
                    </div>
                </div>
                <aside className="resume-builder-ats-box">
                    <div className="resume-score-header"><span className="ai-badge"><Sparkles size={13} /> Target keywords</span></div>
                    <div className="skill-chip-list">{record.ats_keywords.length ? record.ats_keywords.map((keyword) => <span className="skill-chip" key={keyword}>{keyword}</span>) : <span className="form-hint">No configured target keywords were found.</span>}</div>
                    <div className="resume-builder-suggestions" style={{ marginTop: 18 }}>
                        <h3>Target role</h3>
                        <p>{record.target_role}</p>
                        <p className="form-hint">Automatic generation only uses reviewed resume facts. Manual edits are treated as your own corrections and additions.</p>
                    </div>
                    <div className="resume-builder-actions" style={{ marginTop: 18 }}>
                        <LoadingButton type="button" loading={exporting === "pdf"} loadingLabel="Creating PDF..." onClick={() => { void download("pdf"); }}><Download size={15} /> Download PDF</LoadingButton>
                        <LoadingButton type="button" variant="secondary" loading={exporting === "docx"} loadingLabel="Creating DOCX..." onClick={() => { void download("docx"); }}><Download size={15} /> Download DOCX</LoadingButton>
                    </div>
                </aside>
            </div>
        </AuthCard>
    );
};

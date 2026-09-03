import { Download, FileText, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { LoadingButton } from "../../components/auth/Button";
import { ErrorMessage, SuccessMessage } from "../../components/auth/FeedbackMessage";
import { resumeService } from "../../services/resume.service";
import type { GeneratedResumeSnapshot } from "../../types/ats-resume";

const triggerDownload = (url: string, fileName: string): void => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
};

export const ResumeBuilderPreviewPage = (): JSX.Element => {
    const params = useParams();
    const [record, setRecord] = useState<GeneratedResumeSnapshot | null>(null);
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
            .then((result) => setRecord(result))
            .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load the generated resume preview."));
    }, [params.id]);

    const download = async (format: "pdf" | "docx"): Promise<void> => {
        if (!record) return;
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

    if (!record) {
        return <AuthCard className="onboarding-card" eyebrow="ATS preview" title="Preparing your resume preview" subtitle="Loading your factual, role-targeted version and ATS guidance."><ErrorMessage>{error}</ErrorMessage><div className="review-loading"><Sparkles className="spin-icon" size={18} /> Loading preview...</div></AuthCard>;
    }

    const content = record.resume_content;

    return (
        <AuthCard className="onboarding-card" eyebrow="ATS resume preview" title={content.personalInfo.name || record.target_role} subtitle={`Version: ${record.version_name ?? "ATS v1"} · ATS score ${record.ats_score ?? 0}`}>
            <ErrorMessage>{error}</ErrorMessage>
            <SuccessMessage>{success}</SuccessMessage>
            <div className="resume-builder-grid">
                <div className="resume-builder-panel">
                    <div className="resume-preview-card" style={{ position: "relative" }}>
                        <div className="resume-preview-heading">
                            <span className="ai-badge"><FileText size={13} /> ATS formatted</span>
                            <span className="ai-badge">{record.ats_score ?? 0}%</span>
                        </div>
                        <h2>{content.personalInfo.name || "Resume"}</h2>
                        <p className="resume-preview-contact">{[content.personalInfo.email, content.personalInfo.phone, content.personalInfo.city].filter(Boolean).join(" · ")}</p>
                        {content.summary && <div className="resume-preview-section"><strong>Professional summary</strong><p>{content.summary}</p></div>}
                        {content.skills.length > 0 && <div className="resume-preview-section"><strong>Skills</strong><div className="skill-chip-list">{content.skills.map((skill) => <span className="skill-chip" key={skill}>{skill}</span>)}</div></div>}
                        {content.experience.length > 0 && <div className="resume-preview-section">
                            <strong>Experience</strong>
                            {content.experience.map((role, index) => (
                                <p key={`${role.role}-${index}`}><strong>{role.role}</strong>{role.company ? ` · ${role.company}` : ""}{role.period ? ` · ${role.period}` : ""}{role.details ? <><br />{role.details}</> : null}</p>
                            ))}
                        </div>}
                        {content.projects.length > 0 && <div className="resume-preview-section">
                            <strong>Projects</strong>
                            {content.projects.map((project, index) => <p key={`${project.name}-${index}`}><strong>{project.name}</strong>{project.details ? <><br />{project.details}</> : null}{project.impact ? <><br />{project.impact}</> : null}</p>)}
                        </div>}
                        {content.education.length > 0 && <div className="resume-preview-section"><strong>Education</strong>{content.education.map((entry, index) => <p key={`${entry.institution}-${index}`}>{[entry.institution, entry.details].filter(Boolean).join(" · ")}</p>)}</div>}
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
                        <p className="form-hint">Generated content only uses reviewed resume facts. Missing experience or projects are omitted rather than invented.</p>
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

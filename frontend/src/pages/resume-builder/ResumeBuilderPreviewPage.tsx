import { Download, FileText, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { Button } from "../../components/auth/Button";
import { ErrorMessage } from "../../components/auth/FeedbackMessage";
import { resumeService } from "../../services/resume.service";
import type { GeneratedResumeSnapshot } from "../../types/ats-resume";

export const ResumeBuilderPreviewPage = (): JSX.Element => {
    const params = useParams();
    const [record, setRecord] = useState<GeneratedResumeSnapshot | null>(null);
    const [error, setError] = useState<string>();

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

    if (!record) {
        return <AuthCard className="onboarding-card" eyebrow="ATS preview" title="Preparing your resume preview" subtitle="Loading your optimized version and the matching ATS guidance."><ErrorMessage>{error}</ErrorMessage><div className="review-loading"><Sparkles className="spin-icon" size={18} /> Loading preview...</div></AuthCard>;
    }

    const content = record.resume_content;

    return (
        <AuthCard className="onboarding-card" eyebrow="ATS resume preview" title={content.personalInfo.name || record.target_role} subtitle={`Version: ${record.version_name ?? "ATS v1"} · ATS score ${record.ats_score ?? 0}`}>
            <ErrorMessage>{error}</ErrorMessage>
            <div className="resume-builder-grid">
                <div className="resume-builder-panel">
                    <div className="resume-preview-card" style={{ position: "relative" }}>
                        <div className="resume-preview-heading">
                            <span className="ai-badge"><Sparkles size={13} /> ATS optimized</span>
                            <span className="ai-badge">{record.ats_score ?? 0}%</span>
                        </div>
                        <h2>{content.personalInfo.name}</h2>
                        <p className="resume-preview-contact">{[content.personalInfo.email, content.personalInfo.phone, content.personalInfo.city].filter(Boolean).join(" · ")}</p>
                        <div className="resume-preview-section">
                            <strong>Professional summary</strong>
                            <p>{content.summary}</p>
                        </div>
                        <div className="resume-preview-section">
                            <strong>Skills</strong>
                            <div className="skill-chip-list">{content.skills.map((skill) => <span className="skill-chip" key={skill}>{skill}</span>)}</div>
                        </div>
                        <div className="resume-preview-section">
                            <strong>Experience</strong>
                            {content.experience.map((role, index) => (
                                <p key={`${role.role}-${index}`}><strong>{role.role}</strong>{role.company ? ` · ${role.company}` : ""}{role.period ? ` · ${role.period}` : ""}<br />{role.details}</p>
                            ))}
                        </div>
                        <div className="resume-preview-section">
                            <strong>Education</strong>
                            {content.education.map((entry, index) => <p key={`${entry.institution}-${index}`}>{entry.institution} · {entry.details}</p>)}
                        </div>
                        <div className="resume-preview-links">
                            {content.links.linkedin && <span><FileText size={13} /> {content.links.linkedin}</span>}
                            {content.links.github && <span><FileText size={13} /> {content.links.github}</span>}
                            {content.links.portfolio && <span><FileText size={13} /> {content.links.portfolio}</span>}
                        </div>
                    </div>
                </div>
                <aside className="resume-builder-ats-box">
                    <div className="resume-score-header"><span className="ai-badge"><Sparkles size={13} /> Keywords</span></div>
                    <div className="skill-chip-list">{record.ats_keywords.map((keyword) => <span className="skill-chip" key={keyword}>{keyword}</span>)}</div>
                    <div className="resume-builder-suggestions" style={{ marginTop: 18 }}>
                        <h3>Target role</h3>
                        <p>{record.target_role}</p>
                    </div>
                    <div className="resume-builder-actions" style={{ marginTop: 18 }}>
                        <Button type="button" variant="secondary"><Download size={15} /> Download PDF</Button>
                    </div>
                </aside>
            </div>
        </AuthCard>
    );
};

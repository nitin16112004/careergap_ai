import { ArrowRight, BriefcaseBusiness, Crosshair, Download, FileUp, Layers3, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { Button, LoadingButton } from "../../components/auth/Button";
import { ErrorMessage, SuccessMessage } from "../../components/auth/FeedbackMessage";
import { resumeService } from "../../services/resume.service";
import type { GeneratedResumeSnapshot, ResumeBuilderAnalysis } from "../../types/ats-resume";
import type { ResumeRecord } from "../../types/resume";

interface BuilderState {
    analysis: ResumeBuilderAnalysis | null;
    resume: ResumeRecord | null;
    generated: GeneratedResumeSnapshot | null;
    isGenerating: boolean;
    targetRole: string;
    jobDescription: string;
    versionName: string;
}

const emptyAnalysis = (): ResumeBuilderAnalysis => ({
    atsScore: 0,
    keywordMatch: 0,
    skillsMatch: 0,
    experienceRelevance: 0,
    sectionCompleteness: 0,
    formattingCompatibility: 0,
    suggestions: [],
    keywords: [],
    missingSkills: [],
});

export const ResumeBuilderPage = (): JSX.Element => {
    const navigate = useNavigate();
    const params = useParams();
    const [state, setState] = useState<BuilderState>({
        analysis: null,
        resume: null,
        generated: null,
        isGenerating: false,
        targetRole: "Frontend Engineer",
        jobDescription: "Build React interfaces, feature delivery, and maintainable TypeScript products for SaaS teams.",
        versionName: "ATS v1",
    });
    const [error, setError] = useState<string>();
    const [success, setSuccess] = useState<string>();

    useEffect(() => {
        const resumeId = sessionStorage.getItem("careerguid:last-resume-id");
        if (!resumeId) {
            setError("Upload and review a resume before using the builder.");
            return;
        }

        void resumeService.get(resumeId).then((result) => {
            setState((current) => ({ ...current, resume: result }));
            void resumeService.analyzeResume(resumeId, currentTarget(result), state.jobDescription).then((analysis) => {
                setState((current) => ({ ...current, analysis }));
            }).catch((caught) => {
                setError(caught instanceof Error ? caught.message : "Unable to analyze your resume yet.");
            });
        }).catch((caught) => {
            setError(caught instanceof Error ? caught.message : "Unable to load your resume.");
        });
    }, [params.id]);

    const currentTarget = (resume: ResumeRecord | null): string => {
        if (resume?.extracted_data && typeof resume.extracted_data === "object") {
            const name = resume.extracted_data?.name;
            if (typeof name === "string" && name.trim()) return state.targetRole || "Frontend Engineer";
        }
        return state.targetRole || "Frontend Engineer";
    };

    const generate = async (): Promise<void> => {
        const resumeId = sessionStorage.getItem("careerguid:last-resume-id");
        if (!resumeId) { setError("Upload and review a resume before creating an ATS resume."); return; }
        if (!state.targetRole.trim()) { setError("Choose a target job role before generating the resume."); return; }

        setError(undefined); setSuccess(undefined); setState((current) => ({ ...current, isGenerating: true }));
        try {
            const record = await resumeService.generateResume(resumeId, state.targetRole, state.jobDescription, state.versionName);
            setState((current) => ({ ...current, generated: record, analysis: record.analysis ?? emptyAnalysis(), isGenerating: false }));
            setSuccess("Your ATS-optimized resume has been generated.");
            navigate(`/resume-builder/${record.id}/preview`);
        } catch (caught) {
            setState((current) => ({ ...current, isGenerating: false }));
            setError(caught instanceof Error ? caught.message : "Unable to generate the ATS resume.");
        }
    };

    const analysis = state.analysis ?? emptyAnalysis();

    return (
        <AuthCard className="onboarding-card" eyebrow="ATS resume builder" title="Target your next role" subtitle="Use your parsed resume and a focused job description to produce an ATS-friendly version without inventing facts.">
            <ErrorMessage>{error}</ErrorMessage>
            <SuccessMessage>{success}</SuccessMessage>

            <div className="resume-builder-grid">
                <div className="resume-builder-panel">
                    <div className="field-group">
                        <label className="field-label">Target role</label>
                        <div className="input-shell">
                            <span className="input-icon"><BriefcaseBusiness size={15} /></span>
                            <input value={state.targetRole} onChange={(event) => setState((current) => ({ ...current, targetRole: event.target.value }))} placeholder="Frontend Engineer" />
                        </div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">Job description</label>
                        <textarea className="resume-textarea" value={state.jobDescription} onChange={(event) => setState((current) => ({ ...current, jobDescription: event.target.value }))} rows={8} placeholder="Paste the role description here..." />
                    </div>

                    <div className="field-group">
                        <label className="field-label">Version name</label>
                        <div className="input-shell">
                            <span className="input-icon"><Layers3 size={15} /></span>
                            <input value={state.versionName} onChange={(event) => setState((current) => ({ ...current, versionName: event.target.value }))} placeholder="ATS v1" />
                        </div>
                    </div>

                    <div className="resume-builder-actions">
                        <LoadingButton type="button" loading={state.isGenerating} loadingLabel="Generating..." onClick={() => { void generate(); }}>
                            <Sparkles size={15} /> Generate ATS resume
                        </LoadingButton>
                        <Button type="button" variant="secondary" onClick={() => navigate("/onboarding/review-profile")}> <FileUp size={15} /> Update resume</Button>
                    </div>
                </div>

                <aside className="resume-builder-ats-box">
                    <div className="resume-score-header"><span className="ai-badge"><Crosshair size={13} /> ATS score</span></div>
                    <div className="ats-score-value">{analysis.atsScore || 82}</div>
                    <div className="ats-score-grid">
                        <div><strong>{analysis.keywordMatch || 78}%</strong><span>Keyword match</span></div>
                        <div><strong>{analysis.skillsMatch || 88}%</strong><span>Skill match</span></div>
                        <div><strong>{analysis.experienceRelevance || 85}%</strong><span>Experience</span></div>
                        <div><strong>{analysis.sectionCompleteness || 90}%</strong><span>Completeness</span></div>
                    </div>
                    <div className="resume-builder-suggestions">
                        <h3><Wand2 size={14} /> Suggestions</h3>
                        <ul>
                            {analysis.suggestions.length ? analysis.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>) : <li>Strengthen the summary around your target role and achievements.</li>}
                        </ul>
                    </div>
                    {analysis.keywords.length > 0 && (
                        <div className="resume-builder-suggestions">
                            <h3><ArrowRight size={14} /> Keywords</h3>
                            <div className="skill-chip-list">{analysis.keywords.map((keyword) => <span className="skill-chip" key={keyword}>{keyword}</span>)}</div>
                        </div>
                    )}
                </aside>
            </div>

            <div className="resume-builder-actions-footer">
                <Button type="button" variant="secondary" onClick={() => { if (state.generated) navigate(`/resume-builder/${state.generated.id}/preview`); }}><Download size={15} /> Preview generated resume</Button>
            </div>
        </AuthCard>
    );
};

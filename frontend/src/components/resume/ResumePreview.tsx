import { CheckCircle2, Link2, Sparkles } from "lucide-react";
import type { ExtractedResumeData } from "../../types/resume";

const display = (value: unknown): string => typeof value === "string" ? value : "";
const itemText = (value: unknown): string => typeof value === "string" ? value : (value && typeof value === "object" && "details" in value ? display((value as { details?: unknown }).details) : "");

export const ResumePreview = ({ data }: { data: ExtractedResumeData }): JSX.Element => (
  <aside className="resume-preview-card">
    <div className="resume-preview-heading"><span className="ai-badge"><Sparkles size={13} /> AI extracted</span><CheckCircle2 size={19} color="#16a34a" /></div>
    <h2>{display(data.name) || "Your profile preview"}</h2>
    <p className="resume-preview-contact">{[display(data.email), display(data.phone), display(data.city)].filter(Boolean).join(" · ") || "Contact details will appear here"}</p>
    <div className="resume-preview-section"><strong>Skills</strong><div className="skill-chip-list">{data.skills.length ? data.skills.map((skill) => <span className="skill-chip" key={skill}>{skill}</span>) : <span className="muted-copy">No skills extracted yet</span>}</div></div>
    <div className="resume-preview-section"><strong>Education</strong>{data.education.slice(0, 3).map((item, index) => <p key={`${itemText(item)}-${index}`}>{itemText(item)}</p>)}{!data.education.length && <span className="muted-copy">Add your education in the review form</span>}</div>
    <div className="resume-preview-section"><strong>Experience & projects</strong><p>{data.experience.length} experience entries · {data.projects.length} projects</p></div>
    <div className="resume-preview-links">{[data.linkedin, data.github, data.portfolio].filter(Boolean).map((link) => <span key={link}><Link2 size={13} /> {link.replace(/^https?:\/\//, "")}</span>)}</div>
  </aside>
);

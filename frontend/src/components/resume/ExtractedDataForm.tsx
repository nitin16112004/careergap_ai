import { Plus, Save, Trash2 } from "lucide-react";
import type { ExtractedResumeData } from "../../types/resume";
import { InputField } from "../auth/InputField";

interface ExtractedDataFormProps {
  data: ExtractedResumeData;
  onChange: (data: ExtractedResumeData) => void;
  onSubmit: () => void;
  saving?: boolean;
}

const textFor = (value: unknown): string => typeof value === "string" ? value : (value && typeof value === "object" && "details" in value ? String((value as { details?: unknown }).details ?? "") : "");

export const ExtractedDataForm = ({ data, onChange, onSubmit, saving = false }: ExtractedDataFormProps): JSX.Element => {
  const set = (key: keyof ExtractedResumeData, value: string): void => onChange({ ...data, [key]: value });
  const updateList = (key: "education" | "experience" | "projects", index: number, value: string): void => {
    const list = data[key].map((item, itemIndex) => itemIndex === index ? { ...item, details: value } : item);
    onChange({ ...data, [key]: list });
  };
  const addListItem = (key: "education" | "experience" | "projects"): void => onChange({ ...data, [key]: [...data[key], { details: "" }] });
  const removeListItem = (key: "education" | "experience" | "projects", index: number): void => onChange({ ...data, [key]: data[key].filter((_, itemIndex) => itemIndex !== index) });

  return <form className="resume-review-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <div className="resume-form-section"><div className="section-heading"><div><span className="eyebrow">Personal details</span><h2>Make it yours</h2></div><span className="source-badge source-auto">Auto-filled</span></div>
      <div className="review-form-grid"><InputField label="Full name" name="name" value={data.name} onChange={(event) => set("name", event.target.value)} required /><InputField label="Email" name="email" type="email" value={data.email} onChange={(event) => set("email", event.target.value)} required /><InputField label="Phone" name="phone" value={data.phone} onChange={(event) => set("phone", event.target.value)} /><InputField label="Current city" name="city" value={data.city} onChange={(event) => set("city", event.target.value)} /></div>
    </div>
    <div className="resume-form-section"><div className="section-heading"><div><span className="eyebrow">Skills</span><h2>What you can do</h2></div><span className={`source-badge ${data.skills.length ? "source-auto" : "source-missing"}`}>{data.skills.length ? "Auto-filled" : "Missing"}</span></div><label className="field-label" htmlFor="skills">Skills <span className="field-hint">Separate each skill with a comma</span></label><textarea id="skills" className="resume-textarea" value={data.skills.join(", ")} onChange={(event) => onChange({ ...data, skills: event.target.value.split(",").map((skill) => skill.trim()).filter(Boolean) })} placeholder="React, TypeScript, PostgreSQL" /></div>
    {(["education", "experience", "projects"] as const).map((key) => <div className="resume-form-section" key={key}><div className="section-heading"><div><span className="eyebrow">{key === "experience" ? "Work history" : key}</span><h2>{key === "projects" ? "Your work" : key === "education" ? "Your education" : "Your experience"}</h2></div><button type="button" className="link-button" onClick={() => addListItem(key)}><Plus size={14} /> Add</button></div>{data[key].map((item, index) => <div className="editable-list-row" key={`${key}-${index}`}><textarea className="resume-textarea" value={textFor(item)} onChange={(event) => updateList(key, index, event.target.value)} placeholder={`Add ${key} details`} /><button type="button" className="icon-button danger-icon" onClick={() => removeListItem(key, index)} aria-label={`Remove ${key} item`}><Trash2 size={16} /></button></div>)}{!data[key].length && <p className="form-hint">No {key} extracted. Add details that help your career profile.</p>}</div>)}
    <div className="resume-form-section"><div className="section-heading"><div><span className="eyebrow">Profile links</span><h2>Stay connected</h2></div><span className="source-badge source-manual">Editable</span></div><div className="review-form-grid"><InputField label="LinkedIn" name="linkedin" value={data.linkedin} onChange={(event) => set("linkedin", event.target.value)} placeholder="https://linkedin.com/in/you" /><InputField label="GitHub" name="github" value={data.github} onChange={(event) => set("github", event.target.value)} placeholder="https://github.com/you" /><InputField label="Portfolio" name="portfolio" value={data.portfolio} onChange={(event) => set("portfolio", event.target.value)} placeholder="https://your-site.com" /></div></div>
    <button type="submit" className="button button-primary" disabled={saving}><Save size={16} /> {saving ? "Saving review..." : "Save review draft"}</button>
  </form>;
};

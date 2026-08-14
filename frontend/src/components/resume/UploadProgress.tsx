import { Check, Circle } from "lucide-react";

export type UploadStage = "idle" | "uploading" | "processing" | "ready" | "failed";

const steps = [
  ["uploading", "Uploading resume"],
  ["processing", "Analyzing profile"],
  ["ready", "Preparing review"],
] as const;

export const UploadProgress = ({ stage }: { stage: UploadStage }): JSX.Element | null => {
  if (stage === "idle") return null;
  const activeIndex = stage === "failed" ? 1 : steps.findIndex(([key]) => key === stage);
  return <div className="resume-progress" aria-live="polite">{steps.map(([key, label], index) => {
    const complete = index < activeIndex || stage === "ready";
    const active = key === stage || (stage === "failed" && index === 1);
    return <div className={`resume-progress-step${active ? " active" : ""}${complete ? " complete" : ""}`} key={key}><span>{complete ? <Check size={13} /> : <Circle size={13} />}</span><small>{label}</small></div>;
  })}</div>;
};

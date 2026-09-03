import { BrainCircuit, LoaderCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { UploadStage } from "./UploadProgress";

export const ParsingLoader = ({ stage }: { stage: UploadStage }): JSX.Element => {
  const message = stage === "uploading" ? "Uploading resume..." : "AI is analyzing your resume...";
  return <motion.div className="parsing-loader" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><span><BrainCircuit size={24} /></span><div><strong>{message}</strong><p>Extracting profile details and preparing an editable review.</p></div><LoaderCircle className="spin-icon" size={20} aria-label="Processing" /></motion.div>;
};

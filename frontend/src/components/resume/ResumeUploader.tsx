import { FileText, X } from "lucide-react";
import { FileDropzone } from "./FileDropzone";

interface ResumeUploaderProps {
  file: File | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export const ResumeUploader = ({ file, onFile, onRemove, disabled = false }: ResumeUploaderProps): JSX.Element => (
  <div className="resume-uploader">
    {!file && <FileDropzone onFile={onFile} disabled={disabled} />}
    {file && (
      <div className="resume-selected-file">
        <span className="resume-file-icon"><FileText size={21} /></span>
        <div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></div>
        <button type="button" className="icon-button" onClick={onRemove} disabled={disabled} aria-label="Choose a different resume"><X size={18} /></button>
      </div>
    )}
  </div>
);

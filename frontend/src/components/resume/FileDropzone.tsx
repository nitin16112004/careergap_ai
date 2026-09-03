import { FileUp, UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

interface FileDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export const FileDropzone = ({ onFile, disabled = false }: FileDropzoneProps): JSX.Element => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const accept = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const takeFile = (file: File | undefined): void => {
    if (!disabled && file) onFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    takeFile(event.dataTransfer.files[0]);
  };

  return (
    <div
      className={`resume-dropzone${dragging ? " resume-dropzone-active" : ""}${disabled ? " resume-dropzone-disabled" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => { if (!disabled) inputRef.current?.click(); }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !disabled) inputRef.current?.click(); }}
      aria-label="Choose a PDF or DOCX resume"
    >
      <input ref={inputRef} hidden type="file" accept={accept} disabled={disabled} onChange={(event) => takeFile(event.target.files?.[0])} />
      <span className="resume-dropzone-icon"><UploadCloud size={30} /></span>
      <strong>Drag and drop your resume here</strong>
      <span>or click to browse your files</span>
      <small><FileUp size={13} /> PDF or DOCX · max 5 MB</small>
    </div>
  );
};

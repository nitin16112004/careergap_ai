import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: ReactNode;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(({ label, error, icon, id, name, ...props }, ref) => {
  const inputId = id || name || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="field-group">
      <label htmlFor={inputId} className="field-label">{label}</label>
      <div className={`input-shell${error ? " input-error" : ""}`}>
        {icon && <span className="input-icon" aria-hidden="true">{icon}</span>}
        <input ref={ref} id={inputId} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />
      </div>
      {error && <motion.p id={`${inputId}-error`} className="field-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{error}</motion.p>}
    </div>
  );
});
InputField.displayName = "InputField";

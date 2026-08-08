import { CheckCircle2, CircleAlert } from "lucide-react";
import { motion } from "framer-motion";

export const ErrorMessage = ({ children }: { children?: string }): JSX.Element | null => children ? (
  <motion.div className="feedback feedback-error" role="alert" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
    <CircleAlert size={17} aria-hidden="true" />
    <span>{children}</span>
  </motion.div>
) : null;

export const SuccessMessage = ({ children }: { children?: string }): JSX.Element | null => children ? (
  <motion.div className="feedback feedback-success" role="status" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
    <CheckCircle2 size={17} aria-hidden="true" />
    <span>{children}</span>
  </motion.div>
) : null;

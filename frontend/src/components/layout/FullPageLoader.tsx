import { motion } from "framer-motion";

export const FullPageLoader = ({ label = "Loading..." }: { label?: string }): JSX.Element => (
  <div className="full-page-loader" role="status" aria-live="polite">
    <motion.div className="loader-orbit" animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
    <span>{label}</span>
  </div>
);

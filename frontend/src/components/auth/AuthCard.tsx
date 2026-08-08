import { motion } from "framer-motion";
import type { ReactNode } from "react";

export const AuthCard = ({ eyebrow, title, subtitle, children, footer }: { eyebrow?: string; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }): JSX.Element => (
  <motion.section className="auth-card" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease: "easeOut" }}>
    <div className="auth-card-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {children}
    {footer && <div className="auth-card-footer">{footer}</div>}
  </motion.section>
);

import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export const Logo = ({ compact = false }: { compact?: boolean }): JSX.Element => (
  <Link to="/" className="brand-logo" aria-label="CareerGuid AI home">
    <span className="brand-mark"><Sparkles size={18} strokeWidth={2.4} /></span>
    {!compact && <span>CareerGuid <strong>AI</strong></span>}
  </Link>
);

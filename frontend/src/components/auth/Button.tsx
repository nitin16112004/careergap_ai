import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant = "primary", children, className = "", ...props }, ref) => {
  return <motion.div className="button-motion-wrapper" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}><button ref={ref} className={`button button-${variant} ${className}`} {...props}>{children}</button></motion.div>;
});
Button.displayName = "Button";

export const LoadingButton = ({ loading, loadingLabel, children, ...props }: ButtonProps & { loading?: boolean; loadingLabel: string }): JSX.Element => (
  <Button disabled={loading || props.disabled} {...props}>
    {loading && <span className="button-spinner" aria-hidden="true" />}
    <span>{loading ? loadingLabel : children}</span>
  </Button>
);

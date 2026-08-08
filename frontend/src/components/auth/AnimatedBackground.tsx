import { motion, useReducedMotion } from "framer-motion";

export const AnimatedBackground = (): JSX.Element => {
  const reduceMotion = useReducedMotion();
  return (
    <div className="animated-background" aria-hidden="true">
      <div className="background-grid" />
      <motion.div className="glow-blob glow-blob-one" animate={reduceMotion ? undefined : { x: [0, 22, 0], y: [0, -18, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="glow-blob glow-blob-two" animate={reduceMotion ? undefined : { x: [0, -24, 0], y: [0, 20, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="glow-blob glow-blob-three" animate={reduceMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      <div className="noise-overlay" />
    </div>
  );
};

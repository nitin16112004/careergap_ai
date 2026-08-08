import helmet from "helmet";

export const securityMiddleware = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

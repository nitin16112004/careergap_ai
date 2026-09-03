import helmet from "helmet";
import { getEnv } from "../config/env";

const env = getEnv();

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "no-referrer" },
  hsts: env.NODE_ENV === "production"
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: false }
    : false,
});

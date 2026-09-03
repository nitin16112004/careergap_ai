import helmet from "helmet";
import { getEnv } from "../config/env";

const production = getEnv().NODE_ENV === "production";

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "no-referrer" },
  strictTransportSecurity: production
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
    : false,
});

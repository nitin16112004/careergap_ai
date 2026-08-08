import type { AuthContext } from "./index";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      user?: AuthContext;
    }
  }
}

export {};

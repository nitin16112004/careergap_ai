import { createContext, useContext } from "react";
import type { AuthState } from "../types/auth";

export interface AuthContextValue extends AuthState {
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
};

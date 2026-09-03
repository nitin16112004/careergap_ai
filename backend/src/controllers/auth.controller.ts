import type { NextFunction, Request, Response } from "express";
import { authService } from "../services/auth.service";
import { HttpError } from "../utils/http-error";

const clientIp = (request: Request): string => request.ip || request.socket.remoteAddress || "unknown";

export const signup = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await authService.signup(request.body);
    response.status(201).json({ success: true, message: "Account created successfully. Please verify your email.", data });
  } catch (error) {
    next(error);
  }
};

export const login = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await authService.login(request.body, clientIp(request));
    response.json({ success: true, message: "Logged in successfully.", data });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await authService.verifyEmail(request.body);
    response.json({ success: true, message: "Email verified successfully.", data });
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    await authService.resendVerification(request.body.email, clientIp(request));
    response.json({ success: true, message: "If an account exists, a verification email has been sent." });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    await authService.forgotPassword(request.body, clientIp(request));
    response.json({ success: true, message: "If an account exists with this email, password reset instructions have been sent." });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = request.user?.userId ?? request.auth?.userId;
    if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
    await authService.resetPassword(userId, request.body);
    response.json({ success: true, message: "Password reset successful. Please login again." });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await authService.refresh(request.body);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const logout = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const accessToken = request.user?.accessToken ?? request.auth?.accessToken;
    if (!accessToken) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
    await authService.logout(accessToken);
    response.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
};

export const me = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = request.user ?? request.auth;
    if (!auth) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
    const data = await authService.me(auth);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const authController = {
  signup,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  me,
};

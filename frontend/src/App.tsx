import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "./components/layout/AuthLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { FullPageLoader } from "./components/layout/FullPageLoader";

const LoginPage = lazy(() => import("./pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import("./pages/auth/SignupPage").then((module) => ({ default: module.SignupPage })));
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage").then((module) => ({ default: module.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage").then((module) => ({ default: module.ResetPasswordPage })));
const AuthNextStepPage = lazy(() => import("./pages/AuthNextStepPage").then((module) => ({ default: module.AuthNextStepPage })));

export const App = (): JSX.Element => (
  <Suspense fallback={<FullPageLoader label="Loading your secure workspace..." />}>
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding/upload-resume" element={<AuthNextStepPage />} />
        <Route path="/dashboard" element={<AuthNextStepPage />} />
        <Route path="/admin" element={<AuthNextStepPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </Suspense>
);

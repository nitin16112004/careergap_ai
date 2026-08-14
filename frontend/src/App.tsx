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
const ResumeUploadPage = lazy(() => import("./pages/onboarding/ResumeUploadPage").then((module) => ({ default: module.ResumeUploadPage })));
const ReviewProfilePage = lazy(() => import("./pages/onboarding/ReviewProfilePage").then((module) => ({ default: module.ReviewProfilePage })));
const ResumeBuilderPage = lazy(() => import("./pages/resume-builder/ResumeBuilderPage").then((module) => ({ default: module.ResumeBuilderPage })));
const ResumeBuilderPreviewPage = lazy(() => import("./pages/resume-builder/ResumeBuilderPreviewPage").then((module) => ({ default: module.ResumeBuilderPreviewPage })));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage").then((module) => ({ default: module.RoadmapPage })));

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
        <Route path="/onboarding/upload-resume" element={<ResumeUploadPage />} />
        <Route path="/onboarding/review-profile" element={<ReviewProfilePage />} />
        <Route path="/resume-builder" element={<ResumeBuilderPage />} />
        <Route path="/resume-builder/:id" element={<ResumeBuilderPage />} />
        <Route path="/resume-builder/:id/preview" element={<ResumeBuilderPreviewPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/dashboard" element={<AuthNextStepPage />} />
        <Route path="/admin" element={<AuthNextStepPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </Suspense>
);

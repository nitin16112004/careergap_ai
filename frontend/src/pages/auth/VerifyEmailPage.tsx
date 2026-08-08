import { ArrowLeft, MailCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthProgress } from "../../components/auth/AuthProgress";
import { ErrorMessage, SuccessMessage } from "../../components/auth/FeedbackMessage";
import { InputField } from "../../components/auth/InputField";
import { LoadingButton, Button } from "../../components/auth/Button";
import { ApiError } from "../../services/api";
import { authService } from "../../services/auth.service";
import { useAuth } from "../../hooks/use-auth";

const schema = z.object({ token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email") });
type Values = z.infer<typeof schema>;

export const VerifyEmailPage = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const email = useMemo(() => (location.state as { email?: string } | null)?.email || sessionStorage.getItem("careerguid:verification-email") || user?.email || "", [location.state, user?.email]);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur" });

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => value <= 1 ? 0 : value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const onSubmit = async ({ token }: Values) => {
    if (!email) { setError("We need your email address to verify this account."); return; }
    setError(undefined);
    setLoading(true);
    try {
      await authService.verifyEmail({ email, token });
      setSuccess("Email verified successfully. Preparing your next step...");
      window.setTimeout(() => navigate(profile?.onboarding_completed ? "/dashboard" : "/onboarding/upload-resume", { replace: true }), 900);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email || cooldown) return;
    setError(undefined);
    setResendLoading(true);
    try {
      await authService.resendVerification(email);
      setCooldown(60);
      setSuccess("A fresh verification email is on its way.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to resend the verification email.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthCard eyebrow="Step 2 of 3" title="Verify your email" subtitle={email ? `Enter the 6-digit code sent to ${email}.` : "Enter the code sent to your inbox."} footer={<p><Link to="/signup" className="back-link"><ArrowLeft size={14} /> Change email</Link></p>}>
      <AuthProgress activeStep={2} />
      <div className="verification-hero"><span><MailCheck size={24} /></span><p>Verification keeps your career workspace private and helps us send useful progress updates.</p></div>
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <ErrorMessage>{error}</ErrorMessage>
        <SuccessMessage>{success}</SuccessMessage>
        <InputField label="Verification code" placeholder="000000" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="otp-input" error={errors.token?.message} {...register("token")} />
        <LoadingButton type="submit" loading={loading} loadingLabel="Verifying email...">Verify email <span aria-hidden="true">↗</span></LoadingButton>
        <Button type="button" variant="secondary" disabled={resendLoading || Boolean(cooldown)} onClick={resend}>{resendLoading ? "Sending..." : cooldown ? `Resend available in ${cooldown}s` : "Resend verification email"}</Button>
      </form>
    </AuthCard>
  );
};

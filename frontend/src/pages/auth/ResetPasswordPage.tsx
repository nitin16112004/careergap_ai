import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { ErrorMessage, SuccessMessage } from "../../components/auth/FeedbackMessage";
import { LoadingButton } from "../../components/auth/Button";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { ApiError } from "../../services/api";
import { authService } from "../../services/auth.service";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/use-auth";

const schema = z.object({ password: z.string().min(8, "Use at least 8 characters"), confirmPassword: z.string().min(8, "Confirm your password") }).refine((value) => value.password === value.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
type Values = z.infer<typeof schema>;

export const ResetPasswordPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur" });

  const onSubmit = async (values: Values) => {
    setError(undefined);
    setLoading(true);
    try {
      await authService.resetPassword(values.password, values.confirmPassword);
      await supabase.auth.signOut({ scope: "global" });
      setSuccess("Password reset successful. Please sign in again.");
      window.setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "This reset link is invalid or expired. Request a new one.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard eyebrow="Secure reset" title="Choose a new password" subtitle="Use a strong password you do not reuse elsewhere.">
      <div className="verification-hero"><span><KeyRound size={24} /></span><p>{authLoading ? "Verifying your reset session..." : user ? "Your secure reset session is ready." : "Open the reset link from your email to continue."}</p></div>
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <ErrorMessage>{error}</ErrorMessage>
        <SuccessMessage>{success}</SuccessMessage>
        <PasswordInput label="New password" placeholder="At least 8 characters" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
        <PasswordInput label="Confirm new password" placeholder="Repeat your password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
        <LoadingButton type="submit" loading={loading} loadingLabel="Updating password..." disabled={!user}>Reset password <span aria-hidden="true">↗</span></LoadingButton>
      </form>
    </AuthCard>
  );
};

import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { ErrorMessage, SuccessMessage } from "../../components/auth/FeedbackMessage";
import { InputField } from "../../components/auth/InputField";
import { LoadingButton } from "../../components/auth/Button";
import { ApiError } from "../../services/api";
import { authService } from "../../services/auth.service";

const schema = z.object({ email: z.string().trim().email("Enter a valid email address") });
type Values = z.infer<typeof schema>;

export const ForgotPasswordPage = (): JSX.Element => {
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur" });

  const onSubmit = async ({ email }: Values) => {
    setError(undefined);
    setSuccess(undefined);
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSuccess("If an account exists with this email, password reset instructions have been sent.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to send reset instructions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard eyebrow="Account recovery" title="Find your way back in" subtitle="We’ll send a secure reset link to your email address." footer={<p><Link to="/login" className="back-link"><ArrowLeft size={14} /> Back to sign in</Link></p>}>
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <ErrorMessage>{error}</ErrorMessage>
        <SuccessMessage>{success}</SuccessMessage>
        <InputField label="Email address" placeholder="you@example.com" autoComplete="email" icon={<Mail size={16} />} error={errors.email?.message} {...register("email")} />
        <LoadingButton type="submit" loading={loading} loadingLabel="Sending reset link...">Send reset link <span aria-hidden="true">↗</span></LoadingButton>
      </form>
    </AuthCard>
  );
};

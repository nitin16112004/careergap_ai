import { Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthProgress } from "../../components/auth/AuthProgress";
import { ErrorMessage } from "../../components/auth/FeedbackMessage";
import { InputField } from "../../components/auth/InputField";
import { LoadingButton } from "../../components/auth/Button";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { ApiError } from "../../services/api";
import { authService } from "../../services/auth.service";

const schema = z.object({
  fullName: z.string().trim().min(2, "Tell us your name (at least 2 characters)"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm your password"),
}).refine((value) => value.password === value.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
type Values = z.infer<typeof schema>;

export const SignupPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur" });

  const onSubmit = async (values: Values) => {
    setError(undefined);
    setLoading(true);
    try {
      const result = await authService.signup(values);
      sessionStorage.setItem("careerguid:verification-email", values.email);
      navigate(result.session ? "/onboarding/upload-resume" : "/verify-email", { state: { email: values.email } });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard eyebrow="Start your advantage" title="Create your account" subtitle="A clearer career path is a few thoughtful steps away." footer={<p>Already have an account? <Link to="/login">Sign in <span aria-hidden="true">↗</span></Link></p>}>
      <AuthProgress activeStep={1} />
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <ErrorMessage>{error}</ErrorMessage>
        <InputField label="Full name" placeholder="How should we call you?" autoComplete="name" icon={<UserRound size={16} />} error={errors.fullName?.message} {...register("fullName")} />
        <InputField label="Email address" placeholder="you@example.com" autoComplete="email" icon={<Mail size={16} />} error={errors.email?.message} {...register("email")} />
        <PasswordInput label="Password" placeholder="At least 8 characters" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
        <PasswordInput label="Confirm password" placeholder="Repeat your password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
        <p className="form-hint">By continuing, you agree to receive essential account emails. You can change preferences later.</p>
        <LoadingButton type="submit" loading={loading} loadingLabel="Creating your account...">Create account <span aria-hidden="true">↗</span></LoadingButton>
      </form>
    </AuthCard>
  );
};

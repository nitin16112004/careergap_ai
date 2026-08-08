import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { ErrorMessage } from "../../components/auth/FeedbackMessage";
import { InputField } from "../../components/auth/InputField";
import { LoadingButton } from "../../components/auth/Button";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { authService } from "../../services/auth.service";
import { ApiError } from "../../services/api";

const schema = z.object({ email: z.string().trim().email("Enter a valid email address"), password: z.string().min(1, "Enter your password") });
type Values = z.infer<typeof schema>;

export const LoginPage = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur" });

  const onSubmit = async (values: Values) => {
    setError(undefined);
    setLoading(true);
    try {
      const result = await authService.login(values);
      if (result.requiresVerification) navigate("/verify-email", { state: { email: values.email } });
      else navigate(new URLSearchParams(location.search).get("redirect") || "/onboarding/upload-resume");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Login failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard eyebrow="Welcome back" title="Sign in to your career edge" subtitle="Pick up exactly where your next opportunity starts." footer={<p>New to CareerGuid? <Link to="/signup">Create an account <span aria-hidden="true">↗</span></Link></p>}>
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <ErrorMessage>{error}</ErrorMessage>
        <InputField label="Email address" placeholder="you@example.com" autoComplete="email" icon={<Mail size={16} />} error={errors.email?.message} {...register("email")} />
        <PasswordInput label="Password" placeholder="Enter your password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        <div className="form-row form-row-between">
          <label className="checkbox-label"><input type="checkbox" defaultChecked /> <span>Keep me signed in</span></label>
          <Link className="text-link" to="/forgot-password">Forgot password?</Link>
        </div>
        <LoadingButton type="submit" loading={loading} loadingLabel="Authenticating...">Sign in <span aria-hidden="true">↗</span></LoadingButton>
        <div className="trust-row"><ShieldCheck size={14} /> Secure session · Supabase Auth</div>
      </form>
    </AuthCard>
  );
};

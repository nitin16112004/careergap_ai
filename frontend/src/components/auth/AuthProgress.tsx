export const AuthProgress = ({ activeStep }: { activeStep: 1 | 2 | 3 }): JSX.Element => (
  <div className="auth-progress" aria-label={`Signup progress, step ${activeStep} of 3`}>
    {["Create account", "Verify email", "Your next step"].map((label, index) => {
      const step = index + 1;
      return <div className={`progress-step${step <= activeStep ? " progress-step-active" : ""}`} key={label}><span>{step}</span><small>{label}</small></div>;
    })}
  </div>
);

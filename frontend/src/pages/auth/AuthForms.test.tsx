import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import { SignupPage } from "./SignupPage";

const mocked = vi.hoisted(() => ({
  login: vi.fn(),
  signup: vi.fn(),
}));

vi.mock("../../services/auth.service", () => ({
  authService: { login: mocked.login, signup: mocked.signup },
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

const renderLogin = (entry = "/login") => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<div>VERIFY_EMAIL_TARGET</div>} />
      <Route path="/onboarding/upload-resume" element={<div>ONBOARDING_TARGET</div>} />
      <Route path="/dashboard" element={<div>DASHBOARD_TARGET</div>} />
    </Routes>
  </MemoryRouter>,
);

const renderSignup = () => render(
  <MemoryRouter initialEntries={["/signup"]}>
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-email" element={<div>VERIFY_EMAIL_TARGET</div>} />
      <Route path="/onboarding/upload-resume" element={<div>ONBOARDING_TARGET</div>} />
    </Routes>
  </MemoryRouter>,
);

describe("LoginPage", () => {
  it("validates email and password before calling the auth service", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(mocked.login).not.toHaveBeenCalled();
  });

  it("routes unverified users to email verification", async () => {
    mocked.login.mockResolvedValue({ requiresVerification: true });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email address"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("VERIFY_EMAIL_TARGET")).toBeInTheDocument();
    expect(mocked.login).toHaveBeenCalledWith({ email: "user@example.com", password: "password123" });
  });

  it("honours the protected-route redirect after a verified login", async () => {
    mocked.login.mockResolvedValue({ requiresVerification: false });
    const user = userEvent.setup();
    renderLogin("/login?redirect=%2Fdashboard");

    await user.type(screen.getByLabelText("Email address"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("DASHBOARD_TARGET")).toBeInTheDocument();
  });
});

describe("SignupPage", () => {
  it("blocks mismatched passwords client-side", async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.type(screen.getByLabelText("Full name"), "Ava Stone");
    await user.type(screen.getByLabelText("Email address"), "ava@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "different123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(mocked.signup).not.toHaveBeenCalled();
  });

  it("stores the verification email and routes signups without a session to verification", async () => {
    mocked.signup.mockResolvedValue({ session: null });
    const user = userEvent.setup();
    renderSignup();

    await user.type(screen.getByLabelText("Full name"), "Ava Stone");
    await user.type(screen.getByLabelText("Email address"), "ava@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("VERIFY_EMAIL_TARGET")).toBeInTheDocument();
    expect(sessionStorage.getItem("careerguid:verification-email")).toBe("ava@example.com");
    expect(mocked.signup).toHaveBeenCalledWith(expect.objectContaining({ fullName: "Ava Stone", email: "ava@example.com" }));
  });

  it("continues directly to onboarding when signup returns a session", async () => {
    mocked.signup.mockResolvedValue({ session: { access_token: "token" } });
    const user = userEvent.setup();
    renderSignup();

    await user.type(screen.getByLabelText("Full name"), "Ava Stone");
    await user.type(screen.getByLabelText("Email address"), "ava@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(screen.getByText("ONBOARDING_TARGET")).toBeInTheDocument());
  });
});

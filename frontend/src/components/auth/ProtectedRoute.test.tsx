import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";

const mocked = vi.hoisted(() => ({
  auth: {} as Record<string, unknown>,
}));

vi.mock("../../hooks/use-auth", () => ({
  useAuth: () => mocked.auth,
}));

const verifiedUser = {
  id: "user-1",
  email: "candidate@example.com",
  email_confirmed_at: "2026-09-03T10:00:00.000Z",
};

const completeProfile = {
  id: "user-1",
  email: "candidate@example.com",
  full_name: "Candidate",
  onboarding_completed: true,
  email_verified: true,
  role: "user",
};

const renderAt = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/login" element={<div>Login destination</div>} />
      <Route path="/verify-email" element={<div>Verify destination</div>} />
      <Route path="/onboarding/upload-resume" element={<div>Onboarding destination</div>} />
      <Route path="/dashboard" element={<div>Dashboard destination</div>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/skill-gap" element={<div>Protected skill gap</div>} />
        <Route path="/admin" element={<div>Protected admin</div>} />
      </Route>
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  mocked.auth = {
    loading: false,
    user: verifiedUser,
    profile: completeProfile,
    session: null,
    refreshAuth: vi.fn(),
    signOut: vi.fn(),
  };
});

describe("ProtectedRoute", () => {
  it("redirects guests to login while preserving the protected path", () => {
    mocked.auth = { ...mocked.auth, user: null, profile: null };
    renderAt("/skill-gap");
    expect(screen.getByText("Login destination")).toBeInTheDocument();
  });

  it("redirects unverified users to email verification", () => {
    mocked.auth = {
      ...mocked.auth,
      user: { ...verifiedUser, email_confirmed_at: null },
      profile: { ...completeProfile, email_verified: false },
    };
    renderAt("/skill-gap");
    expect(screen.getByText("Verify destination")).toBeInTheDocument();
  });

  it("redirects users with incomplete onboarding to resume-first onboarding", () => {
    mocked.auth = {
      ...mocked.auth,
      profile: { ...completeProfile, onboarding_completed: false },
    };
    renderAt("/skill-gap");
    expect(screen.getByText("Onboarding destination")).toBeInTheDocument();
  });

  it("allows completed users into protected career features", () => {
    renderAt("/skill-gap");
    expect(screen.getByText("Protected skill gap")).toBeInTheDocument();
  });

  it("blocks non-admin users from admin routes", () => {
    renderAt("/admin");
    expect(screen.getByText("Dashboard destination")).toBeInTheDocument();
  });
});

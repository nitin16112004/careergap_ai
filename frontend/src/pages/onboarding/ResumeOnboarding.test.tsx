import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ResumeUploadPage } from "./ResumeUploadPage";
import { ReviewProfilePage } from "./ReviewProfilePage";
import type { ResumeRecord } from "../../types/resume";

const mocked = vi.hoisted(() => ({
  get: vi.fn(),
  process: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
  completeProfile: vi.fn(),
  listRoles: vi.fn(),
  refreshAuth: vi.fn(),
}));

vi.mock("../../services/resume.service", () => ({
  resumeService: {
    get: mocked.get,
    process: mocked.process,
    update: mocked.update,
    upload: mocked.upload,
  },
}));

vi.mock("../../services/onboarding.service", () => ({
  onboardingService: {
    getProfile: mocked.getProfile,
    save: mocked.saveProfile,
    complete: mocked.completeProfile,
  },
}));

vi.mock("../../services/skill-gap.service", () => ({
  skillGapService: {
    listRoles: mocked.listRoles,
  },
}));

vi.mock("../../hooks/use-auth", () => ({
  useAuth: () => ({ refreshAuth: mocked.refreshAuth }),
}));

const resumeId = "26280af0-482a-4669-9e9e-e8091dad40c5";

const parsedResume = (overrides: Partial<ResumeRecord> = {}): ResumeRecord => ({
  id: resumeId,
  file_name: "ava-resume.pdf",
  file_type: "application/pdf",
  file_size: 264,
  file_url: "user-id/ava-resume.pdf",
  storage_path: "user-id/ava-resume.pdf",
  extracted_data: {
    name: "Ava Stone",
    email: "ava@example.com",
    phone: "+91 98765 43210",
    city: "Bengaluru",
    education: [{ details: "B.Tech, Computer Science" }],
    skills: ["TypeScript", "React"],
    experience: [{ details: "Software Engineer" }],
    projects: [{ details: "Career profile platform" }],
    linkedin: "https://linkedin.com/in/ava",
    github: "https://github.com/ava",
    portfolio: "",
  },
  extracted_text: null,
  extracted_skills: ["TypeScript", "React"],
  parsing_status: "completed",
  parsing_error: null,
  created_at: "2026-08-14T00:00:00.000Z",
  updated_at: "2026-08-14T00:00:00.000Z",
  ...overrides,
});

const profile = {
  id: "user-id",
  full_name: "Ava Stone",
  email: "ava@example.com",
  phone: "+91 98765 43210",
  current_city: "Bengaluru",
  education: null,
  work_experience: null,
  skills: ["TypeScript", "React"],
  projects: [],
  linkedin_url: "https://linkedin.com/in/ava",
  github_url: "https://github.com/ava",
  portfolio_url: null,
  target_job_role: "Frontend Engineer",
  preferred_location: "Bengaluru",
  work_preference: "hybrid" as const,
  expected_salary: "10-14 LPA",
  notice_period: "Immediate",
  career_goal: "Become job-ready for product engineering roles.",
  onboarding_completed: false,
};

const renderUpload = () => render(<MemoryRouter><ResumeUploadPage /></MemoryRouter>);
const renderReview = () => render(
  <MemoryRouter initialEntries={[`/onboarding/review-profile?resumeId=${resumeId}`]}>
    <ReviewProfilePage />
  </MemoryRouter>,
);

const choose = (file: File): void => {
  const input = document.querySelector("input[type=file]");
  if (!(input instanceof HTMLInputElement)) throw new Error("Resume file input was not rendered");
  fireEvent.change(input, { target: { files: [file] } });
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocked.upload.mockResolvedValue({ resume: parsedResume({ parsing_status: "pending" }), queued: false });
  mocked.process.mockResolvedValue({ resume: parsedResume({ parsing_status: "completed" }), queued: true });
  mocked.get.mockResolvedValue(parsedResume());
  mocked.update.mockResolvedValue(parsedResume());
  mocked.getProfile.mockResolvedValue(profile);
  mocked.saveProfile.mockResolvedValue(profile);
  mocked.completeProfile.mockResolvedValue({ ...profile, onboarding_completed: true });
  mocked.listRoles.mockResolvedValue([{ id: "role-1", role_name: "Frontend Engineer", role_slug: "frontend-engineer" }]);
  mocked.refreshAuth.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resume upload onboarding", () => {
  it("shows a validation error for an unsupported resume file", () => {
    renderUpload();
    choose(new File(["resume"], "candidate.txt", { type: "text/plain" }));
    expect(screen.getByText("Please upload a PDF or DOCX resume.")).toBeInTheDocument();
  });

  it("shows the upload loading state while the file request is in progress", async () => {
    mocked.upload.mockReturnValue(new Promise(() => undefined));
    renderUpload();
    choose(new File(["%PDF-1.7"], "candidate.pdf", { type: "application/pdf" }));
    fireEvent.click(screen.getByRole("button", { name: /analyze resume/i }));
    expect(await screen.findByText("Uploading resume...")).toBeInTheDocument();
  });

  it("shows an actionable error when upload fails", async () => {
    mocked.upload.mockRejectedValue(new Error("Storage is temporarily unavailable."));
    renderUpload();
    choose(new File(["%PDF-1.7"], "candidate.pdf", { type: "application/pdf" }));
    fireEvent.click(screen.getByRole("button", { name: /analyze resume/i }));
    expect(await screen.findByText("Storage is temporarily unavailable.")).toBeInTheDocument();
  });

  it("loads resume data and saved career preferences into the final review", async () => {
    renderReview();
    expect(await screen.findByDisplayValue("Ava Stone")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bengaluru")).toBeInTheDocument();
    expect(screen.getByText("Resume analyzed successfully")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("completes onboarding with reviewed resume data and refreshes auth state", async () => {
    renderReview();
    const completeButton = await screen.findByRole("button", { name: /complete onboarding/i });
    fireEvent.click(completeButton);

    await waitFor(() => expect(mocked.completeProfile).toHaveBeenCalledWith(expect.objectContaining({
      fullName: "Ava Stone",
      email: "ava@example.com",
      targetJobRole: "Frontend Engineer",
      preferredLocation: "Bengaluru",
      workPreference: "hybrid",
      resumeId,
    })));
    expect(mocked.update).toHaveBeenCalledWith(resumeId, expect.objectContaining({ name: "Ava Stone" }));
    expect(mocked.refreshAuth).toHaveBeenCalledTimes(1);
  });
});

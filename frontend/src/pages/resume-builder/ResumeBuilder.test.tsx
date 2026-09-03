import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResumeBuilderPage } from "./ResumeBuilderPage";
import { ResumeBuilderPreviewPage } from "./ResumeBuilderPreviewPage";

const mocked = vi.hoisted(() => ({
  getResume: vi.fn(),
  analyzeResume: vi.fn(),
  generateResume: vi.fn(),
  getGeneratedResume: vi.fn(),
  updateGeneratedResume: vi.fn(),
  exportGeneratedResume: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock("../../services/resume.service", () => ({
  resumeService: {
    get: mocked.getResume,
    analyzeResume: mocked.analyzeResume,
    generateResume: mocked.generateResume,
    getGeneratedResume: mocked.getGeneratedResume,
    updateGeneratedResume: mocked.updateGeneratedResume,
    exportGeneratedResume: mocked.exportGeneratedResume,
  },
}));

vi.mock("../../services/onboarding.service", () => ({
  onboardingService: {
    getProfile: mocked.getProfile,
  },
}));

const resumeId = "26280af0-482a-4669-9e9e-e8091dad40c5";
const generatedId = "7bf2e2b1-b4ca-4b7a-a9d8-a5dfa5d92db8";

const resume = {
  id: resumeId,
  file_name: "ava-resume.pdf",
  file_type: "application/pdf",
  file_size: 512,
  file_url: "user/ava-resume.pdf",
  storage_path: "user/ava-resume.pdf",
  extracted_data: {
    name: "Ava Stone",
    email: "ava@example.com",
    phone: "+91 98765 43210",
    city: "Bengaluru",
    skills: ["React", "TypeScript"],
    experience: [],
    projects: [{ name: "Career Platform", details: "Built a resume-first career product." }],
    education: [{ institution: "Example University", details: "B.Tech" }],
  },
  extracted_text: "React TypeScript Career Platform",
  extracted_skills: ["React", "TypeScript"],
  parsing_status: "completed",
  parsing_error: null,
  created_at: "2026-09-03T00:00:00.000Z",
  updated_at: "2026-09-03T00:00:00.000Z",
};

const analysis = {
  atsScore: 42,
  keywordMatch: 50,
  skillsMatch: 50,
  experienceRelevance: 0,
  sectionCompleteness: 83,
  formattingCompatibility: 90,
  suggestions: ["Add real experience evidence if you have it; the builder will not invent experience for you."],
  keywords: ["react", "typescript", "testing"],
  missingSkills: ["testing"],
};

const generated = {
  id: generatedId,
  user_id: "user-1",
  source_resume_id: resumeId,
  target_role: "Frontend Engineer",
  version_name: "ATS v1",
  resume_content: {
    summary: "Targeting Frontend Engineer opportunities. Reviewed profile skills include React, TypeScript.",
    skills: ["React", "TypeScript"],
    experience: [],
    education: [{ institution: "Example University", details: "B.Tech" }],
    projects: [{ name: "Career Platform", details: "Built a resume-first career product." }],
    certifications: [],
    links: {},
    personalInfo: {
      name: "Ava Stone",
      email: "ava@example.com",
      phone: "+91 98765 43210",
      city: "Bengaluru",
    },
  },
  ats_keywords: ["react", "typescript", "testing"],
  ats_score: 42,
  pdf_url: null,
  docx_url: null,
  pdf_storage_path: null,
  docx_storage_path: null,
  is_active: true,
  created_at: "2026-09-03T00:00:00.000Z",
  updated_at: "2026-09-03T00:00:00.000Z",
  analysis,
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  sessionStorage.setItem("careerguid:last-resume-id", resumeId);
  mocked.getResume.mockResolvedValue(resume);
  mocked.getProfile.mockResolvedValue({ target_job_role: "Frontend Engineer" });
  mocked.analyzeResume.mockResolvedValue(analysis);
  mocked.generateResume.mockResolvedValue(generated);
  mocked.getGeneratedResume.mockResolvedValue(generated);
  mocked.updateGeneratedResume.mockImplementation(async (_id: string, patch: { resume_content?: typeof generated.resume_content }) => ({
    ...generated,
    resume_content: patch.resume_content ?? generated.resume_content,
  }));
  mocked.exportGeneratedResume.mockResolvedValue({
    format: "pdf",
    storagePath: "user-1/generated/resume.pdf",
    url: "https://example.com/signed/resume.pdf",
    expiresIn: 900,
    fileName: "ava-stone-frontend-engineer.pdf",
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ResumeBuilderPage", () => {
  it("loads the real profile role and shows no fabricated demo score", async () => {
    render(<MemoryRouter><ResumeBuilderPage /></MemoryRouter>);

    expect(await screen.findByDisplayValue("Frontend Engineer")).toBeInTheDocument();
    await waitFor(() => expect(mocked.analyzeResume).toHaveBeenCalledWith(resumeId, "Frontend Engineer"));
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.queryByText("82")).not.toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("generates from the reviewed source resume and target role", async () => {
    render(
      <MemoryRouter initialEntries={["/resume-builder"]}>
        <Routes>
          <Route path="/resume-builder" element={<ResumeBuilderPage />} />
          <Route path="/resume-builder/:id/preview" element={<div>Preview destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const button = await screen.findByRole("button", { name: /generate factual ats resume/i });
    fireEvent.click(button);

    await waitFor(() => expect(mocked.generateResume).toHaveBeenCalledWith(
      resumeId,
      "Frontend Engineer",
      undefined,
      "ATS v1",
    ));
    expect(await screen.findByText("Preview destination")).toBeInTheDocument();
  });
});

describe("ResumeBuilderPreviewPage", () => {
  const renderPreview = () => render(
    <MemoryRouter initialEntries={[`/resume-builder/${generatedId}/preview`]}>
      <Routes>
        <Route path="/resume-builder/:id/preview" element={<ResumeBuilderPreviewPage />} />
      </Routes>
    </MemoryRouter>,
  );

  it("allows the user to edit and persist the generated factual version", async () => {
    renderPreview();
    expect(await screen.findByText("Ava Stone")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit generated version/i }));
    const summary = screen.getByDisplayValue(/Targeting Frontend Engineer opportunities/i);
    fireEvent.change(summary, { target: { value: "Frontend engineer focused on accessible React interfaces." } });
    fireEvent.click(screen.getByRole("button", { name: /save edits/i }));

    await waitFor(() => expect(mocked.updateGeneratedResume).toHaveBeenCalledWith(generatedId, expect.objectContaining({
      resume_content: expect.objectContaining({ summary: "Frontend engineer focused on accessible React interfaces." }),
    })));
    expect(await screen.findByText(/Resume edits saved/i)).toBeInTheDocument();
  });

  it("requests a private signed PDF export instead of using a public stored URL", async () => {
    renderPreview();
    await screen.findByText("Ava Stone");
    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));

    await waitFor(() => expect(mocked.exportGeneratedResume).toHaveBeenCalledWith(generatedId, "pdf"));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(await screen.findByText(/secure link expires automatically/i)).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
    from: vi.fn(),
    queueAdd: vi.fn(),
    storageFrom: vi.fn(),
    getEnv: vi.fn(() => ({ AI_SERVICE_URL: "http://localhost:8000" })),
}));

vi.mock("../config/supabase", () => ({
    getSupabaseStorageClient: () => ({
        from: mocked.from,
        storage: { from: mocked.storageFrom },
    }),
}));

vi.mock("../jobs/queues", () => ({
    createQueue: () => ({ add: mocked.queueAdd }),
}));

vi.mock("../config/env", () => ({
    getEnv: mocked.getEnv,
}));

import { atsResumeService } from "./ats-resume.service";

const userId = "a835189d-b48d-42b4-8162-3d4825c8e281";
const resumeId = "26280af0-482a-4669-9e9e-e8091dad40c5";
const generatedResumeId = "7bf2e2b1-b4ca-4b7a-a9d8-a5dfa5d92db8";

const resumeRecord = {
    id: resumeId,
    user_id: userId,
    file_name: "ava-resume.pdf",
    file_url: `${userId}/${resumeId}.pdf`,
    storage_path: `${userId}/${resumeId}.pdf`,
    file_type: "application/pdf",
    file_size: 128,
    extracted_text: "Ava Stone React TypeScript Node.js customer-facing web apps",
    extracted_data: {
        name: "Ava Stone",
        email: "ava@example.com",
        phone: "+91 98765 43210",
        city: "Bengaluru",
        education: [{ details: "B.Tech, Computer Science" }],
        skills: ["TypeScript", "React", "Node.js"],
        experience: [{ details: "Built customer-facing web apps with React and TypeScript" }],
        projects: [{ name: "Career profile platform", details: "Built a resume-first career guidance product." }],
        linkedin: "https://linkedin.com/in/ava",
        github: "https://github.com/ava",
        portfolio: "https://ava.example",
    },
    extracted_skills: ["TypeScript", "React", "Node.js"],
    parsing_status: "completed",
    parsing_error: null,
    is_active: true,
    created_at: "2026-08-14T00:00:00.000Z",
    updated_at: "2026-08-14T00:00:00.000Z",
};

const table = () => {
    const chain: Record<string, any> = {};
    chain.eq = vi.fn(() => chain);
    chain.neq = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.insert = vi.fn(() => chain);
    chain.update = vi.fn(() => chain);
    chain.delete = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    chain.single = vi.fn(async () => ({ data: null, error: null }));
    return chain;
};

beforeEach(() => {
    vi.clearAllMocks();
    mocked.from.mockReturnValue(table());
});

describe("atsResumeService.analyze", () => {
    it("scores only evidence actually found in the reviewed resume", async () => {
        const resumeTable = table();
        resumeTable.maybeSingle.mockResolvedValue({ data: resumeRecord, error: null });
        mocked.from.mockReturnValueOnce(resumeTable);

        const result = await atsResumeService.analyze(userId, resumeId, "Frontend Engineer", "Build React dashboards and TypeScript features for SaaS products.");

        expect(result.atsScore).toBeGreaterThan(0);
        expect(result.keywordMatch).toBeGreaterThan(0);
        expect(result.skillsMatch).toBeGreaterThan(0);
        expect(result.keywordMatch).toBeLessThanOrEqual(100);
        expect(result.experienceRelevance).toBeLessThanOrEqual(100);
    });

    it("does not award fake experience relevance when experience is absent", async () => {
        const resumeTable = table();
        resumeTable.maybeSingle.mockResolvedValue({
            data: { ...resumeRecord, extracted_text: "React TypeScript", extracted_data: { ...resumeRecord.extracted_data, experience: [] } },
            error: null,
        });
        mocked.from.mockReturnValueOnce(resumeTable);

        const result = await atsResumeService.analyze(userId, resumeId, "Frontend Engineer", "React TypeScript testing");
        expect(result.experienceRelevance).toBe(0);
        expect(result.suggestions.join(" ")).toContain("will not invent experience");
    });
});

describe("atsResumeService.generate", () => {
    it("persists factual source content and never creates fallback experience claims", async () => {
        const noExperienceResume = {
            ...resumeRecord,
            extracted_data: {
                ...resumeRecord.extracted_data,
                experience: [],
                projects: [],
            },
        };
        const resumeTable = table();
        resumeTable.maybeSingle.mockResolvedValue({ data: noExperienceResume, error: null });
        const retireTable = table();
        const generatedTable = table();

        generatedTable.single.mockImplementation(async () => {
            const payload = generatedTable.insert.mock.calls[0]?.[0] as Record<string, unknown>;
            return { data: payload, error: null };
        });

        mocked.from
            .mockReturnValueOnce(resumeTable)
            .mockReturnValueOnce(retireTable)
            .mockReturnValueOnce(generatedTable);

        const result = await atsResumeService.generate(userId, resumeId, "Frontend Engineer", "Build React dashboards and TypeScript features.");
        const inserted = generatedTable.insert.mock.calls[0][0] as { resume_content: { summary: string; experience: unknown[]; projects: unknown[]; personalInfo: { email: string } } };

        expect(inserted.resume_content.summary).toContain("Targeting Frontend Engineer opportunities");
        expect(inserted.resume_content.summary).not.toContain("results-driven");
        expect(inserted.resume_content.experience).toEqual([]);
        expect(inserted.resume_content.projects).toEqual([]);
        expect(inserted.resume_content.personalInfo.email).toBe("ava@example.com");
        expect(result.resumeContent.skills).toEqual(expect.arrayContaining(["TypeScript", "React", "Node.js"]));
        expect(retireTable.update).toHaveBeenCalledWith({ is_active: false });
    });
});

describe("atsResumeService.updateGenerated", () => {
    it("maps editor camelCase fields to database snake_case columns", async () => {
        const lookupTable = table();
        lookupTable.maybeSingle.mockResolvedValue({ data: { id: generatedResumeId, user_id: userId }, error: null });
        const updateTable = table();
        updateTable.maybeSingle.mockResolvedValue({ data: { id: generatedResumeId, user_id: userId, target_role: "Backend Engineer" }, error: null });
        mocked.from.mockReturnValueOnce(lookupTable).mockReturnValueOnce(updateTable);

        await atsResumeService.updateGenerated(userId, generatedResumeId, {
            targetRole: "Backend Engineer",
            versionName: "Backend v2",
            atsScore: 71,
            atsKeywords: ["node"],
            resumeContent: { summary: "User-edited summary" },
        });

        expect(updateTable.update).toHaveBeenCalledWith(expect.objectContaining({
            target_role: "Backend Engineer",
            version_name: "Backend v2",
            ats_score: 71,
            ats_keywords: ["node"],
            resume_content: { summary: "User-edited summary" },
        }));
    });
});

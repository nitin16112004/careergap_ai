import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
    from: vi.fn(),
    queueAdd: vi.fn(),
    getEnv: vi.fn(() => ({ AI_SERVICE_URL: "http://localhost:8000" })),
}));

vi.mock("../config/supabase", () => ({
    getSupabaseStorageClient: () => ({
        from: mocked.from,
        storage: { from: vi.fn() },
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
    extracted_text: null,
    extracted_data: {
        name: "Ava Stone",
        email: "ava@example.com",
        phone: "+91 98765 43210",
        city: "Bengaluru",
        education: [{ details: "B.Tech, Computer Science" }],
        skills: ["TypeScript", "React", "Node.js"],
        experience: [{ details: "Built customer-facing web apps with React and TypeScript" }],
        projects: [{ details: "Career profile platform" }],
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
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.eq = vi.fn(() => chain);
    chain.neq = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.insert = vi.fn(() => chain);
    chain.update = vi.fn(() => chain);
    chain.delete = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    chain.single = vi.fn(async () => ({ data: null, error: null }));
    return chain;
};

beforeEach(() => {
    vi.clearAllMocks();
    mocked.from.mockReturnValue(table());
});

describe("atsResumeService.analyze", () => {
    it("scores keyword and skill alignment from the user resume and target role", async () => {
        const resumeTable = table();
        resumeTable.maybeSingle.mockResolvedValue({ data: resumeRecord, error: null });
        mocked.from.mockReturnValueOnce(resumeTable);

        const result = await atsResumeService.analyze(userId, resumeId, "Frontend Engineer", "Build React dashboards and TypeScript features for SaaS products.");

        expect(result.atsScore).toBeGreaterThan(0);
        expect(result.keywordMatch).toBeGreaterThan(0);
        expect(result.skillsMatch).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });
});

describe("atsResumeService.generate", () => {
    it("creates a generated resume version without fabricating facts", async () => {
        const resumeTable = table();
        resumeTable.maybeSingle.mockResolvedValue({ data: resumeRecord, error: null });
        const generatedTable = table();
        generatedTable.single.mockResolvedValue({ data: { id: generatedResumeId, user_id: userId, target_role: "Frontend Engineer", resume_content: { summary: "Results-driven frontend engineer" }, ats_score: 88, ats_keywords: ["React", "TypeScript"], created_at: "2026-08-14T00:00:00.000Z", updated_at: "2026-08-14T00:00:00.000Z" }, error: null });
        mocked.from.mockReturnValueOnce(resumeTable).mockReturnValueOnce(generatedTable);

        const result = await atsResumeService.generate(userId, resumeId, "Frontend Engineer", "Build React dashboards and TypeScript features for SaaS products.");

        expect(result.atsScore).toBeGreaterThan(0);
        expect(result.resumeContent.summary).toContain("Ava Stone");
        expect(result.resumeContent.skills).toEqual(expect.arrayContaining(["TypeScript", "React", "Node.js"]));
        expect(result.resumeContent.summary).not.toContain("Google");
        expect(result.resumeContent.summary).not.toContain("Meta");
    });
});

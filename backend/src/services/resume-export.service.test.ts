import { describe, expect, it } from "vitest";
import { createResumeDocx, createResumePdf } from "./resume-export.service";
import type { GeneratedResumeContent } from "../types/ats-resume";

const content: GeneratedResumeContent = {
    summary: "Targeting Frontend Engineer opportunities. Reviewed profile skills include TypeScript and React.",
    skills: ["TypeScript", "React"],
    experience: [{ role: "Software Intern", company: "Acme", period: "2025", details: "Built React interfaces." }],
    education: [{ institution: "Example University", details: "B.Tech Computer Science" }],
    projects: [{ name: "Career Platform", details: "Built a resume-first career guidance project." }],
    certifications: [],
    links: { github: "https://github.com/example" },
    personalInfo: { name: "Ava Stone", email: "ava@example.com", phone: "+91 98765 43210", city: "Bengaluru" },
};

describe("resume export file generation", () => {
    it("creates a valid PDF container with factual resume text", () => {
        const pdf = createResumePdf(content, "Frontend Engineer");
        expect(pdf.subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
        expect(pdf.toString("ascii")).toContain("Ava Stone");
        expect(pdf.toString("ascii")).toContain("Built React interfaces");
        expect(pdf.toString("ascii")).not.toContain("results-driven");
    });

    it("creates a DOCX ZIP container with Word document XML", () => {
        const docx = createResumeDocx(content, "Frontend Engineer");
        expect(docx.subarray(0, 4).toString("binary")).toBe("PK\u0003\u0004");
        const binary = docx.toString("utf8");
        expect(binary).toContain("[Content_Types].xml");
        expect(binary).toContain("word/document.xml");
        expect(binary).toContain("Ava Stone");
        expect(binary).toContain("Built React interfaces");
    });
});

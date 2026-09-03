export interface ResumeBuilderAnalysis {
    atsScore: number;
    keywordMatch: number;
    skillsMatch: number;
    experienceRelevance: number;
    sectionCompleteness: number;
    formattingCompatibility: number;
    suggestions: string[];
    keywords: string[];
    missingSkills: string[];
}

export interface GeneratedResumeContent {
    summary: string;
    skills: string[];
    experience: Array<{ role: string; details: string; company?: string; period?: string }>;
    education: Array<{ institution: string; details: string }>;
    projects: Array<{ name: string; details: string; impact?: string }>;
    certifications: string[];
    links: {
        linkedin?: string;
        github?: string;
        portfolio?: string;
    };
    personalInfo: {
        name: string;
        email: string;
        phone: string;
        city: string;
    };
}

export interface GeneratedResumeSnapshot {
    id: string;
    user_id: string;
    source_resume_id: string | null;
    target_role: string;
    version_name?: string | null;
    resume_content: GeneratedResumeContent;
    resumeContent?: GeneratedResumeContent;
    ats_keywords: string[];
    atsKeywords?: string[];
    ats_score: number | null;
    atsScore?: number | null;
    pdf_url: string | null;
    docx_url: string | null;
    pdf_storage_path: string | null;
    docx_storage_path: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    analysis?: ResumeBuilderAnalysis;
}

export interface ResumeExportResult {
    format: "pdf" | "docx";
    storagePath: string;
    url: string;
    expiresIn: number;
    fileName: string;
}

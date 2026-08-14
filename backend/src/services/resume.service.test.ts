import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResumeRecord } from "../types/resume";

const mocked = vi.hoisted(() => ({
  assertUploadAllowed: vi.fn(),
  dbFrom: vi.fn(),
  queueAdd: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock("../config/supabase", () => ({
  getSupabaseStorageClient: () => ({
    from: mocked.dbFrom,
    storage: { from: mocked.storageFrom },
  }),
}));

vi.mock("../jobs/queues", () => ({
  createQueue: () => ({ add: mocked.queueAdd }),
}));

vi.mock("./resume-rate-limit.service", () => ({
  assertResumeUploadAllowed: mocked.assertUploadAllowed,
}));

import { resumeService } from "./resume.service";

const userId = "a835189d-b48d-42b4-8162-3d4825c8e281";
const resumeId = "26280af0-482a-4669-9e9e-e8091dad40c5";

const record = (overrides: Partial<ResumeRecord> = {}): ResumeRecord => ({
  id: resumeId,
  user_id: userId,
  file_name: "candidate.pdf",
  file_url: `${userId}/${resumeId}.pdf`,
  storage_path: `${userId}/${resumeId}.pdf`,
  file_type: "application/pdf",
  file_size: 64,
  extracted_text: null,
  extracted_data: {},
  extracted_skills: [],
  parsing_status: "pending",
  parsing_error: null,
  is_active: true,
  created_at: "2026-08-14T00:00:00.000Z",
  updated_at: "2026-08-14T00:00:00.000Z",
  ...overrides,
});

const fluent = (result?: { data: ResumeRecord | null; error: unknown }) => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.eq = vi.fn(() => builder);
  builder.neq = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => result ?? { data: null, error: null });
  builder.single = vi.fn(async () => result ?? { data: null, error: null });
  return builder;
};

const mockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  buffer: Buffer.from("%PDF-1.7\nresume"),
  destination: "",
  encoding: "7bit",
  fieldname: "file",
  filename: "",
  mimetype: "application/pdf",
  originalname: "candidate.pdf",
  path: "",
  size: 64,
  stream: undefined as never,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocked.assertUploadAllowed.mockResolvedValue(undefined);
  mocked.storageFrom.mockReturnValue({
    createSignedUrl: vi.fn(async () => ({ data: { signedUrl: "https://signed.example/resume" }, error: null })),
    remove: vi.fn(async () => ({ data: [], error: null })),
    upload: vi.fn(async () => ({ data: { path: "stored" }, error: null })),
  });
});

describe("resumeService.upload", () => {
  it("rejects a file whose content does not match its declared PDF type", async () => {
    await expect(resumeService.upload(userId, mockFile({ buffer: Buffer.from("not a PDF") }))).rejects.toMatchObject({
      code: "RESUME_FILE_TYPE_INVALID",
      statusCode: 400,
    });
    expect(mocked.storageFrom).not.toHaveBeenCalled();
  });

  it("uploads valid content, saves metadata, and only then retires prior active resumes", async () => {
    const stored = record();
    const insert = fluent({ data: stored, error: null });
    const deactivate = fluent();
    mocked.dbFrom.mockReturnValueOnce(insert).mockReturnValueOnce(deactivate);

    const result = await resumeService.upload(userId, mockFile());

    const storage = mocked.storageFrom.mock.results[0]?.value as { upload: ReturnType<typeof vi.fn> };
    expect(mocked.assertUploadAllowed).toHaveBeenCalledWith(userId);
    expect(storage.upload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${userId}/[\\w-]+\\.pdf$`)), expect.any(Buffer), expect.objectContaining({ contentType: "application/pdf" }));
    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: userId, parsing_status: "pending", is_active: true }));
    expect(deactivate.update).toHaveBeenCalledWith({ is_active: false });
    expect(result).toMatchObject({ id: resumeId, queued: false, signed_url: "https://signed.example/resume" });
  });
});

describe("resumeService.process", () => {
  it("moves an owned upload to processing and creates a resume parsing queue job", async () => {
    const pending = record();
    const processing = record({ parsing_status: "processing" });
    mocked.dbFrom.mockReturnValueOnce(fluent({ data: pending, error: null })).mockReturnValueOnce(fluent({ data: processing, error: null }));

    const result = await resumeService.process(userId, resumeId);

    expect(mocked.queueAdd).toHaveBeenCalledWith("parse-resume", expect.objectContaining({ resumeId, userId, storagePath: pending.storage_path }), expect.objectContaining({ attempts: 3 }));
    expect(result).toMatchObject({ id: resumeId, parsing_status: "processing", queued: true });
  });
});

import multer, { MulterError } from "multer";
import type { RequestHandler } from "express";
import { HttpError } from "../utils/http-error";
import { MAX_RESUME_FILE_SIZE, RESUME_MIME_TYPES } from "../types/resume";

const extensionFor = (fileName: string): string => fileName.toLowerCase().split(".").pop() ?? "";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_FILE_SIZE, files: 1 },
  fileFilter: (_request, file, callback) => {
    const extension = extensionFor(file.originalname);
    const allowed = (extension === "pdf" && file.mimetype === RESUME_MIME_TYPES.pdf)
      || (extension === "docx" && file.mimetype === RESUME_MIME_TYPES.docx);
    if (!allowed) {
      callback(new HttpError(400, "Please upload a PDF or DOCX resume.", "RESUME_FILE_TYPE_INVALID"));
      return;
    }
    callback(null, true);
  },
});

export const uploadResumeFile: RequestHandler = (request, response, next) => {
  upload.single("file")(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new HttpError(413, "Resume file must be 5 MB or smaller.", "RESUME_FILE_TOO_LARGE"));
      return;
    }
    next(error);
  });
};

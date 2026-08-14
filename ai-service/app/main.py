from __future__ import annotations

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from .parser import ParsedResume, parse_resume_bytes, parse_text

app = FastAPI(title="CareerGuid AI Parser", version="0.1.0")

MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024
PDF_MIME_TYPE = "application/pdf"
DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def validate_uploaded_resume(content: bytes, file_name: str, content_type: str) -> None:
    extension = file_name.lower().rsplit(".", maxsplit=1)[-1] if "." in file_name else ""
    if not content:
        raise ValueError("Resume file is empty")
    if len(content) > MAX_RESUME_FILE_SIZE:
        raise ValueError("Resume file must be 5 MB or smaller")
    if extension == "pdf" and content_type == PDF_MIME_TYPE and content.startswith(b"%PDF-"):
        return
    if extension == "docx" and content_type == DOCX_MIME_TYPE and content.startswith(b"PK\\x03\\x04"):
        return
    raise ValueError("Only valid PDF and DOCX resumes are supported")


class ParseResponse(BaseModel):
    success: bool = True
    data: ParsedResume


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "careerguid-ai-parser"}


@app.post("/parse-resume", response_model=ParseResponse)
async def parse_resume(file: UploadFile | None = File(default=None), text: str | None = Form(default=None)) -> ParseResponse:
    try:
        if file is not None:
            content = await file.read()
            file_name = file.filename or "resume"
            content_type = file.content_type or ""
            validate_uploaded_resume(content, file_name, content_type)
            parsed = parse_resume_bytes(content, file_name, content_type)
        elif text:
            parsed = parse_text(text)
        else:
            raise HTTPException(status_code=400, detail="Provide a PDF/DOCX file or resume text")
        return ParseResponse(data=parsed)
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Resume parsing failed") from error

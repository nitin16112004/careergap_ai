from __future__ import annotations

import io
import re
import zipfile
from typing import Any
from xml.etree import ElementTree

from pydantic import BaseModel, Field

try:
    import pdfplumber
except ImportError:  # pragma: no cover - production installs requirements.txt
    pdfplumber = None

try:
    from docx import Document
except ImportError:  # pragma: no cover - production installs requirements.txt
    Document = None


class EducationItem(BaseModel):
    details: str = Field(default="", max_length=500)


class ExperienceItem(BaseModel):
    details: str = Field(default="", max_length=1_000)


class ProjectItem(BaseModel):
    details: str = Field(default="", max_length=1_000)


class ParsedResume(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    city: str = ""
    education: list[EducationItem] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""
    rawText: str = ""


SKILL_DICTIONARY = (
    "JavaScript", "TypeScript", "React", "React.js", "Node.js", "Express.js",
    "PostgreSQL", "Supabase", "Redis", "Docker", "REST API", "JWT", "Python",
    "FastAPI", "RAG", "AI/ML", "HTML", "CSS", "Next.js", "Vue", "Angular",
    "Java", "C++", "Go", "AWS", "Azure", "GCP", "Git", "Linux", "Figma",
    "GraphQL", "Prisma", "SQL", "NoSQL", "Pandas", "NumPy", "scikit-learn",
    "TensorFlow", "PyTorch", "Kubernetes", "Terraform", "CI/CD", "Jest",
)

SECTION_ALIASES = {
    "education": {"education", "academic background", "qualifications"},
    "experience": {"experience", "work experience", "employment", "professional experience"},
    "projects": {"projects", "personal projects", "selected projects"},
}


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\x00", " ")).strip()


def _extract_pdf(data: bytes) -> str:
    if pdfplumber is None:
        raise ValueError("PDF parsing dependencies are not installed")
    with pdfplumber.open(io.BytesIO(data)) as document:
        return "\n".join(page.extract_text() or "" for page in document.pages)


def _extract_docx(data: bytes) -> str:
    if Document is not None:
        document = Document(io.BytesIO(data))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    # Safe fallback for environments that only need a smoke test. The XML is
    # parsed without executing macros or opening embedded relationships.
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        xml = archive.read("word/document.xml")
    root = ElementTree.fromstring(xml)
    return "\n".join(node.text or "" for node in root.iter() if node.tag.endswith("}t"))


def extract_text(data: bytes, file_name: str, content_type: str) -> str:
    lower_name = file_name.lower()
    if content_type == "application/pdf" or lower_name.endswith(".pdf"):
        return _extract_pdf(data)
    if content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or lower_name.endswith(".docx"):
        return _extract_docx(data)
    raise ValueError("Only PDF and DOCX resumes are supported")


def _lines(text: str) -> list[str]:
    return [line for line in (_clean_text(item) for item in text.splitlines()) if line]


def _section_lines(lines: list[str], section: str) -> list[str]:
    aliases = SECTION_ALIASES[section]
    start = next((index for index, line in enumerate(lines) if line.lower().rstrip(":") in aliases), None)
    if start is None:
        return []
    result: list[str] = []
    for line in lines[start + 1:]:
        normalized = line.lower().rstrip(":")
        if normalized in {alias for values in SECTION_ALIASES.values() for alias in values}:
            break
        result.append(line)
    return result[:20]


def _extract_links(text: str, provider: str) -> str:
    pattern = rf"https?://(?:www\.)?{provider}\.com/[^\s)]+"
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(0).rstrip(".,") if match else ""


def parse_text(text: str) -> ParsedResume:
    normalized = _clean_text(text)
    lines = _lines(text)
    email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", normalized)
    phone_match = re.search(r"(?:\+?\d[\d\s().-]{7,}\d)", normalized)
    city_match = re.search(r"(?:city|location|based in)\s*[:\-]\s*([A-Za-z .'-]{2,60})", text, re.IGNORECASE)

    name = ""
    for line in lines[:8]:
        if "@" not in line and not re.search(r"https?://|\d{5,}", line) and line.lower() not in {"resume", "curriculum vitae", "cv"}:
            name = line[:120]
            break

    skills = []
    lowered = normalized.lower()
    for skill in SKILL_DICTIONARY:
        if skill.lower() in lowered and skill not in skills:
            skills.append(skill)

    return ParsedResume(
        name=name,
        email=email_match.group(0) if email_match else "",
        phone=_clean_text(phone_match.group(0)) if phone_match else "",
        city=_clean_text(city_match.group(1)) if city_match else "",
        education=[EducationItem(details=line) for line in _section_lines(lines, "education")],
        skills=skills,
        experience=[ExperienceItem(details=line) for line in _section_lines(lines, "experience")],
        projects=[ProjectItem(details=line) for line in _section_lines(lines, "projects")],
        linkedin=_extract_links(normalized, "linkedin"),
        github=_extract_links(normalized, "github"),
        portfolio=(next((url.rstrip(".,") for url in re.findall(r"https?://[^\s)]+", normalized) if "linkedin.com" not in url.lower() and "github.com" not in url.lower()), "")),
        rawText=text[:200_000],
    )


def parse_resume_bytes(data: bytes, file_name: str, content_type: str) -> ParsedResume:
    if not data:
        raise ValueError("Resume file is empty")
    text = extract_text(data, file_name, content_type)
    if not text.strip():
        raise ValueError("No readable text could be extracted from this resume")
    return parse_text(text)

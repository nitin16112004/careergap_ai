from __future__ import annotations

import asyncio
import sys
import unittest
from pathlib import Path

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import MAX_RESUME_FILE_SIZE, parse_resume
from app.parser import parse_text


class MemoryUpload:
    def __init__(self, content: bytes, filename: str, content_type: str) -> None:
        self.content = content
        self.filename = filename
        self.content_type = content_type

    async def read(self) -> bytes:
        return self.content


class ResumeParserTests(unittest.TestCase):
    def test_extracts_structured_profile_data_from_text(self) -> None:
        parsed = parse_text(
            "Ava Stone\n"
            "ava@example.com | +91 98765 43210\n"
            "Location: Bengaluru\n"
            "Skills\nTypeScript, React, Python\n"
            "Education\nB.Tech Computer Science\n"
            "Experience\nSoftware Engineer at CareerGuid\n"
            "Projects\nAI career profile platform\n"
            "https://linkedin.com/in/ava\nhttps://github.com/ava\nhttps://ava.example"
        )

        self.assertEqual(parsed.name, "Ava Stone")
        self.assertEqual(parsed.email, "ava@example.com")
        self.assertEqual(parsed.city, "Bengaluru")
        self.assertIn("TypeScript", parsed.skills)
        self.assertEqual(parsed.education[0].details, "B.Tech Computer Science")
        self.assertEqual(parsed.experience[0].details, "Software Engineer at CareerGuid")
        self.assertEqual(parsed.projects[0].details, "AI career profile platform")
        self.assertEqual(parsed.linkedin, "https://linkedin.com/in/ava")
        self.assertEqual(parsed.github, "https://github.com/ava")
        self.assertEqual(parsed.portfolio, "https://ava.example")

    def test_endpoint_rejects_files_with_an_invalid_signature(self) -> None:
        upload = MemoryUpload(b"not a PDF", "candidate.pdf", "application/pdf")

        with self.assertRaises(HTTPException) as raised:
            asyncio.run(parse_resume(file=upload))

        self.assertEqual(raised.exception.status_code, 422)
        self.assertIn("Only valid PDF and DOCX", str(raised.exception.detail))

    def test_endpoint_rejects_files_larger_than_five_megabytes(self) -> None:
        upload = MemoryUpload(b"%PDF-" + (b"x" * MAX_RESUME_FILE_SIZE), "candidate.pdf", "application/pdf")

        with self.assertRaises(HTTPException) as raised:
            asyncio.run(parse_resume(file=upload))

        self.assertEqual(raised.exception.status_code, 422)
        self.assertIn("5 MB", str(raised.exception.detail))


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

from pathlib import Path
import sys

from fastapi.testclient import TestClient
import pytest

# GitHub Actions invokes the pytest console script. Make the ai-service root an
# explicit import root so these HTTP contract tests do not depend on runner
# sys.path behavior.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.main as main
from app.rag import (
    ProviderConfigurationError,
    ProviderResponseError,
    RoadmapGenerationResponse,
    RoadmapPlan,
    _provider_timeout,
)

client = TestClient(main.app)


def test_health_contract() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "careerguid-ai"}


def test_parse_resume_rejects_invalid_pdf_signature() -> None:
    response = client.post(
        "/parse-resume",
        files={"file": ("resume.pdf", b"not-a-real-pdf", "application/pdf")},
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Only valid PDF and DOCX resumes are supported"


def test_embeddings_maps_missing_provider_configuration_to_503(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail(_: str):
        raise ProviderConfigurationError("EMBEDDING_API_KEY is required for RAG generation")

    monkeypatch.setattr(main, "create_embedding", fail)
    response = client.post("/embeddings", json={"input": "Backend Engineer roadmap"})

    assert response.status_code == 503
    assert "EMBEDDING_API_KEY" in response.json()["detail"]


def test_generate_roadmap_maps_provider_failure_to_502(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail(_):
        raise ProviderResponseError("LLM provider returned HTTP 503")

    monkeypatch.setattr(main, "generate_roadmap", fail)
    response = client.post("/generate-roadmap", json={
        "target_role": "Backend Engineer",
        "current_skills": ["TypeScript"],
        "missing_skills": ["PostgreSQL"],
        "documents": [{
            "id": "doc-1",
            "title": "PostgreSQL fundamentals",
            "category": "database",
            "content": "Practice relational modelling and SQL queries.",
        }],
    })

    assert response.status_code == 502
    assert response.json()["detail"] == "LLM provider returned HTTP 503"


def test_generate_roadmap_returns_structured_week_contract(monkeypatch: pytest.MonkeyPatch) -> None:
    roadmap = RoadmapPlan.model_validate({
        "title": "Backend Engineer Roadmap",
        "description": "A focused one-week database plan.",
        "duration_weeks": 1,
        "weeks": [{
            "week_number": 1,
            "title": "PostgreSQL Foundations",
            "description": "Build practical relational database foundations.",
            "tasks": [{
                "title": "Model a relational schema",
                "description": "Create tables, keys, and one query exercise.",
                "resource_document_ids": ["doc-1"],
            }],
        }],
    })
    monkeypatch.setattr(main, "generate_roadmap", lambda _: RoadmapGenerationResponse(roadmap=roadmap, model="test-model"))

    response = client.post("/generate-roadmap", json={
        "target_role": "Backend Engineer",
        "current_skills": ["TypeScript"],
        "missing_skills": ["PostgreSQL"],
        "documents": [{
            "id": "doc-1",
            "title": "PostgreSQL fundamentals",
            "category": "database",
            "content": "Practice relational modelling and SQL queries.",
        }],
    })

    assert response.status_code == 200
    payload = response.json()
    assert payload["model"] == "test-model"
    assert payload["roadmap"]["duration_weeks"] == 1
    assert payload["roadmap"]["weeks"][0]["week_number"] == 1
    assert payload["roadmap"]["weeks"][0]["tasks"][0]["resource_document_ids"] == ["doc-1"]


def test_provider_timeout_is_bounded_and_recovers_from_invalid_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_PROVIDER_TIMEOUT_SECONDS", "1")
    assert _provider_timeout() == 5.0

    monkeypatch.setenv("AI_PROVIDER_TIMEOUT_SECONDS", "500")
    assert _provider_timeout() == 120.0

    monkeypatch.setenv("AI_PROVIDER_TIMEOUT_SECONDS", "not-a-number")
    assert _provider_timeout() == 45.0

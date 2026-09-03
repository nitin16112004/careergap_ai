from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.rag import (
    EmbeddingResponse,
    ProviderConfigurationError,
    RagDocument,
    RoadmapGenerationRequest,
    RoadmapPlan,
    create_embedding,
    generate_roadmap,
)


def test_embedding_response_requires_configured_dimension() -> None:
    response = EmbeddingResponse(embedding=[0.0] * 1536, model="embedding-test")
    assert len(response.embedding) == 1536

    with pytest.raises(ValidationError):
        EmbeddingResponse(embedding=[0.0] * 3, model="wrong-dimension")


def test_roadmap_plan_requires_sequential_weeks() -> None:
    with pytest.raises(ValidationError):
        RoadmapPlan.model_validate({
            "title": "Backend Roadmap",
            "description": "A grounded plan.",
            "duration_weeks": 1,
            "weeks": [{
                "week_number": 2,
                "title": "Week 2",
                "description": "Invalid first week number.",
                "tasks": [{
                    "title": "Practice APIs",
                    "description": "Build a small API exercise.",
                    "resource_document_ids": ["doc-1"],
                }],
            }],
        })


def test_embedding_generation_fails_closed_without_provider_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("EMBEDDING_API_KEY", raising=False)
    monkeypatch.setenv("EMBEDDING_MODEL", "embedding-test")
    with pytest.raises(ProviderConfigurationError):
        create_embedding("Target role: Backend Engineer")


def test_roadmap_generation_fails_closed_without_llm_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.setenv("LLM_MODEL", "llm-test")
    request = RoadmapGenerationRequest(
        target_role="Backend Engineer",
        current_skills=["JavaScript"],
        missing_skills=["PostgreSQL"],
        documents=[RagDocument(
            id="doc-1",
            title="PostgreSQL fundamentals",
            category="database",
            content="Practice relational modelling and SQL queries.",
        )],
    )
    with pytest.raises(ProviderConfigurationError):
        generate_roadmap(request)

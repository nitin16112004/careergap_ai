from __future__ import annotations

import json
import os
from typing import Any

import httpx
from pydantic import BaseModel, Field, field_validator, model_validator


DEFAULT_OPENAI_COMPATIBLE_BASE_URL = "https://api.openai.com/v1"
EXPECTED_EMBEDDING_DIMENSION = int(os.getenv("RAG_EMBEDDING_DIMENSION", "1536"))


class ProviderConfigurationError(RuntimeError):
    pass


class ProviderResponseError(RuntimeError):
    pass


class EmbeddingRequest(BaseModel):
    input: str = Field(min_length=3, max_length=12000)


class EmbeddingResponse(BaseModel):
    embedding: list[float]
    model: str

    @field_validator("embedding")
    @classmethod
    def validate_embedding_dimension(cls, value: list[float]) -> list[float]:
        if len(value) != EXPECTED_EMBEDDING_DIMENSION:
            raise ValueError(
                f"Embedding provider returned {len(value)} dimensions; expected {EXPECTED_EMBEDDING_DIMENSION}."
            )
        return value


class RagDocument(BaseModel):
    id: str
    title: str
    category: str
    content: str = Field(min_length=1, max_length=30000)
    source_url: str | None = None
    similarity: float | None = None


class RoadmapGenerationRequest(BaseModel):
    target_role: str = Field(min_length=1, max_length=200)
    current_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(min_length=1)
    recommended_skills: list[str] = Field(default_factory=list)
    career_goal: str | None = Field(default=None, max_length=2000)
    duration_weeks: int | None = Field(default=None, ge=1, le=24)
    documents: list[RagDocument] = Field(min_length=1, max_length=12)


class RoadmapTask(BaseModel):
    title: str = Field(min_length=3, max_length=220)
    description: str = Field(min_length=3, max_length=2000)
    resource_document_ids: list[str] = Field(default_factory=list, max_length=5)


class RoadmapWeek(BaseModel):
    week_number: int = Field(ge=1, le=24)
    title: str = Field(min_length=3, max_length=220)
    description: str = Field(min_length=3, max_length=2000)
    tasks: list[RoadmapTask] = Field(min_length=1, max_length=10)


class RoadmapPlan(BaseModel):
    title: str = Field(min_length=3, max_length=220)
    description: str = Field(min_length=3, max_length=4000)
    duration_weeks: int = Field(ge=1, le=24)
    weeks: list[RoadmapWeek] = Field(min_length=1, max_length=24)

    @model_validator(mode="after")
    def validate_week_structure(self) -> "RoadmapPlan":
        if self.duration_weeks != len(self.weeks):
            raise ValueError("duration_weeks must equal the number of generated weeks")
        expected = list(range(1, len(self.weeks) + 1))
        actual = [week.week_number for week in self.weeks]
        if actual != expected:
            raise ValueError("Roadmap weeks must be sequential and start at week 1")
        return self


class RoadmapGenerationResponse(BaseModel):
    roadmap: RoadmapPlan
    model: str


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ProviderConfigurationError(f"{name} is required for RAG generation")
    return value


def _provider_base_url(name: str) -> str:
    return os.getenv(name, DEFAULT_OPENAI_COMPATIBLE_BASE_URL).strip().rstrip("/")


def _provider_timeout() -> float:
    raw = os.getenv("AI_PROVIDER_TIMEOUT_SECONDS", "45")
    try:
        return max(5.0, min(float(raw), 120.0))
    except ValueError:
        return 45.0


def create_embedding(text: str) -> EmbeddingResponse:
    api_key = _required_env("EMBEDDING_API_KEY")
    model = _required_env("EMBEDDING_MODEL")
    base_url = _provider_base_url("EMBEDDING_BASE_URL")

    with httpx.Client(timeout=_provider_timeout()) as client:
        response = client.post(
            f"{base_url}/embeddings",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "input": text},
        )

    if response.status_code >= 400:
        raise ProviderResponseError(f"Embedding provider returned HTTP {response.status_code}")

    try:
        payload = response.json()
        vector = payload["data"][0]["embedding"]
        response_model = str(payload.get("model") or model)
    except (ValueError, KeyError, IndexError, TypeError) as error:
        raise ProviderResponseError("Embedding provider returned an invalid response") from error

    return EmbeddingResponse(embedding=vector, model=response_model)


def _roadmap_system_prompt(document_ids: set[str]) -> str:
    allowed_ids = ", ".join(sorted(document_ids))
    return (
        "You are CareerGuid AI's roadmap planner. Build a realistic, week-wise learning roadmap using only "
        "the supplied user facts and retrieved knowledge-base context. Do not invent employers, certifications, "
        "achievements, salaries, or external facts. Every resource_document_id must be one of these provided IDs: "
        f"{allowed_ids}. Return JSON only, with keys title, description, duration_weeks, weeks. Each week must have "
        "week_number, title, description, tasks. Each task must have title, description, resource_document_ids. "
        "Weeks must be sequential from 1 and duration_weeks must equal the number of weeks."
    )


def _roadmap_user_prompt(request: RoadmapGenerationRequest) -> str:
    context = [
        {
            "id": document.id,
            "title": document.title,
            "category": document.category,
            "content": document.content,
            "similarity": document.similarity,
        }
        for document in request.documents
    ]
    payload: dict[str, Any] = {
        "target_role": request.target_role,
        "current_skills": request.current_skills,
        "missing_skills": request.missing_skills,
        "recommended_skills": request.recommended_skills,
        "career_goal": request.career_goal,
        "requested_duration_weeks": request.duration_weeks,
        "retrieved_context": context,
    }
    return json.dumps(payload, ensure_ascii=False)


def generate_roadmap(request: RoadmapGenerationRequest) -> RoadmapGenerationResponse:
    api_key = _required_env("LLM_API_KEY")
    model = _required_env("LLM_MODEL")
    base_url = _provider_base_url("LLM_BASE_URL")
    document_ids = {document.id for document in request.documents}

    request_body: dict[str, Any] = {
        "model": model,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": _roadmap_system_prompt(document_ids)},
            {"role": "user", "content": _roadmap_user_prompt(request)},
        ],
        "response_format": {"type": "json_object"},
    }

    with httpx.Client(timeout=_provider_timeout()) as client:
        response = client.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=request_body,
        )

    if response.status_code >= 400:
        raise ProviderResponseError(f"LLM provider returned HTTP {response.status_code}")

    try:
        payload = response.json()
        content = payload["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        response_model = str(payload.get("model") or model)
    except (ValueError, KeyError, IndexError, TypeError, json.JSONDecodeError) as error:
        raise ProviderResponseError("LLM provider returned invalid roadmap JSON") from error

    roadmap = RoadmapPlan.model_validate(parsed)
    invalid_ids = {
        document_id
        for week in roadmap.weeks
        for task in week.tasks
        for document_id in task.resource_document_ids
        if document_id not in document_ids
    }
    if invalid_ids:
        raise ProviderResponseError("LLM roadmap referenced knowledge documents that were not retrieved")

    return RoadmapGenerationResponse(roadmap=roadmap, model=response_model)

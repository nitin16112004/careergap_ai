# AI Service

FastAPI service for the asynchronous resume parsing boundary.

## Run locally

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

`GET /health` verifies the service. `POST /parse-resume` accepts a PDF/DOCX
multipart field named `file`; a `text` form field is also supported for local
parser tests. The current parser extracts text, contact links, section lines,
and a normalized dictionary of common skills. A future LLM/RAG adapter can be
added behind `app.parser` without changing the backend queue contract.

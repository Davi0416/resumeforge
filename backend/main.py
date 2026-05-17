from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json

from backend import database, config
from backend.services import ollama_service, apilayer_service
from backend.orchestrators.analysis_orchestrator import stream_analyze
from backend.orchestrators.reconstruct_orchestrator import stream_reconstruct

@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.init_db()
    yield

app = FastAPI(title="ResumeForge API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ───────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    resume: str
    job: Optional[str] = ""
    mode: Optional[str] = "geral"

class ReconstructRequest(BaseModel):
    resume: str
    job: Optional[str] = ""
    mode: Optional[str] = "geral"
    githubUsername: Optional[str] = ""
    step1Result: Optional[dict] = None

class SettingsPayload(BaseModel):
    githubToken: Optional[str] = ""
    apilayerKey: Optional[str] = ""

# ── Health ───────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    check = await ollama_service.check_model()
    return {"status": "ok", "ollama": check}

# ── Analyze (SSE) ────────────────────────────────────────────────────

@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    async def generate():
        async for chunk in stream_analyze(req.resume, req.job or "", req.mode or "geral"):
            yield chunk
    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# ── Reconstruct (SSE) ────────────────────────────────────────────────

@app.post("/api/reconstruct")
async def reconstruct(req: ReconstructRequest):
    async def generate():
        async for chunk in stream_reconstruct(
            req.resume, req.job or "", req.mode or "geral",
            req.githubUsername or "", req.step1Result
        ):
            yield chunk
    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# ── History ──────────────────────────────────────────────────────────

@app.get("/api/history")
async def get_history():
    entries = await database.get_all()
    return entries

@app.delete("/api/history/{entry_id}")
async def delete_history(entry_id: str):
    await database.delete_analysis(entry_id)
    return {"ok": True}

# ── Settings ─────────────────────────────────────────────────────────

@app.get("/api/settings")
async def get_settings():
    return {
        "hasGithubToken": bool(config.get_github_token()),
        "hasApilayerKey": bool(config.get_apilayer_key()),
    }

@app.post("/api/settings")
async def save_settings(payload: SettingsPayload):
    config.set_github_token(payload.githubToken or None)
    config.set_apilayer_key(payload.apilayerKey or None)
    return {"ok": True}

# ── PDF Parse ────────────────────────────────────────────────────────

@app.post("/api/pdf/parse")
async def parse_pdf(file: UploadFile = File(...)):
    try:
        content = await file.read()
        result = await apilayer_service.parse_resume(content, file.filename or "resume.pdf")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha no parsing do PDF: {e}")

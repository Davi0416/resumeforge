import httpx, json, re

OLLAMA_BASE = "http://localhost:11434"
MODEL = "qwen2.5:14b"

async def check_model() -> dict:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{OLLAMA_BASE}/api/tags")
            r.raise_for_status()
            data = r.json()
            models = [m["name"] for m in data.get("models", [])]
            has_model = any(MODEL in m for m in models)
            if not has_model:
                return {"ok": False, "reason": f"Modelo '{MODEL}' não encontrado. Execute: ollama pull {MODEL}", "models": models}
            return {"ok": True, "reason": None, "models": models}
    except Exception as e:
        return {"ok": False, "reason": f"Ollama não está rodando: {e}", "models": []}

def _strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()

async def generate_stream(prompt: str) -> dict:
    full_text = ""
    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream(
            "POST", f"{OLLAMA_BASE}/api/generate",
            json={"model": MODEL, "prompt": prompt, "stream": True,
                  "options": {"num_ctx": 8192, "temperature": 0.3}}
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                try:
                    chunk = json.loads(line)
                    full_text += chunk.get("response", "")
                    if chunk.get("done"):
                        break
                except Exception:
                    continue

    cleaned = _strip_fences(full_text)
    return json.loads(cleaned)
